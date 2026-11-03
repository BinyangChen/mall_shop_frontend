import type { Role } from '@/types/api';

export interface AccessMeta {
  requiresAuth?: boolean;
  requiresAdmin?: boolean;
}

export type AccessUser = { role: Role } | null | undefined;

export interface AccessDecision {
  redirect: string;
}

/**
 * 纯函数：根据路由 meta 与当前用户计算访问决策。
 * 返回 null 表示放行；重定向 query（登录后回跳）由路由守卫补充。
 */
export function resolveAccess(meta: AccessMeta, user: AccessUser): AccessDecision | null {
  if (meta.requiresAdmin) {
    if (!user) return { redirect: '/login' };
    if (user.role !== 'ADMIN') return { redirect: '/' };
    return null;
  }
  if (meta.requiresAuth && !user) {
    return { redirect: '/login' };
  }
  return null;
}

/** 只允许站内路径作为登录后的 redirect，防止开放重定向。 */
export function safeRedirect(raw: unknown, fallback = '/'): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== 'string') return fallback;
  if (!value.startsWith('/') || value.startsWith('//')) return fallback;
  if (value.startsWith('/login') || value.startsWith('/register')) return fallback;
  return value;
}
