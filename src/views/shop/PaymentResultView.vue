<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  CircleCheckFilled,
  CircleCloseFilled,
  Clock,
  Refresh,
  WarningFilled,
} from '@element-plus/icons-vue';
import { orderApi } from '@/api/orders';
import type { Order } from '@/types/api';
import { formatCents } from '@/utils/money';
import { ORDER_STATUS_META } from '@/utils/format';

type ResultState = 'loading' | 'success' | 'pending' | 'failed' | 'error';

const MAX_SECONDS = 30;
const POLL_INTERVAL_MS = 2000;
const MAX_ATTEMPTS = MAX_SECONDS / (POLL_INTERVAL_MS / 1000) + 1;

const route = useRoute();
const router = useRouter();
const order = ref<Order | null>(null);
const state = ref<ResultState>('loading');
const error = ref('');
const attempts = ref(0);
let runToken = 0;
let unmounted = false;

const orderId = computed(() => {
  const raw = Number(route.query.orderId);
  return Number.isInteger(raw) && raw > 0 ? raw : null;
});

const paymentId = computed(() => {
  const raw = Number(route.query.paymentId);
  return Number.isInteger(raw) && raw > 0 ? raw : null;
});

const progress = computed(() =>
  state.value === 'loading' ? Math.min(95, Math.round((attempts.value / MAX_ATTEMPTS) * 100)) : 100,
);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function resolveState(current: Order): ResultState {
  if (current.status === 'CANCELLED') return 'failed';
  if (current.status === 'PAID' || current.status === 'SHIPPED' || current.status === 'COMPLETED') {
    return 'success';
  }
  return 'pending';
}

async function startPolling(): Promise<void> {
  const token = ++runToken;
  if (!orderId.value) {
    state.value = 'error';
    error.value = '缺少订单信息，无法查询支付结果';
    return;
  }

  state.value = 'loading';
  error.value = '';
  attempts.value = 0;
  order.value = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    if (token !== runToken || unmounted) return;
    attempts.value = attempt;
    try {
      const current = await orderApi.detail(orderId.value);
      if (token !== runToken || unmounted) return;
      order.value = current;
      const next = resolveState(current);
      if (next === 'success' || next === 'failed') {
        state.value = next;
        return;
      }
    } catch (pollError) {
      if (token !== runToken || unmounted) return;
      error.value = pollError instanceof Error ? pollError.message : '支付结果查询失败';
    }
    if (attempt < MAX_ATTEMPTS) await sleep(POLL_INTERVAL_MS);
  }

  if (token !== runToken || unmounted) return;
  state.value = order.value ? 'pending' : 'error';
  if (!order.value && !error.value) error.value = '支付结果查询超时，请稍后重试';
}

function viewOrder(): void {
  if (orderId.value) {
    void router.push(`/orders/${orderId.value}`);
  } else {
    void router.push('/orders');
  }
}

onMounted(startPolling);
onUnmounted(() => {
  unmounted = true;
  runToken += 1;
});
</script>

<template>
  <div class="container page-shell result-page fade-page">
    <div class="result-card surface-card">
      <div class="result-inner">
        <template v-if="state === 'loading'">
          <div class="status-visual loading-visual">
            <span class="spinner"></span>
          </div>
          <span class="result-kicker">CONFIRMING PAYMENT</span>
          <h1>正在确认支付结果</h1>
          <p class="result-desc">
            正在与服务器同步支付状态，通常几秒内完成，最多等待 {{ MAX_SECONDS }} 秒。
          </p>
          <div class="progress-wrap">
            <el-progress :percentage="progress" :show-text="false" :stroke-width="4" />
            <span>第 {{ attempts }} / {{ MAX_ATTEMPTS }} 次查询</span>
          </div>
        </template>

        <template v-else-if="state === 'success'">
          <div class="status-visual success-visual">
            <el-icon><CircleCheckFilled /></el-icon>
          </div>
          <span class="result-kicker">PAYMENT COMPLETED</span>
          <h1>支付成功</h1>
          <p class="result-desc">
            订单已支付成功，商家将尽快为你准备商品。
          </p>
          <div v-if="order" class="result-summary">
            <div>
              <span>订单号</span>
              <strong>{{ order.orderNo }}</strong>
            </div>
            <div>
              <span>支付金额</span>
              <strong class="price">{{ formatCents(order.payableCents) }}</strong>
            </div>
            <div>
              <span>订单状态</span>
              <el-tag :type="ORDER_STATUS_META[order.status].type" effect="light" size="small">
                {{ ORDER_STATUS_META[order.status].label }}
              </el-tag>
            </div>
          </div>
          <div class="result-actions">
            <el-button type="primary" size="large" @click="viewOrder">查看订单</el-button>
            <el-button size="large" @click="router.push('/products')">继续购物</el-button>
          </div>
        </template>

        <template v-else-if="state === 'pending'">
          <div class="status-visual pending-visual">
            <el-icon><Clock /></el-icon>
          </div>
          <span class="result-kicker">PROCESSING</span>
          <h1>支付结果处理中</h1>
          <p class="result-desc">
            暂未收到支付成功的确认。若你已完成付款，请稍等片刻后刷新订单查看最新状态。
          </p>
          <div v-if="order" class="result-summary">
            <div>
              <span>订单号</span>
              <strong>{{ order.orderNo }}</strong>
            </div>
            <div>
              <span>应付金额</span>
              <strong class="price">{{ formatCents(order.payableCents) }}</strong>
            </div>
          </div>
          <div class="result-actions">
            <el-button type="primary" size="large" :icon="Refresh" @click="startPolling">
              继续查询
            </el-button>
            <el-button size="large" @click="viewOrder">查看订单</el-button>
          </div>
        </template>

        <template v-else-if="state === 'failed'">
          <div class="status-visual failed-visual">
            <el-icon><CircleCloseFilled /></el-icon>
          </div>
          <span class="result-kicker">PAYMENT NOT COMPLETED</span>
          <h1>支付未完成</h1>
          <p class="result-desc">
            订单当前状态为「已取消」或支付未成功。你可以回到订单列表查看详情并重新下单。
          </p>
          <div v-if="order" class="result-summary">
            <div>
              <span>订单号</span>
              <strong>{{ order.orderNo }}</strong>
            </div>
            <div>
              <span>订单状态</span>
              <el-tag :type="ORDER_STATUS_META[order.status].type" effect="light" size="small">
                {{ ORDER_STATUS_META[order.status].label }}
              </el-tag>
            </div>
          </div>
          <div class="result-actions">
            <el-button type="primary" size="large" @click="router.push('/orders')">
              查看我的订单
            </el-button>
          </div>
        </template>

        <template v-else>
          <div class="status-visual error-visual">
            <el-icon><WarningFilled /></el-icon>
          </div>
          <span class="result-kicker">SOMETHING WENT WRONG</span>
          <h1>暂时无法确认支付结果</h1>
          <p class="result-desc">{{ error || '页面缺少必要参数，或网络暂时不可用。' }}</p>
          <div v-if="paymentId" class="payment-ref">支付流水号：{{ paymentId }}</div>
          <div class="result-actions">
            <el-button type="primary" size="large" @click="startPolling">重新查询</el-button>
            <el-button size="large" @click="router.push('/orders')">返回订单列表</el-button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.result-page {
  display: flex;
  min-height: 66vh;
  align-items: center;
  justify-content: center;
}

.result-card {
  width: min(590px, 100%);
  overflow: hidden;
}

.result-inner {
  display: flex;
  align-items: center;
  flex-direction: column;
  padding: 48px 38px 42px;
  text-align: center;
}

.status-visual {
  position: relative;
  display: grid;
  width: 82px;
  height: 82px;
  margin-bottom: 24px;
  border-radius: 50%;
  font-size: 43px;
  place-items: center;
}

.status-visual::after {
  position: absolute;
  inset: -10px;
  border: 1px solid currentColor;
  border-radius: 50%;
  content: '';
  opacity: 0.12;
}

.loading-visual {
  color: var(--brand);
  background: var(--brand-soft);
}

.spinner {
  width: 34px;
  height: 34px;
  border: 2.5px solid rgba(232, 93, 42, 0.17);
  border-top-color: var(--brand);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.success-visual {
  color: var(--success);
  background: #eaf5f0;
}

.pending-visual {
  color: var(--warning);
  background: #fdf5e6;
}

.failed-visual {
  color: var(--danger);
  background: #fdf0f0;
}

.error-visual {
  color: var(--danger);
  background: #fdf0f0;
}

.result-kicker {
  color: var(--muted);
  font-size: 8.5px;
  font-weight: 700;
  letter-spacing: 0.22em;
}

.result-inner h1 {
  margin-top: 8px;
  font-family: var(--font-display);
  font-size: 33px;
  font-weight: 600;
  letter-spacing: -0.025em;
}

.result-desc {
  max-width: 390px;
  margin-top: 10px;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.8;
}

.progress-wrap {
  width: min(290px, 100%);
  margin-top: 25px;
}

.progress-wrap span {
  display: block;
  margin-top: 9px;
  color: var(--muted);
  font-size: 9.5px;
}

.result-summary {
  display: grid;
  width: 100%;
  gap: 12px;
  padding: 17px 20px;
  margin-top: 24px;
  text-align: left;
  background: #faf7f2;
  border-radius: 11px;
}

.result-summary > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.result-summary span {
  color: var(--muted);
  font-size: 10.5px;
}

.result-summary strong {
  color: var(--ink-soft);
  font-size: 11.5px;
  font-weight: 500;
  word-break: break-all;
}

.result-summary .price {
  color: var(--brand);
  font-size: 18px;
}

.result-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 9px;
  margin-top: 26px;
}

.result-actions .el-button {
  min-width: 130px;
  margin: 0;
  border-radius: 8px;
}

.payment-ref {
  padding: 5px 9px;
  margin-top: 14px;
  color: var(--muted);
  background: #f6f2ec;
  border-radius: 5px;
  font-family: monospace;
  font-size: 9.5px;
}

@media (max-width: 600px) {
  .result-inner {
    padding: 36px 22px 32px;
  }

  .status-visual {
    width: 72px;
    height: 72px;
    font-size: 36px;
  }

  .result-inner h1 {
    font-size: 28px;
  }

  .result-actions {
    width: 100%;
    flex-direction: column;
  }

  .result-actions .el-button {
    width: 100%;
  }
}
</style>
