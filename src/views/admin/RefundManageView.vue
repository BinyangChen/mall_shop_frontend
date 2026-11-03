<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { Refresh, Search } from '@element-plus/icons-vue';
import { adminApi } from '@/api/admin';
import type { AdminRefundView, RefundStatus } from '@/types/api';
import { formatCents } from '@/utils/money';
import { formatDateTime, REFUND_STATUS_META } from '@/utils/format';
import PageHeader from '@/components/PageHeader.vue';
import EmptyState from '@/components/EmptyState.vue';
import RefundReviewDialog from '@/components/admin/RefundReviewDialog.vue';

const PAGE_SIZE = 10;
const refunds = ref<AdminRefundView[]>([]);
const total = ref(0);
const page = ref(1);
const loading = ref(true);
const error = ref('');
const status = ref<RefundStatus | undefined>(undefined);
let requestSeq = 0;

const dialogVisible = ref(false);
const dialogMode = ref<'approve' | 'reject'>('approve');
const selectedRefund = ref<AdminRefundView | null>(null);

const statusOptions = (Object.keys(REFUND_STATUS_META) as RefundStatus[]).map((value) => ({
  value,
  label: REFUND_STATUS_META[value].label,
}));

async function loadRefunds(): Promise<void> {
  const seq = ++requestSeq;
  loading.value = true;
  error.value = '';
  try {
    const result = await adminApi.refunds.list({
      status: status.value,
      page: page.value - 1,
      size: PAGE_SIZE,
    });
    if (seq !== requestSeq) return;
    refunds.value = result.items;
    total.value = result.total;
  } catch (loadError) {
    if (seq !== requestSeq) return;
    refunds.value = [];
    total.value = 0;
    error.value = loadError instanceof Error ? loadError.message : '退款列表加载失败';
  } finally {
    if (seq === requestSeq) loading.value = false;
  }
}

function applyFilters(): void {
  page.value = 1;
  void loadRefunds();
}

function resetFilters(): void {
  status.value = undefined;
  page.value = 1;
  void loadRefunds();
}

function changePage(nextPage: number): void {
  page.value = nextPage;
  void loadRefunds();
}

function openReview(refund: AdminRefundView, mode: 'approve' | 'reject'): void {
  selectedRefund.value = refund;
  dialogMode.value = mode;
  dialogVisible.value = true;
}

onMounted(loadRefunds);
</script>

<template>
  <div class="fade-page">
    <PageHeader
      title="退款审批"
      description="审核顾客退款申请；执行失败可重试通过。"
      kicker="REFUND REVIEW"
    >
      <template #actions>
        <el-button :icon="Refresh" :loading="loading" @click="loadRefunds">刷新列表</el-button>
      </template>
    </PageHeader>

    <section class="admin-panel filter-panel">
      <div class="filter-row">
        <div class="filter-copy">
          <span>按状态筛选</span>
          <p>拒绝或通过退款均需填写审核备注。</p>
        </div>
        <el-select v-model="status" placeholder="全部状态" clearable class="filter-select">
          <el-option
            v-for="option in statusOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
        <div class="filter-actions">
          <el-button type="primary" :icon="Search" @click="applyFilters">查询</el-button>
          <el-button @click="resetFilters">重置</el-button>
        </div>
      </div>
    </section>

    <div v-if="error" class="error-band">
      <span>{{ error }}</span>
      <el-button size="small" plain @click="loadRefunds">重新加载</el-button>
    </div>

    <section class="admin-panel table-panel">
      <div class="table-head-row">
        <span class="table-count">共 {{ total }} 条退款申请</span>
        <span class="table-tip">仅待审核与失败状态可操作</span>
      </div>

      <el-table v-loading="loading" :data="refunds" size="small">
        <el-table-column label="退款单" min-width="150">
          <template #default="{ row }">
            <span class="refund-id">#{{ row.id }}</span>
            <span class="refund-order">{{ row.orderNo }}</span>
          </template>
        </el-table-column>
        <el-table-column label="顾客" prop="username" width="100" />
        <el-table-column label="金额" width="100">
          <template #default="{ row }">
            <strong class="refund-amount">{{ formatCents(row.amountCents) }}</strong>
          </template>
        </el-table-column>
        <el-table-column label="退款原因" min-width="180">
          <template #default="{ row }">
            <span class="refund-reason">{{ row.reason }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag
              :type="REFUND_STATUS_META[row.status as RefundStatus].type"
              size="small"
              effect="plain"
            >
              {{ REFUND_STATUS_META[row.status as RefundStatus].label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="申请时间" width="135">
          <template #default="{ row }">
            <span class="refund-time">{{ formatDateTime(row.createdAt) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="审核备注" min-width="140">
          <template #default="{ row }">
            <span v-if="row.adminComment" class="admin-comment">{{ row.adminComment }}</span>
            <span v-else class="text-muted">—</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="155" fixed="right">
          <template #default="{ row }">
            <div
              v-if="row.status === 'REQUESTED' || row.status === 'FAILED'"
              class="row-actions"
            >
              <el-button
                link
                type="primary"
                size="small"
                @click="openReview(row, 'approve')"
              >
                {{ row.status === 'FAILED' ? '重试通过' : '通过' }}
              </el-button>
              <el-button link type="danger" size="small" @click="openReview(row, 'reject')">
                拒绝
              </el-button>
            </div>
            <span v-else class="text-muted action-empty">已处理</span>
          </template>
        </el-table-column>
        <template #empty>
          <EmptyState
            compact
            title="暂无退款申请"
            description="顾客提交退款申请后会出现在这里。"
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

    <RefundReviewDialog
      v-model="dialogVisible"
      :refund="selectedRefund"
      :mode="dialogMode"
      @reviewed="loadRefunds"
    />
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
  gap: 12px;
}

.filter-copy {
  flex: 1;
  min-width: 190px;
}

.filter-copy span {
  color: var(--ink);
  font-size: 11.5px;
  font-weight: 600;
}

.filter-copy p {
  margin-top: 2px;
  color: var(--muted);
  font-size: 9px;
}

.filter-select {
  width: 150px;
}

.filter-actions {
  display: flex;
  gap: 8px;
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

.refund-id {
  display: block;
  color: var(--ink);
  font-family: monospace;
  font-size: 10.5px;
  font-weight: 600;
}

.refund-order {
  display: block;
  margin-top: 2px;
  color: var(--muted);
  font-family: monospace;
  font-size: 8.5px;
}

.refund-amount {
  color: var(--ink);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.refund-reason {
  display: -webkit-box;
  overflow: hidden;
  color: var(--ink-soft);
  font-size: 10.5px;
  line-height: 1.5;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.refund-time {
  color: var(--muted);
  font-size: 9px;
}

.admin-comment {
  display: -webkit-box;
  overflow: hidden;
  color: var(--muted);
  font-size: 9.5px;
  line-height: 1.5;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.row-actions {
  display: flex;
}

.row-actions :deep(.el-button) {
  margin-left: 0;
  padding: 3px 6px;
  font-size: 10.5px;
}

.action-empty {
  font-size: 9.5px;
}

.table-pagination {
  display: flex;
  justify-content: flex-end;
  padding-top: 16px;
}

@media (max-width: 600px) {
  .admin-panel {
    padding: 13px;
    border-radius: 10px;
  }

  .filter-row {
    align-items: stretch;
    flex-direction: column;
    gap: 9px;
  }

  .filter-select {
    width: 100%;
  }

  .filter-actions .el-button {
    flex: 1;
  }

  .filter-actions {
    width: 100%;
  }

  .table-tip {
    display: none;
  }

  .table-pagination {
    justify-content: center;
  }
}
</style>
