import { defineStore } from 'pinia';
import { cartApi } from '@/api/cart';
import type { Cart } from '@/types/api';

interface CartState {
  cart: Cart | null;
  loading: boolean;
  error: string | null;
}

export const useCartStore = defineStore('cart', {
  state: (): CartState => ({
    cart: null,
    loading: false,
    error: null,
  }),

  getters: {
    count: (state): number => state.cart?.itemCount ?? 0,
    totalCents: (state): number => state.cart?.totalCents ?? 0,
    items: (state) => state.cart?.items ?? [],
  },

  actions: {
    async fetch(silent = true): Promise<Cart | null> {
      this.loading = true;
      this.error = null;
      try {
        this.cart = await cartApi.get();
        return this.cart;
      } catch (error) {
        this.error = error instanceof Error ? error.message : '购物车加载失败';
        if (!silent) throw error;
        return null;
      } finally {
        this.loading = false;
      }
    },

    async addItem(productId: number, quantity: number): Promise<Cart> {
      this.cart = await cartApi.addItem(productId, quantity);
      return this.cart;
    },

    async updateItem(productId: number, quantity: number): Promise<Cart> {
      this.cart = await cartApi.updateItem(productId, quantity);
      return this.cart;
    },

    async removeItem(productId: number): Promise<Cart> {
      this.cart = await cartApi.removeItem(productId);
      return this.cart;
    },

    clear(): void {
      this.cart = null;
      this.error = null;
    },
  },
});
