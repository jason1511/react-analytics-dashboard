import { apiRequest } from "./client";

export type AuthUser = { id: string; email: string };
export type AuthResponse = {
  accessToken: string;
  expiresAt: string;
  user: AuthUser;
};

export function register(email: string, password: string) {
  return apiRequest<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function login(email: string, password: string) {
  return apiRequest<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function getCurrentUser() {
  return apiRequest<AuthUser>("/api/auth/me");
}
