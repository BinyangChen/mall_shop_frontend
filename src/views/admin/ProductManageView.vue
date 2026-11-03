<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Delete, Edit, Plus, Refresh, Search } from '@element-plus/icons-vue';
import { adminApi } from '@/api/admin';
import type { AdminProductDetail, Category, ProductStatus } from '@/types/api';
import { fallbackImage, PRODUCT_STATUS_META } from '@/utils/format';
import { formatCents } from '@/utils/money';
import PageHeader from '@/components/PageHeader.vue';
import EmptyState from '@/components/EmptyState.vue';
import ProductFormDialog from '@/components/admin/ProductFormDialog.vue';

const PAGE_SIZE = 10;
const products = ref<AdminProductDetail[]>([]);
const categories = ref<Category[]>([]);
const total = ref(0);
const page = ref(1);
const loading = ref(true);
const error = ref('');

const keyword = ref('');
const categoryId = ref<number | undefined>(undefined);
const status = ref<ProductStatus | undefined>(undefined);
let requestSeq = 0;

const dialogVisible = ref(false);
const editingProduct = ref<AdminProductDetail | null>(null);
const stockDialogVisible = ref(false);
const stockProduct = ref<AdminProductDetail | null>(null);
const stockValue = ref(0);
const stockSaving = ref(false);
const togglingId = ref<number | null>(null);

const hasFilters = computed(
  () => Boolean(keyword.value.trim() || categoryId.value || status.value),
);

async function loadCategories(): Promise<void> {
  try {
    categories.value = await adminApi.categories.list();
  } catch (loadError) {
    ElMessage.error(loadError instanceof Error ? loadError.message : '分类加载失败');
  }
}

async function loadProducts(): Promise<void> {
  const seq = ++requestSeq;
  loading.value = true;
  error.value = '';
  try {
    const result = await adminApi.products.list({
      q: keyword.value.trim() || undefined,
      categoryId: categoryId.value,
      status: status.value,
      page: page.value - 1,
      size: PAGE_SIZE,
    });
    if (seq !== requestSeq) return;
    products.value = result.items;
    total.value = result.total;
  } catch (loadError) {
    if (seq !== requestSeq) return;
    products.value = [];
    total.value = 0;
    error.value = loadError instanceof Error ? loadError.message : '商品加载失败';
  } finally {
    if (seq === requestSeq) loading.value = false;
  }
}

function applyFilters(): void {
  page.value = 1;
  void loadProducts();
}

function resetFilters(): void {
  keyword.value = '';
  categoryId.value = undefined;
  status.value = undefined;
  page.value = 1;
  void loadProducts();
}

function changePage(nextPage: number): void {
  page.value = nextPage;
  void loadProducts();
}

function openCreate(): void {
  editingProduct.value = null;
  dialogVisible.value = true;
}

function openEdit(product: AdminProductDetail): void {
  editingProduct.value = product;
  dialogVisible.value = true;
}

async function onSaved(): Promise<void> {
  await loadProducts();
}

async function toggleStatus(product: AdminProductDetail): Promise<void> {
  const nextStatus: ProductStatus = product.status === 'ON_SALE' ? 'OFF_SALE' : 'ON_SALE';
  if (nextStatus === 'OFF_SALE') {
    try {
      await ElMessageBox.confirm(
        `确定下架「${product.title}」吗？下架后顾客将无法购买。`,
        '下架商品',
        {
          confirmButtonText: '确认下架',
          cancelButtonText: '取消',
          type: 'warning',
        },
      );
    } catch {
      return;
    }
  }
  togglingId.value = product.id;
  try {
    await adminApi.products.update(product.id, {
      categoryId: product.categoryId,
      title: product.title,
      subtitle: product.subtitle,
      description: product.description,
      priceCents: product.priceCents,
      originalPriceCents: product.originalPriceCents,
      imageUrl: product.imageUrl,
      images: product.images,
      status: nextStatus,
    });
    ElMessage.success(nextStatus === 'ON_SALE' ? '商品已上架' : '商品已下架');
    await loadProducts();
  } catch (toggleError) {
    ElMessage.error(toggleError instanceof Error ? toggleError.message : '状态更新失败');
  } finally {
    togglingId.value = null;
  }
}

function openStockDialog(product: AdminProductDetail): void {
  stockProduct.value = product;
  stockValue.value = product.stock;
  stockDialogVisible.value = true;
}

async function saveStock(): Promise<void> {
  if (!stockProduct.value || stockSaving.value) return;
  if (!Number.isInteger(stockValue.value) || stockValue.value < 0) {
    ElMessage.warning('库存必须为不小于 0 的整数');
    return;
  }
  stockSaving.value = true;
  try {
    await adminApi.products.adjustStock(stockProduct.value.id, { stock: stockValue.value });
    ElMessage.success('库存已更新');
    stockDialogVisible.value = false;
    await loadProducts();
  } catch (stockError) {
    ElMessage.error(stockError instanceof Error ? stockError.message : '库存更新失败');
  } finally {
    stockSaving.value = false;
  }
}

async function deleteProduct(product: AdminProductDetail): Promise<void> {
  try {
    await ElMessageBox.confirm(
      `确定删除「${product.title}」吗？删除后商品将从管理中移除（软删除）。`,
      '删除商品',
      {
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        type: 'warning',
      },
    );
  } catch {
    return;
  }
  try {
    await adminApi.products.remove(product.id);
    ElMessage.success('商品已删除');
    if (products.value.length === 1 && page.value > 1) page.value -= 1;
    await loadProducts();
  } catch (deleteError) {
    ElMessage.error(deleteError instanceof Error ? deleteError.message : '删除失败');
  }
}

onMounted(async () => {
  await Promise.allSettled([loadCategories(), loadProducts()]);
});
</script>

<template>
  <div class="fade-page">
    <PageHeader
      title="商品管理"
      description="维护商品信息、库存与上下架状态。"
      kicker="PRODUCT CATALOG"
    >
      <template #actions>
        <el-button type="primary" :icon="Plus" @click="openCreate">新增商品</el-button>
      </template>
    </PageHeader>

    <section class="admin-panel filter-panel">
      <div class="filter-row">
        <el-input
          v-model="keyword"
          placeholder="搜索商品标题"
          clearable
          class="filter-search"
          @keyup.enter="applyFilters"
        >
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <el-select v-model="categoryId" placeholder="全部分类" clearable class="filter-select">
          <el-option
            v-for="category in categories"
            :key="category.id"
            :label="category.name"
            :value="category.id"
          />
        </el-select>
        <el-select v-model="status" placeholder="全部状态" clearable class="filter-select">
          <el-option label="在售" value="ON_SALE" />
          <el-option label="已下架" value="OFF_SALE" />
          <el-option label="草稿" value="DRAFT" />
        </el-select>
        <div class="filter-actions">
          <el-button type="primary" @click="applyFilters">查询</el-button>
          <el-button :icon="Refresh" :disabled="!hasFilters" @click="resetFilters">重置</el-button>
        </div>
      </div>
    </section>

    <div v-if="error" class="error-band table-error">
      <span>{{ error }}</span>
      <el-button size="small" plain @click="loadProducts">重新加载</el-button>
    </div>

    <section class="admin-panel table-panel">
      <div class="table-head-row">
        <span class="table-count">共 {{ total }} 件商品</span>
        <span class="table-tip">价格以元展示，存储为整数分</span>
      </div>

      <el-table v-loading="loading" :data="products" class="admin-table" size="small">
        <el-table-column label="商品" min-width="270">
          <template #default="{ row }">
            <div class="product-cell">
              <img :src="row.imageUrl || ''" :alt="row.title" @error="fallbackImage" />
              <div class="product-cell-copy">
                <strong>{{ row.title }}</strong>
                <span>{{ row.subtitle || '暂无副标题' }}</span>
                <small>ID {{ row.id }}</small>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="分类" prop="categoryName" width="100" />
        <el-table-column label="售价" width="110">
          <template #default="{ row }">
            <strong class="table-price">{{ formatCents(row.priceCents) }}</strong>
          </template>
        </el-table-column>
        <el-table-column label="库存" width="85" align="center">
          <template #default="{ row }">
            <span :class="{ 'stock-warning': row.stock <= 5 }">{{ row.stock }}</span>
          </template>
        </el-table-column>
        <el-table-column label="销量" prop="salesCount" width="75" align="center" />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag
              :type="PRODUCT_STATUS_META[row.status as ProductStatus].type"
              size="small"
              effect="plain"
            >
              {{ PRODUCT_STATUS_META[row.status as ProductStatus].label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="250" fixed="right">
          <template #default="{ row }">
            <div class="row-actions">
              <el-button link type="primary" size="small" :icon="Edit" @click="openEdit(row)">
                编辑
              </el-button>
              <el-button
                link
                type="primary"
                size="small"
                :loading="togglingId === row.id"
                @click="toggleStatus(row)"
              >
                {{ row.status === 'ON_SALE' ? '下架' : '上架' }}
              </el-button>
              <el-button link size="small" @click="openStockDialog(row)">库存</el-button>
              <el-button link type="danger" size="small" :icon="Delete" @click="deleteProduct(row)">
                删除
              </el-button>
            </div>
          </template>
        </el-table-column>
        <template #empty>
          <EmptyState
            compact
            title="暂无符合条件的商品"
            description="调整筛选条件，或创建一件新商品。"
          >
            <template #action>
              <el-button type="primary" plain :icon="Plus" @click="openCreate">新增商品</el-button>
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

    <ProductFormDialog
      v-model="dialogVisible"
      :product="editingProduct"
      :categories="categories"
      @saved="onSaved"
    />

    <el-dialog v-model="stockDialogVisible" title="调整库存" width="400px" append-to-body>
      <div v-if="stockProduct" class="stock-dialog">
        <div class="stock-product">
          <strong>{{ stockProduct.title }}</strong>
          <span>当前库存：{{ stockProduct.stock }} 件</span>
        </div>
        <label class="stock-label" for="stock-value">新库存（绝对值）</label>
        <el-input-number
          id="stock-value"
          v-model="stockValue"
          :min="0"
          :max="999999"
          controls-position="right"
          style="width: 100%"
        />
        <p class="form-hint">库存不得小于已预留数量，具体以服务端校验为准。</p>
      </div>
      <template #footer>
        <el-button :disabled="stockSaving" @click="stockDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="stockSaving" @click="saveStock">保存库存</el-button>
      </template>
    </el-dialog>
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
  width: 260px;
}

.filter-select {
  width: 145px;
}

.filter-actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

.filter-actions .el-button {
  margin: 0;
}

.table-error {
  margin-bottom: 12px;
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

.admin-table {
  width: 100%;
}

.product-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.product-cell img {
  flex: 0 0 auto;
  width: 43px;
  height: 43px;
  object-fit: cover;
  background: #f3efe9;
  border-radius: 7px;
}

.product-cell-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 1px;
}

.product-cell-copy strong {
  overflow: hidden;
  font-size: 11.5px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-cell-copy span {
  overflow: hidden;
  color: var(--muted);
  font-size: 9px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-cell-copy small {
  color: #c0b8ad;
  font-size: 8px;
}

.table-price {
  color: var(--ink);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.stock-warning {
  color: var(--danger);
  font-weight: 600;
}

.row-actions {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
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

.stock-product {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 11px 13px;
  margin-bottom: 15px;
  background: #faf7f2;
  border-radius: 8px;
}

.stock-product strong {
  overflow: hidden;
  font-size: 11.5px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stock-product span {
  flex-shrink: 0;
  color: var(--muted);
  font-size: 9.5px;
}

.stock-label {
  display: block;
  margin-bottom: 6px;
  color: var(--ink-soft);
  font-size: 11.5px;
  font-weight: 500;
}

@media (max-width: 900px) {
  .filter-search {
    flex: 1;
    min-width: 180px;
  }

  .filter-actions {
    margin-left: 0;
  }
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
}
</style>
