/**
 * 金额工具：系统中所有金额均为整数分，禁止用浮点数参与后端金额计算。
 */

export function formatCents(cents: number | null | undefined): string {
  if (cents == null || !Number.isFinite(cents)) return '—';
  const rounded = Math.round(cents);
  const sign = rounded < 0 ? '-' : '';
  const abs = Math.abs(rounded);
  return `${sign}¥${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

/** 分 → 表单用「元」字符串（不含货币符号），无多余小数 0。 */
export function centsToYuan(cents: number | null | undefined): string {
  if (cents == null || !Number.isFinite(cents)) return '';
  return (Math.round(cents) / 100).toFixed(2);
}

/** 「元」输入 → 整数分；非法输入返回 null。支持最多两位小数。 */
export function yuanToCents(value: string | number | null | undefined): number | null {
  if (value == null) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  if (!/^-?\d+(\.\d{0,2})?$/.test(raw)) return null;
  const negative = raw.startsWith('-');
  const unsigned = negative ? raw.slice(1) : raw;
  const [integerPart, fractionPart = ''] = unsigned.split('.');
  const fraction = `${fractionPart}00`.slice(0, 2);
  const cents = Number(integerPart) * 100 + Number(fraction);
  if (!Number.isSafeInteger(cents)) return null;
  return negative ? -cents : cents;
}

/** 百分比优惠券基点 → 展示文本，1000 → 10%。 */
export function formatBasisPoints(value: number): string {
  if (!Number.isFinite(value)) return '—';
  const percent = value / 100;
  return `${Number.isInteger(percent) ? percent : percent.toFixed(2)}%`;
}

/** 优惠券面额展示：固定金额券显示 ¥xx.xx，折扣券显示百分比。 */
export function formatCouponValue(type: 'FIXED' | 'PERCENT', value: number): string {
  return type === 'FIXED' ? formatCents(value) : formatBasisPoints(value);
}
