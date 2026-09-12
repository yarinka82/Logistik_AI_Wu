
import axios from "axios";

export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/auth";

// Базовый клиент для публичных auth-эндпоинтов (login, register, password reset).
// Без Authorization-интерцептора — эти запросы не требуют токена.
export const authClient = axios.create({ baseURL: API_BASE });