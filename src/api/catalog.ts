import type {
  Category,
  Page,
  PageQuery,
  ProductDetail,
  ProductQuery,
  ProductSummary,
  Review,
} from '@/types/api';
import { http } from './http';

export const catalogApi = {
  categories(): Promise<Category[]> {
    return http.get<Category[]>('/categories');
  },
  products(query: ProductQuery = {}): Promise<Page<ProductSummary>> {
    return http.get<Page<ProductSummary>>('/products', { params: query });
  },
  product(id: number): Promise<ProductDetail> {
    return http.get<ProductDetail>(`/products/${id}`);
  },
  reviews(productId: number, query: PageQuery = {}): Promise<Page<Review>> {
    return http.get<Page<Review>>(`/products/${productId}/reviews`, { params: query });
  },
};

export const productApi = catalogApi;
