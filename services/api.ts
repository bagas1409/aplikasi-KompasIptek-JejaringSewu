import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";
import * as SecureStore from "expo-secure-store";
import { Config } from "@/constants/Config";

export const apiClient: AxiosInstance = axios.create({
  baseURL: Config.API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor: Menempelkan Bearer Access Token
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const token = await SecureStore.getItemAsync(Config.STORAGE_KEYS.ACCESS_TOKEN);
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      // Abaikan jika SecureStore gagal di web/emulator fallback
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Unpack JSON Envelope & Automatic Refresh Token on 401
apiClient.interceptors.response.use(
  (response) => {
    // Unpack NestJS TransformInterceptor: { success: true, data: ... }
    if (response.data && response.data.data !== undefined) {
      return response.data;
    }
    return response;
  },
  async (error: AxiosError<{ success?: boolean; errorCode?: string; message?: string }>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = await SecureStore.getItemAsync(Config.STORAGE_KEYS.REFRESH_TOKEN);
        if (refreshToken) {
          const refreshRes = await axios.post(`${Config.API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });

          const newAccessToken = refreshRes.data?.data?.accessToken;
          const newRefreshToken = refreshRes.data?.data?.refreshToken;

          if (newAccessToken) {
            await SecureStore.setItemAsync(Config.STORAGE_KEYS.ACCESS_TOKEN, newAccessToken);
            if (newRefreshToken) {
              await SecureStore.setItemAsync(Config.STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken);
            }

            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            }
            return apiClient(originalRequest);
          }
        }
      } catch (refreshErr) {
        // Refresh token hangus/expired
        await SecureStore.deleteItemAsync(Config.STORAGE_KEYS.ACCESS_TOKEN);
        await SecureStore.deleteItemAsync(Config.STORAGE_KEYS.REFRESH_TOKEN);
        await SecureStore.deleteItemAsync(Config.STORAGE_KEYS.USER_DATA);
      }
    }

    const message =
      error.response?.data?.message ||
      error.message ||
      "Gagal terhubung ke server Pekon. Periksa koneksi internet Anda.";

    return Promise.reject(new Error(message));
  }
);
