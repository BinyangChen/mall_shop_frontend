import { describe, expect, it } from 'vitest';
import { resolveAccess, safeRedirect } from '../guards';

describe('resolveAccess', () => {
  it('sends guests to login for protected routes', () => {
    expect(resolveAccess({ requiresAuth: true }, null)).toEqual({ redirect: '/login' });
  });

  it('allows guests to browse public routes', () => {
    expect(resolveAccess({}, null)).toBeNull();
    expect(resolveAccess({ requiresAuth: false }, null)).toBeNull();
  });

  it('blocks customer from admin routes', () => {
    expect(resolveAccess({ requiresAdmin: true }, { role: 'CUSTOMER' })).toEqual({
      redirect: '/',
    });
  });

  it('sends guests visiting admin routes to login', () => {
    expect(resolveAccess({ requiresAdmin: true }, null)).toEqual({ redirect: '/login' });
  });

  it('allows admin', () => {
    expect(resolveAccess({ requiresAdmin: true }, { role: 'ADMIN' })).toBeNull();
  });

  it('allows authenticated customer on protected customer routes', () => {
    expect(
      resolveAccess({ requiresAuth: true }, { role: 'CUSTOMER' }),
    ).toBeNull();
  });
});

describe('safeRedirect', () => {
  it('accepts internal paths only', () => {
    expect(safeRedirect('/orders/12')).toBe('/orders/12');
    expect(safeRedirect(['/cart'])).toBe('/cart');
  });

  it('rejects external and auth-loop redirects', () => {
    expect(safeRedirect('https://evil.example.com')).toBe('/');
    expect(safeRedirect('//evil.example.com')).toBe('/');
    expect(safeRedirect('/login')).toBe('/');
    expect(safeRedirect(undefined, '/admin')).toBe('/admin');
  });
});
