
/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import axios, {
  type AxiosInstance,
  type AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";
import type { User, LoginPayload, RegisterPayload } from "./types";
import { loginRequest, registerRequest, refreshTokenRequest, fetchMeRequest } from "../api/auth";
import { API_BASE } from "../api/client";

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
  const [loading, setLoading] = useState<boolean>(() => Boolean(localStorage.getItem("access")));

  const refreshPromiseRef = useRef<Promise<string> | null>(null);

  const [api] = useState<AxiosInstance>(() => axios.create({ baseURL: API_BASE }));

  const logout = (): void => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    setUser(null);
  };

  useEffect(() => {
    const requestInterceptor = api.interceptors.request.use((config) => {
      const access = localStorage.getItem("access");
      if (access && config.headers) {
        config.headers.Authorization = `Bearer ${access}`;
      }
      return config;
    });

    const performRefresh = (): Promise<string> => {
      if (!refreshPromiseRef.current) {
        const refresh = localStorage.getItem("refresh");
        refreshPromiseRef.current = refreshTokenRequest(refresh!)
          .then(({ data }) => {
            localStorage.setItem("access", data.access);
            return data.access;
          })
          .finally(() => {
            refreshPromiseRef.current = null;
          });
      }
      return refreshPromiseRef.current;
    };

    const responseInterceptor = api.interceptors.response.use(
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
            const newAccess = await performRefresh();
            originalRequest.headers = originalRequest.headers ?? {};
            originalRequest.headers.Authorization = `Bearer ${newAccess}`;
            return api(originalRequest);
          } catch {
            logout();
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.request.eject(requestInterceptor);
      api.interceptors.response.eject(responseInterceptor);
    };
  }, [api]);


  const fetchMe = useCallback(async (): Promise<User> => {
    const { data } = await fetchMeRequest(api);
    setUser(data);
    return data;
  }, [api]);

  const login = async ({ email, password }: LoginPayload): Promise<void> => {
    const { data } = await loginRequest({ email, password });
    localStorage.setItem("access", data.access);
    localStorage.setItem("refresh", data.refresh);
    await fetchMe();
  };

  const register = async (payload: RegisterPayload): Promise<void> => {
    await registerRequest(payload);
    await login({ email: payload.email, password: payload.password });
  };

  useEffect(() => {
    let ignore = false;

    async function checkAuth() {
      const token = localStorage.getItem("access");
      if (!token) return;

      try {
        await fetchMe();
      } catch {
        if (!ignore) logout();
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    checkAuth();

    return () => {
      ignore = true;
    };
  }, [fetchMe]);

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