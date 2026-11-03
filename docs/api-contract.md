# Mall Shop API 契约 v1

> 前后端唯一事实来源。后端按此实现，前端按此生成/手写类型。任何变更须同步修改本文件。

## 0. 通用约定

- Base URL：`/api`；前端开发通过 Vite 代理到 `http://localhost:8080`。
- 编码：`application/json; charset=utf-8`（支付宝 notify 例外：`application/x-www-form-urlencoded`）。
- 时间：ISO-8601 本地时间，无时区，`YYYY-MM-DDTHH:mm:ss`。
- 货币：所有金额字段为**整数分**，字段名以 `Cents` 结尾。
- 分页请求：`?page=0&size=12`（page 从 0 开始）；分页响应：
  ```json
  { "items": [], "page": 0, "size": 12, "total": 0, "totalPages": 0 }
  ```
- 成功响应包裹：
  ```json
  { "code": "OK", "data": {}, "traceId": "b1c2..." }
  ```
- 错误响应（HTTP 状态码有意义）：
  ```json
  { "code": "INSUFFICIENT_STOCK", "message": "库存不足", "details": [{ "field": "productId", "message": "仅剩 2 件" }], "traceId": "b1c2..." }
  ```
- 鉴权：除公开端点外需 `Authorization: Bearer <accessToken>`。
- 公开端点：`POST /auth/register|login|refresh|logout`、`GET /products*`、`GET /categories`、`GET /products/{id}/reviews`、`POST /payments/alipay/notify`、`GET /payments/alipay/return`。
- 管理员端点均在 `/admin/**`，需 `ADMIN` 角色；其余端点需登录且校验资源归属。
- 金额计算不使用浮点；百分比券 `value` 为基点（1000 = 10% 折扣）。折扣后应付最低 1 分。

### 枚举

```ts
type Role = 'CUSTOMER' | 'ADMIN';
type ProductStatus = 'DRAFT' | 'ON_SALE' | 'OFF_SALE';
type OrderStatus = 'PENDING_PAYMENT' | 'PAID' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED' | 'REFUNDING' | 'REFUNDED';
type PaymentChannel = 'ALIPAY' | 'MOCK';
type PaymentStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'CLOSED';
type RefundStatus = 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'FAILED';
type CouponType = 'FIXED' | 'PERCENT';
type UserCouponStatus = 'UNUSED' | 'LOCKED' | 'USED' | 'EXPIRED';
type ReviewStatus = 'VISIBLE' | 'HIDDEN';
```

### 错误码

| code | HTTP | 场景 |
|---|---|---|
| VALIDATION_ERROR | 400 | 参数校验失败（details 含字段错误） |
| UNAUTHORIZED / TOKEN_EXPIRED / REFRESH_TOKEN_INVALID | 401 | 未登录/令牌过期/刷新令牌无效 |
| INVALID_CREDENTIALS | 401 | 用户名或密码错误 |
| ACCOUNT_LOCKED | 423 | 连续登录失败被锁定 |
| FORBIDDEN | 403 | 无权限或资源不属于当前用户 |
| MOCK_PAYMENT_DISABLED | 403 | mock 支付开关关闭 |
| NOT_FOUND / PRODUCT_NOT_FOUND / ORDER_NOT_FOUND / ADDRESS_NOT_FOUND / PAYMENT_NOT_FOUND | 404 | 资源不存在 |
| USERNAME_TAKEN / EMAIL_TAKEN | 409 | 注册冲突 |
| CONFLICT | 409 | 并发冲突（乐观锁/重复操作） |
| PRODUCT_NOT_ON_SALE | 409 | 商品已下架/未上架 |
| INSUFFICIENT_STOCK | 409 | 库存不足（details: productId, available） |
| CART_EMPTY | 400 | 购物车为空 |
| COUPON_NOT_APPLICABLE | 409 | 优惠券不可用（未达门槛/已用/过期） |
| COUPON_SOLD_OUT / COUPON_ALREADY_CLAIMED / COUPON_LIMIT_REACHED | 409 | 领取失败 |
| INVALID_ORDER_STATUS | 409 | 订单状态不允许该操作 |
| PAYMENT_AMOUNT_MISMATCH / PAYMENT_NOT_PENDING | 409 | 支付金额或状态异常 |
| REFUND_NOT_ALLOWED / REFUND_ALREADY_EXISTS / REFUND_NOT_PENDING | 409 | 退款状态异常 |
| REVIEW_NOT_ALLOWED / REVIEW_ALREADY_EXISTS | 409 | 评价状态异常 |
| CATEGORY_NOT_EMPTY | 409 | 分类下仍有商品 |
| RATE_LIMITED | 429 | 请求过于频繁 |
| INTERNAL_ERROR | 500 | 未预期错误 |

HTTP 状态码与 code 同时返回；前端以 code 判断业务提示。

---

## 1. Auth

### `POST /api/auth/register` (公开)
```json
{ "username": "alice", "email": "alice@example.com", "password": "Secret@123", "displayName": "Alice" }
```
→ 201
```json
{ "code": "OK", "data": { "id": 3, "username": "alice", "email": "alice@example.com", "displayName": "Alice", "role": "CUSTOMER", "status": "ACTIVE", "createdAt": "2026-11-03T10:00:00" } }
```
约束：username 3–30（字母数字下划线），password 8–64，email 合法。

### `POST /api/auth/login` (公开)
```json
{ "usernameOrEmail": "demo", "password": "Demo@12345" }
```
→ 200，`Set-Cookie: refresh_token=<opaque>; HttpOnly; Path=/api/auth; SameSite=Lax; Max-Age=604800`
```json
{ "code": "OK", "data": { "accessToken": "<jwt>", "expiresInSeconds": 900, "user": { "id": 2, "username": "demo", "email": "demo@example.com", "displayName": "演示用户", "role": "CUSTOMER", "status": "ACTIVE", "createdAt": "..." } } }
```

### `POST /api/auth/refresh` (公开，读取 Cookie)
→ 200，轮换 Cookie
```json
{ "code": "OK", "data": { "accessToken": "<jwt>", "expiresInSeconds": 900 } }
```
无 Cookie/无效/过期/重放 → 401。

### `POST /api/auth/logout` (公开，读取 Cookie)
→ 200 `{ "code": "OK", "data": null }`，清除 Cookie 并吊销。

### `GET /api/auth/me` (登录)
→ 200 `{ "code": "OK", "data": User }`

`User = { id, username, email, displayName, role, status, createdAt }`

---

## 2. Catalog

### `GET /api/categories` (公开)
→ `[{ "id": 1, "name": "数码", "sortOrder": 1 }]`

### `GET /api/products` (公开)
Query：`q`、`categoryId`、`sort ∈ {price_asc, price_desc, sales_desc, newest}`（默认 newest）、`page`、`size`
→ 分页 `ProductSummary[]`
```ts
interface ProductSummary {
  id: number; categoryId: number; categoryName: string;
  title: string; subtitle: string | null;
  priceCents: number; originalPriceCents: number | null;
  imageUrl: string | null; salesCount: number;
  ratingAvg: number; ratingCount: number;
  stock: number;
}
```
仅返回 `ON_SALE` 且未删除商品。

### `GET /api/products/{id}` (公开)
→ `ProductDetail = ProductSummary & { description: string; images: string[]; createdAt: string }`
非在售/不存在 → 404 `PRODUCT_NOT_FOUND`（管理员走 admin 接口）。

### `GET /api/products/{id}/reviews` (公开)
Query：`page`、`size` → 分页
```ts
interface Review { id: number; productId: number; rating: number; content: string; userDisplayName: string; createdAt: string; }
```
仅 `VISIBLE`。

---

## 3. Cart（登录）

`Cart`：
```ts
interface Cart {
  items: CartItem[]; itemCount: number; totalCents: number;
}
interface CartItem {
  productId: number; title: string; imageUrl: string | null;
  unitPriceCents: number; quantity: number; subtotalCents: number;
  stock: number; available: boolean; // 商品在售且库存足够
}
```

- `GET /api/cart` → Cart
- `POST /api/cart/items` `{ "productId": 1, "quantity": 1 }` → Cart（同一商品累加；数量上限 99；校验在售/库存 → `INSUFFICIENT_STOCK`）
- `PATCH /api/cart/items/{productId}` `{ "quantity": 2 }` → Cart（1–99）
- `DELETE /api/cart/items/{productId}` → Cart

---

## 4. Addresses（登录）

```ts
interface Address { id: number; recipient: string; phone: string; province: string; city: string; district: string; detail: string; isDefault: boolean; }
```
- `GET /api/addresses` → Address[]
- `POST /api/addresses` `{ recipient, phone, province, city, district, detail, isDefault }` → 201 Address
- `PUT /api/addresses/{id}` 同 body → Address
- `DELETE /api/addresses/{id}` → null
- `POST /api/addresses/{id}/default` → Address
手机号：`^1[3-9]\d{9}$`；各字段非空 ≤100 字符。

---

## 5. Checkout 报价（登录）

### `POST /api/checkout/quote`
```json
{ "couponId": 12 }
```
`couponId` 为 **userCouponId**，可空。基于当前购物车计算，不落库。
→ 200
```ts
interface Quote {
  items: { productId: number; title: string; imageUrl: string | null; unitPriceCents: number; quantity: number; subtotalCents: number; }[];
  itemTotalCents: number;
  discountCents: number;
  payableCents: number;
  selectedUserCouponId: number | null;
  selectedCouponName: string | null;
  availableCoupons: {
    userCouponId: number; templateId: number; name: string; type: CouponType; value: number;
    minSpendCents: number; discountCents: number; applicable: boolean; reason: string | null;
  }[];
}
```
购物车为空 → 400 `CART_EMPTY`；传入的 couponId 不可用 → 409 `COUPON_NOT_APPLICABLE`。

---

## 6. Orders（登录）

### `POST /api/orders`
```json
{ "addressId": 1, "couponId": 12, "clientRequestId": "7b2e0c1a-..." }
```
- `couponId` 可空（userCouponId）。
- `clientRequestId`（UUID，前端生成并持久到提交成功）用于幂等；重复提交返回**已存在订单**（HTTP 200，其余新建为 201）。
- 单事务：校验地址归属 → 服务端重算金额 → 预留库存 → 锁定券 → 建单 → 清空购物车。
→ 201 `Order`

```ts
interface Order {
  id: number; orderNo: string; status: OrderStatus;
  items: { productId: number; productName: string; imageUrl: string | null; unitPriceCents: number; quantity: number; subtotalCents: number; }[];
  shippingAddress: { recipient: string; phone: string; province: string; city: string; district: string; detail: string; };
  itemTotalCents: number; discountCents: number; payableCents: number;
  coupon: { userCouponId: number; name: string; discountCents: number; } | null;
  payDeadline: string | null;
  paidAt: string | null; shippedAt: string | null; completedAt: string | null;
  cancelledAt: string | null; refundedAt: string | null; createdAt: string;
  payment: Payment | null;
  shipment: { carrier: string; trackingNo: string; shippedAt: string; } | null;
  refund: Refund | null;
  actions: { canPay: boolean; canCancel: boolean; canConfirm: boolean; canRefund: boolean; canReview: boolean; };
}
```

### `GET /api/orders?page=&size=&status=`
→ 分页 `OrderSummary[]`
```ts
interface OrderSummary { id; orderNo; status: OrderStatus; itemCount: number; payableCents: number; createdAt: string; items: { productId; productName; imageUrl; quantity; unitPriceCents; }[]; }
```

### `GET /api/orders/{id}` → `Order`（仅本人）

### `POST /api/orders/{id}/cancel` → `Order`
仅 `PENDING_PAYMENT`；释放库存与优惠券。

### `POST /api/orders/{id}/confirm` → `Order`
仅 `SHIPPED` → `COMPLETED`。

### `POST /api/orders/{id}/refunds` `{ "reason": "不想要了" }` → 201 `Refund`
允许：`PAID`、`SHIPPED`、`COMPLETED`（自 `completedAt` 起 7 天内）；同一订单不可并发多个活跃退款。
```ts
interface Refund { id; orderId; orderNo; amountCents; reason; status: RefundStatus; adminComment: string | null; createdAt; reviewedAt: string | null; }
```
申请成功后订单 `status` 变为 `REFUNDING`。

### `GET /api/orders/{id}/refunds` → Refund[]

---

## 7. Payments（登录）

### `POST /api/orders/{id}/payments`
```json
{ "channel": "MOCK" }
```
`channel` 可空：默认按配置（支付宝可用则 ALIPAY，否则 MOCK）。
→ 201
```ts
interface Payment {
  id: number; orderId: number; orderNo: string; channel: PaymentChannel;
  amountCents: number; status: PaymentStatus;
  payUrl: string | null;       // ALIPAY：跳转沙箱收银台
  createdAt: string; expiresAt: string | null; paidAt: string | null;
}
```
同一订单已存在 `PENDING` 支付 → 返回该笔（200）；订单非 `PENDING_PAYMENT` → 409 `INVALID_ORDER_STATUS`。

### `GET /api/payments/{id}` → Payment（仅本人）

### `POST /api/payments/{id}/mock-confirm` → 200 Payment
仅当 `PAYMENT_MOCK_ENABLED=true` 且 channel=MOCK、status=PENDING；否则 403/409。成功后等价于收到成功回调（订单转 PAID）。

### `POST /api/payments/alipay/notify` (公开，支付宝异步通知)
- `application/x-www-form-urlencoded`，服务端验签。
- `out_trade_no` 对应支付的商户流水号；`trade_status ∈ {TRADE_SUCCESS, TRADE_FINISHED}` 视为成功；校验 `total_amount` 与应付一致。
- 幂等处理；成功响应**纯文本** `success`（支付宝要求），失败 `failure`。此端点不使用 JSON 包裹。

### `GET /api/payments/alipay/return` (公开)
支付宝同步跳转；后端 302 到 `{FRONTEND_BASE_URL}/payment/result?orderId={orderId}&paymentId={paymentId}`。

**支付状态机**：`PENDING → SUCCEEDED | FAILED | CLOSED`。订单 `PENDING_PAYMENT → PAID` 只能由成功回调/mock-confirm 的条件更新触发。

---

## 8. Coupons

### `GET /api/coupons` (登录)
可领取模板：
```ts
interface CouponTemplateView {
  id: number; code: string; name: string; type: CouponType; value: number;
  minSpendCents: number; totalQuantity: number; claimedQuantity: number; remainingQuantity: number;
  perUserLimit: number; claimedByMe: number;
  validFrom: string; validTo: string; status: 'ACTIVE' | 'DISABLED';
}
```
### `POST /api/coupons/{templateId}/claim` → 201 UserCouponView
### `GET /api/coupons/mine?status=` → UserCouponView[]
```ts
interface UserCouponView {
  id: number; templateId: number; name: string; type: CouponType; value: number;
  minSpendCents: number; status: UserCouponStatus;
  validFrom: string; validTo: string; orderId: number | null; usedAt: string | null;
}
```

---

## 9. Reviews

### `POST /api/orders/{orderId}/reviews`
```json
{ "productId": 1, "rating": 5, "content": "很好用" }
```
→ 201 Review。仅订单 `COMPLETED`、productId 属于该订单、每单每商品一次。创建后重算商品评分。

---

## 10. Admin（ADMIN 角色）

### `GET /api/admin/dashboard`
```ts
interface Dashboard {
  orderCounts: Record<OrderStatus, number>;
  totalOrders: number; totalCustomers: number;
  totalRevenueCents: number; todayRevenueCents: number;
  last7Days: { date: string; revenueCents: number; orderCount: number; }[];
  topProducts: { productId: number; title: string; imageUrl: string | null; priceCents: number; salesCount: number; }[];
}
```
`totalRevenueCents` = 已支付且未取消/未退款订单的应付之和（状态 PAID/SHIPPED/COMPLETED/REFUNDING）。

### Products
- `GET /api/admin/products?q=&categoryId=&status=&page=&size=` → 分页 `ProductDetail`（含下架/草稿，需 categoryName）
- `POST /api/admin/products` body：
  ```json
  { "categoryId": 1, "title": "商品名", "subtitle": "副标题", "description": "描述", "priceCents": 9900, "originalPriceCents": 12900, "imageUrl": "https://...", "images": ["https://..."], "status": "ON_SALE", "stock": 100 }
  ```
  → 201 ProductDetail
- `PUT /api/admin/products/{id}` 同上（不含 stock）→ ProductDetail
- `DELETE /api/admin/products/{id}` → null（软删除）
- `PATCH /api/admin/products/{id}/stock` `{ "stock": 80 }` → ProductDetail（绝对值，不得小于 reserved）

### Categories
- `GET /api/admin/categories` → Category[]（含停用）
- `POST /api/admin/categories` `{ "name": "图书", "sortOrder": 5 }` → 201 Category
- `PUT /api/admin/categories/{id}` `{ "name", "sortOrder", "status": "ACTIVE" }` → Category
- `DELETE /api/admin/categories/{id}` → null（有商品时 409 `CATEGORY_NOT_EMPTY`）

### Orders
- `GET /api/admin/orders?status=&q=(订单号/用户名)&page=&size=` → 分页
  ```ts
  interface AdminOrderSummary { id; orderNo; status; payableCents; createdAt; paidAt: string | null; customerUsername: string; itemCount: number; shipment: { carrier; trackingNo; shippedAt } | null; }
  ```
- `GET /api/admin/orders/{id}` → `Order & { customer: { id; username; email; displayName; } }`
- `POST /api/admin/orders/{id}/ship` `{ "carrier": "顺丰速运", "trackingNo": "SF1234567890" }` → Order（仅 PAID）

### Refunds
- `GET /api/admin/refunds?status=&page=&size=` → 分页 `AdminRefundView = Refund & { username: string; }`
- `POST /api/admin/refunds/{id}/approve` `{ "comment": "同意" }` → Refund
- `POST /api/admin/refunds/{id}/reject` `{ "comment": "理由（必填）" }` → Refund
审批允许对 `REQUESTED` 或 `FAILED`（重试）。通过时调用退款网关；失败 → `FAILED`。

### Coupons
- `GET /api/admin/coupons?page=&size=` → 分页 CouponTemplateView
- `POST /api/admin/coupons` body：`{ code, name, type, value, minSpendCents, totalQuantity, perUserLimit, validFrom, validTo, status }` → 201
- `PUT /api/admin/coupons/{id}` 同上（code 不可改）→ CouponTemplateView

### Reviews
- `GET /api/admin/reviews?status=&productId=&page=&size=` → 分页 `ReviewAdminView = Review & { orderId; productTitle: string; status: ReviewStatus; }`
- `PATCH /api/admin/reviews/{id}/visibility` `{ "visible": false }` → ReviewAdminView（隐藏后重算商品评分）

---

## 11. 前端路由与 API 映射

| 路由 | 页面 | 主要 API |
|---|---|---|
| `/login` `/register` | 登录/注册 | auth |
| `/` | 首页（分类 + 推荐） | categories, products |
| `/products` | 商品列表 | products |
| `/products/:id` | 商品详情 + 评价 | product, reviews, cart |
| `/cart` | 购物车 | cart |
| `/checkout` | 结算（地址/券/报价） | addresses, coupons/mine, checkout/quote, orders |
| `/payment/result` | 支付结果 | orders/{id}, payments/{id} |
| `/orders` | 我的订单 | orders |
| `/orders/:id` | 订单详情（支付/取消/确认/退款/评价） | orders, payments, refunds, reviews |
| `/profile` | 地址簿 + 我的优惠券 | addresses, coupons/mine |
| `/admin` | 仪表盘 | admin/dashboard |
| `/admin/products` | 商品管理 | admin/products, admin/categories |
| `/admin/categories` | 分类管理 | admin/categories |
| `/admin/orders` | 订单 + 发货 | admin/orders, admin/orders/{id}/ship |
| `/admin/refunds` | 退款审批 | admin/refunds |
| `/admin/coupons` | 优惠券管理 | admin/coupons |
| `/admin/reviews` | 评价管理 | admin/reviews |

---

## 12. 后端配置项

| 环境变量 | 默认 | 说明 |
|---|---|---|
| `DB_URL` | `jdbc:mysql://127.0.0.1:3307/mall_shop?useUnicode=true&characterEncoding=utf8&useSSL=false&serverTimezone=Asia/Shanghai&allowPublicKeyRetrieval=true` | 项目内 MySQL |
| `DB_USERNAME` / `DB_PASSWORD` | `mall` / `mall_dev_pwd` | 由 `scripts/mysql-start.sh` 创建 |
| `JWT_SECRET` | 开发默认值（≥32 字节） | 生产必须覆盖 |
| `JWT_ACCESS_TTL_SECONDS` | `900` | access token 有效期 |
| `REFRESH_TTL_DAYS` | `7` | refresh token 有效期 |
| `PAYMENT_MOCK_ENABLED` | `true` | mock 支付端点开关 |
| `PAYMENT_ALIPAY_ENABLED` | `false` | true 时启用真实沙箱适配器 |
| `ALIPAY_APP_ID` / `ALIPAY_PRIVATE_KEY` / `ALIPAY_PUBLIC_KEY` | 空 | 沙箱密钥（PEM 无头尾或整段） |
| `ALIPAY_GATEWAY` | `https://openapi-sandbox.dl.alipaydev.com/gateway.do` | 沙箱网关 |
| `ALIPAY_NOTIFY_URL` / `ALIPAY_RETURN_URL` | 指向后端 `/api/payments/alipay/*` | 需公网可达才能收到异步通知 |
| `ORDER_PAYMENT_TIMEOUT_MINUTES` | `30` | 支付超时（联调验收可设为 1） |
| `ORDER_AUTO_COMPLETE_DAYS` | `7` | 发货后自动完成 |
| `DEMO_DATA_ENABLED` | `true` | 启动时写入演示数据 |
| `FRONTEND_BASE_URL` | `http://localhost:5173` | 支付同步跳转目标 |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173` | 跨域白名单 |

---

## 13. 演示账号

| 角色 | 用户名 | 密码 |
|---|---|---|
| 管理员 | `admin` | `Admin@12345` |
| 顾客 | `demo` | `Demo@12345` |
