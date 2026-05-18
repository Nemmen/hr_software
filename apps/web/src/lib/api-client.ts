import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/store/auth";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://hr-software-api.vercel.app/api/v1"
    : "http://localhost:4000/api/v1");
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/v1\/?$/, "");

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach Authorization and CSRF token to requests
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const { session } = useAuthStore.getState();

  if (session?.accessToken) {
    config.headers["Authorization"] = `Bearer ${session.accessToken}`;
  }

  if (typeof document !== "undefined") {
    const csrfToken = document.cookie
      .split("; ")
      .find((row) => row.startsWith("csrf="))
      ?.split("=")[1];

    if (csrfToken) {
      config.headers["X-CSRF-Token"] = csrfToken;
    }
  }
  return config;
});

// Handle 401 responses by clearing session; retry transient 5xx/network errors once.
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as InternalAxiosRequestConfig & { _retried?: boolean };

    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        useAuthStore.getState().logout();
        window.location.href = "/login";
      }
      return Promise.reject(error);
    }

    // Retry once on network error or 5xx (not on 4xx client errors)
    const isTransient =
      !error.response ||
      (error.response.status >= 500 && error.response.status < 600);

    if (isTransient && !config._retried && config) {
      config._retried = true;
      await new Promise((r) => setTimeout(r, 800));
      return apiClient(config);
    }

    return Promise.reject(error);
  },
);


export default apiClient;
