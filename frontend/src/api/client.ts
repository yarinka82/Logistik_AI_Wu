
import axios from "axios";

// API root (without /auth) — used by an authorized client (fleet, marketplace, etc.)
export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api";

// Basic client for public auth-endpoints (login, register, password reset).
// Without Authorization-interceptor — these requests do not require a token.
export const authClient = axios.create({ baseURL: `${API_BASE}/auth` });