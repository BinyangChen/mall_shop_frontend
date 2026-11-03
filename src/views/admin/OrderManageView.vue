<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Refresh, Search, Van, View } from '@element-plus/icons-vue';
import { adminApi } from '@/api/admin';
import type {
  AdminOrderDetail,
  AdminOrderSummary,
  OrderStatus,
  PaymentStatus,
  RefundStatus,
} from '@/types/api';
import {
  formatDateTime,
  fallbackImage,
  ORDER_STATUS_META,
  ORDER_STATUS_OPTIONS,
  PAYMENT_STATUS_META,
  REFUND_STATUS_META,
} from '@/utils/format';
import { formatCents } from '@/utils/money';
import PageHeader from '@/components/PageHeader.vue';
import EmptyState from '@/components/EmptyState.vue';
import TrackingTimeline from '@/components/TrackingTimeline.vue';
import ShipDialog from '@/components/admin/ShipDialog.vue';

const PAGE_SIZE = 10;
const route = useRoute();
const orders = ref<AdminOrderSummary[]>([]);
const total = ref(0);
const page = ref(1);
const loading = ref(true);
const error = ref('');
const keyword = ref('');
const status = ref<OrderStatus | undefined>(undefined);
let requestSeq = 0;

const drawerVisible = ref(false);
const selectedOrder = ref<AdminOrderDetail | null>(null);
const detailLoading = ref(false);
const detailError = ref('');
const detailOrderId = ref<number | null>(null);

const shipDialogVisible = ref(false);
const shipTarget = ref<AdminOrderSummary | AdminOrderDetail | null>(null);

function validStatus(raw: unknown): OrderStatus | undefined {
  if (typeof raw !== 'string') return undefined;
  return ORDER_STATUS_OPTIONS.some((option) => option.value === raw)
    ? (raw as OrderStatus)
    : undefined;
}

status.value = validStatus(route.query.status);

async function loadOrders(): Promise<void> {
  const seq = ++requestSeq;
  loading.value = true;
  error.value = '';
  try {
    const result = await adminApi.orders.list({
      status: status.value,
      q: keyword.value.trim() || undefined,
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

function applyFilters(): void {
  page.value = 1;
  void loadOrders();
}

function resetFilters(): void {
  keyword.value = '';
  status.value = undefined;
  page.value = 1;
  void loadOrders();
}

function changePage(nextPage: number): void {
  page.value = nextPage;
  void loadOrders();
}

async function openDetail(order: AdminOrderSummary): Promise<void> {
  drawerVisible.value = true;
  detailOrderId.value = order.id;
  selectedOrder.value = null;
  detailError.value = '';
  detailLoading.value = true;
  try {
    selectedOrder.value = await adminApi.orders.detail(order.id);
  } catch (loadError) {
    detailError.value = loadError instanceof Error ? loadError.message : '订单详情加载失败';
  } finally {
    detailLoading.value = false;
  }
}

async function retryDetail(): Promise<void> {
  if (!detailOrderId.value) return;
  detailLoading.value = true;
  detailError.value = '';
  try {
    selectedOrder.value = await adminApi.orders.detail(detailOrderId.value);
  } catch (loadError) {
    detailError.value = loadError instanceof Error ? loadError.message : '订单详情加载失败';
  } finally {
    detailLoading.value = false;
  }
}

function openShip(order: AdminOrderSummary | AdminOrderDetail): void {
  shipTarget.value = order;
  shipDialogVisible.value = true;
}

async function onShipped(): Promise<void> {
  await loadOrders();
  if (drawerVisible.value && selectedOrder.value) {
    try {
      selectedOrder.value = await adminApi.orders.detail(selectedOrder.value.id);
    } catch {
      // 列表已刷新，详情可稍后重试。
    }
  }
}

onMounted(loadOrders);
</script>

<template>
  <div class="fade-page">
    <PageHeader
      title="订单管理"
      description="查询订单、查看履约详情并为已支付订单发货。"
      kicker="ORDER OPERATIONS"
    >
      <template #actions>
        <el-button :icon="Refresh" :loading="loading" @click="loadOrders">刷新订单</el-button>
      </template>
    </PageHeader>

    <section class="admin-panel filter-panel">
      <div class="filter-row">
        <el-input
          v-model="keyword"
          placeholder="搜索订单号 / 用户名"
          clearable
          class="filter-search"
          @keyup.enter="applyFilters"
        >
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <el-select v-model="status" placeholder="全部状态" clearable class="filter-select">
          <el-option
            v-for="option in ORDER_STATUS_OPTIONS"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
        <div class="filter-actions">
          <el-button type="primary" @click="applyFilters">查询</el-button>
          <el-button @click="resetFilters">重置</el-button>
        </div>
      </div>
    </section>

    <div v-if="error" class="error-band">
      <span>{{ error }}</span>
      <el-button size="small" plain @click="loadOrders">重新加载</el-button>
    </div>

    <section class="admin-panel table-panel">
      <div class="table-head-row">
        <span class="table-count">共 {{ total }} 笔订单</span>
        <span class="table-tip">仅已支付订单可发货</span>
      </div>

      <el-table v-loading="loading" :data="orders" size="small" class="order-table">
        <el-table-column label="订单号" min-width="175">
          <template #default="{ row }">
            <button type="button" class="order-no-link" @click="openDetail(row)">
              {{ row.orderNo }}
            </button>
            <span class="order-time">{{ formatDateTime(row.createdAt) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="顾客" prop="customerUsername" width="105" />
        <el-table-column label="状态" width="95">
          <template #default="{ row }">
            <el-tag
              :type="ORDER_STATUS_META[row.status as OrderStatus].type"
              size="small"
              effect="plain"
            >
              {{ ORDER_STATUS_META[row.status as OrderStatus].label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="商品数" prop="itemCount" width="75" align="center" />
        <el-table-column label="实付金额" width="105">
          <template #default="{ row }">
            <strong class="amount-cell">{{ formatCents(row.payableCents) }}</strong>
          </template>
        </el-table-column>
        <el-table-column label="物流" min-width="150">
          <template #default="{ row }">
            <div v-if="row.shipment" class="shipment-cell">
              <strong>{{ row.shipment.carrier }}</strong>
              <span>{{ row.shipment.trackingNo }}</span>
            </div>
            <span v-else class="text-muted">未发货</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="155" fixed="right">
          <template #default="{ row }">
            <div class="row-actions">
              <el-button link type="primary" size="small" :icon="View" @click="openDetail(row)">
                详情
              </el-button>
              <el-button
                v-if="row.status === 'PAID'"
                link
                type="primary"
                size="small"
                :icon="Van"
                @click="openShip(row)"
              >
                发货
              </el-button>
            </div>
          </template>
        </el-table-column>
        <template #empty>
          <EmptyState
            compact
            title="暂无符合条件的订单"
            description="调整筛选条件后再试试。"
          />
        </template>
      </el-table>

      <div v-if="total > PAGE_SIZE" class="table-pagination">
        <el-pagination
          :current-page="page"
          :page-size="PAGE_SIZE"
          :total="total"
          layout="total, prev, pager, next"
          background
          @current-change="changePage"
        />
      </div>
    </section>

    <el-drawer
      v-model="drawerVisible"
      title="订单详情"
      size="min(620px, 94vw)"
      append-to-body
      class="order-detail-drawer"
    >
      <div v-if="detailLoading" class="drawer-loading">
        <el-icon class="is-loading" :size="24"><Refresh /></el-icon>
        <span>正在加载订单详情…</span>
      </div>

      <div v-else-if="detailError" class="drawer-error">
        <span>{{ detailError }}</span>
        <el-button
          size="small"
          plain
          @click="retryDetail"
        >
          重试
        </el-button>
      </div>

      <template v-else-if="selectedOrder">
        <div class="drawer-summary">
          <div>
            <span class="drawer-label">订单号</span>
            <strong class="drawer-order-no">{{ selectedOrder.orderNo }}</strong>
            <span class="drawer-created">{{ formatDateTime(selectedOrder.createdAt) }}</span>
          </div>
          <el-tag
            :type="ORDER_STATUS_META[selectedOrder.status].type"
            effect="light"
            size="small"
          >
            {{ ORDER_STATUS_META[selectedOrder.status].label }}
          </el-tag>
        </div>

        <div class="drawer-customer">
          <span class="customer-avatar">
            {{ selectedOrder.customer.displayName.slice(0, 1) }}
          </span>
          <div>
            <strong>{{ selectedOrder.customer.displayName }}</strong>
            <span>
              @{{ selectedOrder.customer.username }} · {{ selectedOrder.customer.email }}
            </span>
          </div>
          <el-button
            v-if="selectedOrder.status === 'PAID'"
            type="primary"
            size="small"
            :icon="Van"
            @click="openShip(selectedOrder)"
          >
            发货
          </el-button>
        </div>

        <div class="drawer-section">
          <h3>订单进度</h3>
          <TrackingTimeline :order="selectedOrder" />
        </div>

        <div class="drawer-section">
          <h3>商品清单</h3>
          <div class="drawer-items">
            <div v-for="item in selectedOrder.items" :key="item.productId" class="drawer-item">
              <img :src="item.imageUrl || ''" :alt="item.productName" @error="fallbackImage" />
              <div>
                <strong>{{ item.productName }}</strong>
                <span>{{ formatCents(item.unitPriceCents) }} × {{ item.quantity }}</span>
              </div>
              <span class="price">{{ formatCents(item.subtotalCents) }}</span>
            </div>
          </div>
        </div>

        <div class="drawer-section">
          <h3>收货信息</h3>
          <div class="drawer-address">
            <strong>
              {{ selectedOrder.shippingAddress.recipient }}
              <span>{{ selectedOrder.shippingAddress.phone }}</span>
            </strong>
            <p>
              {{ selectedOrder.shippingAddress.province }}{{ selectedOrder.shippingAddress.city
              }}{{ selectedOrder.shippingAddress.district }}{{ selectedOrder.shippingAddress.detail }}
            </p>
          </div>
        </div>

        <div class="drawer-section">
          <h3>金额明细</h3>
          <div class="drawer-money">
            <div class="money-row">
              <span>商品总额</span>
              <strong>{{ formatCents(selectedOrder.itemTotalCents) }}</strong>
            </div>
            <div class="money-row">
              <span>优惠金额</span>
              <span class="discount">−{{ formatCents(selectedOrder.discountCents) }}</span>
            </div>
            <div class="money-row total">
              <span>应付金额</span>
              <span class="price">{{ formatCents(selectedOrder.payableCents) }}</span>
            </div>
          </div>
        </div>

        <div v-if="selectedOrder.payment" class="drawer-section">
          <h3>支付信息</h3>
          <div class="drawer-info-grid">
            <div>
              <span>支付方式</span>
              <strong>
                {{ selectedOrder.payment.channel === 'ALIPAY' ? '支付宝' : '模拟支付' }}
              </strong>
            </div>
            <div>
              <span>支付状态</span>
              <el-tag
                :type="PAYMENT_STATUS_META[selectedOrder.payment.status as PaymentStatus].type"
                size="small"
                effect="plain"
              >
                {{ PAYMENT_STATUS_META[selectedOrder.payment.status as PaymentStatus].label }}
              </el-tag>
            </div>
            <div>
              <span>支付时间</span>
              <strong>{{ formatDateTime(selectedOrder.payment.paidAt) }}</strong>
            </div>
          </div>
        </div>

        <div v-if="selectedOrder.shipment" class="drawer-section">
          <h3>物流信息</h3>
          <div class="drawer-info-grid">
            <div>
              <span>承运商</span>
              <strong>{{ selectedOrder.shipment.carrier }}</strong>
            </div>
            <div>
              <span>运单号</span>
              <strong>{{ selectedOrder.shipment.trackingNo }}</strong>
            </div>
            <div>
              <span>发货时间</span>
              <strong>{{ formatDateTime(selectedOrder.shipment.shippedAt) }}</strong>
            </div>
          </div>
        </div>

        <div v-if="selectedOrder.refund" class="drawer-section">
          <h3>退款信息</h3>
          <div class="drawer-refund">
            <div>
              <span>状态</span>
              <el-tag
                :type="REFUND_STATUS_META[selectedOrder.refund.status as RefundStatus].type"
                size="small"
                effect="plain"
              >
                {{ REFUND_STATUS_META[selectedOrder.refund.status as RefundStatus].label }}
              </el-tag>
            </div>
            <div>
              <span>退款金额</span>
              <strong>{{ formatCents(selectedOrder.refund.amountCents) }}</strong>
            </div>
            <div class="full">
              <span>退款原因</span>
              <strong>{{ selectedOrder.refund.reason }}</strong>
            </div>
            <div v-if="selectedOrder.refund.adminComment" class="full">
              <span>管理员备注</span>
              <strong>{{ selectedOrder.refund.adminComment }}</strong>
            </div>
          </div>
        </div>
      </template>
    </el-drawer>

    <ShipDialog v-model="shipDialogVisible" :order="shipTarget" @shipped="onShipped" />
  </div>
</template>

<style scoped>
.admin-panel {
  padding: 18px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 12px;
}

.filter-panel {
  margin-bottom: 14px;
}

.filter-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 9px;
}

.filter-search {
  width: 280px;
}

.filter-select {
  width: 150px;
}

.filter-actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

.filter-actions .el-button {
  margin: 0;
}

.table-head-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.table-count {
  color: var(--ink-soft);
  font-size: 11px;
  font-weight: 600;
}

.table-tip {
  color: var(--muted);
  font-size: 9px;
}

.order-no-link {
  display: block;
  max-width: 100%;
  overflow: hidden;
  padding: 0;
  color: var(--ink);
  background: transparent;
  border: 0;
  cursor: pointer;
  font-family: monospace;
  font-size: 10.5px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.order-no-link:hover {
  color: var(--brand);
}

.order-time {
  display: block;
  margin-top: 3px;
  color: var(--muted);
  font-size: 8.5px;
}

.amount-cell {
  color: var(--ink);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.shipment-cell {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.shipment-cell strong {
  font-size: 10px;
  font-weight: 500;
}

.shipment-cell span {
  color: var(--muted);
  font-family: monospace;
  font-size: 8.5px;
}

.row-actions {
  display: flex;
}

.row-actions :deep(.el-button) {
  margin-left: 0;
  padding: 3px 5px;
  font-size: 10.5px;
}

.table-pagination {
  display: flex;
  justify-content: flex-end;
  padding-top: 16px;
}

.drawer-loading,
.drawer-error {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 220px;
  flex-direction: column;
  gap: 10px;
  color: var(--muted);
  font-size: 12px;
}

.drawer-error {
  flex-direction: row;
}

.drawer-summary {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  padding: 14px 16px;
  background: #faf7f2;
  border-radius: 10px;
}

.drawer-label {
  display: block;
  color: var(--muted);
  font-size: 8.5px;
}

.drawer-order-no {
  display: block;
  margin-top: 2px;
  font-family: monospace;
  font-size: 12px;
  font-weight: 500;
}

.drawer-created {
  display: block;
  margin-top: 3px;
  color: var(--muted);
  font-size: 9px;
}

.drawer-customer {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 15px 2px;
  border-bottom: 1px solid var(--line);
}

.customer-avatar {
  display: grid;
  flex: 0 0 auto;
  width: 34px;
  height: 34px;
  color: var(--brand-strong);
  background: var(--brand-soft);
  border-radius: 50%;
  font-size: 12px;
  font-weight: 600;
  place-items: center;
}

.drawer-customer > div {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 1px;
}

.drawer-customer strong {
  font-size: 11.5px;
  font-weight: 600;
}

.drawer-customer span {
  overflow: hidden;
  color: var(--muted);
  font-size: 9px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.drawer-section {
  padding: 16px 0;
  border-bottom: 1px solid var(--line);
}

.drawer-section:last-child {
  border-bottom: 0;
}

.drawer-section h3 {
  margin-bottom: 13px;
  font-size: 12px;
  font-weight: 700;
}

.drawer-items {
  display: grid;
}

.drawer-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
}

.drawer-item img {
  width: 45px;
  height: 45px;
  object-fit: cover;
  background: #f3efe9;
  border-radius: 7px;
}

.drawer-item > div {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 2px;
}

.drawer-item strong {
  overflow: hidden;
  font-size: 10.5px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.drawer-item span {
  color: var(--muted);
  font-size: 9px;
}

.drawer-item > .price {
  flex-shrink: 0;
  font-size: 11.5px;
}

.drawer-address strong {
  display: flex;
  gap: 7px;
  font-size: 11px;
  font-weight: 600;
}

.drawer-address strong span {
  color: var(--muted);
  font-weight: 400;
}

.drawer-address p {
  margin-top: 5px;
  color: var(--ink-soft);
  font-size: 10.5px;
  line-height: 1.7;
}

.drawer-money {
  padding: 4px 0;
}

.drawer-info-grid,
.drawer-refund {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.drawer-info-grid > div,
.drawer-refund > div {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.drawer-refund .full {
  grid-column: 1 / -1;
}

.drawer-info-grid span,
.drawer-refund span {
  color: var(--muted);
  font-size: 9px;
}

.drawer-info-grid strong,
.drawer-refund strong {
  color: var(--ink-soft);
  font-size: 10.5px;
  font-weight: 500;
  word-break: break-word;
}

@media (max-width: 600px) {
  .admin-panel {
    padding: 13px;
    border-radius: 10px;
  }

  .filter-row {
    align-items: stretch;
    flex-direction: column;
  }

  .filter-search,
  .filter-select {
    width: 100%;
  }

  .filter-actions {
    width: 100%;
    margin-left: 0;
  }

  .filter-actions .el-button {
    flex: 1;
  }

  .table-tip {
    display: none;
  }

  .table-pagination {
    justify-content: center;
  }

  .drawer-info-grid,
  .drawer-refund {
    grid-template-columns: 1fr;
  }

  .drawer-refund .full {
    grid-column: auto;
  }
}
</style>
