import axios, {
  AxiosError,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from "axios";
import { tokenStore } from "./tokenStore";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

export const api = axios.create({ baseURL: BASE_URL });

// Attach the in-memory access token to every request.
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStore.getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// --- Transparent refresh on 401 -------------------------------------------
// A single in-flight refresh is shared by all concurrent 401s so we don't fire
// multiple refresh calls (and don't burn the rotating refresh token).
let refreshing: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refresh = tokenStore.getRefresh();
  if (!refresh) throw new Error("no-refresh-token");
  const { data } = await axios.post(`${BASE_URL}/auth/token/refresh/`, { refresh });
  // Backend rotates the refresh token; persist the new one.
  tokenStore.setTokens(data.access, data.refresh);
  return data.access as string;
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as AxiosRequestConfig & { _retried?: boolean };
    const isAuthCall = original?.url?.includes("/auth/token");

    if (error.response?.status === 401 && original && !original._retried && !isAuthCall) {
      original._retried = true;
      try {
        refreshing = refreshing ?? refreshAccessToken();
        const newAccess = await refreshing;
        refreshing = null;
        original.headers = original.headers ?? {};
        (original.headers as Record<string, string>).Authorization = `Bearer ${newAccess}`;
        return api(original);
      } catch (e) {
        refreshing = null;
        tokenStore.clear();
        // Bounce to login; the auth context also reacts to the cleared token.
        if (location.pathname.startsWith("/panel")) location.assign("/login");
        return Promise.reject(e);
      }
    }
    return Promise.reject(error);
  },
);
