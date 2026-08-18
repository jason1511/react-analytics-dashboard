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
  isGuest: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  continueAsGuest: () => void;
  logout: () => void;
};

const GUEST_SESSION_KEY = "analytics-dashboard.guest";

export const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const { clear: clearDataset } = useDataset();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isGuest, setIsGuest] = useState(
    () => !getAccessToken() &&
      window.sessionStorage.getItem(GUEST_SESSION_KEY) === "true"
  );
  const [isLoading, setIsLoading] = useState(() => Boolean(getAccessToken()));

  const logout = useCallback(() => {
    clearAccessToken();
    window.sessionStorage.removeItem(GUEST_SESSION_KEY);
    setUser(null);
    setIsGuest(false);
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
      request: (username: string, password: string) => ReturnType<typeof requestLogin>,
      username: string,
      password: string
    ) => {
      const response = await request(username, password);
      clearDataset();
      window.sessionStorage.removeItem(GUEST_SESSION_KEY);
      storeAccessToken(response.accessToken);
      setUser(response.user);
      setIsGuest(false);
    },
    [clearDataset]
  );

  const value = useMemo<AuthState>(
    () => ({
      user,
      isGuest,
      isLoading,
      login: (username, password) => authenticate(requestLogin, username, password),
      register: (username, password) => authenticate(requestRegister, username, password),
      continueAsGuest: () => {
        clearAccessToken();
        clearDataset();
        window.sessionStorage.setItem(GUEST_SESSION_KEY, "true");
        setUser(null);
        setIsGuest(true);
      },
      logout,
    }),
    [user, isGuest, isLoading, logout, authenticate, clearDataset]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
