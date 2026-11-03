import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import ShopLayout from '@/layouts/ShopLayout.vue';
import AdminLayout from '@/layouts/AdminLayout.vue';
import { isAdminScope, isCustomerScope, showAdminConsole } from '@/config/scope';
import { useAuthStore } from '@/stores/auth';
import { resolveAccess, safeRedirect } from './guards';

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean;
    requiresAdmin?: boolean;
    guestOnly?: boolean;
    title?: string;
  }
}

const customerChildren: RouteRecordRaw[] = [
  {
    path: '',
    name: 'home',
    component: () => import('@/views/shop/HomeView.vue'),
    meta: { title: '首页' },
  },
  {
    path: 'products',
    name: 'products',
    component: () => import('@/views/shop/ProductListView.vue'),
    meta: { title: '全部商品' },
  },
  {
    path: 'products/:id(\\d+)',
    name: 'product-detail',
    component: () => import('@/views/shop/ProductDetailView.vue'),
    meta: { title: '商品详情' },
  },
  {
    path: 'cart',
    name: 'cart',
    component: () => import('@/views/shop/CartView.vue'),
    meta: { requiresAuth: true, title: '购物车' },
  },
  {
    path: 'checkout',
    name: 'checkout',
    component: () => import('@/views/shop/CheckoutView.vue'),
    meta: { requiresAuth: true, title: '确认订单' },
  },
  {
    path: 'orders',
    name: 'orders',
    component: () => import('@/views/shop/OrderListView.vue'),
    meta: { requiresAuth: true, title: '我的订单' },
  },
  {
    path: 'orders/:id(\\d+)',
    name: 'order-detail',
    component: () => import('@/views/shop/OrderDetailView.vue'),
    meta: { requiresAuth: true, title: '订单详情' },
  },
  {
    path: 'payment/result',
    name: 'payment-result',
    component: () => import('@/views/shop/PaymentResultView.vue'),
    meta: { requiresAuth: true, title: '支付结果' },
  },
  {
    path: 'profile',
    name: 'profile',
    component: () => import('@/views/shop/ProfileView.vue'),
    meta: { requiresAuth: true, title: '个人中心' },
  },
  {
    path: ':pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/shop/NotFoundView.vue'),
    meta: { title: '页面未找到' },
  },
];

const adminChildren: RouteRecordRaw[] = [
  {
    path: '',
    name: 'admin-dashboard',
    component: () => import('@/views/admin/DashboardView.vue'),
    meta: { requiresAdmin: true, title: '仪表盘' },
  },
  {
    path: 'products',
    name: 'admin-products',
    component: () => import('@/views/admin/ProductManageView.vue'),
    meta: { requiresAdmin: true, title: '商品管理' },
  },
  {
    path: 'categories',
    name: 'admin-categories',
    component: () => import('@/views/admin/CategoryManageView.vue'),
    meta: { requiresAdmin: true, title: '分类管理' },
  },
  {
    path: 'orders',
    name: 'admin-orders',
    component: () => import('@/views/admin/OrderManageView.vue'),
    meta: { requiresAdmin: true, title: '订单管理' },
  },
  {
    path: 'refunds',
    name: 'admin-refunds',
    component: () => import('@/views/admin/RefundManageView.vue'),
    meta: { requiresAdmin: true, title: '退款审批' },
  },
  {
    path: 'coupons',
    name: 'admin-coupons',
    component: () => import('@/views/admin/CouponManageView.vue'),
    meta: { requiresAdmin: true, title: '优惠券管理' },
  },
  {
    path: 'reviews',
    name: 'admin-reviews',
    component: () => import('@/views/admin/ReviewManageView.vue'),
    meta: { requiresAdmin: true, title: '评价管理' },
  },
];

const routes: RouteRecordRaw[] = [];

// Login is shared by both entries. Registration exists only on the storefront.
routes.push({
  path: '/login',
  name: 'login',
  component: () => import('@/views/auth/LoginView.vue'),
  meta: { guestOnly: true, title: isAdminScope ? '管理端登录' : '登录' },
});

if (!isAdminScope) {
  routes.push({
    path: '/register',
    name: 'register',
    component: () => import('@/views/auth/RegisterView.vue'),
    meta: { guestOnly: true, title: '注册' },
  });
  routes.push({
    path: '/',
    component: ShopLayout,
    children: customerChildren,
  });
}

if (!isCustomerScope) {
  routes.push({
    path: '/admin',
    component: AdminLayout,
    meta: { requiresAdmin: true },
    children: adminChildren,
  });
}

if (isAdminScope) {
  routes.push({ path: '/', redirect: '/admin' });
  routes.push({ path: '/:pathMatch(.*)*', redirect: '/admin' });
}

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) return savedPosition;
    if (to.hash) return { el: to.hash, behavior: 'smooth' };
    return { top: 0 };
  },
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  await auth.bootstrap();

  // The admin entry only accepts ADMIN sessions. A customer session arriving
  // on port 5174 is revoked and sent to the admin login page.
  if (isAdminScope && auth.user && auth.user.role !== 'ADMIN') {
    await auth.logout();
  }

  const access = resolveAccess(to.meta, auth.user);
  if (access) {
    if (access.redirect === '/login' && !auth.user) {
      return {
        path: '/login',
        query: { redirect: to.fullPath },
      };
    }
    return access.redirect;
  }

  if (to.meta.guestOnly && auth.user) {
    if (isAdminScope || (showAdminConsole && auth.user.role === 'ADMIN')) {
      return '/admin';
    }
    return '/';
  }

  return true;
});

router.afterEach((to) => {
  const title = to.meta.title;
  document.title = title ? `${title} · 拾光集市` : '拾光集市 · 精选好物';
});

export { safeRedirect };
export default router;
