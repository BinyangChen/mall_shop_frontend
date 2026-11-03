<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Delete, ShoppingBag, ShoppingCart } from '@element-plus/icons-vue';
import { useCartStore } from '@/stores/cart';
import type { CartItem } from '@/types/api';
import { formatCents } from '@/utils/money';
import { fallbackImage } from '@/utils/format';
import PageHeader from '@/components/PageHeader.vue';
import EmptyState from '@/components/EmptyState.vue';
import MobileActionBar from '@/components/MobileActionBar.vue';

const router = useRouter();
const cart = useCartStore();
const error = ref('');
const updatingId = ref<number | null>(null);
const initialLoading = ref(true);

const items = computed(() => cart.items);
const hasUnavailable = computed(() => items.value.some((item) => !item.available));
const canCheckout = computed(
  () => items.value.length > 0 && !hasUnavailable.value && !initialLoading.value,
);

async function loadCart(): Promise<void> {
  initialLoading.value = true;
  error.value = '';
  try {
    await cart.fetch(false);
  } catch (loadError) {
    error.value = loadError instanceof Error ? loadError.message : '购物车加载失败';
  } finally {
    initialLoading.value = false;
  }
}

async function changeQuantity(item: CartItem, value: number | undefined): Promise<void> {
  const quantity = Math.max(1, Math.min(99, Number(value) || 1));
  if (quantity === item.quantity) return;
  updatingId.value = item.productId;
  try {
    await cart.updateItem(item.productId, quantity);
    ElMessage.success('数量已更新');
  } catch (updateError) {
    ElMessage.error(updateError instanceof Error ? updateError.message : '数量更新失败');
    await cart.fetch();
  } finally {
    updatingId.value = null;
  }
}

async function removeItem(item: CartItem): Promise<void> {
  try {
    await ElMessageBox.confirm(`确定从购物车移除「${item.title}」吗？`, '移除商品', {
      confirmButtonText: '移除',
      cancelButtonText: '保留',
      type: 'warning',
    });
  } catch {
    return;
  }
  updatingId.value = item.productId;
  try {
    await cart.removeItem(item.productId);
    ElMessage.success('已移除商品');
  } catch (removeError) {
    ElMessage.error(removeError instanceof Error ? removeError.message : '移除失败');
  } finally {
    updatingId.value = null;
  }
}

function handleQuantityChange(item: CartItem, value: unknown): void {
  void changeQuantity(item, typeof value === 'number' ? value : undefined);
}

function checkout(): void {
  if (hasUnavailable.value) {
    ElMessage.warning('请先移除失效商品，再继续结算');
    return;
  }
  if (items.value.length) void router.push('/checkout');
}

onMounted(loadCart);
</script>

<template>
  <div class="container page-shell fade-page mobile-action-page">
    <PageHeader title="购物车" description="确认好每一件心仪好物，然后一起带回家。" kicker="YOUR BAG">
      <template #actions>
        <el-button v-if="items.length" text @click="router.push('/products')">
          继续购物
        </el-button>
      </template>
    </PageHeader>

    <div v-if="error" class="error-band">
      <span>{{ error }}</span>
      <el-button size="small" plain @click="loadCart">重新加载</el-button>
    </div>

    <div v-if="initialLoading" class="cart-layout">
      <div class="surface-card cart-skeletons">
        <div v-for="item in 3" :key="item" class="cart-skeleton-row">
          <div class="skeleton-thumb"></div>
          <div class="skeleton-info">
            <div class="skeleton-line"></div>
            <div class="skeleton-line short"></div>
          </div>
          <div class="skeleton-line tiny"></div>
        </div>
      </div>
    </div>

    <div v-else-if="!items.length && !error" class="surface-card cart-empty">
      <EmptyState
        title="购物车还是空的"
        description="去逛逛吧，说不定会遇见让你心动的那一件。"
      >
        <template #icon>
          <el-icon :size="32"><ShoppingCart /></el-icon>
        </template>
        <template #action>
          <el-button type="primary" round :icon="ShoppingBag" @click="router.push('/products')">
            去逛逛
          </el-button>
        </template>
      </EmptyState>
    </div>

    <div v-else-if="items.length" class="cart-layout">
      <section class="cart-list surface-card">
        <div class="cart-list-head">
          <span>商品信息</span>
          <span>小计</span>
        </div>
        <article v-for="item in items" :key="item.productId" class="cart-row">
          <RouterLink :to="`/products/${item.productId}`" class="cart-image">
            <img :src="item.imageUrl || ''" :alt="item.title" @error="fallbackImage" />
          </RouterLink>

          <div class="cart-info">
            <RouterLink :to="`/products/${item.productId}`" class="cart-title">
              {{ item.title }}
            </RouterLink>
            <span class="unit-price">单价 {{ formatCents(item.unitPriceCents) }}</span>
            <span v-if="!item.available" class="unavailable-tag">
              商品已失效或库存不足，请移除后结算
            </span>
            <span v-else-if="item.stock <= 5" class="low-stock">仅剩 {{ item.stock }} 件</span>
          </div>

          <div class="cart-quantity">
            <el-input-number
              :model-value="item.quantity"
              :min="1"
              :max="Math.max(1, Math.min(99, item.stock))"
              :disabled="!item.available || updatingId === item.productId"
              size="small"
              controls-position="right"
              aria-label="商品数量"
              @change="handleQuantityChange(item, $event)"
            />
          </div>

          <div class="cart-subtotal">
            <span class="subtotal-label">小计</span>
            <strong class="price">{{ formatCents(item.subtotalCents) }}</strong>
          </div>

          <button
            type="button"
            class="remove-button"
            :disabled="updatingId === item.productId"
            :aria-label="`移除 ${item.title}`"
            @click="removeItem(item)"
          >
            <el-icon><Delete /></el-icon>
          </button>
        </article>
      </section>

      <aside class="cart-summary">
        <div class="summary-card surface-card">
          <h2>订单摘要</h2>
          <div class="summary-stats">
            <span>共 {{ cart.count }} 件商品</span>
            <RouterLink to="/products">继续挑选</RouterLink>
          </div>
          <div class="divider"></div>
          <div class="money-row">
            <span>商品合计</span>
            <strong>{{ formatCents(cart.totalCents) }}</strong>
          </div>
          <div class="money-row">
            <span>优惠券</span>
            <span class="text-muted">结算时选择</span>
          </div>
          <div class="money-row total">
            <span>暂计合计</span>
            <span class="price">{{ formatCents(cart.totalCents) }}</span>
          </div>

          <div v-if="hasUnavailable" class="summary-warning">
            购物车中有失效商品，请先移除后继续结算。
          </div>

          <el-button
            type="primary"
            size="large"
            class="checkout-btn"
            :disabled="!canCheckout"
            @click="checkout"
          >
            去结算
          </el-button>
          <p class="summary-foot">最终金额以结算页服务端报价为准</p>
        </div>
      </aside>
    </div>

    <MobileActionBar v-if="!initialLoading && items.length" aria-label="购物车结算">
      <template #info>
        <span>合计</span>
        <strong class="price">{{ formatCents(cart.totalCents) }}</strong>
      </template>
      <el-button type="primary" :disabled="!canCheckout" @click="checkout">去结算</el-button>
    </MobileActionBar>
  </div>
</template>

<style scoped>
.cart-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 330px;
  align-items: start;
  gap: 22px;
}

.cart-list {
  align-self: start;
  padding: 0 22px;
}

.cart-list-head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 116px 120px 32px;
  gap: 18px;
  padding: 16px 0;
  color: var(--muted);
  border-bottom: 1px solid var(--line);
  font-size: 10.5px;
  letter-spacing: 0.04em;
}

.cart-list-head span:nth-child(2) {
  grid-column: 3;
  text-align: right;
}

.cart-row {
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr) 116px 120px 32px;
  align-items: center;
  gap: 18px;
  padding: 20px 0;
  border-bottom: 1px solid var(--line);
}

.cart-row:last-child {
  border-bottom: 0;
}

.cart-image {
  display: block;
  overflow: hidden;
  width: 96px;
  height: 96px;
  background: #f4f0ea;
  border-radius: 10px;
}

.cart-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.35s ease;
}

.cart-image:hover img {
  transform: scale(1.04);
}

.cart-info {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 5px;
}

.cart-title {
  display: -webkit-box;
  overflow: hidden;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.5;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.cart-title:hover {
  color: var(--brand);
}

.unit-price {
  color: var(--muted);
  font-size: 11px;
}

.unavailable-tag {
  align-self: flex-start;
  padding: 2px 7px;
  color: var(--danger);
  background: #fdf0f0;
  border-radius: 4px;
  font-size: 10px;
}

.low-stock {
  align-self: flex-start;
  color: var(--warning);
  font-size: 10px;
}

.cart-quantity {
  display: flex;
  justify-content: center;
}

.cart-quantity :deep(.el-input-number) {
  width: 100px;
}

.cart-subtotal {
  display: flex;
  align-items: flex-end;
  flex-direction: column;
}

.subtotal-label {
  display: none;
  color: var(--muted);
  font-size: 10px;
}

.cart-subtotal .price {
  font-size: 16px;
}

.remove-button {
  display: grid;
  width: 30px;
  height: 30px;
  padding: 0;
  color: var(--muted);
  background: transparent;
  border: 0;
  border-radius: 50%;
  cursor: pointer;
  place-items: center;
  transition: all 0.18s ease;
}

.remove-button:hover {
  color: var(--danger);
  background: #fdf0f0;
}

.cart-summary {
  position: sticky;
  top: 104px;
}

.summary-card {
  padding: 23px;
}

.summary-card h2 {
  font-size: 17px;
  font-weight: 700;
}

.summary-stats {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 6px;
  color: var(--muted);
  font-size: 11px;
}

.summary-stats a {
  color: var(--brand);
  font-weight: 500;
}

.summary-warning {
  padding: 9px 11px;
  margin-top: 14px;
  color: #8d5a13;
  background: #fff7e8;
  border: 1px solid #f4e1bd;
  border-radius: 7px;
  font-size: 10.5px;
  line-height: 1.5;
}

.checkout-btn {
  width: 100%;
  height: 47px;
  margin-top: 20px;
  border-radius: 9px;
}

.summary-foot {
  margin-top: 10px;
  color: var(--muted);
  font-size: 9.5px;
  text-align: center;
}

.cart-empty {
  min-height: 380px;
}

.cart-skeletons {
  padding: 8px 22px;
}

.cart-skeleton-row {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 20px 0;
  border-bottom: 1px solid var(--line);
}

.skeleton-thumb {
  flex: 0 0 auto;
  width: 92px;
  height: 92px;
  border-radius: 10px;
  background: linear-gradient(100deg, #f1ede7 30%, #f8f5f0 50%, #f1ede7 70%);
  background-size: 220% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-info {
  flex: 1;
}

@media (max-width: 960px) {
  .cart-layout {
    grid-template-columns: 1fr;
  }

  .cart-summary {
    position: static;
  }
}

@media (max-width: 768px) {
  .checkout-btn {
    display: none;
  }

  .cart-list {
    padding: 0 15px;
  }

  .cart-list-head {
    display: none;
  }

  .cart-row {
    grid-template-columns: 76px minmax(0, 1fr) 30px;
    align-items: start;
    gap: 12px;
    padding: 16px 0;
  }

  .cart-image {
    width: 76px;
    height: 76px;
  }

  .cart-info {
    grid-column: 2;
    grid-row: 1;
  }

  .cart-quantity {
    justify-content: flex-start;
    grid-column: 2;
    grid-row: 2;
    margin-top: -2px;
  }

  .cart-quantity :deep(.el-input-number) {
    width: 92px;
  }

  .cart-subtotal {
    grid-column: 2 / 4;
    grid-row: 3;
    display: flex;
    align-items: baseline;
    justify-content: flex-end;
    flex-direction: row;
    gap: 7px;
    padding-top: 6px;
    border-top: 1px dashed var(--line);
  }

  .subtotal-label {
    display: inline;
  }

  .cart-subtotal .price {
    font-size: 14px;
  }

  .remove-button {
    grid-column: 3;
    grid-row: 1;
  }

  .summary-card {
    padding: 18px;
  }

  .cart-skeleton-row {
    gap: 12px;
  }

  .skeleton-thumb {
    width: 72px;
    height: 72px;
  }
}

@media (max-width: 420px) {
  .cart-title {
    font-size: 13px;
  }

  .unavailable-tag {
    font-size: 9px;
  }
}
</style>
