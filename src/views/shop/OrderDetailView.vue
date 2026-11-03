<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Clock,
  CopyDocument,
  Location,
  Refresh,
  Ticket,
  Van,
  Wallet,
} from '@element-plus/icons-vue';
import { orderApi } from '@/api/orders';
import { isNormalizedApiError } from '@/api/http';
import { useCartStore } from '@/stores/cart';
import type { Order, OrderItem, OrderStatus } from '@/types/api';
import { formatCents } from '@/utils/money';
import {
  formatDateTime,
  fallbackImage,
  ORDER_STATUS_META,
  PAYMENT_STATUS_META,
  REFUND_STATUS_META,
} from '@/utils/format';
import PageHeader from '@/components/PageHeader.vue';
import EmptyState from '@/components/EmptyState.vue';
import TrackingTimeline from '@/components/TrackingTimeline.vue';
import PaymentDialog from '@/components/PaymentDialog.vue';
import RefundDialog from '@/components/RefundDialog.vue';
import ReviewDialog from '@/components/ReviewDialog.vue';
import MobileActionBar from '@/components/MobileActionBar.vue';

const route = useRoute();
const router = useRouter();
const cart = useCartStore();

const order = ref<Order | null>(null);
const loading = ref(true);
const error = ref('');
const notFound = ref(false);
const operation = ref<string | null>(null);
const paymentVisible = ref(false);
const refundVisible = ref(false);
const reviewVisible = ref(false);
const reviewItem = ref<OrderItem | null>(null);
const reviewedProductIds = ref<Set<number>>(new Set());
const now = ref(Date.now());
let clockTimer: number | null = null;

const orderId = computed(() => Number(route.params.id));

const statusMeta = computed(() =>
  order.value ? ORDER_STATUS_META[order.value.status] : ORDER_STATUS_META.PENDING_PAYMENT,
);

const statusDescription = computed(() => {
  const status: OrderStatus | undefined = order.value?.status;
  const descriptions: Record<OrderStatus, string> = {
    PENDING_PAYMENT: '请在支付截止时间前完成支付，超时订单将自动取消。',
    PAID: '支付已完成，商家正在准备你的商品。',
    SHIPPED: '商品已发出，收到后请及时确认收货。',
    COMPLETED: '这笔订单已完成，感谢你选择拾光集市。',
    CANCELLED: '订单已取消，相关库存与优惠券已释放。',
    REFUNDING: '退款申请正在审核中，请留意处理结果。',
    REFUNDED: '退款已完成，款项将按原支付渠道退回。',
  };
  return status ? descriptions[status] : '';
});

const showCountdown = computed(
  () =>
    order.value?.status === 'PENDING_PAYMENT' &&
    Boolean(order.value?.payDeadline) &&
    remainingSeconds.value > 0,
);

const remainingSeconds = computed(() => {
  if (!order.value?.payDeadline) return 0;
  const deadline = new Date(order.value.payDeadline).getTime();
  if (Number.isNaN(deadline)) return 0;
  return Math.max(0, Math.floor((deadline - now.value) / 1000));
});

const countdownText = computed(() => {
  const seconds = remainingSeconds.value;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return [hours, minutes, secs].map((value) => String(value).padStart(2, '0')).join(':');
});

const canReviewItem = computed(() => Boolean(order.value?.actions.canReview));
const showCreatedTip = computed(
  () => route.query.created === '1' && order.value?.status === 'PENDING_PAYMENT',
);

const channelLabel = computed(() => {
  if (!order.value?.payment) return '—';
  return order.value.payment.channel === 'ALIPAY' ? '支付宝' : '模拟支付';
});

async function loadOrder(silent = false): Promise<void> {
  if (!silent) loading.value = true;
  error.value = '';
  notFound.value = false;
  try {
    order.value = await orderApi.detail(orderId.value);
  } catch (loadError) {
    if (
      isNormalizedApiError(loadError) &&
      (loadError.code === 'ORDER_NOT_FOUND' || loadError.code === 'NOT_FOUND')
    ) {
      notFound.value = true;
    } else {
      error.value = loadError instanceof Error ? loadError.message : '订单加载失败';
    }
  } finally {
    loading.value = false;
  }
}

async function afterOrderChanged(message?: string): Promise<void> {
  if (message) ElMessage.success(message);
  await loadOrder(true);
  await cart.fetch();
}

async function cancelOrder(): Promise<void> {
  if (!order.value) return;
  try {
    await ElMessageBox.confirm(
      '取消后订单将关闭，库存与优惠券会被释放。确定取消订单吗？',
      '取消订单',
      {
        confirmButtonText: '确认取消',
        cancelButtonText: '暂不取消',
        type: 'warning',
      },
    );
  } catch {
    return;
  }
  operation.value = 'cancel';
  try {
    await orderApi.cancel(order.value.id);
    await afterOrderChanged('订单已取消');
  } catch (actionError) {
    ElMessage.error(actionError instanceof Error ? actionError.message : '取消订单失败');
  } finally {
    operation.value = null;
  }
}

async function confirmReceipt(): Promise<void> {
  if (!order.value) return;
  try {
    await ElMessageBox.confirm('请确认已经收到商品，确认后订单将完成。', '确认收货', {
      confirmButtonText: '确认收货',
      cancelButtonText: '再等等',
      type: 'info',
    });
  } catch {
    return;
  }
  operation.value = 'confirm';
  try {
    await orderApi.confirm(order.value.id);
    await afterOrderChanged('已确认收货，订单完成');
  } catch (actionError) {
    ElMessage.error(actionError instanceof Error ? actionError.message : '确认收货失败');
  } finally {
    operation.value = null;
  }
}

function openReview(item: OrderItem): void {
  reviewItem.value = item;
  reviewVisible.value = true;
}

async function onReviewSubmitted(productId: number): Promise<void> {
  reviewedProductIds.value = new Set([...reviewedProductIds.value, productId]);
  await loadOrder(true);
}

async function onPaid(): Promise<void> {
  // PaymentDialog 已展示成功提示，这里仅刷新订单与购物车。
  await afterOrderChanged();
}

async function copyTrackingNo(): Promise<void> {
  const trackingNo = order.value?.shipment?.trackingNo;
  if (!trackingNo) return;
  try {
    await navigator.clipboard.writeText(trackingNo);
    ElMessage.success('运单号已复制');
  } catch {
    ElMessage.warning('复制失败，请手动选择运单号');
  }
}

onMounted(async () => {
  await loadOrder();
  clockTimer = window.setInterval(() => {
    now.value = Date.now();
  }, 1000);
});

onUnmounted(() => {
  if (clockTimer != null) window.clearInterval(clockTimer);
});
</script>

<template>
  <div class="container page-shell fade-page mobile-action-page">
    <PageHeader title="订单详情" description="查看订单进度、收货信息与售后操作。" kicker="ORDER DETAIL">
      <template #actions>
        <el-button text :icon="Refresh" @click="loadOrder(false)">刷新</el-button>
        <el-button text @click="router.push('/orders')">返回订单列表</el-button>
      </template>
    </PageHeader>

    <div v-if="loading" class="order-detail-skeleton">
      <div class="skeleton-hero"></div>
      <div class="skeleton-grid">
        <div class="skeleton-main"></div>
        <div class="skeleton-side"></div>
      </div>
    </div>

    <div v-else-if="notFound" class="surface-card">
      <EmptyState title="订单不存在" description="该订单可能不存在，或不属于当前账号。">
        <template #action>
          <el-button type="primary" round @click="router.push('/orders')">返回订单列表</el-button>
        </template>
      </EmptyState>
    </div>

    <div v-else-if="error" class="surface-card">
      <EmptyState title="订单加载失败" :description="error">
        <template #action>
          <el-button round @click="loadOrder(false)">重新加载</el-button>
        </template>
      </EmptyState>
    </div>

    <template v-else-if="order">
      <div v-if="showCreatedTip" class="created-alert">
        <span>订单已提交成功，请尽快完成支付。</span>
        <el-button type="primary" size="small" @click="paymentVisible = true">去支付</el-button>
      </div>

      <section class="status-hero">
        <div class="status-copy">
          <span class="status-kicker">ORDER STATUS</span>
          <div class="status-title-row">
            <h1>{{ statusMeta.label }}</h1>
          </div>
          <p>{{ statusDescription }}</p>
          <div v-if="order.status === 'PENDING_PAYMENT' && order.payDeadline" class="deadline-row">
            <el-icon><Clock /></el-icon>
            <template v-if="showCountdown">
              剩余支付时间 <strong>{{ countdownText }}</strong>
            </template>
            <template v-else>支付时间已截止，订单可能即将取消</template>
          </div>
        </div>

        <div class="status-actions">
          <el-button
            v-if="order.actions.canPay"
            type="primary"
            size="large"
            @click="paymentVisible = true"
          >
            立即支付
          </el-button>
          <el-button
            v-if="order.actions.canConfirm"
            type="primary"
            size="large"
            :loading="operation === 'confirm'"
            @click="confirmReceipt"
          >
            确认收货
          </el-button>
          <el-button v-if="order.actions.canCancel" size="large" @click="cancelOrder">
            取消订单
          </el-button>
          <el-button
            v-if="order.actions.canRefund"
            size="large"
            plain
            type="danger"
            @click="refundVisible = true"
          >
            申请退款
          </el-button>
        </div>
      </section>

      <div class="order-detail-layout">
        <div class="order-main">
          <section class="detail-panel surface-card">
            <div class="panel-title">
              <h2>订单进度</h2>
              <span class="panel-caption">{{ formatDateTime(order.createdAt) }} 创建</span>
            </div>
            <TrackingTimeline :order="order" />
          </section>

          <section class="detail-panel surface-card">
            <div class="panel-title">
              <h2>商品清单</h2>
              <span class="panel-caption">共 {{ order.items.length }} 种商品</span>
            </div>
            <article v-for="item in order.items" :key="item.productId" class="order-item">
              <RouterLink :to="`/products/${item.productId}`" class="order-item-image">
                <img :src="item.imageUrl || ''" :alt="item.productName" @error="fallbackImage" />
              </RouterLink>
              <div class="order-item-copy">
                <RouterLink :to="`/products/${item.productId}`" class="order-item-title">
                  {{ item.productName }}
                </RouterLink>
                <span>{{ formatCents(item.unitPriceCents) }} × {{ item.quantity }}</span>
              </div>
              <div class="order-item-actions">
                <strong class="price">{{ formatCents(item.subtotalCents) }}</strong>
                <el-button
                  v-if="canReviewItem && !reviewedProductIds.has(item.productId)"
                  size="small"
                  plain
                  @click="openReview(item)"
                >
                  评价商品
                </el-button>
                <span
                  v-else-if="reviewedProductIds.has(item.productId)"
                  class="reviewed-label"
                >
                  已评价
                </span>
              </div>
            </article>
          </section>

          <section v-if="order.refund" class="detail-panel surface-card refund-panel">
            <div class="panel-title">
              <h2>退款信息</h2>
              <el-tag
                :type="REFUND_STATUS_META[order.refund.status].type"
                size="small"
                effect="plain"
              >
                {{ REFUND_STATUS_META[order.refund.status].label }}
              </el-tag>
            </div>
            <div class="refund-grid">
              <div>
                <span>退款金额</span>
                <strong class="price">{{ formatCents(order.refund.amountCents) }}</strong>
              </div>
              <div>
                <span>申请时间</span>
                <strong>{{ formatDateTime(order.refund.createdAt) }}</strong>
              </div>
              <div class="full">
                <span>退款原因</span>
                <strong>{{ order.refund.reason }}</strong>
              </div>
              <div v-if="order.refund.adminComment" class="full">
                <span>商家备注</span>
                <strong>{{ order.refund.adminComment }}</strong>
              </div>
              <div>
                <span>审核时间</span>
                <strong>{{ formatDateTime(order.refund.reviewedAt) }}</strong>
              </div>
            </div>
          </section>
        </div>

        <aside class="order-side">
          <section class="side-panel surface-card">
            <div class="side-title">
              <el-icon><Location /></el-icon>
              <h2>收货信息</h2>
            </div>
            <div class="address-detail">
              <strong>
                {{ order.shippingAddress.recipient }}
                <span>{{ order.shippingAddress.phone }}</span>
              </strong>
              <p>
                {{ order.shippingAddress.province }}{{ order.shippingAddress.city
                }}{{ order.shippingAddress.district }}{{ order.shippingAddress.detail }}
              </p>
            </div>
          </section>

          <section class="side-panel surface-card">
            <div class="side-title">
              <el-icon><Wallet /></el-icon>
              <h2>金额明细</h2>
            </div>
            <div class="money-row">
              <span>商品总额</span>
              <strong>{{ formatCents(order.itemTotalCents) }}</strong>
            </div>
            <div class="money-row">
              <span>优惠券</span>
              <span v-if="order.discountCents > 0" class="discount">
                {{ order.coupon?.name || '优惠' }} −{{ formatCents(order.discountCents) }}
              </span>
              <span v-else class="text-muted">未使用</span>
            </div>
            <div class="money-row total">
              <span>应付金额</span>
              <span class="price">{{ formatCents(order.payableCents) }}</span>
            </div>
          </section>

          <section v-if="order.shipment" class="side-panel surface-card">
            <div class="side-title">
              <el-icon><Van /></el-icon>
              <h2>物流信息</h2>
            </div>
            <div class="info-line">
              <span>承运商</span>
              <strong>{{ order.shipment.carrier }}</strong>
            </div>
            <div class="info-line">
              <span>运单号</span>
              <button type="button" class="tracking-copy" @click="copyTrackingNo">
                {{ order.shipment.trackingNo }}
                <el-icon><CopyDocument /></el-icon>
              </button>
            </div>
            <div class="info-line">
              <span>发货时间</span>
              <strong>{{ formatDateTime(order.shipment.shippedAt) }}</strong>
            </div>
          </section>

          <section v-if="order.payment" class="side-panel surface-card">
            <div class="side-title">
              <el-icon><Ticket /></el-icon>
              <h2>支付信息</h2>
            </div>
            <div class="info-line">
              <span>支付方式</span>
              <strong>{{ channelLabel }}</strong>
            </div>
            <div class="info-line">
              <span>支付状态</span>
              <el-tag
                :type="PAYMENT_STATUS_META[order.payment.status].type"
                size="small"
                effect="plain"
              >
                {{ PAYMENT_STATUS_META[order.payment.status].label }}
              </el-tag>
            </div>
            <div class="info-line">
              <span>支付时间</span>
              <strong>{{ formatDateTime(order.payment.paidAt) }}</strong>
            </div>
          </section>

          <section class="side-panel surface-card order-info-panel">
            <div class="side-title">
              <el-icon><Clock /></el-icon>
              <h2>订单信息</h2>
            </div>
            <div class="info-line">
              <span>订单号</span>
              <strong class="order-no-value">{{ order.orderNo }}</strong>
            </div>
            <div class="info-line">
              <span>创建时间</span>
              <strong>{{ formatDateTime(order.createdAt) }}</strong>
            </div>
            <div v-if="order.cancelledAt" class="info-line">
              <span>取消时间</span>
              <strong>{{ formatDateTime(order.cancelledAt) }}</strong>
            </div>
            <div v-if="order.refundedAt" class="info-line">
              <span>退款时间</span>
              <strong>{{ formatDateTime(order.refundedAt) }}</strong>
            </div>
          </section>
        </aside>
      </div>

      <MobileActionBar aria-label="订单操作">
        <template #info>
          <span>{{ statusMeta.label }}</span>
          <strong class="price">{{ formatCents(order.payableCents) }}</strong>
        </template>
        <el-button
          v-if="order.actions.canPay"
          type="primary"
          @click="paymentVisible = true"
        >
          立即支付
        </el-button>
        <el-button
          v-if="order.actions.canConfirm"
          type="primary"
          :loading="operation === 'confirm'"
          @click="confirmReceipt"
        >
          确认收货
        </el-button>
        <el-button v-if="order.actions.canCancel" @click="cancelOrder">取消订单</el-button>
        <el-button
          v-if="order.actions.canRefund"
          type="danger"
          plain
          @click="refundVisible = true"
        >
          申请退款
        </el-button>
      </MobileActionBar>

      <PaymentDialog v-model="paymentVisible" :order="order" @paid="onPaid" />
      <RefundDialog v-model="refundVisible" :order="order" @refunded="loadOrder(true)" />
      <ReviewDialog
        v-model="reviewVisible"
        :order="order"
        :item="reviewItem"
        @submitted="onReviewSubmitted"
      />
    </template>
  </div>
</template>

<style scoped>
.created-alert {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 16px;
  margin-bottom: 16px;
  color: #7c5417;
  background: #fff7e8;
  border: 1px solid #f1dfba;
  border-radius: 9px;
  font-size: 12px;
}

.status-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 28px;
  padding: 28px 30px;
  margin-bottom: 18px;
  color: #fff;
  background:
    radial-gradient(circle at 88% 15%, rgba(232, 93, 42, 0.24), transparent 34%),
    linear-gradient(130deg, var(--navy), #223149);
  border-radius: var(--radius-lg);
}

.status-copy {
  min-width: 0;
}

.status-kicker {
  color: rgba(240, 178, 142, 0.75);
  font-size: 8.5px;
  font-weight: 700;
  letter-spacing: 0.24em;
}

.status-title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-top: 6px;
}

.status-title-row h1 {
  font-family: var(--font-display);
  font-size: clamp(28px, 3.5vw, 40px);
  font-weight: 500;
  line-height: 1.2;
}

.status-copy > p {
  margin-top: 8px;
  color: rgba(255, 255, 255, 0.52);
  font-size: 12px;
}

.deadline-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 11px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 10.5px;
}

.deadline-row strong {
  color: #f3c7ab;
  font-family: 'DIN Alternate', monospace;
  font-size: 14px;
  letter-spacing: 0.05em;
}

.status-actions {
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 9px;
}

.status-actions .el-button {
  margin: 0;
  border-radius: 8px;
}

.status-actions .el-button--primary {
  color: var(--ink);
  background: #f4e7d8;
  border-color: #f4e7d8;
}

.status-actions .el-button--primary:hover {
  color: #fff;
  background: var(--brand);
  border-color: var(--brand);
}

.order-detail-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 330px;
  align-items: start;
  gap: 18px;
}

.order-main,
.order-side {
  display: grid;
  gap: 14px;
}

.detail-panel {
  padding: 22px;
}

.panel-caption {
  color: var(--muted);
  font-size: 9.5px;
}

.order-item {
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 14px 0;
  border-bottom: 1px solid var(--line);
}

.order-item:first-of-type {
  padding-top: 0;
}

.order-item:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}

.order-item-image {
  display: block;
  flex: 0 0 auto;
  overflow: hidden;
  width: 64px;
  height: 64px;
  background: #f4f0ea;
  border-radius: 8px;
}

.order-item-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.order-item-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 4px;
}

.order-item-title {
  overflow: hidden;
  font-size: 12.5px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.order-item-title:hover {
  color: var(--brand);
}

.order-item-copy span {
  color: var(--muted);
  font-size: 10.5px;
}

.order-item-actions {
  display: flex;
  flex-shrink: 0;
  align-items: flex-end;
  flex-direction: column;
  gap: 7px;
}

.order-item-actions .price {
  font-size: 14px;
}

.reviewed-label {
  color: var(--muted);
  font-size: 9.5px;
}

.refund-panel {
  border-left: 3px solid #e7b46c;
}

.refund-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.refund-grid > div {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.refund-grid > div.full {
  grid-column: 1 / -1;
}

.refund-grid span {
  color: var(--muted);
  font-size: 9.5px;
}

.refund-grid strong {
  color: var(--ink-soft);
  font-size: 11.5px;
  font-weight: 500;
  line-height: 1.65;
}

.side-panel {
  padding: 18px;
}

.side-title {
  display: flex;
  align-items: center;
  gap: 7px;
  padding-bottom: 12px;
  margin-bottom: 12px;
  border-bottom: 1px solid var(--line);
}

.side-title .el-icon {
  color: var(--brand);
  font-size: 15px;
}

.side-title h2 {
  font-size: 13px;
  font-weight: 700;
}

.address-detail strong {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
}

.address-detail strong span {
  color: var(--muted);
  font-weight: 400;
}

.address-detail p {
  margin-top: 7px;
  color: var(--ink-soft);
  font-size: 11px;
  line-height: 1.7;
}

.info-line {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 5px 0;
}

.info-line > span {
  flex-shrink: 0;
  color: var(--muted);
  font-size: 9.5px;
}

.info-line > strong {
  color: var(--ink-soft);
  font-size: 10.5px;
  font-weight: 500;
  text-align: right;
  word-break: break-all;
}

.order-no-value {
  font-family: 'SFMono-Regular', Consolas, monospace;
  font-size: 9.5px !important;
}

.tracking-copy {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  color: var(--brand);
  background: transparent;
  border: 0;
  cursor: pointer;
  font-family: 'SFMono-Regular', Consolas, monospace;
  font-size: 10px;
}

.tracking-copy:hover {
  text-decoration: underline;
}

.order-info-panel {
  background: #fbf9f5;
}

.order-detail-skeleton {
  display: grid;
  gap: 18px;
}

.skeleton-hero {
  height: 170px;
  border-radius: var(--radius-lg);
  background: linear-gradient(100deg, #e9e4dc 30%, #f5f1eb 50%, #e9e4dc 70%);
  background-size: 220% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 330px;
  gap: 18px;
}

.skeleton-main,
.skeleton-side {
  height: 420px;
  border-radius: var(--radius);
  background: linear-gradient(100deg, #f1ede7 30%, #f8f5f0 50%, #f1ede7 70%);
  background-size: 220% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-side {
  height: 300px;
}

@media (max-width: 960px) {
  .order-detail-layout,
  .skeleton-grid {
    grid-template-columns: 1fr;
  }

  .order-side {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .status-hero {
    align-items: flex-start;
    flex-direction: column;
    gap: 20px;
  }

  .status-actions {
    justify-content: flex-start;
  }
}

@media (max-width: 768px) {
  .status-hero {
    padding: 22px 20px;
    margin-bottom: 14px;
  }

  .status-actions {
    display: none;
  }

  .detail-panel {
    padding: 17px;
  }

  .order-side {
    grid-template-columns: 1fr;
  }

  .order-item {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .order-item-image {
    width: 55px;
    height: 55px;
  }

  .order-item-actions {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding-left: 68px;
  }

  .refund-grid {
    grid-template-columns: 1fr;
  }

  .refund-grid > div.full {
    grid-column: auto;
  }
}

@media (max-width: 420px) {
  .created-alert {
    align-items: flex-start;
    flex-direction: column;
    gap: 8px;
  }

  .status-title-row h1 {
    font-size: 29px;
  }
}
</style>
