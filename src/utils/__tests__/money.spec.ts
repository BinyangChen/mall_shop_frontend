import { describe, it, expect } from 'vitest';
import {
  centsToYuan,
  formatBasisPoints,
  formatCouponValue,
  formatCents,
  yuanToCents,
} from '../money';

describe('formatCents', () => {
  it('formats boundary values', () => {
    expect(formatCents(0)).toBe('¥0.00');
    expect(formatCents(1)).toBe('¥0.01');
    expect(formatCents(99)).toBe('¥0.99');
    expect(formatCents(100)).toBe('¥1.00');
    expect(formatCents(12345)).toBe('¥123.45');
  });

  it('handles null, undefined and non-finite values', () => {
    expect(formatCents(null)).toBe('—');
    expect(formatCents(undefined)).toBe('—');
    expect(formatCents(Number.NaN)).toBe('—');
  });

  it('formats negative amounts and large values', () => {
    expect(formatCents(-1)).toBe('-¥0.01');
    expect(formatCents(-12345)).toBe('-¥123.45');
    expect(formatCents(123456789)).toBe('¥1234567.89');
  });
});

describe('yuanToCents / centsToYuan', () => {
  it('converts yuan strings to integer cents without floats', () => {
    expect(yuanToCents('0.01')).toBe(1);
    expect(yuanToCents('0.1')).toBe(10);
    expect(yuanToCents('1')).toBe(100);
    expect(yuanToCents('123.45')).toBe(12345);
    expect(yuanToCents(19.99)).toBe(1999);
  });

  it('accepts at most two decimal places and rejects invalid input', () => {
    expect(yuanToCents('1.234')).toBeNull();
    expect(yuanToCents('abc')).toBeNull();
    expect(yuanToCents('')).toBeNull();
    expect(yuanToCents(null)).toBeNull();
  });

  it('round-trips cents to yuan strings', () => {
    expect(centsToYuan(0)).toBe('0.00');
    expect(centsToYuan(1)).toBe('0.01');
    expect(centsToYuan(12345)).toBe('123.45');
    expect(centsToYuan(null)).toBe('');
  });
});

describe('coupon value formatting', () => {
  it('formats basis points as percentages', () => {
    expect(formatBasisPoints(1000)).toBe('10%');
    expect(formatBasisPoints(1250)).toBe('12.50%');
    expect(formatBasisPoints(10000)).toBe('100%');
  });

  it('formats fixed and percent coupons', () => {
    expect(formatCouponValue('FIXED', 12345)).toBe('¥123.45');
    expect(formatCouponValue('PERCENT', 1000)).toBe('10%');
  });
});
