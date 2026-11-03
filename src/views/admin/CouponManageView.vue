<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { Edit, Plus, Refresh } from '@element-plus/icons-vue';
import { adminApi } from '@/api/admin';
import type { CouponTemplateView } from '@/types/api';
import { formatCents, formatCouponValue } from '@/utils/money';
import { formatDate } from '@/utils/format';
import PageHeader from '@/components/PageHeader.vue';
import EmptyState from '@/components/EmptyState.vue';
import CouponFormDialog from '@/components/admin/CouponFormDialog.vue';

const PAGE_SIZE = 10;
const coupons = ref<CouponTemplateView[]>([]);
const total = ref(0);
const page = ref(1);
const loading = ref(true);
const error = ref('');
const dialogVisible = ref(false);
const editingCoupon = ref<CouponTemplateView | null>(null);

async function loadCoupons(): Promise<void> {
  loading.value = true;
  error.value = '';
  try {
    const result = await adminApi.coupons.list({ page: page.value - 1, size: PAGE_SIZE });
    coupons.value = result.items;
    total.value = result.total;
  } catch (loadError) {
    coupons.value = [];
    total.value = 0;
    error.value = loadError instanceof Error ? loadError.message : '优惠券加载失败';
  } finally {
    loading.value = false;
  }
}

function changePage(nextPage: number): void {
  page.value = nextPage;
  void loadCoupons();
}

function openCreate(): void {
  editingCoupon.value = null;
  dialogVisible.value = true;
}

function openEdit(coupon: CouponTemplateView): void {
  editingCoupon.value = coupon;
  dialogVisible.value = true;
}

onMounted(loadCoupons);
</script>

<template>
  <div class="fade-page">
    <PageHeader
      title="优惠券管理"
      description="配置优惠券模板、发放数量与有效期。"
      kicker="COUPON CAMPAIGNS"
    >
      <template #actions>
        <el-button :icon="Refresh" :loading="loading" @click="loadCoupons">刷新</el-button>
        <el-button type="primary" :icon="Plus" @click="openCreate">新建优惠券</el-button>
      </template>
    </PageHeader>

    <div v-if="error" class="error-band">
      <span>{{ error }}</span>
      <el-button size="small" plain @click="loadCoupons">重新加载</el-button>
    </div>

    <section class="admin-panel">
      <div class="table-head-row">
        <div>
          <span class="table-count">共 {{ total }} 个优惠券模板</span>
          <p class="table-sub">折扣券 value 以基点表示，1000 基点 = 10% 折扣。</p>
        </div>
        <span class="table-tip">金额存储为整数分</span>
      </div>

      <el-table v-loading="loading" :data="coupons" size="small">
        <el-table-column label="优惠券" min-width="200">
          <template #default="{ row }">
            <div class="coupon-cell">
              <span class="coupon-badge">
                {{ formatCouponValue(row.type, row.value) }}
              </span>
              <div>
                <strong>{{ row.name }}</strong>
                <small>{{ row.code }}</small>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="类型" width="85">
          <template #default="{ row }">
            {{ row.type === 'FIXED' ? '固定金额' : '折扣比例' }}
          </template>
        </el-table-column>
        <el-table-column label="使用门槛" width="105">
          <template #default="{ row }">
            <span class="threshold">满 {{ formatCents(row.minSpendCents) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="已领 / 总量" width="105" align="center">
          <template #default="{ row }">
            <span class="quantity-cell">{{ row.claimedQuantity }} / {{ row.totalQuantity }}</span>
          </template>
        </el-table-column>
        <el-table-column label="剩余" width="70" align="center">
          <template #default="{ row }">
            <span :class="{ 'remaining-low': row.remainingQuantity <= 5 }">
              {{ row.remainingQuantity }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="每人限" prop="perUserLimit" width="80" align="center" />
        <el-table-column label="有效期" min-width="175">
          <template #default="{ row }">
            <span class="validity-cell">
              {{ formatDate(row.validFrom) }} 至 {{ formatDate(row.validTo) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="85">
          <template #default="{ row }">
            <el-tag
              :type="row.status === 'ACTIVE' ? 'success' : 'info'"
              size="small"
              effect="plain"
            >
              {{ row.status === 'ACTIVE' ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="85" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" :icon="Edit" @click="openEdit(row)">
              编辑
            </el-button>
          </template>
        </el-table-column>
        <template #empty>
          <EmptyState
            compact
            title="还没有优惠券模板"
            description="创建第一张优惠券，为顾客带来专属优惠。"
          >
            <template #action>
              <el-button type="primary" plain :icon="Plus" @click="openCreate">新建优惠券</el-button>
            </template>
          </EmptyState>
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

    <CouponFormDialog
      v-model="dialogVisible"
      :coupon="editingCoupon"
      @saved="loadCoupons"
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

.table-head-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 14px;
  margin-bottom: 12px;
  border-bottom: 1px solid var(--line);
}

.table-count {
  color: var(--ink);
  font-size: 11.5px;
  font-weight: 600;
}

.table-sub {
  margin-top: 3px;
  color: var(--muted);
  font-size: 9px;
}

.table-tip {
  color: var(--muted);
  font-size: 9px;
}

.coupon-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.coupon-badge {
  display: grid;
  flex: 0 0 auto;
  width: 54px;
  height: 38px;
  color: var(--brand-strong);
  background:
    radial-gradient(circle at 30% 20%, rgba(232, 93, 42, 0.12), transparent 60%),
    var(--brand-soft);
  border: 1px dashed #e5c3ae;
  border-radius: 7px;
  font-family: var(--font-display);
  font-size: 11px;
  font-weight: 600;
  place-items: center;
}

.coupon-cell > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 1px;
}

.coupon-cell strong {
  overflow: hidden;
  font-size: 11.5px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.coupon-cell small {
  overflow: hidden;
  color: var(--muted);
  font-family: monospace;
  font-size: 8.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.threshold,
.quantity-cell {
  color: var(--ink-soft);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
}

.remaining-low {
  color: var(--danger);
  font-weight: 600;
}

.validity-cell {
  color: var(--muted);
  font-size: 9px;
  font-variant-numeric: tabular-nums;
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

  .table-tip {
    display: none;
  }

  .table-pagination {
    justify-content: center;
  }
}
</style>
