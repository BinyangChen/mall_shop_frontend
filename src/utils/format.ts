import type {
  OrderStatus,
  PaymentStatus,
  ProductStatus,
  RefundStatus,
  ReviewStatus,
  UserCouponStatus,
} from '@/types/api';

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const normalized = value.replace('T', ' ');
  return normalized.length > 16 ? normalized.slice(0, 16) : normalized;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  return formatDateTime(value).slice(0, 10);
}

export type TagType = 'info' | 'warning' | 'success' | 'danger' | 'primary';

export const ORDER_STATUS_META: Record<
  OrderStatus,
  { label: string; type: TagType }
> = {
  PENDING_PAYMENT: { label: '待支付', type: 'warning' },
  PAID: { label: '待发货', type: 'primary' },
  SHIPPED: { label: '待收货', type: 'primary' },
  COMPLETED: { label: '已完成', type: 'success' },
  CANCELLED: { label: '已取消', type: 'info' },
  REFUNDING: { label: '退款中', type: 'warning' },
  REFUNDED: { label: '已退款', type: 'info' },
};

export const PAYMENT_STATUS_META: Record<PaymentStatus, { label: string; type: TagType }> = {
  PENDING: { label: '待支付', type: 'warning' },
  SUCCEEDED: { label: '支付成功', type: 'success' },
  FAILED: { label: '支付失败', type: 'danger' },
  CLOSED: { label: '已关闭', type: 'info' },
};

export const PRODUCT_STATUS_META: Record<ProductStatus, { label: string; type: TagType }> = {
  DRAFT: { label: '草稿', type: 'info' },
  ON_SALE: { label: '在售', type: 'success' },
  OFF_SALE: { label: '已下架', type: 'warning' },
};

export const REFUND_STATUS_META: Record<RefundStatus, { label: string; type: TagType }> = {
  REQUESTED: { label: '待审核', type: 'warning' },
  APPROVED: { label: '已通过', type: 'success' },
  REJECTED: { label: '已拒绝', type: 'danger' },
  FAILED: { label: '退款失败', type: 'danger' },
};

export const USER_COUPON_STATUS_META: Record<UserCouponStatus, { label: string; type: TagType }> = {
  UNUSED: { label: '可使用', type: 'success' },
  LOCKED: { label: '已锁定', type: 'warning' },
  USED: { label: '已使用', type: 'info' },
  EXPIRED: { label: '已过期', type: 'info' },
};

export const REVIEW_STATUS_META: Record<ReviewStatus, { label: string; type: TagType }> = {
  VISIBLE: { label: '展示中', type: 'success' },
  HIDDEN: { label: '已隐藏', type: 'info' },
};

export const ORDER_STATUS_OPTIONS = (
  Object.keys(ORDER_STATUS_META) as OrderStatus[]
).map((value) => ({ value, label: ORDER_STATUS_META[value].label }));

export const SORT_OPTIONS = [
  { value: 'newest', label: '最新上架' },
  { value: 'sales_desc', label: '销量优先' },
  { value: 'price_asc', label: '价格从低到高' },
  { value: 'price_desc', label: '价格从高到低' },
] as const;

export function maskPhone(phone: string): string {
  return phone.length === 11 ? `${phone.slice(0, 3)}****${phone.slice(7)}` : phone;
}

export function fallbackImage(event: Event): void {
  const target = event.target as HTMLImageElement;
  target.classList.add('img-fallback');
  target.src =
    'data:image/svg+xml;charset=utf-8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320"><rect width="100%" height="100%" fill="#f1eee9"/><g fill="#b9b2a8"><path d="M116 122h88a10 10 0 0 1 10 10v62a10 10 0 0 1-10 10h-88a10 10 0 0 1-10-10v-62a10 10 0 0 1 10-10Zm6 64 22-26 18 20 16-16 26 22H122Z"/><circle cx="148" cy="146" r="8"/></g></svg>`,
    );
}
