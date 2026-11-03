import type { Quote, QuoteBody } from '@/types/api';
import { http } from './http';

export const checkoutApi = {
  quote(body: QuoteBody = {}): Promise<Quote> {
    return http.post<Quote>('/checkout/quote', body);
  },
};
