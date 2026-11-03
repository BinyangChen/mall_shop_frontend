<script setup lang="ts">
import { computed, onMounted, ref, type Component } from 'vue';
import { useRouter } from 'vue-router';
import {
  ArrowRight,
  Basketball,
  Goods,
  House,
  IceCream,
  Iphone,
  MagicStick,
  Present,
  Reading,
  Search,
  ShoppingBag,
  StarFilled,
} from '@element-plus/icons-vue';
import { catalogApi } from '@/api/catalog';
import type { Category, ProductSummary } from '@/types/api';
import ProductCard from '@/components/ProductCard.vue';
import EmptyState from '@/components/EmptyState.vue';
import { formatCents } from '@/utils/money';
import { fallbackImage } from '@/utils/format';

const router = useRouter();
const heroKeyword = ref('');
const categories = ref<Category[]>([]);
const hotProducts = ref<ProductSummary[]>([]);
const newProducts = ref<ProductSummary[]>([]);
const loading = ref(true);
const pageError = ref('');

const heroProduct = computed(() => hotProducts.value[0] ?? null);

const iconMap: Array<{ keys: string[]; icon: Component }> = [
  { keys: ['数码', '电子', '手机', '电脑'], icon: Iphone },
  { keys: ['家居', '生活', '家纺', '厨具'], icon: House },
  { keys: ['美妆', '个护', '护肤'], icon: MagicStick },
  { keys: ['食品', '零食', '生鲜', '饮料'], icon: IceCream },
  { keys: ['运动', '户外'], icon: Basketball },
  { keys: ['图书', '阅读', '文具'], icon: Reading },
  { keys: ['母婴', '礼物', '礼盒'], icon: Present },
];

function categoryIcon(name: string): Component {
  return iconMap.find((entry) => entry.keys.some((key) => name.includes(key)))?.icon ?? Goods;
}

function goCategory(category: Category): void {
  router.push({ path: '/products', query: { categoryId: String(category.id) } });
}

function submitHeroSearch(): void {
  const q = heroKeyword.value.trim();
  router.push({ path: '/products', query: q ? { q } : {} });
}

async function loadHome(): Promise<void> {
  loading.value = true;
  pageError.value = '';
  const results = await Promise.allSettled([
    catalogApi.categories(),
    catalogApi.products({ sort: 'sales_desc', page: 0, size: 8 }),
    catalogApi.products({ sort: 'newest', page: 0, size: 8 }),
  ]);

  if (results[0].status === 'fulfilled') categories.value = results[0].value;
  if (results[1].status === 'fulfilled') hotProducts.value = results[1].value.items;
  if (results[2].status === 'fulfilled') newProducts.value = results[2].value.items;

  const failed = results.find((result) => result.status === 'rejected');
  if (failed && failed.status === 'rejected') {
    pageError.value =
      failed.reason instanceof Error ? failed.reason.message : '首页内容加载失败，请稍后重试';
  }
  loading.value = false;
}

onMounted(loadHome);
</script>

<template>
  <div class="home-page fade-page">
    <section class="hero-wrap">
      <div class="container hero">
        <div class="hero-copy">
          <span class="hero-kicker">
            <span class="kicker-line"></span>
            CURATED FOR EVERYDAY
          </span>
          <h1>把喜欢的日常，<br /><em>慢慢收集。</em></h1>
          <p class="hero-desc">
            拾光集市从生活本身出发，挑选经得起时间的好物。<br class="desktop-br" />
            少一点将就，多一点刚刚好。
          </p>

          <form class="hero-search" role="search" @submit.prevent="submitHeroSearch">
            <el-icon class="hero-search-icon"><Search /></el-icon>
            <input
              v-model="heroKeyword"
              type="search"
              placeholder="今天想找点什么？"
              aria-label="搜索商品"
            />
            <button type="submit">开始探索</button>
          </form>

          <div class="hero-trust">
            <span><i class="dot"></i>正品精选</span>
            <span><i class="dot"></i>品质保障</span>
            <span><i class="dot"></i>安心售后</span>
          </div>
        </div>

        <div class="hero-art" aria-hidden="true">
          <div class="art-ring ring-one"></div>
          <div class="art-ring ring-two"></div>
          <span class="art-spark spark-one">✦</span>
          <span class="art-spark spark-two">✧</span>

          <div class="spotlight-card">
            <div class="spotlight-image">
              <img
                v-if="heroProduct?.imageUrl"
                :src="heroProduct.imageUrl"
                :alt="heroProduct.title"
                @error="fallbackImage"
              />
              <div v-else class="spotlight-placeholder">
                <el-icon :size="44"><ShoppingBag /></el-icon>
              </div>
              <span class="spotlight-label">本周人气</span>
            </div>
            <div v-if="heroProduct" class="spotlight-info">
              <div>
                <span class="spotlight-category">{{ heroProduct.categoryName }}</span>
                <h3>{{ heroProduct.title }}</h3>
              </div>
              <span class="price">{{ formatCents(heroProduct.priceCents) }}</span>
            </div>
            <div v-else class="spotlight-info">
              <div>
                <span class="spotlight-category">LIFE & DESIGN</span>
                <h3>值得被认真对待的日常</h3>
              </div>
              <span class="price">拾光</span>
            </div>
          </div>

          <div class="floating-note">
            <el-icon><StarFilled /></el-icon>
            <div>
              <strong>认真挑选</strong>
              <small>每一件都值得</small>
            </div>
          </div>

          <span class="art-caption">GOOD THINGS<br />TAKE TIME</span>
        </div>
      </div>
    </section>

    <div class="container">
      <div v-if="pageError" class="error-band home-error">
        <span>{{ pageError }}</span>
        <el-button size="small" plain @click="loadHome">重新加载</el-button>
      </div>

      <section class="category-section">
        <div class="section-heading">
          <div>
            <span class="section-kicker">BROWSE BY MOOD</span>
            <h2>按心情，逛一逛</h2>
          </div>
          <RouterLink to="/products" class="text-link">
            全部商品 <el-icon><ArrowRight /></el-icon>
          </RouterLink>
        </div>

        <div v-if="loading" class="category-skeletons">
          <div v-for="item in 6" :key="item" class="category-skeleton"></div>
        </div>
        <div v-else-if="categories.length" class="category-grid">
          <button
            v-for="(category, index) in categories.slice(0, 8)"
            :key="category.id"
            type="button"
            class="category-card"
            :class="`tone-${index % 4}`"
            @click="goCategory(category)"
          >
            <span class="category-icon">
              <component :is="categoryIcon(category.name)" />
            </span>
            <span class="category-text">
              <strong>{{ category.name }}</strong>
              <small>发现精选好物</small>
            </span>
            <el-icon class="category-arrow"><ArrowRight /></el-icon>
          </button>
        </div>
        <EmptyState
          v-else
          compact
          title="分类正在整理中"
          description="稍后再来逛逛，或直接浏览全部商品。"
        >
          <template #action>
            <el-button round @click="router.push('/products')">浏览全部商品</el-button>
          </template>
        </EmptyState>
      </section>

      <section class="product-section">
        <div class="section-heading">
          <div>
            <span class="section-kicker">MOST LOVED</span>
            <h2>本季热销</h2>
            <p>被大家反复选择的好物，总有它的理由。</p>
          </div>
          <RouterLink
            :to="{ path: '/products', query: { sort: 'sales_desc' } }"
            class="text-link"
          >
            查看热销榜 <el-icon><ArrowRight /></el-icon>
          </RouterLink>
        </div>

        <div v-if="loading" class="loading-grid">
          <div v-for="item in 8" :key="item" class="skeleton-card">
            <div class="skeleton-image"></div>
            <div class="skeleton-lines">
              <div class="skeleton-line"></div>
              <div class="skeleton-line short"></div>
              <div class="skeleton-line tiny"></div>
            </div>
          </div>
        </div>
        <div v-else-if="hotProducts.length" class="product-grid">
          <ProductCard v-for="product in hotProducts" :key="product.id" :product="product" />
        </div>
        <EmptyState
          v-else
          compact
          title="暂无可展示的商品"
          description="商品正在上架中，请稍后再来看看。"
        />
      </section>

      <section class="manifesto">
        <div class="manifesto-quote">“</div>
        <div class="manifesto-content">
          <span class="section-kicker">OUR LITTLE PHILOSOPHY</span>
          <h2>不追赶潮流，只留下真正好用的。</h2>
          <p>好物不必喧哗。我们更在意材质、手感与陪伴的时间。</p>
        </div>
        <div class="manifesto-points">
          <div>
            <strong>01</strong>
            <span>精选选品</span>
          </div>
          <div>
            <strong>02</strong>
            <span>透明价格</span>
          </div>
          <div>
            <strong>03</strong>
            <span>安心售后</span>
          </div>
        </div>
      </section>

      <section class="product-section new-section">
        <div class="section-heading">
          <div>
            <span class="section-kicker">JUST ARRIVED</span>
            <h2>刚刚上架</h2>
            <p>新鲜抵达的好物，给生活一点新的灵感。</p>
          </div>
          <RouterLink to="/products" class="text-link">
            全部新品 <el-icon><ArrowRight /></el-icon>
          </RouterLink>
        </div>

        <div v-if="loading" class="loading-grid">
          <div v-for="item in 4" :key="item" class="skeleton-card">
            <div class="skeleton-image"></div>
            <div class="skeleton-lines">
              <div class="skeleton-line"></div>
              <div class="skeleton-line short"></div>
              <div class="skeleton-line tiny"></div>
            </div>
          </div>
        </div>
        <div v-else-if="newProducts.length" class="product-grid">
          <ProductCard
            v-for="product in newProducts.slice(0, 4)"
            :key="product.id"
            :product="product"
          />
        </div>
        <EmptyState
          v-else
          compact
          title="新品正在路上"
          description="先去热销区逛逛吧。"
        />
      </section>
    </div>
  </div>
</template>

<style scoped>
.home-page {
  padding-bottom: 80px;
}

.hero-wrap {
  position: relative;
  overflow: hidden;
  color: #fff;
  background:
    radial-gradient(circle at 12% 18%, rgba(232, 93, 42, 0.16), transparent 34%),
    linear-gradient(145deg, #1b263b 0%, #172033 55%, #101724 100%);
}

.hero-wrap::before {
  position: absolute;
  top: -140px;
  right: 20%;
  width: 520px;
  height: 520px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 50%;
  content: '';
}

.hero {
  display: grid;
  min-height: 485px;
  padding-top: 58px;
  padding-bottom: 58px;
  grid-template-columns: 1.06fr 0.94fr;
  align-items: center;
  gap: 54px;
}

.hero-copy {
  position: relative;
  z-index: 2;
}

.hero-kicker {
  display: flex;
  align-items: center;
  gap: 11px;
  color: #dca083;
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.28em;
}

.kicker-line {
  width: 27px;
  height: 1px;
  background: rgba(220, 160, 131, 0.65);
}

.hero h1 {
  margin-top: 20px;
  font-family: var(--font-display);
  font-size: clamp(44px, 5.2vw, 68px);
  font-weight: 600;
  line-height: 1.12;
  letter-spacing: -0.04em;
}

.hero h1 em {
  color: #f0b28e;
  font-style: normal;
}

.hero-desc {
  margin-top: 22px;
  color: rgba(255, 255, 255, 0.55);
  font-size: 14px;
  line-height: 1.9;
}

.hero-search {
  display: flex;
  align-items: center;
  gap: 11px;
  width: min(460px, 100%);
  padding: 6px 6px 6px 18px;
  margin-top: 30px;
  background: rgba(255, 255, 255, 0.09);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 999px;
  backdrop-filter: blur(8px);
  transition: all 0.2s ease;
}

.hero-search:focus-within {
  background: rgba(255, 255, 255, 0.13);
  border-color: rgba(240, 178, 142, 0.55);
}

.hero-search-icon {
  flex-shrink: 0;
  color: rgba(255, 255, 255, 0.45);
}

.hero-search input {
  flex: 1;
  min-width: 0;
  padding: 9px 0;
  color: #fff;
  background: transparent;
  border: 0;
  outline: none;
  font-size: 13px;
}

.hero-search input::placeholder {
  color: rgba(255, 255, 255, 0.37);
}

.hero-search input::-webkit-search-cancel-button {
  filter: invert(1);
  opacity: 0.5;
}

.hero-search button {
  flex-shrink: 0;
  padding: 10px 21px;
  color: #1b2330;
  background: #f2e6d7;
  border: 0;
  border-radius: 999px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
  transition: all 0.2s ease;
}

.hero-search button:hover {
  background: #fff;
}

.hero-trust {
  display: flex;
  flex-wrap: wrap;
  gap: 22px;
  margin-top: 24px;
  color: rgba(255, 255, 255, 0.42);
  font-size: 10.5px;
}

.hero-trust span {
  display: flex;
  align-items: center;
  gap: 7px;
}

.dot {
  width: 4px;
  height: 4px;
  background: #dca083;
  border-radius: 50%;
}

.hero-art {
  position: relative;
  height: 360px;
}

.art-ring {
  position: absolute;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 50%;
}

.ring-one {
  top: -40px;
  right: -80px;
  width: 390px;
  height: 390px;
}

.ring-two {
  top: 20px;
  right: -20px;
  width: 280px;
  height: 280px;
  border-color: rgba(232, 93, 42, 0.16);
}

.spotlight-card {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 286px;
  padding: 10px;
  color: var(--ink);
  background: #f6f0e7;
  border-radius: 18px;
  box-shadow: 0 35px 70px rgba(0, 0, 0, 0.36);
  transform: translate(-50%, -50%) rotate(-2.5deg);
}

.spotlight-image {
  position: relative;
  overflow: hidden;
  aspect-ratio: 1.24 / 1;
  background: #e9e0d4;
  border-radius: 12px;
}

.spotlight-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.spotlight-placeholder {
  display: grid;
  width: 100%;
  height: 100%;
  color: #b4a797;
  background:
    radial-gradient(circle at 30% 20%, #fff7eb, transparent 45%),
    #e9e0d4;
  place-items: center;
}

.spotlight-label {
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 4px 9px;
  color: #fff;
  background: rgba(23, 32, 51, 0.75);
  border-radius: 5px;
  font-size: 9px;
  letter-spacing: 0.08em;
  backdrop-filter: blur(4px);
}

.spotlight-info {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  padding: 13px 8px 7px;
}

.spotlight-category {
  color: var(--muted);
  font-size: 9px;
  letter-spacing: 0.1em;
}

.spotlight-info h3 {
  width: 170px;
  margin-top: 4px;
  overflow: hidden;
  font-size: 13px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.spotlight-info .price {
  flex-shrink: 0;
  font-size: 16px;
}

.floating-note {
  position: absolute;
  right: 0;
  bottom: 20px;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 11px 15px;
  color: var(--ink);
  background: #f2e6d7;
  border-radius: 11px;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.25);
  transform: rotate(2deg);
}

.floating-note .el-icon {
  color: var(--brand);
  font-size: 17px;
}

.floating-note strong {
  display: block;
  font-size: 11px;
  line-height: 1.2;
}

.floating-note small {
  display: block;
  margin-top: 2px;
  color: #7f7466;
  font-size: 9px;
}

.art-caption {
  position: absolute;
  top: 20px;
  left: 4px;
  color: rgba(255, 255, 255, 0.18);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.28em;
  line-height: 1.7;
}

.art-spark {
  position: absolute;
  color: rgba(240, 178, 142, 0.55);
  font-size: 18px;
}

.spark-one {
  top: 26px;
  right: 15%;
}

.spark-two {
  bottom: 46px;
  left: 9%;
  font-size: 12px;
}

.home-error {
  margin-top: 24px;
  margin-bottom: 0;
}

.category-section {
  padding-top: 54px;
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.category-card {
  display: flex;
  align-items: center;
  gap: 13px;
  min-width: 0;
  padding: 16px;
  text-align: left;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 13px;
  cursor: pointer;
  transition: all 0.22s ease;
}

.category-card:hover {
  border-color: #e8d2c4;
  box-shadow: var(--shadow-sm);
  transform: translateY(-2px);
}

.category-icon {
  display: grid;
  flex: 0 0 auto;
  width: 43px;
  height: 43px;
  color: #7d5c46;
  background: #f5ede2;
  border-radius: 11px;
  place-items: center;
}

.category-icon :deep(svg) {
  width: 20px;
  height: 20px;
}

.category-card.tone-1 .category-icon {
  color: #4e6d67;
  background: #ebf1ee;
}

.category-card.tone-2 .category-icon {
  color: #7a5b75;
  background: #f2ebf1;
}

.category-card.tone-3 .category-icon {
  color: #7d673c;
  background: #f4f0e3;
}

.category-text {
  min-width: 0;
  flex: 1;
}

.category-text strong {
  display: block;
  overflow: hidden;
  font-size: 13.5px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.category-text small {
  display: block;
  margin-top: 2px;
  color: var(--muted);
  font-size: 10px;
}

.category-arrow {
  flex-shrink: 0;
  color: #c9bfb3;
  font-size: 12px;
  transition:
    transform 0.2s ease,
    color 0.2s ease;
}

.category-card:hover .category-arrow {
  color: var(--brand);
  transform: translateX(3px);
}

.category-skeletons {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 12px;
}

.category-skeleton {
  height: 76px;
  border-radius: 13px;
  background: linear-gradient(100deg, #eee9e2 30%, #f8f5f0 50%, #eee9e2 70%);
  background-size: 220% 100%;
  animation: shimmer 1.5s infinite;
}

.product-section {
  padding-top: 58px;
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 20px;
}

.text-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--ink-soft);
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  transition: color 0.18s ease;
}

.text-link:hover {
  color: var(--brand);
}

.text-link .el-icon {
  font-size: 11px;
  transition: transform 0.18s ease;
}

.text-link:hover .el-icon {
  transform: translateX(2px);
}

.manifesto {
  position: relative;
  display: grid;
  overflow: hidden;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 30px;
  padding: 42px 46px;
  margin-top: 64px;
  color: #fff;
  background:
    radial-gradient(circle at 85% 20%, rgba(232, 93, 42, 0.22), transparent 32%),
    var(--navy);
  border-radius: var(--radius-lg);
}

.manifesto-quote {
  align-self: flex-start;
  color: rgba(240, 178, 142, 0.4);
  font-family: var(--font-display);
  font-size: 92px;
  line-height: 0.8;
}

.manifesto-content h2 {
  margin-top: 9px;
  font-family: var(--font-display);
  font-size: clamp(23px, 2.4vw, 32px);
  font-weight: 500;
  line-height: 1.35;
  letter-spacing: -0.025em;
}

.manifesto-content p {
  margin-top: 9px;
  color: rgba(255, 255, 255, 0.48);
  font-size: 12.5px;
}

.manifesto-points {
  display: flex;
  gap: 26px;
}

.manifesto-points div {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding-left: 18px;
  border-left: 1px solid rgba(255, 255, 255, 0.1);
}

.manifesto-points strong {
  color: #e3a989;
  font-family: var(--font-display);
  font-size: 19px;
  font-weight: 500;
}

.manifesto-points span {
  color: rgba(255, 255, 255, 0.5);
  font-size: 10.5px;
  white-space: nowrap;
}

.new-section {
  padding-top: 64px;
}

@media (max-width: 1024px) {
  .hero {
    min-height: 440px;
    grid-template-columns: 1.15fr 0.85fr;
    gap: 24px;
  }

  .hero-art {
    transform: scale(0.9);
  }

  .category-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .category-skeletons {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .product-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .manifesto {
    grid-template-columns: auto 1fr;
  }

  .manifesto-points {
    display: none;
  }
}

@media (max-width: 768px) {
  .hero {
    display: block;
    min-height: 0;
    padding-top: 45px;
    padding-bottom: 44px;
  }

  .hero h1 {
    font-size: clamp(38px, 10vw, 52px);
  }

  .hero-desc {
    margin-top: 16px;
    font-size: 12.5px;
    line-height: 1.8;
  }

  .desktop-br {
    display: none;
  }

  .hero-search {
    margin-top: 24px;
  }

  .hero-trust {
    margin-top: 18px;
  }

  .hero-art {
    display: none;
  }

  .category-section {
    padding-top: 38px;
  }

  .category-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 9px;
  }

  .category-skeletons {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .category-card {
    gap: 10px;
    padding: 12px;
  }

  .category-icon {
    width: 37px;
    height: 37px;
    border-radius: 9px;
  }

  .category-icon :deep(svg) {
    width: 17px;
    height: 17px;
  }

  .category-text small,
  .category-arrow {
    display: none;
  }

  .product-section {
    padding-top: 42px;
  }

  .product-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .text-link {
    font-size: 11px;
  }

  .manifesto {
    display: block;
    padding: 30px 24px;
    margin-top: 44px;
  }

  .manifesto-quote {
    font-size: 60px;
  }

  .new-section {
    padding-top: 46px;
  }

  .home-page {
    padding-bottom: 50px;
  }

  .home-error {
    margin-top: 16px;
  }
}

@media (max-width: 400px) {
  .hero-search button {
    padding: 9px 14px;
    font-size: 11px;
  }

  .hero-search {
    padding-left: 13px;
  }

  .hero-trust {
    gap: 14px;
  }

  .section-heading p {
    display: none;
  }
}
</style>
