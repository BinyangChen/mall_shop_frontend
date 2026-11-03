# 拾光集市 · 前端

独立前端仓库，覆盖顾客购物全流程与管理端运营后台。使用 Vue 3 + TypeScript + Vite + Pinia + Vue Router + Element Plus 实现，API 严格对接 [`docs/api-contract.md`](docs/api-contract.md)。

## 环境要求

- Node.js 20+（本机验证于 Node 26.7.0 / npm 11.19.0）
- 后端服务运行于 `http://localhost:8080`
- 无 Docker、无额外前端环境变量

## 启动

顾客端与管理端使用**不同端口、不同路由集合**，共用同一套代码：

在仓库根目录执行：

```bash
npm install
npm run dev          # 顾客端 http://localhost:5173
npm run dev:admin    # 管理端 http://localhost:5174/admin
```

PowerShell 也可直接使用：

```powershell
.\scripts\start-frontend.ps1   # 顾客端 5173
.\scripts\start-admin.ps1      # 管理端 5174
```

- `npm run dev` 使用 `--mode customer`（`.env.customer`）：只注册顾客页面与登录/注册，访问 `/admin` 返回 404。
- `npm run dev:admin` 使用 `--mode admin`（`.env.admin`）：只注册管理端页面与登录，`/` 自动跳转 `/admin`；顾客账号无法登录。
- 两个入口均把 `/api` 代理到 `http://localhost:8080`，无需配置 `VITE_API_BASE_URL`。

其他命令：

```bash
npm run test:unit      # Vitest 单元测试
npm run build          # 顾客端构建 → dist/
npm run build:admin    # 管理端构建 → dist-admin/
npm run preview        # 预览顾客端 dist/（4173）
npm run preview:admin  # 预览管理端 dist-admin/（4174）
```

后端未启动时，页面会展示网络错误提示和重试入口，不影响前端构建与单元测试。

## 演示账号

| 角色 | 用户名 | 密码 |
|---|---|---|
| 管理员 | `admin` | `Admin@12345` |
| 顾客 | `demo` | `Demo@12345` |

登录页提供「一键填入」演示账号按钮。

## 路由与页面

### 顾客端

| 路由 | 页面 |
|---|---|
| `/login` `/register` | 登录、注册（品牌分栏布局） |
| `/` | 首页：Hero、分类快捷入口、热销、新品 |
| `/products` | 商品列表：URL 同步关键词/分类/排序/页码、骨架屏、空态、分页 |
| `/products/:id` | 商品详情：图集、价格、评分、库存、数量、加购/立即购买、描述、分页评价 |
| `/cart` | 购物车：数量修改、删除、失效商品提示、金额汇总 |
| `/checkout` | 结算：地址选择/新增、优惠券实时报价、订单摘要、稳定 UUID 提交 |
| `/orders` | 我的订单：状态 Tab、分页、商品缩略图 |
| `/orders/:id` | 订单详情：时间线、金额、地址、物流、支付、按 `actions` 展示支付/取消/确认收货/退款/评价 |
| `/payment/result` | 支付结果：轮询订单状态最多 30 秒，成功/处理中/失败态 |
| `/profile` | 个人中心：地址簿 CRUD/设默认、我的优惠券状态筛选、领券中心 |

### 管理端（需 ADMIN，独立端口 5174）

访问 `http://localhost:5174/admin`。以下路由均位于管理端入口。

| 路由 | 页面 |
|---|---|
| `/admin` | 仪表盘：4 个 KPI、7 种订单状态卡片、近 7 天营收表、热销 Top 5 |
| `/admin/products` | 商品管理：筛选、创建/编辑、元⇄分换算、上下架、库存调整、软删除 |
| `/admin/categories` | 分类管理：新增、编辑、启停、删除（分类非空时展示后端错误） |
| `/admin/orders` | 订单管理：筛选、详情抽屉、发货（承运商 + 运单号） |
| `/admin/refunds` | 退款审批：通过/拒绝（备注必填）、FAILED 重试 |
| `/admin/coupons` | 优惠券管理：模板列表、创建/编辑、百分比基点与金额校验 |
| `/admin/reviews` | 评价管理：按状态/商品筛选、隐藏/恢复 |

## 认证与请求层

- Access Token 仅保存在模块内存（`src/api/token.ts`），**不写入 localStorage / sessionStorage**。
- Refresh Token 为 HttpOnly Cookie；`src/api/http.ts` 中 401 触发单飞刷新（并发请求共享一个 refresh Promise），刷新成功后重放原请求；失败则清空认证并跳转 `/login`，保留 `redirect`。
- 登录/注册/刷新/登出端点不触发 401 刷新，`/auth/me` 正常携带 Bearer。
- 请求响应统一解包 `data`；错误归一化为 `{ code, message, details, status, traceId }`。
- 路由守卫通过纯函数 `resolveAccess(meta, user)` 判断，启动时 `auth.bootstrap()` 先 refresh 再 `/auth/me`。
- 结算 `clientRequestId` 使用 `crypto.randomUUID()`，存入 sessionStorage，提交失败重试保持同一个 UUID，成功后清除。

## 测试

```bash
npm run test:unit
```

覆盖：

- `src/utils/__tests__/money.spec.ts`：分→元边界 `0 / 1 / 99 / 100 / 12345 / null`、元⇄分、优惠券基点。
- `src/router/__tests__/guards.spec.ts`：游客、顾客、管理员访问控制与安全重定向。
- `src/stores/__tests__/auth.spec.ts`：mock API 下的 bootstrap/login/register/logout/token 行为。
- `src/utils/__tests__/checkout.spec.ts`：优惠券挑选、服务端报价展示、UUID 生成。
- `src/utils/__tests__/mobile.spec.ts`：移动端底部 Tab 可见性与各路由激活状态。

当前结果：**5 个测试文件，32 个测试全部通过**；`npm run build`、`npm run build:admin` 均通过。

## 目录结构

```
src/
├── api/           # axios 实例、token 内存存储、按契约拆分的 API 模块
├── types/         # api.ts：契约枚举、DTO、Page<T>
├── stores/        # Pinia：auth、cart
├── router/        # 路由、resolveAccess 纯函数、安全重定向
├── layouts/       # ShopLayout（粘性页头/搜索/购物车徽标）、AdminLayout
├── components/    # 通用组件、订单/支付/退款/地址/优惠券弹窗、管理端表单
├── views/         # auth / shop / admin 页面
├── utils/         # 金额、日期/状态文案、结算纯函数
└── styles/        # theme.css：CSS 变量与 Element Plus 覆盖
```

## 契约说明与实现决策

- 契约中的公开 `ProductDetail` 未包含 `status`，但管理端商品接口需要展示和切换上架状态。前端保留公开 `ProductDetail` 类型不变，额外定义 `AdminProductDetail = ProductDetail & { status: ProductStatus }` 并在管理端 API 使用。
- 支付宝 `notify` 为服务端到服务端回调，前端不调用；支付宝同步 `return` 由后端 302 到 `/payment/result`，前端轮询订单结果。
- ALIPAY 支付优先 `window.open(payUrl)`，浏览器拦截弹窗时回退到当前页跳转。
- Mock 支付在创建支付单后调用 `/payments/{id}/mock-confirm` 再刷新订单。
- 评价按钮由订单 `actions.canReview` 驱动；前端在本地记录本次已评价商品，最终「每单每商品一次」由后端约束。
