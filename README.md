# JEJARING-SEWU Mobile Client (Expo SDK 54) 📱🌱
**Sistem Informasi & Integrasi Logistik Ekonomi Kerakyatan Pekon (KompasIptek Kabupaten Pringsewu)**

Aplikasi mobile resmi warga pekon untuk ekosistem **JEJARING-SEWU (SINERGI-PEKON)** yang mengintegrasikan:
1. **Nebeng-Jastip Searah Komuter** (Hemat bensin s.d. 60% dan minim emisi).
2. **Bursa Hasil Bumi Petani & Mini-Job UMKM** (Inklusif *Zero-Discrimination* bagi penyandang disabilitas).
3. **Kamera Verifikasi Selfie Proof-of-Work (PoW)** (Bukti kerja fisik geospasial anti-fraud berbasis SHA-256).
4. **Dompet Kompas Pekon & Skor Kredit Alternatif ($S_{kredit}$ AHP-TOPSIS)** (Plafon modal kerja BUMDes Rp 1.500.000 tanpa agunan dan katalog penebusan pangan stunting).
5. **Offline-First SQLite Queue** (Ketahanan transaksi di area *blank-spot* pedesaan).

---

## 🛠️ Stack Teknologi

- **Framework:** React Native (Expo SDK 54, React 19, TypeScript)
- **Routing:** Expo Router v6 (File-based Tabs)
- **Styling:** NativeWind v4 (`react-native-css-interop` Tailwind CSS)
- **Geospasial & Hardware:** `expo-location`, `expo-camera`, `expo-image-manipulator`, `expo-crypto`
- **Penyimpanan Lokal & Keamanan:** `expo-secure-store`, `expo-sqlite` (Offline Queue Engine)
- **Aksesibilitas:** TalkBack Screen Reader labels (`accessible={true}`) + Elderly Friendly Font Scaling

---

## 📂 Struktur Navigasi Aplikasi

```text
mobile/
├── app/
│   ├── _layout.tsx                     # Root Layout & AuthProvider
│   └── (tabs)/
│       ├── _layout.tsx                 # Bottom Navigation Tabs (4 Fitur Utama)
│       ├── commuter.tsx                # Modul 1: Nebeng-Jastip (Warga & Kurir Komuter)
│       ├── marketplace.tsx             # Modul 2: Bursa Panen Petani & Mini-Job Disabilitas
│       ├── verify-camera.tsx           # Modul 3: Kamera Selfie PoW + Hashing Geospasial
│       └── profile-wallet.tsx          # Modul 4: Dompet Double-Entry, Skor SPK & Intervensi Gizi
├── context/
│   └── AuthContext.tsx                 # Manajemen Sesi JWT, Refresh Token & DeviceId
├── services/
│   ├── api.ts                         # Axios HTTP Client dengan Interceptor Otomatis
│   └── sqlite.service.ts              # SQLite Database untuk Antrean Transaksi Offline
├── babel.config.js                     # Babel Preset Expo + NativeWind
└── tailwind.config.js                  # Tema Identitas Visual Hijau Pekon Pringsewu
```

---

## 🚀 Panduan Menjalankan Aplikasi

### 1. Prasyarat
Pastikan Backend NestJS telah berjalan di `http://localhost:4000/api/v1` (atau alamat IP LAN komputer Anda).

### 2. Mulai Development Server Expo
Jalankan perintah berikut di dalam folder `mobile/`:

```bash
# Menjalankan Expo bundler dengan pembersihan cache
npx expo start -c
```

### 3. Membuka di Perangkat
- **Android Physical Device:** Pasang aplikasi **Expo Go** dari Google Play Store, lalu pindai QR code yang muncul di terminal (pastikan HP dan laptop berada di jaringan WiFi yang sama).
- **Android Emulator:** Tekan tombol `a` di terminal.
- **Web Browser (Preview):** Tekan tombol `w` di terminal.

---

## 🌟 Fitur-Fitur Unggulan

### 1. Nebeng-Jastip (Dual-Role: Warga & Kurir)
- **Warga:** Menemukan rute searah dalam radius 10 km, 25 km, atau 50 km, lalu memesan titipan jastip dengan titik jemput GPS riil.
- **Kurir:** Membuka rute perjalanan dari pekon ke pasar/kota, mengaktifkan **Live Broadcast GPS Ping (15s)**, dan mengonfirmasi pesanan titipan tetangga.

### 2. Bursa Hasil Bumi & Mini-Job
- Petani dapat memposting hasil panen singkong, kakao, gabah, kopi, dll.
- Pengepul dapat mengajukan tawaran harga per kg dengan kode referral.
- UMKM dapat membuka lowongan kerja mikro ramah disabilitas, dan warga dapat mengklaim pekerjaan secara instan.

### 3. Kamera Validasi Selfie PoW
- Kamera depan/belakang fleksibel (*Flip Camera*).
- Pemilih transaksi aktif (`IN_PROGRESS` / `AWAITING_SELFIE_POW`).
- Validasi toleransi GPS ($\le 50$ meter) untuk mencegah pemalsuan lokasi (*mock locations*).
- Hashing langsung SHA-256 pada file foto sebelum dikirim ke server.

### 4. Dompet Double-Entry & SPK Kredit Alternatif
- Pencatatan mutasi kredit/debit immutable yang terverifikasi signature HMAC-SHA256.
- Perhitungan skor kredit AHP-TOPSIS ($S_{kredit} \ge 85 \rightarrow$ Grade A) untuk rekomendasi plafon pinjaman modal kerja BUMDes Rp 1.500.000 tanpa agunan.
- Penebusan paket pangan hewani anti-stunting (Telur Bebek, Ikan Nila, Susu Kambing Etawa) menggunakan Poin Reputasi kerja.

### 5. Aksesibilitas & Mode Blank-Spot
- **TalkBack Ready:** Dilengkapi label semantik bahasa Indonesia pada seluruh tombol dan aksi.
- **Mode Ramah Lansia:** Tombol perbesar ukuran teks (125%) untuk kenyamanan mata warga senior.
- **Offline SQLite Queue:** Saat jaringan terputus di pelosok pekon, aksi transaksi disimpan di SQLite lokal dan otomatis disinkronkan begitu internet kembali terdeteksi.
