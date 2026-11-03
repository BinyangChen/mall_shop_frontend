import type { AvailableCoupon, Quote } from '@/types/api';

/** 从报价的可选券中挑出指定 userCouponId 的券；找不到返回 null。 */
export function pickCoupon(quote: Quote, userCouponId: number | null): AvailableCoupon | null {
  if (userCouponId == null) return null;
  return quote.availableCoupons.find((coupon) => coupon.userCouponId === userCouponId) ?? null;
}

/** 可用于选择的优惠券（含不可用券，用于解释原因）。 */
export function selectableCoupons(quote: Quote): AvailableCoupon[] {
  return quote.availableCoupons;
}

export interface QuoteDisplaySummary {
  itemTotalCents: number;
  discountCents: number;
  payableCents: number;
  couponName: string | null;
}

/** 展示层只使用服务端报价字段，绝不自行计算应付金额。 */
export function summarizeQuote(quote: Quote | null): QuoteDisplaySummary {
  return {
    itemTotalCents: quote?.itemTotalCents ?? 0,
    discountCents: quote?.discountCents ?? 0,
    payableCents: quote?.payableCents ?? 0,
    couponName: quote?.selectedCouponName ?? null,
  };
}

export function createClientRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}
