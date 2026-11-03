export type AppScope = 'customer' | 'admin' | 'all';

/**
 * VITE_APP_SCOPE is injected by Vite modes:
 * - customer: storefront only (port 5173)
 * - admin: admin console only (port 5174)
 * - all: both route groups (tests / legacy)
 */
export const APP_SCOPE: AppScope =
  ((import.meta.env.VITE_APP_SCOPE as string | undefined) ?? 'all') as AppScope;

export const isAdminScope = APP_SCOPE === 'admin';
export const isCustomerScope = APP_SCOPE === 'customer';
export const showAdminConsole = !isCustomerScope;
export const defaultLandingPath = isAdminScope ? '/admin' : '/';
