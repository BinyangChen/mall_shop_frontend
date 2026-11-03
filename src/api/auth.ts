import type {
  LoginBody,
  LoginResult,
  RefreshResult,
  RegisterBody,
  User,
} from '@/types/api';
import { http, refreshSession } from './http';
import { setAccessToken } from './token';

export const authApi = {
  async login(body: LoginBody): Promise<LoginResult> {
    const result = await http.post<LoginResult>('/auth/login', body);
    setAccessToken(result.accessToken);
    return result;
  },
  register(body: RegisterBody): Promise<User> {
    return http.post<User>('/auth/register', body);
  },
  async refresh(): Promise<RefreshResult> {
    const accessToken = await refreshSession();
    return { accessToken, expiresInSeconds: 0 };
  },
  logout(): Promise<null> {
    return http.post<null>('/auth/logout');
  },
  me(): Promise<User> {
    return http.get<User>('/auth/me');
  },
};
