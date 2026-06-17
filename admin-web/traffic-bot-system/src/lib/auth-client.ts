export type AuthProvider = 'local' | 'google';

export interface AuthUser {
  id: string;
  name: string;
  age: number;
  email: string;
  isActive: boolean;
  provider: AuthProvider;
  avatar?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

export interface DashboardResponse {
  profile: AuthUser;
  widgets: {
    accountAgeDays: number;
    authProvider: AuthProvider;
    profileCompletion: number;
  };
}

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ??
  'http://localhost:3001';
const TOKEN_KEY = 'auth_access_token';

type RequestOptions = RequestInit & {
  token?: string;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { token, headers, ...restOptions } = options;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...restOptions,
    headers: {
      'Content-Type': 'application/json',
      ...(headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = Array.isArray(body?.message)
      ? body.message.join(', ')
      : body?.message || 'Request failed';
    throw new Error(message);
  }

  return body as T;
}

export function saveAccessToken(token: string) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(TOKEN_KEY, token);
  }
}

export function getAccessToken() {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.localStorage.getItem(TOKEN_KEY);
}

export function clearAccessToken() {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(TOKEN_KEY);
  }
}

export async function register(payload: {
  name: string;
  email: string;
  password: string;
  age?: number;
}) {
  return request<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function login(payload: { email: string; password: string }) {
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function loginWithGoogle(idToken: string) {
  return request<AuthResponse>('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ idToken }),
  });
}

export async function me(token: string) {
  return request<AuthUser>('/auth/me', {
    method: 'GET',
    token,
  });
}

export async function getDashboard(token: string) {
  return request<DashboardResponse>('/auth/dashboard', {
    method: 'GET',
    token,
  });
}