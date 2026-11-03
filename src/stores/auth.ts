import { defineStore } from 'pinia';
import { authApi } from '@/api/auth';
import { clearAccessToken, setAccessToken } from '@/api/token';
import type { RegisterBody, User } from '@/types/api';

interface AuthState {
  user: User | null;
  bootstrapped: boolean;
  loading: boolean;
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    bootstrapped: false,
    loading: false,
  }),

  getters: {
    isLoggedIn: (state): boolean => state.user !== null,
    isAdmin: (state): boolean => state.user?.role === 'ADMIN',
  },

  actions: {
    /** 应用启动时用 HttpOnly Cookie 换取 access token，再加载当前用户。静默失败。 */
    async bootstrap(): Promise<void> {
      if (this.bootstrapped) return;
      this.loading = true;
      try {
        const refreshed = await authApi.refresh();
        setAccessToken(refreshed.accessToken);
        this.user = await authApi.me();
      } catch {
        clearAccessToken();
        this.user = null;
      } finally {
        this.bootstrapped = true;
        this.loading = false;
      }
    },

    async login(usernameOrEmail: string, password: string): Promise<User> {
      this.loading = true;
      try {
        const result = await authApi.login({ usernameOrEmail, password });
        setAccessToken(result.accessToken);
        this.user = result.user;
        this.bootstrapped = true;
        return result.user;
      } finally {
        this.loading = false;
      }
    },

    /**
     * 注册成功后自动登录，减少一次跳转。
     * 若注册成功但自动登录失败，错误会抛给页面，用户仍可手动登录。
     */
    async register(body: RegisterBody): Promise<User> {
      this.loading = true;
      try {
        await authApi.register(body);
        const result = await authApi.login({
          usernameOrEmail: body.username,
          password: body.password,
        });
        setAccessToken(result.accessToken);
        this.user = result.user;
        this.bootstrapped = true;
        return result.user;
      } finally {
        this.loading = false;
      }
    },

    async refresh(): Promise<void> {
      try {
        const result = await authApi.refresh();
        setAccessToken(result.accessToken);
        this.user = await authApi.me();
      } catch (error) {
        clearAccessToken();
        this.user = null;
        throw error;
      }
    },

    async logout(): Promise<void> {
      try {
        await authApi.logout();
      } catch {
        // Refresh Cookie 可能已过期，本地状态仍需清理。
      } finally {
        clearAccessToken();
        this.user = null;
        this.bootstrapped = true;
      }
    },
  },
});
