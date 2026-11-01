import React, { createContext, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import { Config } from "@/constants/Config";
import { apiClient } from "@/services/api";

export interface MobileUser {
  id: string;
  fullName: string;
  phoneNumber: string;
  email?: string;
  role: string;
  pekonId: string;
  isNikVerified: boolean;
  vulnerabilityFlags: string[];
}

interface AuthContextType {
  user: MobileUser | null;
  isLoading: boolean;
  loginWithPassword: (phoneNumber: string, password: string) => Promise<MobileUser>;
  loginAsDemoWarga: () => Promise<MobileUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MobileUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredSession();
  }, []);

  const loadStoredSession = async () => {
    try {
      const storedUser = await SecureStore.getItemAsync(Config.STORAGE_KEYS.USER_DATA);
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (e) {
      console.warn("Gagal memuat sesi:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithPassword = async (phoneNumber: string, password: string): Promise<MobileUser> => {
    let deviceId = await SecureStore.getItemAsync("jejaring_device_id");
    if (!deviceId) {
      deviceId = `expo-client-${Crypto.randomUUID()}`;
      await SecureStore.setItemAsync("jejaring_device_id", deviceId);
    }

    const res: any = await apiClient.post("/auth/login", {
      identifier: phoneNumber,
      password,
      deviceId,
    });

    const { user: loggedInUser, accessToken, refreshToken } = res.data;

    await SecureStore.setItemAsync(Config.STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    if (refreshToken) {
      await SecureStore.setItemAsync(Config.STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    }
    await SecureStore.setItemAsync(Config.STORAGE_KEYS.USER_DATA, JSON.stringify(loggedInUser));

    setUser(loggedInUser);
    return loggedInUser;
  };

  const loginAsDemoWarga = async (): Promise<MobileUser> => {
    // Akun warga demo sesuai seed.ts backend
    return loginWithPassword("081234567894", "WargaSlamet123!");
  };

  const logout = async () => {
    try {
      const refreshToken = await SecureStore.getItemAsync(Config.STORAGE_KEYS.REFRESH_TOKEN);
      await apiClient.post("/auth/logout", { refreshToken });
    } catch (e) {
      // Abaikan jika network offline
    }
    await SecureStore.deleteItemAsync(Config.STORAGE_KEYS.ACCESS_TOKEN);
    await SecureStore.deleteItemAsync(Config.STORAGE_KEYS.REFRESH_TOKEN);
    await SecureStore.deleteItemAsync(Config.STORAGE_KEYS.USER_DATA);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        loginWithPassword,
        loginAsDemoWarga,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth harus digunakan di dalam AuthProvider");
  }
  return context;
}
