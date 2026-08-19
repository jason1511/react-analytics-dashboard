import { apiEmpty, apiRequest } from "./client";

export type AuthUser = { id: string; username: string };
export type AuthResponse = {
  expiresAt: string;
  user: AuthUser;
};

export function register(username: string, password: string) {
  return apiRequest<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export function login(username: string, password: string) {
  return apiRequest<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export function getCurrentUser() {
  return apiRequest<AuthUser>("/api/auth/me");
}

export function logout() {
  return apiEmpty("/api/auth/logout", { method: "POST" });
}

export async function checkUsernameAvailability(username: string, signal?: AbortSignal) {
  const query = new URLSearchParams({ username });
  return apiRequest<{ available: boolean }>(
    `/api/auth/username-available?${query}`,
    { signal }
  );
}
