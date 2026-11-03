import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import type { User } from '@/types/api';

vi.mock('@/api/auth', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    refresh: vi.fn(),
    logout: vi.fn(),
    me: vi.fn(),
  },
}));

vi.mock('@/api/token', () => ({
  setAccessToken: vi.fn(),
  clearAccessToken: vi.fn(),
  getAccessToken: vi.fn(() => null),
}));

import { authApi } from '@/api/auth';
import { clearAccessToken, setAccessToken } from '@/api/token';
import { useAuthStore } from '../auth';

const customer: User = {
  id: 2,
  username: 'demo',
  email: 'demo@example.com',
  displayName: '演示用户',
  role: 'CUSTOMER',
  status: 'ACTIVE',
  createdAt: '2026-11-03T10:00:00',
};

const admin: User = {
  ...customer,
  id: 1,
  username: 'admin',
  email: 'admin@example.com',
  displayName: '管理员',
  role: 'ADMIN',
};

describe('auth store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('bootstrap refreshes the session then loads the current user', async () => {
    vi.mocked(authApi.refresh).mockResolvedValue({
      accessToken: 'access-token',
      expiresInSeconds: 900,
    });
    vi.mocked(authApi.me).mockResolvedValue(customer);

    const store = useAuthStore();
    await store.bootstrap();

    expect(authApi.refresh).toHaveBeenCalledTimes(1);
    expect(authApi.me).toHaveBeenCalledTimes(1);
    expect(store.user).toEqual(customer);
    expect(store.bootstrapped).toBe(true);
    expect(store.isLoggedIn).toBe(true);
    expect(store.isAdmin).toBe(false);
    expect(setAccessToken).toHaveBeenCalledWith('access-token');
  });

  it('bootstrap silently handles a missing refresh cookie', async () => {
    vi.mocked(authApi.refresh).mockRejectedValue(new Error('no cookie'));

    const store = useAuthStore();
    await expect(store.bootstrap()).resolves.toBeUndefined();

    expect(store.user).toBeNull();
    expect(store.bootstrapped).toBe(true);
    expect(store.isLoggedIn).toBe(false);
    expect(clearAccessToken).toHaveBeenCalled();
  });

  it('does not run bootstrap twice', async () => {
    vi.mocked(authApi.refresh).mockRejectedValue(new Error('no cookie'));
    const store = useAuthStore();
    await store.bootstrap();
    await store.bootstrap();
    expect(authApi.refresh).toHaveBeenCalledTimes(1);
  });

  it('login stores user and access token in memory', async () => {
    vi.mocked(authApi.login).mockResolvedValue({
      accessToken: 'jwt-token',
      expiresInSeconds: 900,
      user: admin,
    });

    const store = useAuthStore();
    const user = await store.login('admin', 'Admin@12345');

    expect(user).toEqual(admin);
    expect(store.user).toEqual(admin);
    expect(store.isAdmin).toBe(true);
    expect(store.bootstrapped).toBe(true);
    expect(setAccessToken).toHaveBeenCalledWith('jwt-token');
  });

  it('login propagates API errors and keeps the user logged out', async () => {
    vi.mocked(authApi.login).mockRejectedValue(new Error('用户名或密码错误'));
    const store = useAuthStore();

    await expect(store.login('demo', 'wrong-pass')).rejects.toThrow('用户名或密码错误');
    expect(store.user).toBeNull();
    expect(setAccessToken).not.toHaveBeenCalled();
  });

  it('register auto-logins with the new credentials', async () => {
    vi.mocked(authApi.register).mockResolvedValue(customer);
    vi.mocked(authApi.login).mockResolvedValue({
      accessToken: 'new-user-token',
      expiresInSeconds: 900,
      user: customer,
    });

    const store = useAuthStore();
    const user = await store.register({
      username: 'demo',
      email: 'demo@example.com',
      password: 'Demo@12345',
      displayName: '演示用户',
    });

    expect(authApi.register).toHaveBeenCalledTimes(1);
    expect(authApi.login).toHaveBeenCalledWith({
      usernameOrEmail: 'demo',
      password: 'Demo@12345',
    });
    expect(user).toEqual(customer);
    expect(store.user).toEqual(customer);
    expect(setAccessToken).toHaveBeenCalledWith('new-user-token');
  });

  it('logout always clears local auth state even if the API fails', async () => {
    vi.mocked(authApi.logout).mockRejectedValue(new Error('network down'));
    const store = useAuthStore();
    store.user = customer;
    store.bootstrapped = true;

    await store.logout();

    expect(store.user).toBeNull();
    expect(clearAccessToken).toHaveBeenCalled();
  });
});
