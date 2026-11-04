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

// Request Interceptor: Menempelkan Bearer Access Token & Logging
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const method = (config.method || "GET").toUpperCase();
    const fullUrl = `${config.baseURL || ""}${config.url || ""}`;
    console.log(`📡 [API REQUEST] ${method} -> ${fullUrl}`);

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
  (error) => {
    console.error(`❌ [API REQUEST ERROR]`, error.message);
    return Promise.reject(error);
  }
);

// Response Interceptor: Unpack JSON Envelope & Automatic Refresh Token on 401 & Logging
apiClient.interceptors.response.use(
  (response) => {
    const method = (response.config.method || "GET").toUpperCase();
    const url = response.config.url || "";
    console.log(`✅ [API RESPONSE ${response.status}] ${method} ${url}`);

    // Unpack NestJS TransformInterceptor: { success: true, data: ... }
    if (response.data && response.data.data !== undefined) {
      return response.data;
    }
    return response;
  },
  async (error: AxiosError<{ success?: boolean; errorCode?: string; message?: string }>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const method = (originalRequest?.method || "UNKNOWN").toUpperCase();
    const fullUrl = `${originalRequest?.baseURL || ""}${originalRequest?.url || ""}`;
    const status = error.response?.status;
    const errorData = error.response?.data;

    console.error(`🚨 [API ERROR ${status || "NETWORK_FAIL"}] ${method} ${fullUrl}`, {
      message: error.message,
      status: status,
      backendResponse: errorData,
    });

    if (error.response?.status === 401 && !originalRequest?._retry) {
      originalRequest._retry = true;
      try {
        console.log(`🔄 [API AUTH] Mencoba refresh token kedaluwarsa...`);
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
            console.log(`✅ [API AUTH] Token berhasil diperbarui, mencoba kembali request...`);
            return apiClient(originalRequest);
          }
        }
      } catch (refreshErr: any) {
        console.warn(`⚠️ [API AUTH] Refresh token gagal atau kedaluwarsa:`, refreshErr.message);
        await SecureStore.deleteItemAsync(Config.STORAGE_KEYS.ACCESS_TOKEN);
        await SecureStore.deleteItemAsync(Config.STORAGE_KEYS.REFRESH_TOKEN);
        await SecureStore.deleteItemAsync(Config.STORAGE_KEYS.USER_DATA);
      }
    }

    let message = error.response?.data?.message || error.message;
    if (error.message?.includes("Network Error") || !error.response) {
      message = `Gagal terhubung ke server Pekon (${Config.API_BASE_URL}). Pastikan backend aktif dan HP berada di jaringan yang sama.`;
    }

    return Promise.reject(new Error(message));
  }
);
