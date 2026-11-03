import type { CreatePaymentBody, Payment } from '@/types/api';
import { http } from './http';

export const paymentApi = {
  createForOrder(orderId: number, body: CreatePaymentBody = {}): Promise<Payment> {
    return http.post<Payment>(`/orders/${orderId}/payments`, body);
  },
  get(id: number): Promise<Payment> {
    return http.get<Payment>(`/payments/${id}`);
  },
  mockConfirm(id: number): Promise<Payment> {
    return http.post<Payment>(`/payments/${id}/mock-confirm`);
  },
};

export const paymentsApi = paymentApi;
