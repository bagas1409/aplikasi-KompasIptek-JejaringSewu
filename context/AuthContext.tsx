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

export interface RegisterPayload {
  nik: string;
  fullName: string;
  phoneNumber: string;
  password: string;
  pekonId?: string;
  email?: string;
  vulnerabilityFlags?: string[];
}

interface AuthContextType {
  user: MobileUser | null;
  isLoading: boolean;
  loginWithPassword: (phoneNumber: string, password: string) => Promise<MobileUser>;
  register: (payload: RegisterPayload) => Promise<any>;
  loginAsDemoWarga: () => Promise<MobileUser>;
  loginAsPetani: () => Promise<MobileUser>;
  loginAsPengepul: () => Promise<MobileUser>;
  loginAsPekerjaDisabilitas: () => Promise<MobileUser>;
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
    console.log("🔍 [AUTH INIT] Memeriksa sesi tersimpan di SecureStore...");
    try {
      const storedUser = await SecureStore.getItemAsync(Config.STORAGE_KEYS.USER_DATA);
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        console.log(`✅ [AUTH INIT] Sesi ditemukan: ${parsedUser.fullName} (${parsedUser.role})`);
        setUser(parsedUser);
      } else {
        console.log("ℹ️ [AUTH INIT] Tidak ada sesi login tersimpan (Guest/Auth Mode).");
      }
    } catch (e: any) {
      console.warn("⚠️ [AUTH INIT] Gagal membaca sesi dari SecureStore:", e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getOrCreateDeviceId = async (): Promise<string> => {
    let deviceId = await SecureStore.getItemAsync("jejaring_device_id");
    if (!deviceId) {
      deviceId = `expo-client-${Crypto.randomUUID()}`;
      await SecureStore.setItemAsync("jejaring_device_id", deviceId);
    }
    return deviceId;
  };

  const loginWithPassword = async (phoneNumber: string, password: string): Promise<MobileUser> => {
    console.log(`🔐 [AUTH LOGIN] Memulai proses login untuk nomor: ${phoneNumber}`);
    console.log(`🌐 [AUTH LOGIN TARGET] ${Config.API_BASE_URL}/auth/login`);

    try {
      const deviceId = await getOrCreateDeviceId();

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

      console.log(`🎉 [AUTH LOGIN BERHASIL] Sesi aktif terdaftar:`, {
        userId: loggedInUser.id,
        nama: loggedInUser.fullName,
        peran: loggedInUser.role,
        pekonId: loggedInUser.pekonId,
        nikTerverifikasi: loggedInUser.isNikVerified,
      });

      return loggedInUser;
    } catch (err: any) {
      console.error(`❌ [AUTH LOGIN GAGAL]`, {
        nomorHp: phoneNumber,
        pesanError: err.message,
        detailRespon: err.response?.data || "Tidak ada respon dari server",
      });
      throw err;
    }
  };

  const register = async (payload: RegisterPayload): Promise<any> => {
    const maskedNik = payload.nik ? `${payload.nik.slice(0, 4)}********${payload.nik.slice(-4)}` : "TIDAK_ADA";
    console.log(`📝 [AUTH REGISTER] Memulai pendaftaran warga baru:`, {
      nik: maskedNik,
      nama: payload.fullName,
      nomorHp: payload.phoneNumber,
      kategori: payload.vulnerabilityFlags,
      targetEndpoint: `${Config.API_BASE_URL}/auth/register`,
    });

    try {
      // Ambil master pekon jika pekonId belum diset
      let pekonId = payload.pekonId;
      if (!pekonId) {
        try {
          console.log(`🔍 [AUTH REGISTER] Mengambil daftar pekon aktif dari server...`);
          const pekonRes: any = await apiClient.get("/auth/pekon").catch(() => null);
          if (pekonRes?.data?.[0]?.id) {
            pekonId = pekonRes.data[0].id;
            console.log(`📍 [AUTH REGISTER] Menggunakan pekon: ${pekonRes.data[0].namaPekon} (${pekonId})`);
          }
        } catch {
          console.log(`ℹ️ [AUTH REGISTER] Menggunakan auto-fallback pekon di backend.`);
        }
      }

      const res: any = await apiClient.post("/auth/register", {
        nik: payload.nik,
        fullName: payload.fullName,
        phoneNumber: payload.phoneNumber,
        password: payload.password,
        pekonId: pekonId || undefined,
        email: payload.email || undefined,
        vulnerabilityFlags: payload.vulnerabilityFlags || ["NONE"],
      });

      console.log(`🎉 [AUTH REGISTER BERHASIL] Warga berhasil didaftarkan:`, res.data);
      return res.data;
    } catch (err: any) {
      console.error(`❌ [AUTH REGISTER GAGAL]`, {
        nomorHp: payload.phoneNumber,
        pesanError: err.message,
        detailRespon: err.response?.data || "Tidak ada respon dari server",
      });
      throw err;
    }
  };

  // Demo Switcher 3 Tokoh Pekon
  const loginAsPetani = async (): Promise<MobileUser> => {
    console.log("🌾 [AUTH DEMO] Masuk sebagai Petani: Pak Slamet");
    return loginWithPassword("081234567894", "WargaSlamet123!");
  };

  const loginAsPengepul = async (): Promise<MobileUser> => {
    console.log("🚛 [AUTH DEMO] Masuk sebagai Pengepul: H. Suratno");
    return loginWithPassword("081234567893", "WargaSlamet123!");
  };

  const loginAsPekerjaDisabilitas = async (): Promise<MobileUser> => {
    console.log("♿ [AUTH DEMO] Masuk sebagai Pekerja Inklusif: Mbak Yanti");
    return loginWithPassword("081234567895", "WargaSlamet123!");
  };

  const loginAsDemoWarga = loginAsPetani;

  const logout = async () => {
    console.log(`🚪 [AUTH LOGOUT] Mengeluarkan sesi akun warga: ${user?.fullName || "Anonim"}...`);
    try {
      const refreshToken = await SecureStore.getItemAsync(Config.STORAGE_KEYS.REFRESH_TOKEN);
      if (refreshToken) {
        await apiClient.post("/auth/logout", { refreshToken }).catch(() => {});
      }
    } catch {
      // Abaikan jika network offline
    }
    await SecureStore.deleteItemAsync(Config.STORAGE_KEYS.ACCESS_TOKEN);
    await SecureStore.deleteItemAsync(Config.STORAGE_KEYS.REFRESH_TOKEN);
    await SecureStore.deleteItemAsync(Config.STORAGE_KEYS.USER_DATA);
    setUser(null);
    console.log(`✅ [AUTH LOGOUT BERHASIL] Sesi berhasil dihapus.`);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        loginWithPassword,
        register,
        loginAsDemoWarga,
        loginAsPetani,
        loginAsPengepul,
        loginAsPekerjaDisabilitas,
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
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
