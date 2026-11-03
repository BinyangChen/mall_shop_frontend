<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import {
  ArrowDown,
  Management,
  Search,
  ShoppingBag,
  ShoppingCart,
  User,
} from '@element-plus/icons-vue';
import { showAdminConsole } from '@/config/scope';
import { useAuthStore } from '@/stores/auth';
import { useCartStore } from '@/stores/cart';
import MobileTabBar from '@/components/MobileTabBar.vue';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const cart = useCartStore();
const searchText = ref('');

const queryText = computed(() => {
  const q = route.query.q;
  return typeof q === 'string' ? q : '';
});

watch(
  queryText,
  (value) => {
    searchText.value = value;
  },
  { immediate: true },
);

watch(
  () => auth.isLoggedIn,
  (loggedIn) => {
    if (loggedIn) {
      void cart.fetch(true);
    } else {
      cart.clear();
    }
  },
  { immediate: true },
);

const avatarLetter = computed(() => {
  const name = auth.user?.displayName || auth.user?.username || '我';
  return name.slice(0, 1).toUpperCase();
});

function submitSearch(): void {
  const q = searchText.value.trim();
  router.push({ path: '/products', query: q ? { q } : {} });
}

async function onUserCommand(command: string): Promise<void> {
  if (command === 'logout') {
    await auth.logout();
    cart.clear();
    ElMessage.success('已退出登录');
    if (route.meta.requiresAuth) {
      await router.push('/');
    }
    return;
  }
  if (command === 'admin') {
    await router.push('/admin');
    return;
  }
  await router.push(command);
}
</script>

<template>
  <div class="shop-shell">
    <div class="announcement">
      <div class="container announcement-inner">
        <span>拾光集市 · 认真挑选每一件日常好物</span>
        <span class="announcement-right">全场正品保障 · 7 天无忧退换</span>
      </div>
    </div>

    <header class="shop-header">
      <div class="container header-inner">
        <RouterLink to="/" class="brand" aria-label="拾光集市首页">
          <span class="brand-mark">
            <el-icon :size="21"><ShoppingBag /></el-icon>
          </span>
          <span class="brand-copy">
            <strong>拾光集市</strong>
            <small>CURATED GOODS</small>
          </span>
        </RouterLink>

        <nav class="desktop-nav" aria-label="主导航">
          <RouterLink to="/" :class="{ 'nav-active': route.path === '/' }">首页</RouterLink>
          <RouterLink to="/products" :class="{ 'nav-active': route.path.startsWith('/products') }">
            全部商品
          </RouterLink>
          <RouterLink
            to="/orders"
            :class="{
              'nav-active':
                route.path.startsWith('/orders') || route.path.startsWith('/payment'),
            }"
          >
            我的订单
          </RouterLink>
        </nav>

        <form class="header-search" role="search" @submit.prevent="submitSearch">
          <el-input
            v-model="searchText"
            placeholder="搜索心仪好物…"
            clearable
            aria-label="搜索商品"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <button type="submit" class="search-submit">搜索</button>
        </form>

        <div class="header-actions">
          <RouterLink to="/cart" class="icon-action" aria-label="购物车">
            <el-badge :value="cart.count" :hidden="cart.count <= 0" :max="99">
              <span class="icon-circle">
                <el-icon :size="20"><ShoppingCart /></el-icon>
              </span>
            </el-badge>
            <span class="action-label">购物车</span>
          </RouterLink>

          <el-dropdown v-if="auth.isLoggedIn" trigger="click" @command="onUserCommand">
            <button type="button" class="user-trigger">
              <span class="avatar">{{ avatarLetter }}</span>
              <span class="user-name">{{ auth.user?.displayName || auth.user?.username }}</span>
              <el-icon class="chevron"><ArrowDown /></el-icon>
            </button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="/profile">
                  <el-icon><User /></el-icon>个人中心
                </el-dropdown-item>
                <el-dropdown-item command="/orders">
                  <el-icon><ShoppingBag /></el-icon>我的订单
                </el-dropdown-item>
                <el-dropdown-item v-if="auth.isAdmin && showAdminConsole" command="admin">
                  <el-icon><Management /></el-icon>管理控制台
                </el-dropdown-item>
                <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>

          <div v-else class="guest-actions">
            <RouterLink to="/login" class="login-link">登录</RouterLink>
            <RouterLink to="/register" class="register-link">注册</RouterLink>
          </div>
        </div>
      </div>

      <div class="mobile-row">
        <div class="container mobile-row-inner">
          <form class="mobile-search" role="search" @submit.prevent="submitSearch">
            <el-input v-model="searchText" placeholder="搜索商品" clearable aria-label="搜索商品">
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </form>
        </div>
      </div>
    </header>

    <main class="shop-main">
      <RouterView v-slot="{ Component }">
        <component :is="Component" :key="route.path" />
      </RouterView>
    </main>

    <footer class="shop-footer">
      <div class="container footer-grid">
        <div class="footer-brand">
          <div class="footer-logo">
            <span class="brand-mark small">
              <el-icon :size="17"><ShoppingBag /></el-icon>
            </span>
            <strong>拾光集市</strong>
          </div>
          <p>把值得的日常，慢慢挑给你。</p>
          <span class="footer-tagline">CURATED WITH CARE</span>
        </div>
        <div class="footer-col">
          <h3>逛一逛</h3>
          <RouterLink to="/products">全部商品</RouterLink>
          <RouterLink to="/orders">我的订单</RouterLink>
          <RouterLink to="/cart">购物车</RouterLink>
        </div>
        <div class="footer-col">
          <h3>账户</h3>
          <RouterLink to="/profile">个人中心</RouterLink>
          <RouterLink to="/login">登录账号</RouterLink>
          <RouterLink to="/register">注册会员</RouterLink>
        </div>
        <div class="footer-col footer-service">
          <h3>服务承诺</h3>
          <span>正品好物 · 安心选购</span>
          <span>订单状态全程可查</span>
          <span>客服在线 · 妥善售后</span>
        </div>
      </div>
      <div class="container footer-bottom">
        <span>© 2026 拾光集市 Mall Shop</span>
        <span>演示项目 · 仅用于技术展示</span>
      </div>
    </footer>

    <MobileTabBar />
  </div>
</template>

<style scoped>
.shop-shell {
  display: flex;
  min-height: 100vh;
  flex-direction: column;
}

.announcement {
  color: rgba(255, 255, 255, 0.72);
  background: var(--navy);
  font-size: 11.5px;
  letter-spacing: 0.04em;
}

.announcement-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 32px;
}

.announcement-right {
  color: rgba(255, 255, 255, 0.48);
}

.shop-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(255, 255, 255, 0.94);
  border-bottom: 1px solid var(--line);
  backdrop-filter: blur(14px);
}

.header-inner {
  display: flex;
  align-items: center;
  gap: clamp(18px, 2.6vw, 36px);
  min-height: 76px;
}

.brand {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 10px;
}

.brand-mark {
  display: grid;
  width: 40px;
  height: 40px;
  color: #fff4e8;
  background: var(--navy);
  border-radius: 12px;
  place-items: center;
  box-shadow: 0 5px 14px rgba(23, 32, 51, 0.16);
}

.brand-mark.small {
  width: 32px;
  height: 32px;
  border-radius: 9px;
}

.brand-copy {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
}

.brand-copy strong {
  font-family: var(--font-display);
  font-size: 21px;
  letter-spacing: 0.02em;
}

.brand-copy small {
  margin-top: 3px;
  color: var(--muted);
  font-size: 8px;
  font-weight: 600;
  letter-spacing: 0.19em;
}

.desktop-nav {
  display: flex;
  align-items: center;
  gap: 26px;
  margin-right: 4px;
}

.desktop-nav a {
  position: relative;
  padding: 8px 0;
  color: var(--ink-soft);
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  transition: color 0.18s ease;
}

.desktop-nav a::after {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 2px;
  background: var(--brand);
  border-radius: 2px;
  content: '';
  opacity: 0;
  transform: scaleX(0.4);
  transition: all 0.2s ease;
}

.desktop-nav a:hover,
.desktop-nav a.nav-active {
  color: var(--ink);
}

.desktop-nav a.nav-active::after {
  opacity: 1;
  transform: scaleX(1);
}

.header-search {
  display: flex;
  flex: 1;
  max-width: 360px;
  margin-left: auto;
  overflow: hidden;
  background: #f5f2ed;
  border: 1px solid transparent;
  border-radius: 999px;
  transition: all 0.2s ease;
}

.header-search:focus-within {
  background: #fff;
  border-color: #edc5b2;
  box-shadow: 0 0 0 3px rgba(232, 93, 42, 0.08);
}

.header-search :deep(.el-input__wrapper) {
  background: transparent;
  box-shadow: none;
}

.header-search :deep(.el-input__inner) {
  font-size: 13px;
}

.search-submit {
  flex-shrink: 0;
  padding: 0 18px;
  color: #fff;
  background: var(--ink);
  border: 0;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  transition: background 0.18s ease;
}

.search-submit:hover {
  background: var(--brand);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.icon-action {
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--ink-soft);
  font-size: 12px;
}

.icon-circle {
  display: grid;
  width: 38px;
  height: 38px;
  background: #f5f2ed;
  border-radius: 50%;
  place-items: center;
  transition: background 0.18s ease;
}

.icon-action:hover .icon-circle {
  color: var(--brand);
  background: var(--brand-soft);
}

.action-label {
  white-space: nowrap;
}

.user-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.avatar {
  display: grid;
  width: 36px;
  height: 36px;
  color: var(--brand-strong);
  background: var(--brand-soft);
  border: 1px solid #f2d3c5;
  border-radius: 50%;
  font-size: 14px;
  font-weight: 700;
  place-items: center;
}

.user-name {
  max-width: 88px;
  overflow: hidden;
  color: var(--ink);
  font-size: 13px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chevron {
  color: var(--muted);
  font-size: 11px;
}

.guest-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.login-link {
  padding: 6px;
  color: var(--ink-soft);
  font-size: 13px;
  font-weight: 500;
}

.register-link {
  padding: 7px 16px;
  color: #fff;
  background: var(--ink);
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  transition: background 0.18s ease;
}

.register-link:hover {
  background: var(--brand);
}

.mobile-row {
  display: none;
}

.shop-main {
  min-width: 0;
  flex: 1;
}

.shop-footer {
  margin-top: auto;
  color: rgba(255, 255, 255, 0.64);
  background: var(--navy);
  padding: 54px 0 22px;
}

.footer-grid {
  display: grid;
  grid-template-columns: 1.7fr 1fr 1fr 1.25fr;
  gap: 44px;
  padding-bottom: 42px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.09);
}

.footer-brand p {
  margin-top: 15px;
  color: rgba(255, 255, 255, 0.55);
  font-size: 13px;
}

.footer-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #fff;
  font-family: var(--font-display);
  font-size: 20px;
}

.footer-tagline {
  display: inline-block;
  margin-top: 20px;
  color: rgba(255, 255, 255, 0.32);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.22em;
}

.footer-col {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.footer-col h3 {
  margin-bottom: 5px;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
}

.footer-col a,
.footer-col span {
  color: rgba(255, 255, 255, 0.54);
  font-size: 12.5px;
  transition: color 0.18s ease;
}

.footer-col a:hover {
  color: #fff;
}

.footer-bottom {
  display: flex;
  justify-content: space-between;
  padding-top: 20px;
  color: rgba(255, 255, 255, 0.32);
  font-size: 11px;
}

@media (max-width: 1080px) {
  .desktop-nav {
    gap: 18px;
  }

  .action-label {
    display: none;
  }

  .header-inner {
    gap: 18px;
  }
}

@media (max-width: 1023px) {
  .desktop-nav,
  .announcement,
  .header-search,
  .action-label {
    display: none;
  }

  .header-inner {
    min-height: 60px;
    gap: 8px;
  }

  .brand {
    min-height: 44px;
  }

  .brand-mark {
    width: 36px;
    height: 36px;
    border-radius: 10px;
  }

  .brand-copy strong {
    font-size: 18px;
  }

  .brand-copy small {
    display: none;
  }

  .header-actions {
    gap: 6px;
    margin-left: auto;
  }

  .icon-action,
  .user-trigger {
    min-width: 44px;
    min-height: 44px;
    justify-content: center;
  }

  .icon-circle {
    width: 38px;
    height: 38px;
  }

  .user-name,
  .chevron {
    display: none;
  }

  .avatar {
    width: 38px;
    height: 38px;
  }

  .guest-actions {
    gap: 4px;
  }

  .login-link {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    padding: 0 8px;
    font-size: 13px;
  }

  .register-link {
    display: inline-flex;
    align-items: center;
    min-height: 40px;
    padding: 6px 13px;
    font-size: 12px;
  }

  .mobile-row {
    display: block;
    padding-bottom: 8px;
  }

  .mobile-row-inner {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .mobile-search {
    flex: 1;
    min-width: 0;
  }

  .mobile-search :deep(.el-input__wrapper) {
    min-height: 40px;
    padding-inline: 14px;
    background: #f5f2ed;
    border-radius: 999px;
    box-shadow: none;
  }

  .mobile-search :deep(.el-input__inner) {
    font-size: 16px;
  }

  .shop-main {
    padding-bottom: calc(72px + env(safe-area-inset-bottom));
  }

  .shop-footer {
    display: none;
  }
}

@media (max-width: 480px) {
  .brand-copy strong {
    font-size: 17px;
  }

  .brand-mark {
    width: 34px;
    height: 34px;
  }

  .icon-circle,
  .avatar {
    width: 36px;
    height: 36px;
  }

  .register-link {
    padding: 6px 10px;
  }
}
</style>
