<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { Hide, Refresh, Search, View } from '@element-plus/icons-vue';
import { adminApi } from '@/api/admin';
import type { AdminReviewView, ReviewStatus } from '@/types/api';
import { formatDateTime, REVIEW_STATUS_META } from '@/utils/format';
import PageHeader from '@/components/PageHeader.vue';
import EmptyState from '@/components/EmptyState.vue';
import RatingStars from '@/components/RatingStars.vue';

const PAGE_SIZE = 10;
const reviews = ref<AdminReviewView[]>([]);
const total = ref(0);
const page = ref(1);
const loading = ref(true);
const error = ref('');
const status = ref<ReviewStatus | undefined>(undefined);
const productId = ref<number | undefined>(undefined);
const togglingId = ref<number | null>(null);
let requestSeq = 0;

async function loadReviews(): Promise<void> {
  const seq = ++requestSeq;
  loading.value = true;
  error.value = '';
  try {
    const result = await adminApi.reviews.list({
      status: status.value,
      productId: productId.value,
      page: page.value - 1,
      size: PAGE_SIZE,
    });
    if (seq !== requestSeq) return;
    reviews.value = result.items;
    total.value = result.total;
  } catch (loadError) {
    if (seq !== requestSeq) return;
    reviews.value = [];
    total.value = 0;
    error.value = loadError instanceof Error ? loadError.message : '评价列表加载失败';
  } finally {
    if (seq === requestSeq) loading.value = false;
  }
}

function applyFilters(): void {
  page.value = 1;
  void loadReviews();
}

function resetFilters(): void {
  status.value = undefined;
  productId.value = undefined;
  page.value = 1;
  void loadReviews();
}

function changePage(nextPage: number): void {
  page.value = nextPage;
  void loadReviews();
}

async function toggleVisibility(review: AdminReviewView): Promise<void> {
  const shouldShow = review.status === 'HIDDEN';
  togglingId.value = review.id;
  try {
    await adminApi.reviews.setVisibility(review.id, { visible: shouldShow });
    ElMessage.success(shouldShow ? '评价已恢复展示' : '评价已隐藏');
    await loadReviews();
  } catch (toggleError) {
    ElMessage.error(toggleError instanceof Error ? toggleError.message : '操作失败');
  } finally {
    togglingId.value = null;
  }
}

onMounted(loadReviews);
</script>

<template>
  <div class="fade-page">
    <PageHeader
      title="评价管理"
      description="审核并管理商品评价；隐藏或恢复后商品评分会同步重算。"
      kicker="REVIEW MODERATION"
    >
      <template #actions>
        <el-button :icon="Refresh" :loading="loading" @click="loadReviews">刷新列表</el-button>
      </template>
    </PageHeader>

    <section class="admin-panel filter-panel">
      <div class="filter-row">
        <el-select v-model="status" placeholder="全部状态" clearable class="filter-select">
          <el-option label="展示中" value="VISIBLE" />
          <el-option label="已隐藏" value="HIDDEN" />
        </el-select>
        <el-input-number
          v-model="productId"
          :min="1"
          :controls="false"
          placeholder="按商品 ID 筛选"
          class="filter-product"
        />
        <div class="filter-actions">
          <el-button type="primary" :icon="Search" @click="applyFilters">查询</el-button>
          <el-button @click="resetFilters">重置</el-button>
        </div>
      </div>
    </section>

    <div v-if="error" class="error-band">
      <span>{{ error }}</span>
      <el-button size="small" plain @click="loadReviews">重新加载</el-button>
    </div>

    <section class="admin-panel table-panel">
      <div class="table-head-row">
        <span class="table-count">共 {{ total }} 条评价</span>
        <span class="table-tip">隐藏评价会从顾客端商品详情中移除</span>
      </div>

      <el-table v-loading="loading" :data="reviews" size="small">
        <el-table-column label="评价" min-width="300">
          <template #default="{ row }">
            <div class="review-cell">
              <div class="review-cell-head">
                <strong>{{ row.userDisplayName }}</strong>
                <RatingStars :rating="row.rating" :show-value="true" :size="12" />
                <span class="review-date">{{ formatDateTime(row.createdAt) }}</span>
              </div>
              <p class="review-content" :title="row.content">
                {{ row.content || '（未填写文字评价）' }}
              </p>
              <span class="review-product">商品：{{ row.productTitle }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="商品 ID" width="80" align="center">
          <template #default="{ row }">{{ row.productId }}</template>
        </el-table-column>
        <el-table-column label="订单" width="100">
          <template #default="{ row }">
            <span class="order-ref">#{{ row.orderId }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag
              :type="REVIEW_STATUS_META[row.status as ReviewStatus].type"
              size="small"
              effect="plain"
            >
              {{ REVIEW_STATUS_META[row.status as ReviewStatus].label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button
              link
              :type="row.status === 'VISIBLE' ? 'danger' : 'primary'"
              size="small"
              :icon="row.status === 'VISIBLE' ? Hide : View"
              :loading="togglingId === row.id"
              @click="toggleVisibility(row)"
            >
              {{ row.status === 'VISIBLE' ? '隐藏' : '恢复展示' }}
            </el-button>
          </template>
        </el-table-column>
        <template #empty>
          <EmptyState
            compact
            title="暂无评价"
            description="顾客完成订单并发表评价后会展示在这里。"
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

.filter-select {
  width: 150px;
}

.filter-product {
  width: 170px;
}

.filter-product :deep(.el-input__inner) {
  text-align: left;
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

.review-cell {
  padding: 3px 0;
}

.review-cell-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 9px;
}

.review-cell-head strong {
  font-size: 11px;
  font-weight: 600;
}

.review-date {
  margin-left: auto;
  color: var(--muted);
  font-size: 8.5px;
}

.review-content {
  display: -webkit-box;
  max-width: 540px;
  margin-top: 5px;
  overflow: hidden;
  color: var(--ink-soft);
  font-size: 10.5px;
  line-height: 1.6;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.review-product {
  display: block;
  margin-top: 4px;
  color: var(--muted);
  font-size: 8.5px;
}

.order-ref {
  color: var(--muted);
  font-family: monospace;
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
  }

  .filter-select,
  .filter-product {
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

  .review-date {
    width: 100%;
    margin-left: 0;
  }
}
</style>
