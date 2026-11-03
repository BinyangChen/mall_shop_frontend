export type MobileTabKey = 'home' | 'products' | 'cart' | 'orders' | 'profile';

export interface MobileTabDefinition {
  key: MobileTabKey;
  label: string;
  to: string;
}

export const MOBILE_TABS: MobileTabDefinition[] = [
  { key: 'home', label: '首页', to: '/' },
  { key: 'products', label: '商品', to: '/products' },
  { key: 'cart', label: '购物车', to: '/cart' },
  { key: 'orders', label: '订单', to: '/orders' },
  { key: 'profile', label: '我的', to: '/profile' },
];

/** The app shell switches to the bottom tab bar below 1024px. */
export const MOBILE_TAB_BAR_MAX_WIDTH = 1023;

export function isMobileTabBarVisible(viewportWidth: number): boolean {
  return viewportWidth <= MOBILE_TAB_BAR_MAX_WIDTH;
}

/**
 * Resolve the active customer tab for a route path.
 * Focused checkout/payment routes stay visually attached to their parent tab.
 */
export function isMobileTabActive(path: string, tab: MobileTabKey): boolean {
  const normalized = (path.split('?')[0].split('#')[0] || '/').replace(/\/+$/, '') || '/';

  switch (tab) {
    case 'home':
      return normalized === '/';
    case 'products':
      return normalized === '/products' || normalized.startsWith('/products/');
    case 'cart':
      return normalized === '/cart' || normalized === '/checkout';
    case 'orders':
      return normalized === '/orders' || normalized.startsWith('/orders/') || normalized.startsWith('/payment');
    case 'profile':
      return normalized === '/profile';
    default:
      return false;
  }
}
