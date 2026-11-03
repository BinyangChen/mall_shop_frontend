import type { CouponTemplateView, UserCouponStatus, UserCouponView } from '@/types/api';
import { http } from './http';

export const couponApi = {
  templates(): Promise<CouponTemplateView[]> {
    return http.get<CouponTemplateView[]>('/coupons');
  },
  claim(templateId: number): Promise<UserCouponView> {
    return http.post<UserCouponView>(`/coupons/${templateId}/claim`);
  },
  mine(status?: UserCouponStatus): Promise<UserCouponView[]> {
    return http.get<UserCouponView[]>('/coupons/mine', {
      params: status ? { status } : {},
    });
  },
};

export const couponsApi = couponApi;
