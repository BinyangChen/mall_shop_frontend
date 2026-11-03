import type {
  AdminCouponQuery,
  AdminOrderDetail,
  AdminOrderQuery,
  AdminOrderSummary,
  AdminProductDetail,
  AdminProductQuery,
  AdminRefundQuery,
  AdminRefundView,
  AdminReviewQuery,
  AdminReviewView,
  Category,
  CategoryCreateBody,
  CategoryUpdateBody,
  CouponBody,
  CouponTemplateView,
  CouponUpdateBody,
  Dashboard,
  Order,
  Page,
  ProductCreateBody,
  ProductUpdateBody,
  Refund,
  RefundReviewBody,
  ShipBody,
  StockBody,
  VisibilityBody,
} from '@/types/api';
import { http } from './http';

export const adminApi = {
  dashboard(): Promise<Dashboard> {
    return http.get<Dashboard>('/admin/dashboard');
  },

  products: {
    list(query: AdminProductQuery = {}): Promise<Page<AdminProductDetail>> {
      return http.get<Page<AdminProductDetail>>('/admin/products', { params: query });
    },
    create(body: ProductCreateBody): Promise<AdminProductDetail> {
      return http.post<AdminProductDetail>('/admin/products', body);
    },
    update(id: number, body: ProductUpdateBody): Promise<AdminProductDetail> {
      return http.put<AdminProductDetail>(`/admin/products/${id}`, body);
    },
    remove(id: number): Promise<null> {
      return http.delete<null>(`/admin/products/${id}`);
    },
    adjustStock(id: number, body: StockBody): Promise<AdminProductDetail> {
      return http.patch<AdminProductDetail>(`/admin/products/${id}/stock`, body);
    },
  },

  categories: {
    list(): Promise<Category[]> {
      return http.get<Category[]>('/admin/categories');
    },
    create(body: CategoryCreateBody): Promise<Category> {
      return http.post<Category>('/admin/categories', body);
    },
    update(id: number, body: CategoryUpdateBody): Promise<Category> {
      return http.put<Category>(`/admin/categories/${id}`, body);
    },
    remove(id: number): Promise<null> {
      return http.delete<null>(`/admin/categories/${id}`);
    },
  },

  orders: {
    list(query: AdminOrderQuery = {}): Promise<Page<AdminOrderSummary>> {
      return http.get<Page<AdminOrderSummary>>('/admin/orders', { params: query });
    },
    detail(id: number): Promise<AdminOrderDetail> {
      return http.get<AdminOrderDetail>(`/admin/orders/${id}`);
    },
    ship(id: number, body: ShipBody): Promise<Order> {
      return http.post<Order>(`/admin/orders/${id}/ship`, body);
    },
  },

  refunds: {
    list(query: AdminRefundQuery = {}): Promise<Page<AdminRefundView>> {
      return http.get<Page<AdminRefundView>>('/admin/refunds', { params: query });
    },
    approve(id: number, body: RefundReviewBody): Promise<Refund> {
      return http.post<Refund>(`/admin/refunds/${id}/approve`, body);
    },
    reject(id: number, body: RefundReviewBody): Promise<Refund> {
      return http.post<Refund>(`/admin/refunds/${id}/reject`, body);
    },
  },

  coupons: {
    list(query: AdminCouponQuery = {}): Promise<Page<CouponTemplateView>> {
      return http.get<Page<CouponTemplateView>>('/admin/coupons', { params: query });
    },
    create(body: CouponBody): Promise<CouponTemplateView> {
      return http.post<CouponTemplateView>('/admin/coupons', body);
    },
    update(id: number, body: CouponUpdateBody): Promise<CouponTemplateView> {
      return http.put<CouponTemplateView>(`/admin/coupons/${id}`, body);
    },
  },

  reviews: {
    list(query: AdminReviewQuery = {}): Promise<Page<AdminReviewView>> {
      return http.get<Page<AdminReviewView>>('/admin/reviews', { params: query });
    },
    setVisibility(id: number, body: VisibilityBody): Promise<AdminReviewView> {
      return http.patch<AdminReviewView>(`/admin/reviews/${id}/visibility`, body);
    },
  },
};
