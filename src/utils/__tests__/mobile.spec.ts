import { describe, expect, it } from 'vitest';
import { isMobileTabActive, isMobileTabBarVisible } from '../mobile';

describe('mobile tab bar helpers', () => {
  it('shows the tab bar only below the desktop breakpoint', () => {
    expect(isMobileTabBarVisible(375)).toBe(true);
    expect(isMobileTabBarVisible(768)).toBe(true);
    expect(isMobileTabBarVisible(1023)).toBe(true);
    expect(isMobileTabBarVisible(1024)).toBe(false);
  });

  it('marks the products tab active for collection and detail routes', () => {
    expect(isMobileTabActive('/products', 'products')).toBe(true);
    expect(isMobileTabActive('/products/42?from=home', 'products')).toBe(true);
    expect(isMobileTabActive('/', 'products')).toBe(false);
  });

  it('keeps cart and checkout in the same tab group', () => {
    expect(isMobileTabActive('/cart', 'cart')).toBe(true);
    expect(isMobileTabActive('/checkout/', 'cart')).toBe(true);
    expect(isMobileTabActive('/checkout', 'orders')).toBe(false);
  });

  it('routes order and payment result pages to the orders tab', () => {
    expect(isMobileTabActive('/orders', 'orders')).toBe(true);
    expect(isMobileTabActive('/orders/9', 'orders')).toBe(true);
    expect(isMobileTabActive('/payment/result?orderId=9', 'orders')).toBe(true);
    expect(isMobileTabActive('/profile', 'profile')).toBe(true);
    expect(isMobileTabActive('/', 'home')).toBe(true);
  });
});
