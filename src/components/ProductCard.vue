<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Plus, ShoppingCart } from '@element-plus/icons-vue';
import type { ProductSummary } from '@/types/api';
import { formatCents } from '@/utils/money';
import { fallbackImage } from '@/utils/format';
import { useAuthStore } from '@/stores/auth';
import { useCartStore } from '@/stores/cart';
import RatingStars from './RatingStars.vue';

const props = defineProps<{ product: ProductSummary }>();
const router = useRouter();
const auth = useAuthStore();
const cart = useCartStore();
const adding = ref(false);

const soldOut = computed(() => props.product.stock <= 0);
const discountLabel = computed(() => {
  const original = props.product.originalPriceCents;
  if (!original || original <= props.product.priceCents) return '';
  const rate = (props.product.priceCents / original) * 10;
  return `${rate.toFixed(1)}折`;
});

function goLogin(): void {
  router.push({ path: '/login', query: { redirect: router.currentRoute.value.fullPath } });
}

async function addToCart(): Promise<void> {
  if (soldOut.value || adding.value) return;
  if (!auth.isLoggedIn) {
    ElMessage.info('请先登录后再加入购物车');
    goLogin();
    return;
  }
  adding.value = true;
  try {
    await cart.addItem(props.product.id, 1);
    ElMessage.success('已加入购物车');
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '加入购物车失败');
  } finally {
    adding.value = false;
  }
}
</script>

<template>
  <article class="product-card">
    <RouterLink :to="`/products/${product.id}`" class="product-media" :aria-label="product.title">
      <img
        :src="product.imageUrl || ''"
        :alt="product.title"
        loading="lazy"
        @error="fallbackImage"
      />
      <span v-if="discountLabel" class="discount-badge">{{ discountLabel }}</span>
      <span v-if="soldOut" class="sold-out">已售罄</span>
      <span class="quick-hint">查看详情</span>
    </RouterLink>

    <div class="product-body">
      <div class="product-meta">
        <span>{{ product.categoryName }}</span>
        <span>已售 {{ product.salesCount }}</span>
      </div>
      <RouterLink :to="`/products/${product.id}`" class="product-title">
        {{ product.title }}
      </RouterLink>
      <p v-if="product.subtitle" class="product-subtitle">{{ product.subtitle }}</p>
      <RatingStars :rating="product.ratingAvg" :count="product.ratingCount" />
      <div class="product-footer">
        <div class="price-group">
          <span class="price">{{ formatCents(product.priceCents) }}</span>
          <span
            v-if="product.originalPriceCents && product.originalPriceCents > product.priceCents"
            class="price-original"
          >
            {{ formatCents(product.originalPriceCents) }}
          </span>
        </div>
        <el-tooltip :content="soldOut ? '商品已售罄' : '加入购物车'" placement="top">
          <button
            class="add-button"
            type="button"
            :class="{ disabled: soldOut }"
            :disabled="soldOut"
            :aria-label="`将 ${product.title} 加入购物车`"
            @click.prevent="addToCart"
          >
            <el-icon v-if="adding" class="is-loading"><Plus /></el-icon>
            <el-icon v-else><ShoppingCart /></el-icon>
          </button>
        </el-tooltip>
      </div>
    </div>
  </article>
</template>

<style scoped>
.product-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  transition:
    transform 0.25s ease,
    box-shadow 0.25s ease,
    border-color 0.25s ease;
}

.product-card:hover {
  transform: translateY(-4px);
  border-color: #e7d7ca;
  box-shadow: var(--shadow);
}

.product-media {
  position: relative;
  display: block;
  overflow: hidden;
  aspect-ratio: 1 / 1;
  background: #f3efe9;
}

.product-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}

.product-card:hover .product-media img {
  transform: scale(1.045);
}

.discount-badge {
  position: absolute;
  top: 12px;
  left: 12px;
  padding: 3px 9px;
  color: #fff;
  background: var(--brand);
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.sold-out {
  position: absolute;
  inset: 0;
  display: grid;
  color: #fff;
  background: rgba(23, 32, 51, 0.45);
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.08em;
  place-items: center;
}

.quick-hint {
  position: absolute;
  right: 12px;
  bottom: 12px;
  padding: 5px 11px;
  color: var(--ink);
  background: rgba(255, 255, 255, 0.92);
  border-radius: 999px;
  font-size: 11px;
  opacity: 0;
  transform: translateY(4px);
  transition: all 0.25s ease;
  backdrop-filter: blur(6px);
}

.product-card:hover .quick-hint {
  opacity: 1;
  transform: translateY(0);
}

.product-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 7px;
  padding: 14px 15px 15px;
}

.product-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: var(--muted);
  font-size: 11px;
}

.product-meta span:first-child {
  overflow: hidden;
  color: var(--brand);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-title {
  display: -webkit-box;
  overflow: hidden;
  min-height: 42px;
  font-size: 14.5px;
  font-weight: 600;
  line-height: 1.45;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.product-title:hover {
  color: var(--brand);
}

.product-subtitle {
  overflow: hidden;
  color: var(--muted);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-footer {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 8px;
  margin-top: auto;
  padding-top: 8px;
}

.price-group {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 5px;
}

.price-group .price {
  font-size: 20px;
}

.add-button {
  display: grid;
  flex: 0 0 auto;
  width: 34px;
  height: 34px;
  padding: 0;
  color: #fff;
  background: var(--ink);
  border: 0;
  border-radius: 50%;
  cursor: pointer;
  place-items: center;
  transition:
    background 0.18s ease,
    transform 0.18s ease;
}

.add-button:hover {
  background: var(--brand);
  transform: scale(1.06);
}

.add-button.disabled {
  color: #aaa7a2;
  background: #e9e5df;
  cursor: not-allowed;
  transform: none;
}

@media (max-width: 768px) {
  .product-body {
    gap: 5px;
    padding: 11px;
  }

  .product-title {
    min-height: 38px;
    font-size: 13px;
  }

  .product-subtitle,
  .product-meta span:last-child,
  .quick-hint {
    display: none;
  }

  .price-group .price {
    font-size: 18px;
  }

  .add-button {
    width: 30px;
    height: 30px;
  }

  .discount-badge {
    top: 8px;
    left: 8px;
    padding: 2px 7px;
  }
}
</style>
