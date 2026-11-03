import type {
  CreateOrderBody,
  CreateRefundBody,
  Order,
  OrderQuery,
  OrderSummary,
  Page,
  Refund,
} from '@/types/api';
import { http } from './http';

export const orderApi = {
  create(body: CreateOrderBody): Promise<Order> {
    return http.post<Order>('/orders', body);
  },
  list(query: OrderQuery = {}): Promise<Page<OrderSummary>> {
    return http.get<Page<OrderSummary>>('/orders', { params: query });
  },
  detail(id: number): Promise<Order> {
    return http.get<Order>(`/orders/${id}`);
  },
  cancel(id: number): Promise<Order> {
    return http.post<Order>(`/orders/${id}/cancel`);
  },
  confirm(id: number): Promise<Order> {
    return http.post<Order>(`/orders/${id}/confirm`);
  },
  createRefund(id: number, body: CreateRefundBody): Promise<Refund> {
    return http.post<Refund>(`/orders/${id}/refunds`, body);
  },
  listRefunds(id: number): Promise<Refund[]> {
    return http.get<Refund[]>(`/orders/${id}/refunds`);
  },
};

export const ordersApi = orderApi;
