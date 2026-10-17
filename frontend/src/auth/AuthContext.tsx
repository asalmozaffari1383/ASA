import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { fetchMe, login as loginRequest } from "../api/endpoints";
import { tokenStore } from "../api/tokenStore";
import type { CurrentUser, PermissionFlag } from "../types";

interface AuthState {
  user: CurrentUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  can: (flag: PermissionFlag) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  // On boot, if a refresh token survived, the access token is fetched lazily by
  // the first /users/me/ call (the 401 interceptor refreshes transparently).
  useEffect(() => {
    let active = true;
    (async () => {
      if (!tokenStore.getRefresh()) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await fetchMe();
        if (active) setUser(data);
      } catch {
        tokenStore.clear();
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const { data } = await loginRequest(username, password);
    tokenStore.setTokens(data.access, data.refresh);
    const me = await fetchMe();
    setUser(me.data);
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const { data } = await fetchMe();
    setUser(data);
  }, []);

  const can = useCallback(
    (flag: PermissionFlag) => Boolean(user && user[flag]),
    [user],
  );

  const value = useMemo(
    () => ({ user, loading, login, logout, can, refreshUser }),
    [user, loading, login, logout, can, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
