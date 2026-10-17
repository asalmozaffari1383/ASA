import axios from "axios";

// Shared HTTP client for the public site. Mirrors the staff panel's client shape
// (baseURL from env, same /api convention) but carries no auth — every endpoint it
// touches (public-submit, public config, tracking, fix/payment uploads) is anonymous.
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

export const apiClient = axios.create({ baseURL: BASE_URL });
