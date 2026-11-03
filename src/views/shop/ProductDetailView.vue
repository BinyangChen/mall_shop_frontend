<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import {
  ArrowRight,
  Clock,
  Goods,
  Lock,
  ShoppingCart,
  Van,
} from '@element-plus/icons-vue';
import { catalogApi } from '@/api/catalog';
import type { Page, ProductDetail, Review } from '@/types/api';
import { isNormalizedApiError } from '@/api/http';
import { useAuthStore } from '@/stores/auth';
import { useCartStore } from '@/stores/cart';
import { formatCents } from '@/utils/money';
import { formatDateTime, fallbackImage } from '@/utils/format';
import RatingStars from '@/components/RatingStars.vue';
import EmptyState from '@/components/EmptyState.vue';
import MobileActionBar from '@/components/MobileActionBar.vue';

const REVIEW_PAGE_SIZE = 5;

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const cart = useCartStore();

const product = ref<ProductDetail | null>(null);
const loading = ref(true);
const error = ref('');
const notFound = ref(false);
const quantity = ref(1);
const currentImageIndex = ref(0);
const activeTab = ref('description');
const adding = ref(false);
const buying = ref(false);

const reviews = ref<Page<Review> | null>(null);
const reviewsLoading = ref(false);
const reviewsError = ref('');
const reviewPage = ref(1);

const productId = computed(() => Number(route.params.id));

const gallery = computed(() => {
  if (!product.value) return [];
  const values = [product.value.imageUrl, ...(product.value.images ?? [])].filter(
    (value): value is string => Boolean(value),
  );
  return Array.from(new Set(values));
});

const currentImage = computed(() => gallery.value[currentImageIndex.value] ?? '');
const soldOut = computed(() => (product.value?.stock ?? 0) <= 0);
const discountLabel = computed(() => {
  if (!product.value?.originalPriceCents || !product.value.priceCents) return '';
  if (product.value.originalPriceCents <= product.value.priceCents) return '';
  return `${((product.value.priceCents / product.value.originalPriceCents) * 10).toFixed(1)}折`;
});
const maxQuantity = computed(() => Math.max(1, Math.min(99, product.value?.stock ?? 1)));

async function loadProduct(): Promise<void> {
  loading.value = true;
  error.value = '';
  notFound.value = false;
  try {
    product.value = await catalogApi.product(productId.value);
    quantity.value = 1;
    currentImageIndex.value = 0;
  } catch (loadError) {
    if (
      isNormalizedApiError(loadError) &&
      (loadError.code === 'PRODUCT_NOT_FOUND' || loadError.code === 'NOT_FOUND')
    ) {
      notFound.value = true;
    } else {
      error.value = loadError instanceof Error ? loadError.message : '商品加载失败';
    }
  } finally {
    loading.value = false;
  }
}

async function loadReviews(page = 1): Promise<void> {
  reviewsLoading.value = true;
  reviewsError.value = '';
  try {
    reviews.value = await catalogApi.reviews(productId.value, {
      page: page - 1,
      size: REVIEW_PAGE_SIZE,
    });
    reviewPage.value = page;
  } catch (loadError) {
    reviewsError.value = loadError instanceof Error ? loadError.message : '评价加载失败';
  } finally {
    reviewsLoading.value = false;
  }
}

function ensureLoggedIn(): boolean {
  if (auth.isLoggedIn) return true;
  ElMessage.info('请先登录后再购买');
  void router.push({ path: '/login', query: { redirect: route.fullPath } });
  return false;
}

async function addToCart(goCart = false): Promise<void> {
  if (!product.value || soldOut.value || !ensureLoggedIn()) return;
  const quantityToAdd = Math.max(1, Math.min(maxQuantity.value, Number(quantity.value) || 1));
  const setter = goCart ? buying : adding;
  setter.value = true;
  try {
    await cart.addItem(product.value.id, quantityToAdd);
    if (goCart) {
      await router.push('/cart');
    } else {
      ElMessage.success('已加入购物车');
    }
  } catch (addError) {
    ElMessage.error(addError instanceof Error ? addError.message : '加入购物车失败');
  } finally {
    setter.value = false;
  }
}

function selectImage(index: number): void {
  currentImageIndex.value = index;
}

function changeReviewPage(page: number): void {
  void loadReviews(page);
}

onMounted(async () => {
  await loadProduct();
  if (!notFound.value && !error.value) {
    void loadReviews(1);
  }
});
</script>

<template>
  <div class="container page-shell detail-page fade-page mobile-action-page">
    <div v-if="loading" class="detail-skeleton">
      <div class="skeleton-gallery"></div>
      <div class="skeleton-detail">
        <div class="skeleton-line tiny"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line short"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line short"></div>
        <div class="skeleton-actions"></div>
      </div>
    </div>

    <div v-else-if="notFound" class="surface-card">
      <EmptyState
        title="商品不存在或已下架"
        description="它可能已经被带走，去看看其他好物吧。"
      >
        <template #action>
          <el-button type="primary" round @click="router.push('/products')">
            浏览全部商品
          </el-button>
        </template>
      </EmptyState>
    </div>

    <div v-else-if="error" class="surface-card">
      <EmptyState title="商品加载失败" :description="error">
        <template #action>
          <el-button round @click="loadProduct">重新加载</el-button>
        </template>
      </EmptyState>
    </div>

    <template v-else-if="product">
      <nav class="breadcrumb" aria-label="面包屑">
        <RouterLink to="/">首页</RouterLink>
        <span>/</span>
        <RouterLink :to="{ path: '/products', query: { categoryId: String(product.categoryId) } }">
          {{ product.categoryName }}
        </RouterLink>
        <span>/</span>
        <span class="current">{{ product.title }}</span>
      </nav>

      <section class="detail-hero">
        <div class="gallery">
          <div class="main-image">
            <el-image
              v-if="currentImage"
              :src="currentImage"
              :alt="product.title"
              :preview-src-list="gallery"
              :initial-index="currentImageIndex"
              fit="cover"
              preview-teleported
              hide-on-click-modal
              class="gallery-image"
            >
              <template #error>
                <div class="image-placeholder">
                  <el-icon :size="44"><Goods /></el-icon>
                </div>
              </template>
            </el-image>
            <div v-else class="image-placeholder">
              <el-icon :size="48"><Goods /></el-icon>
            </div>
            <span v-if="discountLabel" class="gallery-discount">{{ discountLabel }}</span>
            <span v-if="soldOut" class="gallery-sold">已售罄</span>
          </div>
          <div v-if="gallery.length > 1" class="thumbnails">
            <button
              v-for="(image, index) in gallery"
              :key="`${image}-${index}`"
              type="button"
              :class="['thumb', { active: index === currentImageIndex }]"
              :aria-label="`查看第 ${index + 1} 张图片`"
              @click="selectImage(index)"
            >
              <img :src="image" :alt="`${product.title} 图片 ${index + 1}`" @error="fallbackImage" />
            </button>
          </div>
        </div>

        <div class="product-info">
          <div class="info-kicker">
            <RouterLink
              :to="{ path: '/products', query: { categoryId: String(product.categoryId) } }"
              class="category-pill"
            >
              {{ product.categoryName }}
            </RouterLink>
            <span class="sales-note">已售 {{ product.salesCount }} 件</span>
          </div>

          <h1>{{ product.title }}</h1>
          <p v-if="product.subtitle" class="subtitle">{{ product.subtitle }}</p>

          <div class="rating-line">
            <RatingStars :rating="product.ratingAvg" :count="product.ratingCount" :size="15" />
            <span class="rating-divider"></span>
            <span>{{ product.ratingCount > 0 ? '真实用户评价' : '等待第一条评价' }}</span>
          </div>

          <div class="price-panel">
            <div class="price-main">
              <span class="price">{{ formatCents(product.priceCents) }}</span>
              <span
                v-if="product.originalPriceCents && product.originalPriceCents > product.priceCents"
                class="price-original"
              >
                {{ formatCents(product.originalPriceCents) }}
              </span>
              <span v-if="discountLabel" class="save-tag">省 {{ discountLabel }}</span>
            </div>
            <span class="price-note">价格已含税 · 结算时以服务端报价为准</span>
          </div>

          <div class="stock-line">
            <span :class="['stock-dot', { empty: soldOut }]"></span>
            <span v-if="soldOut" class="text-danger">暂时售罄</span>
            <span v-else-if="product.stock <= 10" class="stock-low">
              库存紧张，仅剩 {{ product.stock }} 件
            </span>
            <span v-else>现货充足 · 库存 {{ product.stock }} 件</span>
          </div>

          <div class="purchase-panel">
            <div class="quantity-row">
              <span class="quantity-label">数量</span>
              <el-input-number
                v-model="quantity"
                :min="1"
                :max="maxQuantity"
                :disabled="soldOut"
                controls-position="right"
                aria-label="购买数量"
              />
              <span class="quantity-hint">单次最多 99 件</span>
            </div>

            <div class="purchase-actions">
              <el-button
                class="cart-btn"
                size="large"
                :disabled="soldOut"
                :loading="adding"
                @click="addToCart(false)"
              >
                <el-icon><ShoppingCart /></el-icon>
                加入购物车
              </el-button>
              <el-button
                type="primary"
                size="large"
                class="buy-btn"
                :disabled="soldOut"
                :loading="buying"
                @click="addToCart(true)"
              >
                {{ soldOut ? '暂时售罄' : '立即购买' }}
                <el-icon v-if="!soldOut"><ArrowRight /></el-icon>
              </el-button>
            </div>
          </div>

          <div class="service-list">
            <div>
              <el-icon><Lock /></el-icon>
              <span><strong>安心下单</strong> · 服务端全程校验库存与金额</span>
            </div>
            <div>
              <el-icon><Van /></el-icon>
              <span><strong>物流可查</strong> · 发货后可在订单中查看运单</span>
            </div>
            <div>
              <el-icon><Clock /></el-icon>
              <span><strong>售后无忧</strong> · 符合规则可申请退款</span>
            </div>
          </div>
        </div>
      </section>

      <section class="detail-content surface-card">
        <el-tabs v-model="activeTab" class="detail-tabs">
          <el-tab-pane label="商品详情" name="description">
            <div class="description-panel">
              <div v-if="product.description" class="description-text">
                {{ product.description }}
              </div>
              <EmptyState
                v-else
                compact
                title="暂无详细描述"
                description="这件好物还没有更多文字介绍。"
              />
              <div class="detail-meta">
                <span>上架时间：{{ formatDateTime(product.createdAt) }}</span>
                <span>商品编号：{{ product.id }}</span>
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane :label="`用户评价 (${product.ratingCount})`" name="reviews">
            <div class="reviews-panel">
              <div class="review-summary">
                <div class="summary-score">
                  <strong>{{ product.ratingAvg > 0 ? product.ratingAvg.toFixed(1) : '—' }}</strong>
                  <div>
                    <RatingStars
                      :rating="product.ratingAvg"
                      :count="product.ratingCount"
                      :show-value="false"
                      :size="14"
                    />
                    <small>基于 {{ product.ratingCount }} 条评价</small>
                  </div>
                </div>
                <span class="summary-note">评价仅来自已完成的真实订单</span>
              </div>

              <div v-if="reviewsError" class="error-band review-error">
                <span>{{ reviewsError }}</span>
                <el-button size="small" plain @click="loadReviews(reviewPage)">重试</el-button>
              </div>

              <div v-if="reviewsLoading" class="review-skeletons">
                <div v-for="item in 3" :key="item" class="review-skeleton">
                  <div class="review-skeleton-head">
                    <span></span>
                    <div>
                      <div class="skeleton-line tiny"></div>
                      <div class="skeleton-line short"></div>
                    </div>
                  </div>
                  <div class="skeleton-line"></div>
                  <div class="skeleton-line short"></div>
                </div>
              </div>

              <template v-else-if="reviews?.items.length">
                <article v-for="review in reviews.items" :key="review.id" class="review-item">
                  <div class="review-avatar">{{ review.userDisplayName.slice(0, 1) }}</div>
                  <div class="review-body">
                    <div class="review-head">
                      <div>
                        <strong>{{ review.userDisplayName }}</strong>
                        <RatingStars :rating="review.rating" :show-value="false" :size="12" />
                      </div>
                      <time>{{ formatDateTime(review.createdAt) }}</time>
                    </div>
                    <p>{{ review.content || '用户未填写文字评价。' }}</p>
                  </div>
                </article>

                <div v-if="(reviews.totalPages ?? 0) > 1" class="review-pagination">
                  <el-pagination
                    :current-page="reviewPage"
                    :page-size="REVIEW_PAGE_SIZE"
                    :total="reviews.total"
                    layout="prev, pager, next"
                    small
                    @current-change="changeReviewPage"
                  />
                </div>
              </template>

              <EmptyState
                v-else
                compact
                title="还没有评价"
                description="完成订单后，欢迎分享你的真实体验。"
              />
            </div>
          </el-tab-pane>
        </el-tabs>
      </section>

      <MobileActionBar aria-label="商品购买操作">
        <template #info>
          <span class="bar-price">{{ formatCents(product.priceCents) }}</span>
          <small>数量 × {{ quantity }}</small>
        </template>
        <el-button :disabled="soldOut" :loading="adding" @click="addToCart(false)">
          加入购物车
        </el-button>
        <el-button
          type="primary"
          :disabled="soldOut"
          :loading="buying"
          @click="addToCart(true)"
        >
          {{ soldOut ? '暂时售罄' : '立即购买' }}
        </el-button>
      </MobileActionBar>
    </template>
  </div>
</template>

<style scoped>
.breadcrumb {
  display: flex;
  overflow: hidden;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 22px;
  color: var(--muted);
  font-size: 11.5px;
}

.breadcrumb a:hover {
  color: var(--brand);
}

.breadcrumb .current {
  max-width: 360px;
  overflow: hidden;
  color: var(--ink-soft);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.02fr) minmax(0, 0.98fr);
  gap: clamp(30px, 5vw, 64px);
  padding: 24px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
}

.gallery {
  min-width: 0;
}

.main-image {
  position: relative;
  overflow: hidden;
  aspect-ratio: 1 / 1;
  background: #f4f0e9;
  border-radius: 16px;
}

.gallery-image {
  width: 100%;
  height: 100%;
}

.gallery-image :deep(img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.45s ease;
}

.main-image:hover .gallery-image :deep(img) {
  transform: scale(1.015);
}

.image-placeholder {
  display: grid;
  width: 100%;
  height: 100%;
  color: #bcb2a4;
  background:
    radial-gradient(circle at 35% 28%, #fffaf2, transparent 48%),
    #f1ece4;
  place-items: center;
}

.gallery-discount {
  position: absolute;
  top: 16px;
  left: 16px;
  padding: 5px 11px;
  color: #fff;
  background: var(--brand);
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
}

.gallery-sold {
  position: absolute;
  inset: 0;
  display: grid;
  color: #fff;
  background: rgba(23, 32, 51, 0.45);
  font-size: 22px;
  font-weight: 600;
  letter-spacing: 0.14em;
  place-items: center;
}

.thumbnails {
  display: flex;
  overflow-x: auto;
  gap: 9px;
  padding-top: 12px;
}

.thumb {
  flex: 0 0 auto;
  width: 68px;
  height: 68px;
  overflow: hidden;
  padding: 2px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 9px;
  cursor: pointer;
  transition: border-color 0.18s ease;
}

.thumb.active {
  border-color: var(--brand);
  box-shadow: 0 0 0 2px rgba(232, 93, 42, 0.1);
}

.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 6px;
}

.product-info {
  display: flex;
  min-width: 0;
  flex-direction: column;
  padding: 6px 0;
}

.info-kicker {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.category-pill {
  display: inline-flex;
  padding: 4px 10px;
  color: var(--brand-strong);
  background: var(--brand-soft);
  border-radius: 5px;
  font-size: 10.5px;
  font-weight: 600;
}

.category-pill:hover {
  background: #f9e4d9;
}

.sales-note {
  color: var(--muted);
  font-size: 11.5px;
}

.product-info h1 {
  margin-top: 16px;
  font-family: var(--font-display);
  font-size: clamp(26px, 3vw, 38px);
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: -0.025em;
}

.subtitle {
  margin-top: 9px;
  color: var(--muted);
  font-size: 13.5px;
  line-height: 1.7;
}

.rating-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-top: 16px;
  color: var(--muted);
  font-size: 11.5px;
}

.rating-divider {
  width: 1px;
  height: 11px;
  background: var(--line-strong);
}

.price-panel {
  padding: 19px 20px;
  margin-top: 20px;
  background:
    linear-gradient(105deg, rgba(232, 93, 42, 0.065), rgba(232, 93, 42, 0.015)),
    #fdfbf8;
  border: 1px solid #f1e4da;
  border-radius: 12px;
}

.price-main {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 10px;
}

.price-main .price {
  font-size: clamp(30px, 3.5vw, 40px);
  line-height: 1;
}

.price-main .price-original {
  font-size: 13px;
}

.save-tag {
  padding: 2px 7px;
  color: var(--brand-strong);
  background: #fbe3d7;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
}

.price-note {
  display: block;
  margin-top: 8px;
  color: var(--muted);
  font-size: 10.5px;
}

.stock-line {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 18px;
  color: var(--ink-soft);
  font-size: 12px;
}

.stock-dot {
  width: 6px;
  height: 6px;
  background: var(--success);
  border-radius: 50%;
  box-shadow: 0 0 0 3px rgba(47, 143, 107, 0.1);
}

.stock-dot.empty {
  background: var(--danger);
  box-shadow: 0 0 0 3px rgba(214, 74, 74, 0.1);
}

.stock-low {
  color: var(--warning);
}

.purchase-panel {
  padding-top: 20px;
  margin-top: 20px;
  border-top: 1px solid var(--line);
}

.quantity-row {
  display: flex;
  align-items: center;
  gap: 14px;
}

.quantity-label {
  width: 42px;
  color: var(--ink-soft);
  font-size: 12px;
}

.quantity-hint {
  color: var(--muted);
  font-size: 10.5px;
}

.purchase-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.purchase-actions .el-button {
  flex: 1;
  height: 48px;
  margin: 0;
  border-radius: 10px;
  font-size: 13.5px;
}

.cart-btn {
  color: var(--ink);
  background: #fff;
  border-color: var(--ink);
}

.cart-btn:hover {
  color: var(--brand);
  background: #fff;
  border-color: var(--brand);
}

.buy-btn {
  color: #fff;
  background: var(--ink);
  border-color: var(--ink);
}

.buy-btn:hover {
  background: var(--brand);
  border-color: var(--brand);
}

.service-list {
  display: grid;
  gap: 9px;
  padding-top: 20px;
  margin-top: auto;
}

.service-list div {
  display: flex;
  align-items: center;
  gap: 9px;
  color: var(--muted);
  font-size: 10.5px;
}

.service-list .el-icon {
  color: #a59686;
  font-size: 14px;
}

.service-list strong {
  color: var(--ink-soft);
  font-weight: 600;
}

.detail-content {
  padding: 8px 26px 28px;
  margin-top: 22px;
}

.detail-tabs :deep(.el-tabs__header) {
  margin-bottom: 22px;
}

.detail-tabs :deep(.el-tabs__item) {
  height: 52px;
  font-size: 13px;
}

.detail-tabs :deep(.el-tabs__item.is-active) {
  color: var(--ink);
}

.description-panel {
  min-height: 190px;
}

.description-text {
  color: var(--ink-soft);
  font-size: 14px;
  line-height: 2;
  white-space: pre-wrap;
  word-break: break-word;
}

.detail-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 28px;
  padding-top: 18px;
  margin-top: 28px;
  color: var(--muted);
  border-top: 1px dashed var(--line);
  font-size: 10.5px;
}

.review-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 15px 18px;
  margin-bottom: 22px;
  background: #faf7f2;
  border-radius: 11px;
}

.summary-score {
  display: flex;
  align-items: center;
  gap: 13px;
}

.summary-score > strong {
  color: var(--ink);
  font-family: var(--font-display);
  font-size: 32px;
  font-weight: 500;
  line-height: 1;
}

.summary-score small {
  display: block;
  margin-top: 5px;
  color: var(--muted);
  font-size: 9.5px;
}

.summary-note {
  color: var(--muted);
  font-size: 10px;
}

.review-error {
  margin-bottom: 14px;
}

.review-item {
  display: flex;
  gap: 13px;
  padding: 20px 0;
  border-bottom: 1px solid var(--line);
}

.review-item:first-child {
  padding-top: 0;
}

.review-item:last-of-type {
  border-bottom: 0;
}

.review-avatar {
  display: grid;
  flex: 0 0 auto;
  width: 35px;
  height: 35px;
  color: var(--brand-strong);
  background: var(--brand-soft);
  border-radius: 50%;
  font-size: 12px;
  font-weight: 600;
  place-items: center;
}

.review-body {
  min-width: 0;
  flex: 1;
}

.review-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.review-head strong {
  display: block;
  margin-bottom: 2px;
  font-size: 12.5px;
  font-weight: 600;
}

.review-head time {
  color: var(--muted);
  font-size: 10px;
  white-space: nowrap;
}

.review-body p {
  margin-top: 9px;
  color: var(--ink-soft);
  font-size: 12.5px;
  line-height: 1.8;
  word-break: break-word;
}

.review-pagination {
  display: flex;
  justify-content: center;
  padding-top: 20px;
}

.review-skeleton {
  padding: 16px 0;
  border-bottom: 1px solid var(--line);
}

.review-skeleton-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 13px;
}

.review-skeleton-head > span {
  width: 32px;
  height: 32px;
  background: #f1ede7;
  border-radius: 50%;
}

.review-skeleton-head > div {
  flex: 1;
}

.review-skeletons .skeleton-line {
  margin-top: 8px;
}

.detail-skeleton {
  display: grid;
  min-height: 500px;
  padding: 24px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  grid-template-columns: 1fr 1fr;
  gap: 50px;
}

.skeleton-gallery {
  aspect-ratio: 1 / 1;
  border-radius: 16px;
  background: linear-gradient(100deg, #f1ede7 30%, #f8f5f0 50%, #f1ede7 70%);
  background-size: 220% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-detail {
  padding: 18px 0;
}

.skeleton-detail .skeleton-line {
  height: 16px;
  margin-bottom: 14px;
}

.skeleton-detail .skeleton-line.short {
  height: 12px;
}

.skeleton-actions {
  height: 50px;
  margin-top: 36px;
  border-radius: 10px;
  background: #f3efe9;
}

@media (max-width: 900px) {
  .detail-hero {
    grid-template-columns: 1fr;
    gap: 26px;
    padding: 16px;
  }

  .product-info {
    padding: 0 4px 8px;
  }

  .detail-skeleton {
    grid-template-columns: 1fr;
    gap: 24px;
  }

  .detail-skeleton .skeleton-gallery {
    aspect-ratio: 1.5 / 1;
  }

  .service-list {
    margin-top: 18px;
  }
}

@media (max-width: 768px) {
  .purchase-actions {
    display: none;
  }

  .bar-price {
    color: var(--brand-strong);
    font-size: 20px;
    font-weight: 700;
  }

  .breadcrumb {
    margin-bottom: 14px;
  }

  .main-image {
    border-radius: 12px;
  }

  .thumb {
    width: 55px;
    height: 55px;
  }

  .detail-content {
    padding: 4px 16px 20px;
    margin-top: 14px;
  }

  .detail-tabs :deep(.el-tabs__item) {
    height: 46px;
    padding: 0 13px;
    font-size: 12px;
  }

  .review-summary {
    align-items: flex-start;
    flex-direction: column;
    gap: 8px;
  }

  .summary-note {
    padding-left: 55px;
  }
}

@media (max-width: 420px) {
  .product-info h1 {
    margin-top: 12px;
    font-size: 25px;
  }

  .price-panel {
    padding: 15px;
    margin-top: 15px;
  }

  .purchase-actions {
    flex-direction: column;
  }

  .purchase-actions .el-button {
    width: 100%;
    height: 44px;
  }

  .quantity-hint {
    display: none;
  }

  .review-head {
    flex-direction: column;
    gap: 4px;
  }

  .detail-meta {
    gap: 8px;
    flex-direction: column;
  }
}
</style>
