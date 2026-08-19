import { api, clearAuthToken, setAuthToken } from '@/api';

export type UserProfile = {
  id: number;
  name: string;
  wins: number;
  losses: number;
  rating: number;
  qr_code: string;
};

type AuthCredentials = {
  name: string;
  password: string;
};

type AuthResponse = {
  access_token: string;
  token_type: string;
  user: UserProfile;
};

export async function register(credentials: AuthCredentials) {
  const response = await api.post<AuthResponse>('/auth/register', credentials);
  await setAuthToken(response.data.access_token);
  return response.data.user;
}

export async function login(credentials: AuthCredentials) {
  const response = await api.post<AuthResponse>('/auth/login', credentials);
  await setAuthToken(response.data.access_token);
  return response.data.user;
}

export async function getCurrentUser() {
  const response = await api.get<UserProfile>('/auth/me');
  return response.data;
}

export async function logout() {
  await clearAuthToken();
}
