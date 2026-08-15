/* eslint-disable react-refresh/only-export-components */

import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import {
  getCurrentUser,
  login as requestLogin,
  register as requestRegister,
  type AuthUser,
} from "../api/auth";
import {
  clearAccessToken,
  getAccessToken,
  storeAccessToken,
} from "../api/client";
import { useDataset } from "./use-dataset";

type AuthState = {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

export const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const { clear: clearDataset } = useDataset();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(() => Boolean(getAccessToken()));

  const logout = useCallback(() => {
    clearAccessToken();
    setUser(null);
    clearDataset();
  }, [clearDataset]);

  useEffect(() => {
    const onUnauthorized = () => logout();
    window.addEventListener("auth:unauthorized", onUnauthorized);
    if (getAccessToken()) {
      getCurrentUser()
        .then(setUser)
        .catch(() => logout())
        .finally(() => setIsLoading(false));
    }
    return () => window.removeEventListener("auth:unauthorized", onUnauthorized);
  }, [logout]);

  const authenticate = useCallback(
    async (
      request: (email: string, password: string) => ReturnType<typeof requestLogin>,
      email: string,
      password: string
    ) => {
      const response = await request(email, password);
      clearDataset();
      storeAccessToken(response.accessToken);
      setUser(response.user);
    },
    [clearDataset]
  );

  const value = useMemo<AuthState>(
    () => ({
      user,
      isLoading,
      login: (email, password) => authenticate(requestLogin, email, password),
      register: (email, password) => authenticate(requestRegister, email, password),
      logout,
    }),
    [user, isLoading, logout, authenticate]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
