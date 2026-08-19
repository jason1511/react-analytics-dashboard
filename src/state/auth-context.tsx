/* eslint-disable react-refresh/only-export-components */

import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import {
  getCurrentUser,
  login as requestLogin,
  logout as requestLogout,
  register as requestRegister,
  type AuthUser,
} from "../api/auth";
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
  const [shouldRestoreSession] = useState(
    () => window.sessionStorage.getItem(GUEST_SESSION_KEY) !== "true"
  );
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isGuest, setIsGuest] = useState(
    () => window.sessionStorage.getItem(GUEST_SESSION_KEY) === "true"
  );
  const [isLoading, setIsLoading] = useState(shouldRestoreSession);

  const clearLocalAuth = useCallback(() => {
    window.sessionStorage.removeItem(GUEST_SESSION_KEY);
    setUser(null);
    setIsGuest(false);
    clearDataset();
  }, [clearDataset]);

  const logout = useCallback(() => {
    void requestLogout().catch(() => undefined);
    clearLocalAuth();
  }, [clearLocalAuth]);

  useEffect(() => {
    const onUnauthorized = () => clearLocalAuth();
    window.addEventListener("auth:unauthorized", onUnauthorized);
    if (shouldRestoreSession) {
      getCurrentUser()
        .then(setUser)
        .catch(() => clearLocalAuth())
        .finally(() => setIsLoading(false));
    }
    return () => window.removeEventListener("auth:unauthorized", onUnauthorized);
  }, [clearLocalAuth, shouldRestoreSession]);

  const authenticate = useCallback(
    async (
      request: (username: string, password: string) => ReturnType<typeof requestLogin>,
      username: string,
      password: string
    ) => {
      const response = await request(username, password);
      clearDataset();
      window.sessionStorage.removeItem(GUEST_SESSION_KEY);
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
        void requestLogout().catch(() => undefined);
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
