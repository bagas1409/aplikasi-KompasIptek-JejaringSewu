export const Config = {
  // IP Wi-Fi LAN laptop untuk Expo Go di HP fisik (fallback ke localhost untuk emulator/web)
  API_BASE_URL: process.env.EXPO_PUBLIC_API_URL || "http://192.168.1.2:4000/api/v1",
  STORAGE_KEYS: {
    ACCESS_TOKEN: "jejaring_mobile_access_token",
    REFRESH_TOKEN: "jejaring_mobile_refresh_token",
    USER_DATA: "jejaring_mobile_user",
  },
  DEFAULT_PEKON: {
    id: "18.10.02.2001",
    namaPekon: "Pekon Pagelaran",
    kecamatan: "Pagelaran",
  },
};
