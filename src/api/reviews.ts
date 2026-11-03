import type { CreateReviewBody, Review } from '@/types/api';
import { http } from './http';

export const reviewApi = {
  create(orderId: number, body: CreateReviewBody): Promise<Review> {
    return http.post<Review>(`/orders/${orderId}/reviews`, body);
  },
};

export const reviewsApi = reviewApi;
