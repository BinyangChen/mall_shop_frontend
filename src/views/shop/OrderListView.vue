<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowRight, ShoppingBag } from '@element-plus/icons-vue';
import { orderApi } from '@/api/orders';
import type { OrderStatus, OrderSummary } from '@/types/api';
import { formatCents } from '@/utils/money';
import { formatDateTime, fallbackImage, ORDER_STATUS_META, ORDER_STATUS_OPTIONS } from '@/utils/format';
import PageHeader from '@/components/PageHeader.vue';
import EmptyState from '@/components/EmptyState.vue';

const PAGE_SIZE = 10;
const VALID_STATUSES = ORDER_STATUS_OPTIONS.map((option) => option.value);

const route = useRoute();
const router = useRouter();
const orders = ref<OrderSummary[]>([]);
const total = ref(0);
const loading = ref(true);
const error = ref('');
let requestSeq = 0;

const currentStatus = computed<OrderStatus | ''>(() => {
  const raw = route.query.status;
  return typeof raw === 'string' && VALID_STATUSES.includes(raw as OrderStatus)
    ? (raw as OrderStatus)
    : '';
});

const page = computed(() => {
  const raw = Number(route.query.page);
  return Number.isInteger(raw) && raw > 0 ? raw : 1;
});

const tabs = computed(() => [
  { value: '', label: '全部订单' },
  ...ORDER_STATUS_OPTIONS.map((option) => ({ value: option.value, label: option.label })),
]);

async function loadOrders(): Promise<void> {
  const seq = ++requestSeq;
  loading.value = true;
  error.value = '';
  try {
    const result = await orderApi.list({
      status: currentStatus.value || undefined,
      page: page.value - 1,
      size: PAGE_SIZE,
    });
    if (seq !== requestSeq) return;
    orders.value = result.items;
    total.value = result.total;
  } catch (loadError) {
    if (seq !== requestSeq) return;
    orders.value = [];
    total.value = 0;
    error.value = loadError instanceof Error ? loadError.message : '订单加载失败';
  } finally {
    if (seq === requestSeq) loading.value = false;
  }
}

function selectStatus(status: OrderStatus | ''): void {
  const query: Record<string, string> = {};
  if (status) query.status = status;
  void router.push({ path: '/orders', query });
}

function changePage(nextPage: number): void {
  const query: Record<string, string> = { ...(route.query as Record<string, string>) };
  if (nextPage <= 1) delete query.page;
  else query.page = String(nextPage);
  void router.push({ path: '/orders', query });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

watch(
  () => [route.query.status, route.query.page],
  () => {
    void loadOrders();
  },
  { immediate: true },
);
</script>

<template>
  <div class="container page-shell fade-page">
    <PageHeader
      title="我的订单"
      description="从下单到收货，每一笔订单的进度都清晰可见。"
      kicker="MY ORDERS"
    >
      <template #actions>
        <el-button text @click="router.push('/products')">继续购物</el-button>
      </template>
    </PageHeader>

    <div class="status-tabs" role="tablist" aria-label="订单状态筛选">
      <button
        v-for="tab in tabs"
        :key="tab.value || 'all'"
        type="button"
        role="tab"
        :aria-selected="currentStatus === tab.value"
        :class="{ active: currentStatus === tab.value }"
        @click="selectStatus(tab.value as OrderStatus | '')"
      >
        {{ tab.label }}
      </button>
    </div>

    <div v-if="error" class="error-band">
      <span>{{ error }}</span>
      <el-button size="small" plain @click="loadOrders">重新加载</el-button>
    </div>

    <div v-if="loading" class="order-skeletons">
      <div v-for="item in 3" :key="item" class="order-skeleton surface-card">
        <div class="skeleton-line short"></div>
        <div class="order-skeleton-body">
          <div class="skeleton-thumb"></div>
          <div>
            <div class="skeleton-line"></div>
            <div class="skeleton-line short"></div>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="orders.length" class="order-list">
      <article
        v-for="order in orders"
        :key="order.id"
        class="order-card surface-card"
        role="link"
        tabindex="0"
        @click="router.push(`/orders/${order.id}`)"
        @keydown.enter="router.push(`/orders/${order.id}`)"
      >
        <header class="order-head">
          <div class="order-head-meta">
            <span class="order-no">订单号 {{ order.orderNo }}</span>
            <span class="order-time">{{ formatDateTime(order.createdAt) }}</span>
          </div>
          <el-tag :type="ORDER_STATUS_META[order.status].type" effect="light" size="small">
            {{ ORDER_STATUS_META[order.status].label }}
          </el-tag>
        </header>

        <div class="order-body">
          <div class="thumb-strip">
            <div
              v-for="(item, index) in order.items.slice(0, 4)"
              :key="`${item.productId}-${index}`"
              class="order-thumb"
            >
              <img :src="item.imageUrl || ''" :alt="item.productName" @error="fallbackImage" />
              <span v-if="item.quantity > 1" class="thumb-qty">×{{ item.quantity }}</span>
            </div>
            <span v-if="order.items.length > 4" class="more-items">
              +{{ order.items.length - 4 }}
            </span>
          </div>
          <div class="order-description">
            <strong>{{ order.items[0]?.productName || '订单商品' }}</strong>
            <span>共 {{ order.itemCount }} 件商品</span>
          </div>
        </div>

        <footer class="order-foot">
          <div class="order-total">
            <span>实付金额</span>
            <strong class="price">{{ formatCents(order.payableCents) }}</strong>
          </div>
          <span class="detail-link">
            查看详情
            <el-icon><ArrowRight /></el-icon>
          </span>
        </footer>
      </article>

      <div v-if="total > PAGE_SIZE" class="pagination-wrap">
        <el-pagination
          :current-page="page"
          :page-size="PAGE_SIZE"
          :total="total"
          layout="prev, pager, next"
          background
          @current-change="changePage"
        />
      </div>
    </div>

    <div v-else-if="!error" class="surface-card">
      <EmptyState
        :title="currentStatus ? '暂无该状态的订单' : '还没有订单'"
        :description="
          currentStatus ? '换个状态看看，或去挑选新的好物。' : '选一件喜欢的好物，开启你的第一笔订单。'
        "
      >
        <template #icon>
          <el-icon :size="32"><ShoppingBag /></el-icon>
        </template>
        <template #action>
          <el-button type="primary" round @click="router.push('/products')">去逛逛</el-button>
        </template>
      </EmptyState>
    </div>
  </div>
</template>

<style scoped>
.status-tabs {
  display: flex;
  overflow-x: auto;
  gap: 2px;
  padding: 4px;
  margin-bottom: 20px;
  background: #ece7e0;
  border-radius: 11px;
  scrollbar-width: none;
}

.status-tabs::-webkit-scrollbar {
  display: none;
}

.status-tabs button {
  flex: 1;
  padding: 8px 14px;
  color: var(--ink-soft);
  white-space: nowrap;
  background: transparent;
  border: 0;
  border-radius: 8px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.18s ease;
}

.status-tabs button:hover {
  color: var(--ink);
}

.status-tabs button.active {
  color: var(--ink);
  background: #fff;
  box-shadow: 0 2px 8px rgba(30, 36, 48, 0.08);
  font-weight: 600;
}

.order-list {
  display: grid;
  gap: 14px;
}

.order-card {
  padding: 0 22px;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.order-card:hover {
  border-color: #e5d2c4;
  box-shadow: var(--shadow-sm);
  transform: translateY(-1px);
}

.order-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 14px 0;
  border-bottom: 1px solid var(--line);
}

.order-head-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.order-no {
  color: var(--ink-soft);
  font-size: 11px;
  font-weight: 500;
}

.order-time {
  color: var(--muted);
  font-size: 10px;
}

.order-body {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 17px 0;
}

.thumb-strip {
  display: flex;
  flex-shrink: 0;
  align-items: center;
}

.order-thumb {
  position: relative;
  overflow: hidden;
  width: 58px;
  height: 58px;
  margin-right: 6px;
  background: #f3efe9;
  border: 2px solid #fff;
  border-radius: 9px;
  box-shadow: 0 1px 4px rgba(30, 36, 48, 0.08);
}

.order-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumb-qty {
  position: absolute;
  right: 2px;
  bottom: 2px;
  padding: 0 3px;
  color: #fff;
  background: rgba(23, 32, 51, 0.72);
  border-radius: 3px;
  font-size: 8px;
}

.more-items {
  display: grid;
  width: 40px;
  height: 40px;
  margin-left: 4px;
  color: var(--muted);
  background: #f5f1eb;
  border-radius: 8px;
  font-size: 10px;
  place-items: center;
}

.order-description {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}

.order-description strong {
  max-width: 500px;
  overflow: hidden;
  font-size: 12.5px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.order-description span {
  color: var(--muted);
  font-size: 10px;
}

.order-foot {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 26px;
  padding: 13px 0;
  border-top: 1px solid var(--line);
}

.order-total {
  display: flex;
  align-items: baseline;
  gap: 7px;
  color: var(--muted);
  font-size: 10px;
}

.order-total .price {
  font-size: 18px;
}

.detail-link {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--ink-soft);
  font-size: 11px;
  font-weight: 500;
}

.order-card:hover .detail-link {
  color: var(--brand);
}

.pagination-wrap {
  display: flex;
  justify-content: center;
  padding-top: 22px;
}

.order-skeletons {
  display: grid;
  gap: 14px;
}

.order-skeleton {
  height: 180px;
  padding: 20px;
}

.order-skeleton-body {
  display: flex;
  gap: 16px;
  margin-top: 24px;
}

.skeleton-thumb {
  flex: 0 0 auto;
  width: 58px;
  height: 58px;
  border-radius: 8px;
  background: #f2eee8;
}

.order-skeleton-body > div:last-child {
  flex: 1;
}

.order-skeleton-body .skeleton-line {
  margin-bottom: 10px;
}

@media (max-width: 768px) {
  .status-tabs button {
    flex: 0 0 auto;
    padding: 7px 13px;
  }

  .order-card {
    padding: 0 15px;
  }

  .order-head {
    align-items: flex-start;
  }

  .order-head-meta {
    flex-direction: column;
    gap: 2px;
  }

  .order-body {
    gap: 12px;
  }

  .order-thumb {
    width: 48px;
    height: 48px;
    margin-right: 4px;
  }

  .more-items {
    display: none;
  }

  .order-description strong {
    max-width: 170px;
  }

  .order-foot {
    justify-content: space-between;
    gap: 12px;
  }

  .order-total {
    align-items: flex-end;
    flex-direction: column;
    gap: 1px;
  }

  .order-total .price {
    font-size: 16px;
  }

  .thumb-qty {
    font-size: 7px;
  }
}
</style>
