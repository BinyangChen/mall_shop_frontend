import type { Address, AddressBody } from '@/types/api';
import { http } from './http';

export const addressApi = {
  list(): Promise<Address[]> {
    return http.get<Address[]>('/addresses');
  },
  create(body: AddressBody): Promise<Address> {
    return http.post<Address>('/addresses', body);
  },
  update(id: number, body: AddressBody): Promise<Address> {
    return http.put<Address>(`/addresses/${id}`, body);
  },
  remove(id: number): Promise<null> {
    return http.delete<null>(`/addresses/${id}`);
  },
  setDefault(id: number): Promise<Address> {
    return http.post<Address>(`/addresses/${id}/default`);
  },
};
