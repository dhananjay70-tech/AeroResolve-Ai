import { createContext, useCallback, useEffect, useState } from "react";
import { AUTH_EXPIRED_EVENT, authApi, tokenStorage } from "../services/api";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const token = tokenStorage.get();
    if (!token) {
      setInitializing(false);
      return;
    }

    authApi
      .me()
      .then((res) => setUser(res.data))
      .catch(() => tokenStorage.clear())
      .finally(() => setInitializing(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await authApi.login(email, password);
    tokenStorage.set(res.data.token);
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const register = useCallback(async (email, password, fullName) => {
    const res = await authApi.register(email, password, fullName);
    tokenStorage.set(res.data.token);
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const logout = useCallback(() => {
    tokenStorage.clear();
    setUser(null);
  }, []);

  useEffect(() => {
    window.addEventListener(AUTH_EXPIRED_EVENT, logout);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, logout);
  }, [logout]);

  return (
    <AuthContext.Provider
      value={{ user, initializing, isAuthenticated: Boolean(user), login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}
