export interface AuthUser {
  id: string;
  username: string;
  email: string;
  displayName: string;
  role: string;
  avatarUrl?: string;
  createdAt?: string;
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface RegisterPayload {
  email: string;
  password: string;
  name: string;
  username?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}
