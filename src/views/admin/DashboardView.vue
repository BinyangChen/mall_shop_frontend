<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { List, Refresh, Sunny, User, Wallet } from '@element-plus/icons-vue';
import { adminApi } from '@/api/admin';
import type { Dashboard, OrderStatus } from '@/types/api';
import { formatCents } from '@/utils/money';
import { formatDate, fallbackImage, ORDER_STATUS_META, ORDER_STATUS_OPTIONS } from '@/utils/format';
import PageHeader from '@/components/PageHeader.vue';
import EmptyState from '@/components/EmptyState.vue';
import StatCard from '@/components/admin/StatCard.vue';

const router = useRouter();
const dashboard = ref<Dashboard | null>(null);
const loading = ref(true);
const error = ref('');

const statusColors: Record<OrderStatus, string> = {
  PENDING_PAYMENT: '#d28b10',
  PAID: '#d9762f',
  SHIPPED: '#4d7ea8',
  COMPLETED: '#2f8f6b',
  CANCELLED: '#9a968f',
  REFUNDING: '#b58a2b',
  REFUNDED: '#7a6c84',
};

const statusCards = computed(() =>
  ORDER_STATUS_OPTIONS.map((option) => ({
    ...option,
    count: dashboard.value?.orderCounts?.[option.value] ?? 0,
    color: statusColors[option.value],
  })),
);

async function loadDashboard(): Promise<void> {
  loading.value = true;
  error.value = '';
  try {
    dashboard.value = await adminApi.dashboard();
  } catch (loadError) {
    error.value = loadError instanceof Error ? loadError.message : '仪表盘加载失败';
  } finally {
    loading.value = false;
  }
}

function goOrders(status?: OrderStatus): void {
  void router.push({ path: '/admin/orders', query: status ? { status } : {} });
}

onMounted(loadDashboard);
</script>

<template>
  <div class="fade-page">
    <PageHeader
      title="仪表盘"
      description="掌握店铺经营概览，关注每一笔订单与营收变化。"
      kicker="OPERATIONS OVERVIEW"
    >
      <template #actions>
        <el-button :icon="Refresh" :loading="loading" @click="loadDashboard">刷新数据</el-button>
      </template>
    </PageHeader>

    <div v-if="error" class="error-band">
      <span>{{ error }}</span>
      <el-button size="small" plain @click="loadDashboard">重新加载</el-button>
    </div>

    <template v-if="loading">
      <div class="kpi-grid">
        <div v-for="item in 4" :key="item" class="dash-skeleton kpi-skeleton"></div>
      </div>
      <div class="dash-skeleton wide-skeleton"></div>
      <div class="dashboard-lower">
        <div class="dash-skeleton table-skeleton"></div>
        <div class="dash-skeleton table-skeleton"></div>
      </div>
    </template>

    <template v-else-if="dashboard">
      <div class="kpi-grid">
        <StatCard
          label="总订单数"
          :value="dashboard.totalOrders"
          hint="全量历史订单"
          :icon="List"
          tone="navy"
        />
        <StatCard
          label="总客户数"
          :value="dashboard.totalCustomers"
          hint="注册顾客账号"
          :icon="User"
          tone="brand"
        />
        <StatCard
          label="累计有效营收"
          :value="formatCents(dashboard.totalRevenueCents)"
          hint="已支付且未取消/退款"
          :icon="Wallet"
          tone="green"
        />
        <StatCard
          label="今日营收"
          :value="formatCents(dashboard.todayRevenueCents)"
          hint="按支付成功时间统计"
          :icon="Sunny"
          tone="gold"
        />
      </div>

      <section class="status-section admin-panel">
        <div class="admin-panel-head">
          <div>
            <span class="admin-kicker">ORDER PIPELINE</span>
            <h2>订单状态概览</h2>
          </div>
          <el-button text type="primary" @click="goOrders()">查看全部订单</el-button>
        </div>
        <div class="status-grid">
          <button
            v-for="status in statusCards"
            :key="status.value"
            type="button"
            class="status-card"
            :style="{ '--status-color': status.color }"
            @click="goOrders(status.value as OrderStatus)"
          >
            <span class="status-dot"></span>
            <span class="status-label">{{ status.label }}</span>
            <strong>{{ status.count }}</strong>
            <small>笔订单</small>
          </button>
        </div>
      </section>

      <div class="dashboard-lower">
        <section class="admin-panel table-panel">
          <div class="admin-panel-head">
            <div>
              <span class="admin-kicker">LAST 7 DAYS</span>
              <h2>近 7 天营收</h2>
            </div>
            <span class="head-note">按支付时间汇总</span>
          </div>

          <el-table :data="dashboard.last7Days" class="revenue-table" size="small">
            <el-table-column label="日期" min-width="100">
              <template #default="{ row }">
                <span class="date-cell">{{ formatDate(row.date) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="订单数" prop="orderCount" width="80" align="center" />
            <el-table-column label="营收" min-width="115" align="right">
              <template #default="{ row }">
                <strong class="revenue-cell">{{ formatCents(row.revenueCents) }}</strong>
              </template>
            </el-table-column>
          </el-table>
        </section>

        <section class="admin-panel top-products">
          <div class="admin-panel-head">
            <div>
              <span class="admin-kicker">TOP PRODUCTS</span>
              <h2>热销 Top 5</h2>
            </div>
            <span class="head-note">按累计销量</span>
          </div>

          <div v-if="dashboard.topProducts.length" class="top-product-list">
            <div
              v-for="(product, index) in dashboard.topProducts.slice(0, 5)"
              :key="product.productId"
              class="top-product-row"
            >
              <span :class="['rank', { top: index < 3 }]">{{ String(index + 1).padStart(2, '0') }}</span>
              <img :src="product.imageUrl || ''" :alt="product.title" @error="fallbackImage" />
              <div class="top-product-copy">
                <strong>{{ product.title }}</strong>
                <span>销量 {{ product.salesCount }} 件</span>
              </div>
              <span class="price">{{ formatCents(product.priceCents) }}</span>
            </div>
          </div>
          <EmptyState
            v-else
            compact
            title="暂无热销商品"
            description="商品产生销量后会展示在这里。"
          />
        </section>
      </div>
    </template>
  </div>
</template>

<style scoped>
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.admin-panel {
  padding: 20px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 12px;
}

.status-section {
  margin-top: 16px;
}

.admin-panel-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 17px;
}

.admin-kicker {
  color: var(--muted);
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.16em;
}

.admin-panel-head h2 {
  margin-top: 3px;
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.015em;
}

.head-note {
  color: var(--muted);
  font-size: 9.5px;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 9px;
}

.status-card {
  position: relative;
  display: flex;
  align-items: flex-start;
  flex-direction: column;
  padding: 13px 13px 12px;
  text-align: left;
  background: #fbf9f5;
  border: 1px solid var(--line);
  border-radius: 9px;
  cursor: pointer;
  transition: all 0.18s ease;
}

.status-card::after {
  position: absolute;
  top: 13px;
  right: 11px;
  width: 5px;
  height: 5px;
  background: var(--status-color);
  border-radius: 50%;
  content: '';
}

.status-card:hover {
  background: #fff;
  border-color: var(--status-color);
  box-shadow: 0 4px 14px rgba(30, 36, 48, 0.06);
  transform: translateY(-1px);
}

.status-label {
  color: var(--muted);
  font-size: 9.5px;
}

.status-card strong {
  margin-top: 8px;
  color: var(--ink);
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 600;
  line-height: 1;
}

.status-card small {
  margin-top: 5px;
  color: #b6aea4;
  font-size: 8px;
}

.status-dot {
  width: 4px;
  height: 4px;
  margin-bottom: 7px;
  background: var(--status-color);
  border-radius: 50%;
  opacity: 0.6;
}

.dashboard-lower {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 16px;
  margin-top: 16px;
}

.revenue-table {
  --el-table-header-bg-color: #fbf9f5;
  font-size: 11.5px;
}

.date-cell {
  color: var(--ink-soft);
  font-variant-numeric: tabular-nums;
}

.revenue-cell {
  color: var(--ink);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.top-product-list {
  display: grid;
}

.top-product-row {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 9px 0;
  border-bottom: 1px solid var(--line);
}

.top-product-row:first-child {
  padding-top: 0;
}

.top-product-row:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}

.rank {
  flex: 0 0 auto;
  width: 22px;
  color: #b6ada2;
  font-family: var(--font-display);
  font-size: 13px;
  font-weight: 600;
}

.rank.top {
  color: var(--brand);
}

.top-product-row img {
  width: 40px;
  height: 40px;
  object-fit: cover;
  background: #f3efe9;
  border-radius: 7px;
}

.top-product-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 2px;
}

.top-product-copy strong {
  overflow: hidden;
  font-size: 11.5px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.top-product-copy span {
  color: var(--muted);
  font-size: 8.5px;
}

.top-product-row > .price {
  flex-shrink: 0;
  font-size: 12.5px;
}

.dash-skeleton {
  border-radius: 12px;
  background: linear-gradient(100deg, #ece7e0 30%, #f6f2ec 50%, #ece7e0 70%);
  background-size: 220% 100%;
  animation: shimmer 1.5s infinite;
}

.kpi-skeleton {
  height: 116px;
}

.wide-skeleton {
  height: 180px;
  margin-top: 16px;
}

.table-skeleton {
  height: 300px;
}

@media (max-width: 1180px) {
  .status-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 960px) {
  .kpi-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .dashboard-lower {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .kpi-grid {
    gap: 9px;
  }

  .admin-panel {
    padding: 15px;
  }

  .status-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .status-card {
    padding: 11px;
  }

  .status-card strong {
    font-size: 21px;
  }

  .admin-panel-head h2 {
    font-size: 18px;
  }

  .head-note {
    display: none;
  }
}
</style>
