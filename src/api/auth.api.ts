import { apiGet, apiPost, setToken } from './client';
import type { AuthResponse, AuthUserDto } from '../types/api';

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await apiPost<AuthResponse>('/api/auth/login', { email, password });
  setToken(res.token);
  return res;
}

export async function registerSpectator(
  email: string,
  password: string,
  fullName: string,
): Promise<AuthResponse> {
  const res = await apiPost<AuthResponse>('/api/auth/register', {
    email,
    password,
    fullName,
  });
  setToken(res.token);
  return res;
}

export async function getMe(): Promise<{ user: AuthUserDto }> {
  return apiGet<{ user: AuthUserDto }>('/api/auth/me');
}

export function logout(): void {
  setToken(null);
}
