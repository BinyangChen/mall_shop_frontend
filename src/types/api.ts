/**
 * 本文件逐字段对应 docs/api-contract.md（v1）。
 * 所有金额均为整数分；时间为 ISO-8601 本地时间字符串。
 */

// ---------------------------------------------------------------------------
// 基础枚举与通用结构
// ---------------------------------------------------------------------------

export type Role = 'CUSTOMER' | 'ADMIN';
export type ProductStatus = 'DRAFT' | 'ON_SALE' | 'OFF_SALE';
export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'SHIPPED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REFUNDING'
  | 'REFUNDED';
export type PaymentChannel = 'ALIPAY' | 'MOCK';
export type PaymentStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'CLOSED';
export type RefundStatus = 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'FAILED';
export type CouponType = 'FIXED' | 'PERCENT';
export type UserCouponStatus = 'UNUSED' | 'LOCKED' | 'USED' | 'EXPIRED';
export type ReviewStatus = 'VISIBLE' | 'HIDDEN';
export type CouponStatus = 'ACTIVE' | 'DISABLED';
export type CategoryStatus = 'ACTIVE' | 'DISABLED';
export type SortOption = 'price_asc' | 'price_desc' | 'sales_desc' | 'newest';
export type ProductSort = SortOption;

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'TOKEN_EXPIRED'
  | 'REFRESH_TOKEN_INVALID'
  | 'INVALID_CREDENTIALS'
  | 'ACCOUNT_LOCKED'
  | 'FORBIDDEN'
  | 'MOCK_PAYMENT_DISABLED'
  | 'NOT_FOUND'
  | 'PRODUCT_NOT_FOUND'
  | 'ORDER_NOT_FOUND'
  | 'ADDRESS_NOT_FOUND'
  | 'PAYMENT_NOT_FOUND'
  | 'USERNAME_TAKEN'
  | 'EMAIL_TAKEN'
  | 'CONFLICT'
  | 'PRODUCT_NOT_ON_SALE'
  | 'INSUFFICIENT_STOCK'
  | 'CART_EMPTY'
  | 'COUPON_NOT_APPLICABLE'
  | 'COUPON_SOLD_OUT'
  | 'COUPON_ALREADY_CLAIMED'
  | 'COUPON_LIMIT_REACHED'
  | 'INVALID_ORDER_STATUS'
  | 'PAYMENT_AMOUNT_MISMATCH'
  | 'PAYMENT_NOT_PENDING'
  | 'REFUND_NOT_ALLOWED'
  | 'REFUND_ALREADY_EXISTS'
  | 'REFUND_NOT_PENDING'
  | 'REVIEW_NOT_ALLOWED'
  | 'REVIEW_ALREADY_EXISTS'
  | 'CATEGORY_NOT_EMPTY'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

export interface ApiEnvelope<T> {
  code: 'OK';
  data: T;
  traceId?: string;
}

export interface ApiErrorDetail {
  field: string;
  message: string;
}

export interface ApiErrorBody {
  code: ErrorCode | string;
  message: string;
  details?: ApiErrorDetail[] | null;
  traceId?: string;
}

export interface Page<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
  totalPages: number;
}

export interface PageQuery {
  page?: number;
  size?: number;
}

// ---------------------------------------------------------------------------
// Auth / User
// ---------------------------------------------------------------------------

export interface User {
  id: number;
  username: string;
  email: string;
  displayName: string;
  role: Role;
  status: string;
  createdAt: string;
}

export interface RegisterBody {
  username: string;
  email: string;
  password: string;
  displayName: string;
}

export interface LoginBody {
  usernameOrEmail: string;
  password: string;
}

export interface LoginResult {
  accessToken: string;
  expiresInSeconds: number;
  user: User;
}

export interface RefreshResult {
  accessToken: string;
  expiresInSeconds: number;
}

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

export interface Category {
  id: number;
  name: string;
  sortOrder: number;
  /** 管理端分类接口会返回；公开接口可能省略。 */
  status?: CategoryStatus;
}

export interface ProductSummary {
  id: number;
  categoryId: number;
  categoryName: string;
  title: string;
  subtitle: string | null;
  priceCents: number;
  originalPriceCents: number | null;
  imageUrl: string | null;
  salesCount: number;
  ratingAvg: number;
  ratingCount: number;
  stock: number;
}

export interface ProductDetail extends ProductSummary {
  description: string;
  images: string[];
  createdAt: string;
}

/**
 * 管理端商品接口返回 ProductDetail。
 * 契约中 ProductDetail 未单列 status，但管理端必须展示/切换上架状态，
 * 因此在此显式扩展（不对公开商品类型引入额外字段）。
 */
export interface AdminProductDetail extends ProductDetail {
  status: ProductStatus;
}

export interface ProductQuery extends PageQuery {
  q?: string;
  categoryId?: number;
  sort?: SortOption;
}

export interface Review {
  id: number;
  productId: number;
  rating: number;
  content: string;
  userDisplayName: string;
  createdAt: string;
}

export interface CreateReviewBody {
  productId: number;
  rating: number;
  content: string;
}

// ---------------------------------------------------------------------------
// Cart
// ---------------------------------------------------------------------------

export interface CartItem {
  productId: number;
  title: string;
  imageUrl: string | null;
  unitPriceCents: number;
  quantity: number;
  subtotalCents: number;
  stock: number;
  available: boolean;
}

export interface Cart {
  items: CartItem[];
  itemCount: number;
  totalCents: number;
}

// ---------------------------------------------------------------------------
// Address
// ---------------------------------------------------------------------------

export interface Address {
  id: number;
  recipient: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  isDefault: boolean;
}

export interface AddressBody {
  recipient: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  isDefault: boolean;
}

// ---------------------------------------------------------------------------
// Checkout quote
// ---------------------------------------------------------------------------

export interface QuoteItem {
  productId: number;
  title: string;
  imageUrl: string | null;
  unitPriceCents: number;
  quantity: number;
  subtotalCents: number;
}

export interface AvailableCoupon {
  userCouponId: number;
  templateId: number;
  name: string;
  type: CouponType;
  value: number;
  minSpendCents: number;
  discountCents: number;
  applicable: boolean;
  reason: string | null;
}

export interface Quote {
  items: QuoteItem[];
  itemTotalCents: number;
  discountCents: number;
  payableCents: number;
  selectedUserCouponId: number | null;
  selectedCouponName: string | null;
  availableCoupons: AvailableCoupon[];
}

export interface QuoteBody {
  couponId?: number | null;
}

// ---------------------------------------------------------------------------
// Orders / Payments / Refunds
// ---------------------------------------------------------------------------

export interface OrderItem {
  productId: number;
  productName: string;
  imageUrl: string | null;
  unitPriceCents: number;
  quantity: number;
  subtotalCents: number;
}

export interface OrderShippingAddress {
  recipient: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
}

export interface OrderCoupon {
  userCouponId: number;
  name: string;
  discountCents: number;
}

export interface Shipment {
  carrier: string;
  trackingNo: string;
  shippedAt: string;
}

export interface Payment {
  id: number;
  orderId: number;
  orderNo: string;
  channel: PaymentChannel;
  amountCents: number;
  status: PaymentStatus;
  /** ALIPAY：跳转沙箱收银台；MOCK 为 null。 */
  payUrl: string | null;
  createdAt: string;
  expiresAt: string | null;
  paidAt: string | null;
}

export interface Refund {
  id: number;
  orderId: number;
  orderNo: string;
  amountCents: number;
  reason: string;
  status: RefundStatus;
  adminComment: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

export interface OrderActions {
  canPay: boolean;
  canCancel: boolean;
  canConfirm: boolean;
  canRefund: boolean;
  canReview: boolean;
}

export interface Order {
  id: number;
  orderNo: string;
  status: OrderStatus;
  items: OrderItem[];
  shippingAddress: OrderShippingAddress;
  itemTotalCents: number;
  discountCents: number;
  payableCents: number;
  coupon: OrderCoupon | null;
  payDeadline: string | null;
  paidAt: string | null;
  shippedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  refundedAt: string | null;
  createdAt: string;
  payment: Payment | null;
  shipment: Shipment | null;
  refund: Refund | null;
  actions: OrderActions;
}

export interface OrderSummaryItem {
  productId: number;
  productName: string;
  imageUrl: string | null;
  quantity: number;
  unitPriceCents: number;
}

export interface OrderSummary {
  id: number;
  orderNo: string;
  status: OrderStatus;
  itemCount: number;
  payableCents: number;
  createdAt: string;
  items: OrderSummaryItem[];
}

export interface OrderQuery extends PageQuery {
  status?: OrderStatus;
}

export interface CreateOrderBody {
  addressId: number;
  couponId?: number | null;
  clientRequestId: string;
}

export interface CreateRefundBody {
  reason: string;
}

export interface CreatePaymentBody {
  channel?: PaymentChannel;
}

// ---------------------------------------------------------------------------
// Coupons
// ---------------------------------------------------------------------------

export interface CouponTemplateView {
  id: number;
  code: string;
  name: string;
  type: CouponType;
  value: number;
  minSpendCents: number;
  totalQuantity: number;
  claimedQuantity: number;
  remainingQuantity: number;
  perUserLimit: number;
  claimedByMe: number;
  validFrom: string;
  validTo: string;
  status: CouponStatus;
}

export interface UserCouponView {
  id: number;
  templateId: number;
  name: string;
  type: CouponType;
  value: number;
  minSpendCents: number;
  status: UserCouponStatus;
  validFrom: string;
  validTo: string;
  orderId: number | null;
  usedAt: string | null;
}

// ---------------------------------------------------------------------------
// Admin dashboard
// ---------------------------------------------------------------------------

export interface DashboardLast7Day {
  date: string;
  revenueCents: number;
  orderCount: number;
}

export interface DashboardTopProduct {
  productId: number;
  title: string;
  imageUrl: string | null;
  priceCents: number;
  salesCount: number;
}

export interface Dashboard {
  orderCounts: Record<OrderStatus, number>;
  totalOrders: number;
  totalCustomers: number;
  totalRevenueCents: number;
  todayRevenueCents: number;
  last7Days: DashboardLast7Day[];
  topProducts: DashboardTopProduct[];
}

// ---------------------------------------------------------------------------
// Admin products / categories
// ---------------------------------------------------------------------------

export interface AdminProductQuery extends PageQuery {
  q?: string;
  categoryId?: number;
  status?: ProductStatus;
}

export interface ProductCreateBody {
  categoryId: number;
  title: string;
  subtitle: string | null;
  description: string;
  priceCents: number;
  originalPriceCents: number | null;
  imageUrl: string | null;
  images: string[];
  status: ProductStatus;
  stock: number;
}

export type ProductUpdateBody = Omit<ProductCreateBody, 'stock'>;

export interface StockBody {
  stock: number;
}

export interface CategoryCreateBody {
  name: string;
  sortOrder: number;
}

export interface CategoryUpdateBody extends CategoryCreateBody {
  status: CategoryStatus;
}

// ---------------------------------------------------------------------------
// Admin orders / refunds / coupons / reviews
// ---------------------------------------------------------------------------

export interface AdminOrderSummary {
  id: number;
  orderNo: string;
  status: OrderStatus;
  payableCents: number;
  createdAt: string;
  paidAt: string | null;
  customerUsername: string;
  itemCount: number;
  shipment: Shipment | null;
}

export interface AdminOrderDetail extends Order {
  customer: {
    id: number;
    username: string;
    email: string;
    displayName: string;
  };
}

export interface AdminOrderQuery extends PageQuery {
  status?: OrderStatus;
  q?: string;
}

export interface AdminRefundView extends Refund {
  username: string;
}

export interface AdminRefundQuery extends PageQuery {
  status?: RefundStatus;
}

export interface AdminCouponQuery extends PageQuery {}

export interface CouponBody {
  code: string;
  name: string;
  type: CouponType;
  value: number;
  minSpendCents: number;
  totalQuantity: number;
  perUserLimit: number;
  validFrom: string;
  validTo: string;
  status: CouponStatus;
}

/**
 * The contract uses the same request body for create and update. `code` is
 * immutable: the backend validates the field is present but ignores its value
 * when updating an existing template.
 */
export type CouponUpdateBody = CouponBody;

export interface AdminReviewView extends Review {
  orderId: number;
  productTitle: string;
  status: ReviewStatus;
}

export interface AdminReviewQuery extends PageQuery {
  status?: ReviewStatus;
  productId?: number;
}

export interface ShipBody {
  carrier: string;
  trackingNo: string;
}

export interface RefundReviewBody {
  comment: string;
}

export interface VisibilityBody {
  visible: boolean;
}
