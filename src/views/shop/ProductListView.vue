<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Search } from '@element-plus/icons-vue';
import { catalogApi } from '@/api/catalog';
import type { Category, ProductSort, ProductSummary } from '@/types/api';
import ProductCard from '@/components/ProductCard.vue';
import EmptyState from '@/components/EmptyState.vue';
import PageHeader from '@/components/PageHeader.vue';
import { SORT_OPTIONS } from '@/utils/format';

const PAGE_SIZE = 12;
const VALID_SORTS: ProductSort[] = ['newest', 'sales_desc', 'price_asc', 'price_desc'];

const route = useRoute();
const router = useRouter();
const categories = ref<Category[]>([]);
const products = ref<ProductSummary[]>([]);
const total = ref(0);
const loading = ref(true);
const error = ref('');
const searchText = ref('');
let requestSeq = 0;

function queryString(key: string): string {
  const value = route.query[key];
  return typeof value === 'string' ? value : '';
}

const keyword = computed(() => queryString('q'));
const selectedCategoryId = computed(() => {
  const raw = Number(queryString('categoryId'));
  return Number.isInteger(raw) && raw > 0 ? raw : null;
});
const sort = computed<ProductSort>(() => {
  const raw = queryString('sort') as ProductSort;
  return VALID_SORTS.includes(raw) ? raw : 'newest';
});
const page = computed(() => {
  const raw = Number(queryString('page'));
  return Number.isInteger(raw) && raw > 0 ? raw : 1;
});
const selectedCategory = computed(
  () => categories.value.find((category) => category.id === selectedCategoryId.value) ?? null,
);

const heading = computed(() => {
  if (keyword.value) return `搜索“${keyword.value}”`;
  if (selectedCategory.value) return selectedCategory.value.name;
  return '全部好物';
});

function updateQuery(patch: Record<string, string | undefined>, resetPage = false): void {
  const next: Record<string, string> = {};
  const merged = { ...route.query, ...patch };
  for (const [key, value] of Object.entries(merged)) {
    if (value === undefined || value === '' || (resetPage && key === 'page')) continue;
    if (typeof value === 'string') next[key] = value;
  }
  if (!next.sort || next.sort === 'newest') delete next.sort;
  if (resetPage) delete next.page;
  void router.push({ path: '/products', query: next });
}

function submitSearch(): void {
  updateQuery({ q: searchText.value.trim() || undefined }, true);
}

function selectCategory(id: number | null): void {
  updateQuery({ categoryId: id ? String(id) : undefined }, true);
}

function selectSort(value: ProductSort): void {
  updateQuery({ sort: value === 'newest' ? undefined : value }, true);
}

function changePage(nextPage: number): void {
  updateQuery({ page: nextPage > 1 ? String(nextPage) : undefined });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetFilters(): void {
  searchText.value = '';
  void router.push({ path: '/products' });
}

async function loadCategories(): Promise<void> {
  try {
    categories.value = await catalogApi.categories();
  } catch {
    categories.value = [];
  }
}

async function loadProducts(): Promise<void> {
  const seq = ++requestSeq;
  loading.value = true;
  error.value = '';
  try {
    const result = await catalogApi.products({
      q: keyword.value || undefined,
      categoryId: selectedCategoryId.value ?? undefined,
      sort: sort.value,
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
    error.value = loadError instanceof Error ? loadError.message : '商品加载失败，请稍后重试';
  } finally {
    if (seq === requestSeq) loading.value = false;
  }
}

watch(
  keyword,
  (value) => {
    searchText.value = value;
  },
  { immediate: true },
);

watch(
  () => [route.query.q, route.query.categoryId, route.query.sort, route.query.page],
  () => {
    void loadProducts();
  },
  { immediate: true },
);

onMounted(loadCategories);
</script>

<template>
  <div class="container page-shell fade-page">
    <PageHeader
      :title="heading"
      :description="
        keyword
          ? '为你找到与关键词相关的精选好物。'
          : selectedCategory
            ? `浏览「${selectedCategory.name}」分类下的精选商品。`
            : '慢慢逛，总有一件刚好适合你。'
      "
      kicker="THE COLLECTION"
    />

    <section class="list-toolbar surface-card">
      <form class="list-search" role="search" @submit.prevent="submitSearch">
        <el-input
          v-model="searchText"
          placeholder="在全部商品中搜索…"
          clearable
          aria-label="搜索商品"
          @clear="submitSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-button type="primary" native-type="submit">搜索</el-button>
      </form>

      <div class="category-filter" aria-label="分类筛选">
        <button
          type="button"
          class="filter-chip"
          :class="{ active: !selectedCategoryId }"
          @click="selectCategory(null)"
        >
          全部
        </button>
        <button
          v-for="category in categories"
          :key="category.id"
          type="button"
          class="filter-chip"
          :class="{ active: selectedCategoryId === category.id }"
          @click="selectCategory(category.id)"
        >
          {{ category.name }}
        </button>
      </div>

      <div class="toolbar-bottom">
        <span class="result-count">
          <template v-if="loading">正在挑选好物…</template>
          <template v-else>共 <strong>{{ total }}</strong> 件商品</template>
        </span>
        <div class="sort-tabs" aria-label="排序方式">
          <button
            v-for="option in SORT_OPTIONS"
            :key="option.value"
            type="button"
            :class="{ active: sort === option.value }"
            @click="selectSort(option.value)"
          >
            {{ option.label }}
          </button>
        </div>
      </div>
    </section>

    <div v-if="error" class="error-band list-error">
      <span>{{ error }}</span>
      <el-button size="small" plain @click="loadProducts">重新加载</el-button>
    </div>

    <div v-if="loading" class="loading-grid product-grid-wrap">
      <div v-for="item in 8" :key="item" class="skeleton-card">
        <div class="skeleton-image"></div>
        <div class="skeleton-lines">
          <div class="skeleton-line"></div>
          <div class="skeleton-line short"></div>
          <div class="skeleton-line tiny"></div>
        </div>
      </div>
    </div>

    <template v-else-if="products.length">
      <div class="product-grid">
        <ProductCard v-for="product in products" :key="product.id" :product="product" />
      </div>

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
    </template>

    <div v-else-if="!error" class="surface-card list-empty">
      <EmptyState
        :title="keyword ? '没有找到相关商品' : '这个分类还没有商品'"
        description="换个关键词或分类试试，也许会有新的发现。"
      >
        <template #action>
          <el-button round @click="resetFilters">查看全部商品</el-button>
        </template>
      </EmptyState>
    </div>
  </div>
</template>

<style scoped>
.list-toolbar {
  padding: 20px;
  margin-bottom: 24px;
}

.list-search {
  display: flex;
  gap: 8px;
  max-width: 520px;
}

.list-search :deep(.el-input__wrapper) {
  background: #f8f5f0;
  box-shadow: none;
}

.list-search :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px var(--brand) inset;
}

.category-filter {
  display: flex;
  overflow-x: auto;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 16px;
  margin-top: 16px;
  border-top: 1px solid var(--line);
  scrollbar-width: none;
}

.category-filter::-webkit-scrollbar {
  display: none;
}

.toolbar-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding-top: 14px;
}

.result-count {
  color: var(--muted);
  font-size: 12px;
}

.result-count strong {
  color: var(--ink);
  font-weight: 600;
}

.list-error {
  margin-bottom: 20px;
}

.product-grid-wrap {
  margin-bottom: 20px;
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 20px;
}

.pagination-wrap {
  display: flex;
  justify-content: center;
  padding-top: 38px;
}

.list-empty {
  margin-top: 4px;
}

@media (max-width: 1024px) {
  .product-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .list-toolbar {
    padding: 15px;
    margin-bottom: 16px;
  }

  .list-search {
    max-width: none;
  }

  .category-filter {
    flex-wrap: nowrap;
    margin-top: 13px;
    padding-top: 13px;
  }

  .toolbar-bottom {
    align-items: flex-start;
    flex-direction: column;
    gap: 10px;
  }

  .sort-tabs {
    width: 100%;
  }

  .sort-tabs button {
    flex: 1;
    padding: 6px 7px;
  }

  .product-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .pagination-wrap {
    padding-top: 28px;
  }
}
</style>
