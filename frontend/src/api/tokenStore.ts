// JWT token storage.
//
// Security posture: the short-lived ACCESS token is kept in memory only (never
// persisted), so it isn't readable from disk and dies with the tab. The long-lived
// REFRESH token is persisted in localStorage so sessions survive reloads, and is
// rotated on every refresh (the backend has ROTATE_REFRESH_TOKENS=True).

const REFRESH_KEY = "asa.refresh";

let accessToken: string | null = null;

export const tokenStore = {
  getAccess: () => accessToken,
  setAccess: (token: string | null) => {
    accessToken = token;
  },
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  setRefresh: (token: string | null) => {
    if (token) localStorage.setItem(REFRESH_KEY, token);
    else localStorage.removeItem(REFRESH_KEY);
  },
  setTokens: (access: string, refresh?: string) => {
    accessToken = access;
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear: () => {
    accessToken = null;
    localStorage.removeItem(REFRESH_KEY);
  },
};
