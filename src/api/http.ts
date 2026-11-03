import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import type { ApiErrorBody, ApiErrorDetail, RefreshResult } from '@/types/api';
import { clearAccessToken, getAccessToken, setAccessToken } from './token';

const API_BASE = '/api';
const AUTH_NO_REFRESH_PATHS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];
const AUTH_NO_TOKEN_PATHS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

export class NormalizedApiError extends Error {
  readonly code: string;
  readonly details: ApiErrorDetail[] | null;
  readonly status: number | null;
  readonly traceId: string | null;

  constructor(
    code: string,
    message: string,
    details: ApiErrorDetail[] | null = null,
    status: number | null = null,
    traceId: string | null = null,
  ) {
    super(message);
    this.name = 'NormalizedApiError';
    this.code = code;
    this.details = details;
    this.status = status;
    this.traceId = traceId;
  }
}

export function isNormalizedApiError(error: unknown): error is NormalizedApiError {
  return error instanceof NormalizedApiError;
}

export function normalizeError(error: unknown): NormalizedApiError {
  if (isNormalizedApiError(error)) return error;
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as ApiErrorBody | undefined;
    const status = error.response?.status ?? null;
    if (body && typeof body === 'object' && typeof body.code === 'string') {
      return new NormalizedApiError(
        body.code,
        body.message || '请求失败，请稍后重试',
        Array.isArray(body.details) ? body.details : null,
        status,
        body.traceId ?? null,
      );
    }
    if (error.code === 'ECONNABORTED') {
      return new NormalizedApiError('TIMEOUT', '请求超时，请稍后重试', null, status);
    }
    if (!error.response) {
      return new NormalizedApiError(
        'NETWORK_ERROR',
        '无法连接服务器，请确认后端服务已启动',
        null,
        null,
      );
    }
    return new NormalizedApiError(
      'HTTP_ERROR',
      status ? `请求失败（HTTP ${status}）` : '请求失败，请稍后重试',
      null,
      status,
    );
  }
  if (error instanceof Error && error.message) {
    return new NormalizedApiError('UNKNOWN_ERROR', error.message);
  }
  return new NormalizedApiError('UNKNOWN_ERROR', '未知错误，请稍后重试');
}

/** 兼容不同版本 Element Plus / 浏览器，取错误中的第一条字段错误。 */
export function firstDetailMessage(error: unknown): string | null {
  if (isNormalizedApiError(error) && error.details?.length) {
    return error.details[0]?.message ?? null;
  }
  return null;
}

interface RetryableConfig extends InternalAxiosRequestConfig {
  __isRetry?: boolean;
}

const instance: AxiosInstance = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

let refreshPromise: Promise<string> | null = null;
let redirecting = false;

function isAuthNoRefreshPath(url: string | undefined): boolean {
  if (!url) return false;
  return AUTH_NO_REFRESH_PATHS.some((path) => url.startsWith(path));
}

function isAuthNoTokenPath(url: string | undefined): boolean {
  if (!url) return false;
  return AUTH_NO_TOKEN_PATHS.some((path) => url.startsWith(path));
}

/**
 * 使用 HttpOnly Refresh Cookie 轮换 access token。
 * 单飞：并发失败请求共享同一个刷新请求。
 */
export function refreshSession(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post<{ code: string; data: RefreshResult }>(
        `${API_BASE}/auth/refresh`,
        undefined,
        { withCredentials: true, timeout: 20000 },
      )
      .then((response) => {
        const token = response.data?.data?.accessToken;
        if (!token) {
          throw new NormalizedApiError('REFRESH_TOKEN_INVALID', '登录状态已失效');
        }
        setAccessToken(token);
        return token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

function redirectToLogin(): void {
  if (typeof window === 'undefined' || redirecting) return;
  const { pathname, search, hash } = window.location;
  if (pathname === '/login' || pathname === '/register') return;
  redirecting = true;
  clearAccessToken();
  const redirect = encodeURIComponent(`${pathname}${search}${hash}`);
  window.location.replace(`/login?redirect=${redirect}`);
}

function isLoginRedirectNeeded(status: number | undefined, url: string | undefined): boolean {
  return status === 401 && !isAuthNoRefreshPath(url);
}

instance.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token && !isAuthNoTokenPath(config.url)) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

instance.interceptors.response.use(
  (response) => {
    const payload = response.data;
    if (payload && typeof payload === 'object' && 'data' in payload) {
      return payload.data;
    }
    return payload;
  },
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) {
      return Promise.reject(normalizeError(error));
    }

    const status = error.response?.status;
    const original = error.config as RetryableConfig | undefined;

    if (isLoginRedirectNeeded(status, original?.url) && original && !original.__isRetry) {
      original.__isRetry = true;
      try {
        const token = await refreshSession();
        original.headers.set('Authorization', `Bearer ${token}`);
        return await instance(original);
      } catch {
        clearAccessToken();
        redirectToLogin();
        return Promise.reject(normalizeError(error));
      }
    }

    return Promise.reject(normalizeError(error));
  },
);

/** 通过拦截器后，方法直接返回响应包裹中的 data。 */
export interface HttpClient {
  get<T>(url: string, config?: AxiosRequestConfig): Promise<T>;
  post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>;
  put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>;
  patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>;
  delete<T>(url: string, config?: AxiosRequestConfig): Promise<T>;
}

export const http = instance as unknown as HttpClient;
export { instance as axiosInstance };
