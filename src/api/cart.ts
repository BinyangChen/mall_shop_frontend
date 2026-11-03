import type { Cart } from '@/types/api';
import { http } from './http';

export const cartApi = {
  get(): Promise<Cart> {
    return http.get<Cart>('/cart');
  },
  addItem(productId: number, quantity: number): Promise<Cart> {
    return http.post<Cart>('/cart/items', { productId, quantity });
  },
  updateItem(productId: number, quantity: number): Promise<Cart> {
    return http.patch<Cart>(`/cart/items/${productId}`, { quantity });
  },
  removeItem(productId: number): Promise<Cart> {
    return http.delete<Cart>(`/cart/items/${productId}`);
  },
};
