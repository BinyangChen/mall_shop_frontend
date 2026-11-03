import { describe, expect, it } from 'vitest';
import type { Quote } from '@/types/api';
import { createClientRequestId, pickCoupon, summarizeQuote } from '../checkout';

const quote: Quote = {
  items: [
    {
      productId: 1,
      title: '桌面台灯',
      imageUrl: null,
      unitPriceCents: 9900,
      quantity: 2,
      subtotalCents: 19800,
    },
  ],
  itemTotalCents: 19800,
  discountCents: 1980,
  payableCents: 17820,
  selectedUserCouponId: 12,
  selectedCouponName: '满 100 减 10%',
  availableCoupons: [
    {
      userCouponId: 12,
      templateId: 3,
      name: '满 100 减 10%',
      type: 'PERCENT',
      value: 1000,
      minSpendCents: 10000,
      discountCents: 1980,
      applicable: true,
      reason: null,
    },
    {
      userCouponId: 13,
      templateId: 4,
      name: '满 500 减 50',
      type: 'FIXED',
      value: 5000,
      minSpendCents: 50000,
      discountCents: 0,
      applicable: false,
      reason: '未达到使用门槛',
    },
  ],
};

describe('pickCoupon', () => {
  it('finds the selected coupon by userCouponId', () => {
    expect(pickCoupon(quote, 12)?.name).toBe('满 100 减 10%');
    expect(pickCoupon(quote, 13)?.applicable).toBe(false);
  });

  it('returns null for missing or empty selection', () => {
    expect(pickCoupon(quote, null)).toBeNull();
    expect(pickCoupon(quote, 999)).toBeNull();
  });
});

describe('summarizeQuote', () => {
  it('uses server-quoted amounts without local recomputation', () => {
    expect(summarizeQuote(quote)).toEqual({
      itemTotalCents: 19800,
      discountCents: 1980,
      payableCents: 17820,
      couponName: '满 100 减 10%',
    });
  });

  it('returns zeroed summary when quote is unavailable', () => {
    expect(summarizeQuote(null)).toEqual({
      itemTotalCents: 0,
      discountCents: 0,
      payableCents: 0,
      couponName: null,
    });
  });
});

describe('createClientRequestId', () => {
  it('returns a UUID-shaped stable value', () => {
    const id = createClientRequestId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(createClientRequestId()).not.toBe(id);
  });
});
