
/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  type ReactNode, useCallback,
} from "react";
import axios, {
  type AxiosInstance,
  type AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";
import type { User, LoginPayload, RegisterPayload, TokenPair } from "./types";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/auth";

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  api: AxiosInstance;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  // 1. Устраняем каскадный ререндер: проверяем наличие токена сразу при создании стейта
  const [loading, setLoading] = useState<boolean>(() => Boolean(localStorage.getItem("access")));

  const logout = (): void => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    setUser(null);
  };

  const api = useMemo<AxiosInstance>(() => {
    const instance = axios.create({ baseURL: API_BASE });

    instance.interceptors.request.use((config) => {
      const access = localStorage.getItem("access");
      if (access && config.headers) {
        config.headers.Authorization = `Bearer ${access}`;
      }
      return config;
    });

    instance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as RetryableRequestConfig | undefined;
        const refresh = localStorage.getItem("refresh");

        if (
          error.response?.status === 401 &&
          refresh &&
          originalRequest &&
          !originalRequest._retry
        ) {
          originalRequest._retry = true;
          try {
            const { data } = await axios.post<TokenPair>(`${API_BASE}/token/refresh/`, {
              refresh,
            });
            localStorage.setItem("access", data.access);
            originalRequest.headers = originalRequest.headers ?? {};
            originalRequest.headers.Authorization = `Bearer ${data.access}`;
            return instance(originalRequest);
          } catch {
            logout();
          }
        }
        return Promise.reject(error);
      }
    );

    return instance;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);



  const login = async ({ email, password }: LoginPayload): Promise<void> => {
    const { data } = await axios.post<TokenPair>(`${API_BASE}/login/`, { email, password });
    localStorage.setItem("access", data.access);
    localStorage.setItem("refresh", data.refresh);
    await fetchMe();
  };

  const register = async (payload: RegisterPayload): Promise<void> => {
    await axios.post(`${API_BASE}/register/`, payload);
    await login({ email: payload.email, password: payload.password });
  };

const fetchMe = useCallback(async (): Promise<User> => {
    const { data } = await api.get<User>("/me/");
    setUser(data);
    return data;
  }, [api]);

  useEffect(() => {
    let ignore = false;
    const token = localStorage.getItem("access");

    if (token) {
      api
        .get<User>("/me/")
        .then(({ data }) => {
          if (!ignore) {
            setUser(data);
          }
        })
        .catch(() => {
          if (!ignore) {
            logout();
          }
        })
        .finally(() => {
          if (!ignore) {
            setLoading(false);
          }
        });
    }

    return () => {
      ignore = true;
    };
  }, [api]);

  const value: AuthContextValue = { user, loading, login, register, logout, api };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}