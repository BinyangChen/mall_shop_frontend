<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import {
  ArrowRight,
  Edit,
  Location,
  Lock,
  Plus,
  ShoppingBag,
  Ticket,
  Van,
} from '@element-plus/icons-vue';
import { addressApi } from '@/api/address';
import { checkoutApi } from '@/api/checkout';
import { couponsApi } from '@/api/coupons';
import { orderApi } from '@/api/orders';
import { isNormalizedApiError } from '@/api/http';
import { useCartStore } from '@/stores/cart';
import type { Address, Quote } from '@/types/api';
import { formatCents } from '@/utils/money';
import { createClientRequestId } from '@/utils/checkout';
import { fallbackImage } from '@/utils/format';
import PageHeader from '@/components/PageHeader.vue';
import EmptyState from '@/components/EmptyState.vue';
import AddressFormDialog from '@/components/AddressFormDialog.vue';
import CouponPickerDialog from '@/components/CouponPickerDialog.vue';
import OrderSummaryCard from '@/components/OrderSummaryCard.vue';
import MobileActionBar from '@/components/MobileActionBar.vue';

const CLIENT_REQUEST_KEY = 'mall_shop:checkout:clientRequestId';
const router = useRouter();
const cart = useCartStore();

const addresses = ref<Address[]>([]);
const selectedAddressId = ref<number | null>(null);
const addressError = ref('');
const quote = ref<Quote | null>(null);
const quoteError = ref('');
const cartEmpty = ref(false);
const selectedCouponId = ref<number | null>(null);
const unusedCouponCount = ref(0);
const initialLoading = ref(true);
const quoteLoading = ref(false);
const submitting = ref(false);
const couponDialogVisible = ref(false);
const addressDialogVisible = ref(false);
const addressDialogAddress = ref<Address | null>(null);
let quoteSeq = 0;

function readOrCreateRequestId(): string {
  try {
    const existing = sessionStorage.getItem(CLIENT_REQUEST_KEY);
    if (existing) return existing;
  } catch {
    // sessionStorage 不可用时仍使用内存中的稳定 UUID。
  }
  const id = createClientRequestId();
  try {
    sessionStorage.setItem(CLIENT_REQUEST_KEY, id);
  } catch {
    // 忽略存储异常。
  }
  return id;
}

const clientRequestId = ref(readOrCreateRequestId());

const itemCount = computed(
  () => quote.value?.items.reduce((total, item) => total + item.quantity, 0) ?? 0,
);
const canSubmit = computed(
  () =>
    Boolean(quote.value) &&
    Boolean(selectedAddressId.value) &&
    !quoteLoading.value &&
    !submitting.value,
);

async function loadInitial(): Promise<void> {
  initialLoading.value = true;
  quoteError.value = '';
  addressError.value = '';
  cartEmpty.value = false;

  const [addressResult, quoteResult, couponResult] = await Promise.allSettled([
    addressApi.list(),
    checkoutApi.quote({}),
    couponsApi.mine('UNUSED'),
  ]);

  if (addressResult.status === 'fulfilled') {
    addresses.value = addressResult.value;
    const preferred =
      addresses.value.find((address) => address.isDefault) ?? addresses.value[0] ?? null;
    selectedAddressId.value = preferred?.id ?? null;
  } else {
    addressError.value =
      addressResult.reason instanceof Error ? addressResult.reason.message : '地址加载失败';
  }

  if (quoteResult.status === 'fulfilled') {
    quote.value = quoteResult.value;
    selectedCouponId.value = quoteResult.value.selectedUserCouponId;
  } else if (
    isNormalizedApiError(quoteResult.reason) &&
    quoteResult.reason.code === 'CART_EMPTY'
  ) {
    cartEmpty.value = true;
  } else {
    quoteError.value =
      quoteResult.reason instanceof Error ? quoteResult.reason.message : '结算信息加载失败';
  }

  if (couponResult.status === 'fulfilled') {
    unusedCouponCount.value = couponResult.value.filter((item) => item.status === 'UNUSED').length;
  }

  initialLoading.value = false;
}

async function refreshQuote(couponId: number | null): Promise<void> {
  const seq = ++quoteSeq;
  quoteLoading.value = true;
  quoteError.value = '';
  try {
    const result = await checkoutApi.quote({ couponId });
    if (seq !== quoteSeq) return;
    quote.value = result;
    selectedCouponId.value = result.selectedUserCouponId;
  } catch (error) {
    if (seq !== quoteSeq) return;
    if (couponId != null && isNormalizedApiError(error) && error.code === 'COUPON_NOT_APPLICABLE') {
      ElMessage.warning(error.message || '优惠券不适用本单');
      selectedCouponId.value = null;
      try {
        quote.value = await checkoutApi.quote({});
      } catch (fallbackError) {
        quoteError.value =
          fallbackError instanceof Error ? fallbackError.message : '报价加载失败';
      }
    } else {
      quoteError.value = error instanceof Error ? error.message : '报价加载失败';
      ElMessage.error(quoteError.value);
    }
  } finally {
    if (seq === quoteSeq) quoteLoading.value = false;
  }
}

async function applyCoupon(userCouponId: number | null): Promise<void> {
  selectedCouponId.value = userCouponId;
  await refreshQuote(userCouponId);
}

function openAddressDialog(address: Address | null = null): void {
  addressDialogAddress.value = address;
  addressDialogVisible.value = true;
}

async function onAddressSaved(saved: Address): Promise<void> {
  try {
    addresses.value = await addressApi.list();
    selectedAddressId.value = saved.id;
    addressError.value = '';
  } catch (error) {
    addressError.value = error instanceof Error ? error.message : '地址刷新失败';
  }
}

async function submitOrder(): Promise<void> {
  if (submitting.value) return;
  if (!quote.value) {
    ElMessage.warning('结算信息尚未准备好');
    return;
  }
  if (!selectedAddressId.value) {
    ElMessage.warning('请先选择收货地址');
    openAddressDialog();
    return;
  }

  submitting.value = true;
  try {
    const order = await orderApi.create({
      addressId: selectedAddressId.value,
      couponId: selectedCouponId.value,
      clientRequestId: clientRequestId.value,
    });
    try {
      sessionStorage.removeItem(CLIENT_REQUEST_KEY);
    } catch {
      // 忽略存储异常。
    }
    await cart.fetch();
    ElMessage.success('订单提交成功，请尽快完成支付');
    await router.push({ path: `/orders/${order.id}`, query: { created: '1' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : '订单提交失败';
    ElMessage.error(message);
    if (
      isNormalizedApiError(error) &&
      ['INSUFFICIENT_STOCK', 'PRODUCT_NOT_ON_SALE', 'CART_EMPTY'].includes(error.code)
    ) {
      await cart.fetch();
      await refreshQuote(selectedCouponId.value);
    } else if (isNormalizedApiError(error) && error.code === 'COUPON_NOT_APPLICABLE') {
      selectedCouponId.value = null;
      await refreshQuote(null);
    }
    // 提交失败时保留 clientRequestId，重试仍使用同一个 UUID。
  } finally {
    submitting.value = false;
  }
}

onMounted(loadInitial);
</script>

<template>
  <div class="container page-shell fade-page mobile-action-page">
    <PageHeader
      title="确认订单"
      description="核对收货信息与商品，使用优惠券后提交订单。"
      kicker="CHECKOUT"
    >
      <template #actions>
        <el-button text @click="router.push('/cart')">返回购物车</el-button>
      </template>
    </PageHeader>

    <div v-if="initialLoading" class="checkout-skeleton">
      <div class="surface-card skeleton-panel tall"></div>
      <div class="surface-card skeleton-panel short"></div>
    </div>

    <div v-else-if="cartEmpty" class="surface-card">
      <EmptyState
        title="购物车为空，暂时无法结算"
        description="先将心仪好物加入购物车，再回来完成订单吧。"
      >
        <template #icon>
          <el-icon :size="32"><ShoppingBag /></el-icon>
        </template>
        <template #action>
          <el-button type="primary" round @click="router.push('/products')">去挑选商品</el-button>
        </template>
      </EmptyState>
    </div>

    <div v-else-if="quoteError && !quote" class="surface-card">
      <EmptyState title="结算信息加载失败" :description="quoteError">
        <template #action>
          <el-button round @click="loadInitial">重新加载</el-button>
        </template>
      </EmptyState>
    </div>

    <div v-else class="checkout-layout">
      <div class="checkout-main">
        <section class="checkout-section surface-card">
          <div class="section-head">
            <div class="section-title">
              <span class="section-icon"><el-icon><Location /></el-icon></span>
              <div>
                <h2>收货地址</h2>
                <p>请选择本次订单的收货地址</p>
              </div>
            </div>
            <el-button text type="primary" :icon="Plus" @click="openAddressDialog()">
              新增地址
            </el-button>
          </div>

          <div v-if="addressError" class="error-band address-error">
            <span>{{ addressError }}</span>
            <el-button size="small" plain @click="loadInitial">重试</el-button>
          </div>

          <div v-if="addresses.length" class="address-grid">
            <div
              v-for="address in addresses"
              :key="address.id"
              :class="['address-card', { active: selectedAddressId === address.id }]"
              role="button"
              tabindex="0"
              @click="selectedAddressId = address.id"
              @keydown.enter="selectedAddressId = address.id"
            >
              <div class="address-top">
                <span class="address-radio">
                  <i v-if="selectedAddressId === address.id"></i>
                </span>
                <strong>{{ address.recipient }}</strong>
                <span class="address-phone">{{ address.phone }}</span>
                <el-tag v-if="address.isDefault" size="small" type="warning" effect="plain">
                  默认
                </el-tag>
                <button
                  type="button"
                  class="edit-address"
                  aria-label="编辑地址"
                  @click.stop="openAddressDialog(address)"
                >
                  <el-icon><Edit /></el-icon>
                </button>
              </div>
              <p class="address-text">
                {{ address.province }}{{ address.city }}{{ address.district }}{{
                  address.detail
                }}
              </p>
            </div>
          </div>

          <div v-else class="address-empty">
            <span>还没有收货地址，添加一个再继续结算。</span>
            <el-button size="small" type="primary" plain @click="openAddressDialog()">
              添加地址
            </el-button>
          </div>
        </section>

        <section class="checkout-section surface-card">
          <div class="section-head">
            <div class="section-title">
              <span class="section-icon"><el-icon><Ticket /></el-icon></span>
              <div>
                <h2>优惠券</h2>
                <p>已领取 {{ unusedCouponCount }} 张可用优惠券</p>
              </div>
            </div>
          </div>

          <button
            type="button"
            class="coupon-trigger"
            :class="{ selected: quote?.selectedUserCouponId != null }"
            :disabled="quoteLoading || !quote"
            @click="couponDialogVisible = true"
          >
            <span class="coupon-trigger-copy">
              <strong>{{ quote?.selectedCouponName || '选择优惠券' }}</strong>
              <small v-if="quote?.discountCents">
                已优惠 {{ formatCents(quote.discountCents) }}
              </small>
              <small v-else>
                {{
                  quote?.availableCoupons.filter((coupon) => coupon.applicable).length
                    ? `${quote.availableCoupons.filter((coupon) => coupon.applicable).length} 张可用于本单`
                    : '暂无可用优惠券'
                }}
              </small>
            </span>
            <span class="coupon-trigger-action">
              {{ quote?.selectedUserCouponId != null ? '更换' : '去选择' }}
              <el-icon><ArrowRight /></el-icon>
            </span>
          </button>
        </section>

        <section class="checkout-section surface-card">
          <div class="section-head">
            <div class="section-title">
              <span class="section-icon"><el-icon><ShoppingBag /></el-icon></span>
              <div>
                <h2>商品清单</h2>
                <p>共 {{ itemCount }} 件商品 · 由拾光集市发货</p>
              </div>
            </div>
          </div>

          <div v-if="quoteError" class="error-band">
            <span>{{ quoteError }}</span>
            <el-button size="small" plain @click="refreshQuote(selectedCouponId)">
              重新报价
            </el-button>
          </div>

          <div v-loading="quoteLoading" class="checkout-items">
            <article v-for="item in quote?.items" :key="item.productId" class="checkout-item">
              <RouterLink :to="`/products/${item.productId}`" class="item-image">
                <img :src="item.imageUrl || ''" :alt="item.title" @error="fallbackImage" />
              </RouterLink>
              <div class="item-copy">
                <RouterLink :to="`/products/${item.productId}`" class="item-title">
                  {{ item.title }}
                </RouterLink>
                <span class="item-price">
                  {{ formatCents(item.unitPriceCents) }} × {{ item.quantity }}
                </span>
              </div>
              <strong class="item-subtotal price">{{ formatCents(item.subtotalCents) }}</strong>
            </article>
            <EmptyState
              v-if="quote && !quote.items.length"
              compact
              title="没有可结算的商品"
              description="购物车可能已发生变化，请返回购物车确认。"
            />
          </div>

          <div class="delivery-note">
            <el-icon><Van /></el-icon>
            <span>发货后可在订单详情中查看承运商与物流单号。</span>
          </div>
        </section>
      </div>

      <aside class="checkout-aside">
        <div class="summary-sticky" v-loading="quoteLoading">
          <OrderSummaryCard
            :item-total-cents="quote?.itemTotalCents ?? 0"
            :discount-cents="quote?.discountCents ?? 0"
            :payable-cents="quote?.payableCents ?? 0"
            :coupon-name="quote?.selectedCouponName"
            submit-text="提交订单"
            :submit-disabled="!canSubmit"
            :loading="submitting"
            @submit="submitOrder"
          />
          <div class="assurance-card">
            <div><el-icon><Lock /></el-icon>服务端重算金额与库存</div>
            <div><el-icon><Van /></el-icon>订单全程状态可追踪</div>
          </div>
        </div>
      </aside>
    </div>

    <MobileActionBar v-if="quote && !initialLoading" aria-label="提交订单">
      <template #info>
        <span>应付</span>
        <strong class="price">{{ formatCents(quote.payableCents) }}</strong>
      </template>
      <el-button type="primary" :disabled="!canSubmit" :loading="submitting" @click="submitOrder">
        提交订单
      </el-button>
    </MobileActionBar>

    <AddressFormDialog
      v-model="addressDialogVisible"
      :address="addressDialogAddress"
      @saved="onAddressSaved"
    />
    <CouponPickerDialog
      v-model="couponDialogVisible"
      :quote="quote"
      :selected-id="selectedCouponId"
      :loading="quoteLoading"
      @select="applyCoupon"
    />
  </div>
</template>

<style scoped>
.checkout-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 350px;
  align-items: start;
  gap: 22px;
}

.checkout-main {
  display: grid;
  min-width: 0;
  gap: 16px;
}

.checkout-section {
  padding: 22px;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 11px;
}

.section-icon {
  display: grid;
  flex: 0 0 auto;
  width: 37px;
  height: 37px;
  color: var(--brand-strong);
  background: var(--brand-soft);
  border-radius: 10px;
  place-items: center;
}

.section-title h2 {
  font-size: 16px;
  font-weight: 700;
}

.section-title p {
  margin-top: 2px;
  color: var(--muted);
  font-size: 10.5px;
}

.address-error {
  margin-bottom: 14px;
}

.address-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.address-card {
  position: relative;
  padding: 14px 15px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.18s ease;
}

.address-card:hover {
  border-color: #edc5b2;
}

.address-card.active {
  background: var(--brand-wash);
  border-color: var(--brand);
  box-shadow: 0 0 0 2px rgba(232, 93, 42, 0.07);
}

.address-top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 7px;
  padding-right: 24px;
}

.address-radio {
  display: grid;
  flex: 0 0 auto;
  width: 15px;
  height: 15px;
  border: 1px solid #cfc5b9;
  border-radius: 50%;
  place-items: center;
}

.address-card.active .address-radio {
  border-color: var(--brand);
}

.address-radio i {
  width: 7px;
  height: 7px;
  background: var(--brand);
  border-radius: 50%;
}

.address-top strong {
  font-size: 12.5px;
  font-weight: 600;
}

.address-phone {
  color: var(--muted);
  font-size: 10.5px;
}

.edit-address {
  position: absolute;
  top: 11px;
  right: 10px;
  display: grid;
  width: 25px;
  height: 25px;
  padding: 0;
  color: var(--muted);
  background: transparent;
  border: 0;
  border-radius: 50%;
  cursor: pointer;
  place-items: center;
}

.edit-address:hover {
  color: var(--brand);
  background: #fff;
}

.address-text {
  margin-top: 8px;
  color: var(--ink-soft);
  font-size: 11.5px;
  line-height: 1.65;
  word-break: break-word;
}

.address-empty {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 17px;
  color: var(--muted);
  background: #faf7f2;
  border: 1px dashed var(--line-strong);
  border-radius: 9px;
  font-size: 11.5px;
}

.coupon-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 16px;
  padding: 14px 16px;
  text-align: left;
  background:
    linear-gradient(100deg, rgba(232, 93, 42, 0.045), transparent 55%),
    #fdfbf8;
  border: 1px dashed #e7c8b7;
  border-radius: 10px;
  cursor: pointer;
  transition: border-color 0.18s ease;
}

.coupon-trigger:hover:not(:disabled) {
  border-color: var(--brand);
}

.coupon-trigger:disabled {
  cursor: wait;
  opacity: 0.65;
}

.coupon-trigger-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
}

.coupon-trigger-copy strong {
  overflow: hidden;
  color: var(--ink);
  font-size: 12.5px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.coupon-trigger-copy small {
  color: var(--muted);
  font-size: 10px;
}

.coupon-trigger.selected .coupon-trigger-copy strong {
  color: var(--brand-strong);
}

.coupon-trigger-action {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 3px;
  color: var(--brand);
  font-size: 10.5px;
  font-weight: 600;
}

.checkout-items {
  display: grid;
}

.checkout-item {
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 13px 0;
  border-bottom: 1px solid var(--line);
}

.checkout-item:first-child {
  padding-top: 0;
}

.checkout-item:last-child {
  border-bottom: 0;
}

.item-image {
  display: block;
  flex: 0 0 auto;
  overflow: hidden;
  width: 60px;
  height: 60px;
  background: #f4f0ea;
  border-radius: 8px;
}

.item-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.item-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 4px;
}

.item-title {
  overflow: hidden;
  font-size: 12.5px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-title:hover {
  color: var(--brand);
}

.item-price {
  color: var(--muted);
  font-size: 10.5px;
}

.item-subtotal {
  flex-shrink: 0;
  font-size: 14px;
}

.delivery-note {
  display: flex;
  align-items: center;
  gap: 7px;
  padding-top: 15px;
  margin-top: 8px;
  color: var(--muted);
  border-top: 1px dashed var(--line);
  font-size: 10px;
}

.checkout-aside {
  min-width: 0;
}

.summary-sticky {
  position: sticky;
  top: 104px;
}

.assurance-card {
  display: grid;
  gap: 8px;
  padding: 16px 20px;
  margin-top: 12px;
  color: var(--muted);
  background: rgba(255, 255, 255, 0.4);
  border: 1px solid var(--line);
  border-radius: 11px;
  font-size: 10px;
}

.assurance-card div {
  display: flex;
  align-items: center;
  gap: 7px;
}

.assurance-card .el-icon {
  color: #a59686;
}

.checkout-skeleton {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 350px;
  gap: 22px;
}

.skeleton-panel {
  height: 500px;
  background: linear-gradient(100deg, #f1ede7 30%, #f8f5f0 50%, #f1ede7 70%);
  background-size: 220% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-panel.short {
  height: 320px;
}

@media (max-width: 960px) {
  .checkout-layout,
  .checkout-skeleton {
    grid-template-columns: 1fr;
  }

  .summary-sticky {
    position: static;
  }
}

@media (max-width: 680px) {
  .checkout-section {
    padding: 16px;
  }

  .address-grid {
    grid-template-columns: 1fr;
  }

  .section-head {
    align-items: flex-start;
  }

  .section-title p {
    display: none;
  }

  .address-empty {
    align-items: flex-start;
    flex-direction: column;
  }

  .checkout-skeleton .skeleton-panel {
    height: 280px;
  }
}

@media (max-width: 400px) {
  .checkout-item {
    align-items: flex-start;
  }

  .item-image {
    width: 50px;
    height: 50px;
  }

  .item-subtotal {
    font-size: 12px;
  }

  .coupon-trigger-action {
    font-size: 10px;
  }
}
</style>
