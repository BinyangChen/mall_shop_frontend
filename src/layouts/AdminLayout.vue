<script setup lang="ts">
import { computed, ref, watch, type Component } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import {
  ArrowDown,
  ChatLineSquare,
  Expand,
  Fold,
  Goods,
  Grid,
  List,
  Odometer,
  Refresh,
  ShoppingBag,
  SwitchButton,
  Ticket,
} from '@element-plus/icons-vue';
import { useAuthStore } from '@/stores/auth';
import { useCartStore } from '@/stores/cart';

interface AdminMenuItem {
  path: string;
  label: string;
  icon: Component;
}

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const cart = useCartStore();
const mobileOpen = ref(false);

const menuItems: AdminMenuItem[] = [
  { path: '/admin', label: '仪表盘', icon: Odometer },
  { path: '/admin/products', label: '商品管理', icon: Goods },
  { path: '/admin/categories', label: '分类管理', icon: Grid },
  { path: '/admin/orders', label: '订单管理', icon: List },
  { path: '/admin/refunds', label: '退款审批', icon: Refresh },
  { path: '/admin/coupons', label: '优惠券管理', icon: Ticket },
  { path: '/admin/reviews', label: '评价管理', icon: ChatLineSquare },
];

const activeMenu = computed(() => {
  const matched = menuItems.find(
    (item) => route.path === item.path || (item.path !== '/admin' && route.path.startsWith(item.path)),
  );
  return matched?.path ?? '/admin';
});

const currentTitle = computed(() => route.meta.title || '管理控制台');

function toggleMobile(): void {
  mobileOpen.value = !mobileOpen.value;
}

async function logout(): Promise<void> {
  await auth.logout();
  cart.clear();
  ElMessage.success('已退出登录');
  await router.push('/login');
}

watch(
  () => route.path,
  () => {
    mobileOpen.value = false;
  },
);
</script>

<template>
  <div class="admin-shell">
    <div v-if="mobileOpen" class="sidebar-overlay" @click="mobileOpen = false"></div>

    <aside :class="['admin-sidebar', { open: mobileOpen }]">
      <RouterLink to="/admin" class="admin-brand">
        <span class="admin-logo">
          <el-icon :size="20"><ShoppingBag /></el-icon>
        </span>
        <span class="brand-text">
          <strong>拾光集市</strong>
          <small>ADMIN CONSOLE</small>
        </span>
      </RouterLink>

      <div class="nav-caption">运营工作台</div>
      <el-menu :default-active="activeMenu" router class="admin-menu">
        <el-menu-item v-for="item in menuItems" :key="item.path" :index="item.path">
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.label }}</span>
        </el-menu-item>
      </el-menu>

      <div class="sidebar-bottom">
        <RouterLink to="/" class="back-shop">
          <el-icon><ShoppingBag /></el-icon>
          返回店铺前台
        </RouterLink>
        <span class="version">Mall Shop v1.0</span>
      </div>
    </aside>

    <div class="admin-main">
      <header class="admin-topbar">
        <div class="topbar-left">
          <button
            type="button"
            class="mobile-toggle"
            :aria-label="mobileOpen ? '收起菜单' : '展开菜单'"
            @click="toggleMobile"
          >
            <el-icon :size="19"><component :is="mobileOpen ? Fold : Expand" /></el-icon>
          </button>
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/admin' }">管理控制台</el-breadcrumb-item>
            <el-breadcrumb-item v-if="route.path !== '/admin'">{{ currentTitle }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>

        <div class="topbar-right">
          <RouterLink to="/" class="shop-link">顾客视图</RouterLink>
          <el-dropdown trigger="click">
            <button type="button" class="admin-user">
              <span class="admin-avatar">
                {{ (auth.user?.displayName || auth.user?.username || '管').slice(0, 1) }}
              </span>
              <span class="admin-user-copy">
                <strong>{{ auth.user?.displayName || auth.user?.username }}</strong>
                <small>管理员</small>
              </span>
              <el-icon class="down-icon"><ArrowDown /></el-icon>
            </button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="router.push('/')">
                  <el-icon><ShoppingBag /></el-icon>返回店铺
                </el-dropdown-item>
                <el-dropdown-item divided @click="logout">
                  <el-icon><SwitchButton /></el-icon>退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>

      <main class="admin-content">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style scoped>
.admin-shell {
  display: flex;
  min-height: 100vh;
  background: #f4f1ec;
}

.admin-sidebar {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  z-index: 110;
  display: flex;
  width: 232px;
  flex-direction: column;
  padding: 24px 16px 18px;
  color: rgba(255, 255, 255, 0.65);
  background:
    radial-gradient(circle at 20% 4%, rgba(232, 93, 42, 0.15), transparent 32%),
    #172033;
}

.admin-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 8px;
  margin-bottom: 34px;
  color: #fff;
}

.admin-logo {
  display: grid;
  width: 38px;
  height: 38px;
  color: #ffe9d8;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 11px;
  place-items: center;
}

.brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.brand-text strong {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 500;
}

.brand-text small {
  margin-top: 3px;
  color: rgba(255, 255, 255, 0.3);
  font-size: 7.5px;
  font-weight: 600;
  letter-spacing: 0.16em;
}

.nav-caption {
  padding: 0 11px;
  margin-bottom: 8px;
  color: rgba(255, 255, 255, 0.24);
  font-size: 8.5px;
  font-weight: 600;
  letter-spacing: 0.12em;
}

.admin-menu {
  flex: 1;
  background: transparent;
  border: 0;
}

.admin-menu :deep(.el-menu-item) {
  height: 43px;
  margin-bottom: 3px;
  color: rgba(255, 255, 255, 0.55);
  border-radius: 8px;
  font-size: 12.5px;
}

.admin-menu :deep(.el-menu-item .el-icon) {
  color: rgba(255, 255, 255, 0.36);
  font-size: 16px;
}

.admin-menu :deep(.el-menu-item:hover) {
  color: #fff;
  background: rgba(255, 255, 255, 0.055);
}

.admin-menu :deep(.el-menu-item.is-active) {
  color: #fff;
  background: rgba(232, 93, 42, 0.16);
  font-weight: 600;
}

.admin-menu :deep(.el-menu-item.is-active .el-icon) {
  color: #ec9a77;
}

.admin-menu :deep(.el-menu-item.is-active::before) {
  position: absolute;
  top: 50%;
  left: 0;
  width: 2.5px;
  height: 17px;
  background: var(--brand);
  border-radius: 0 3px 3px 0;
  content: '';
  transform: translateY(-50%);
}

.sidebar-bottom {
  display: flex;
  flex-direction: column;
  gap: 13px;
  padding: 16px 9px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
}

.back-shop {
  display: flex;
  align-items: center;
  gap: 6px;
  color: rgba(255, 255, 255, 0.43);
  font-size: 10.5px;
  transition: color 0.18s ease;
}

.back-shop:hover {
  color: #fff;
}

.version {
  color: rgba(255, 255, 255, 0.18);
  font-size: 8px;
  letter-spacing: 0.06em;
}

.admin-main {
  display: flex;
  min-width: 0;
  min-height: 100vh;
  flex: 1;
  flex-direction: column;
  margin-left: 232px;
}

.admin-topbar {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  height: 64px;
  padding: 0 30px;
  background: rgba(255, 255, 255, 0.88);
  border-bottom: 1px solid #e8e3dc;
  backdrop-filter: blur(14px);
}

.topbar-left {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 12px;
}

.admin-topbar :deep(.el-breadcrumb__inner) {
  color: var(--muted);
  font-size: 11.5px;
  font-weight: 400;
}

.admin-topbar :deep(.el-breadcrumb__item:last-child .el-breadcrumb__inner) {
  color: var(--ink);
  font-weight: 600;
}

.mobile-toggle {
  display: none;
  width: 34px;
  height: 34px;
  padding: 0;
  color: var(--ink-soft);
  background: #f6f2ec;
  border: 0;
  border-radius: 8px;
  cursor: pointer;
  place-items: center;
}

.topbar-right {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 18px;
}

.shop-link {
  color: var(--muted);
  font-size: 11px;
  transition: color 0.18s ease;
}

.shop-link:hover {
  color: var(--brand);
}

.admin-user {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.admin-avatar {
  display: grid;
  width: 33px;
  height: 33px;
  color: var(--brand-strong);
  background: var(--brand-soft);
  border: 1px solid #f1d3c5;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 600;
  place-items: center;
}

.admin-user-copy {
  display: flex;
  align-items: flex-start;
  flex-direction: column;
  line-height: 1.3;
}

.admin-user-copy strong {
  max-width: 90px;
  overflow: hidden;
  color: var(--ink);
  font-size: 11.5px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.admin-user-copy small {
  color: var(--muted);
  font-size: 8.5px;
}

.down-icon {
  color: var(--muted);
  font-size: 10px;
}

.admin-content {
  flex: 1;
  width: 100%;
  max-width: 1480px;
  padding: 28px 30px 48px;
  margin: 0 auto;
}

.sidebar-overlay {
  display: none;
}

@media (max-width: 960px) {
  .admin-sidebar {
    width: 218px;
    transform: translateX(-100%);
    transition: transform 0.25s ease;
  }

  .admin-sidebar.open {
    box-shadow: 20px 0 60px rgba(0, 0, 0, 0.25);
    transform: translateX(0);
  }

  .admin-main {
    margin-left: 0;
  }

  .mobile-toggle {
    display: grid;
  }

  .sidebar-overlay {
    position: fixed;
    inset: 0;
    z-index: 105;
    display: block;
    background: rgba(17, 24, 36, 0.42);
    backdrop-filter: blur(2px);
  }

  .admin-content {
    padding: 22px 20px 40px;
  }

  .admin-topbar {
    padding: 0 20px;
  }
}

@media (max-width: 600px) {
  .admin-topbar {
    height: 58px;
    padding: 0 14px;
  }

  .topbar-right {
    gap: 10px;
  }

  .shop-link,
  .admin-user-copy,
  .down-icon {
    display: none;
  }

  .admin-content {
    padding: 16px 12px 34px;
  }

  .admin-topbar :deep(.el-breadcrumb__item:first-child) {
    display: none;
  }

  .admin-topbar :deep(.el-breadcrumb__separator:first-of-type) {
    display: none;
  }
}
</style>
