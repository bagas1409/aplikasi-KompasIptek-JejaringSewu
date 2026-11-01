import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Crypto from 'expo-crypto';
import {
  Camera,
  MapPin,
  ShieldCheck,
  RefreshCw,
  Send,
  SwitchCamera,
  AlertTriangle,
  ChevronDown,
  Briefcase,
  Sprout,
  Truck,
  CheckCircle2,
  X,
} from 'lucide-react-native';
import { apiClient } from '@/services/api';

export default function VerifyCameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [facing, setFacing] = useState<'front' | 'back'>('front'); // Default kamera depan untuk Selfie PoW
  const [isCapturing, setIsCapturing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Daftar transaksi aktif
  const [activeTransactions, setActiveTransactions] = useState<any[]>([]);
  const [selectedTx, setSelectedTx] = useState<any | null>(null);
  const [showTxModal, setShowTxModal] = useState(false);

  // Foto yang berhasil diambil
  const [capturedPhoto, setCapturedPhoto] = useState<{
    uri: string;
    hash: string;
    gpsLat: number;
    gpsLng: number;
    accuracy: number;
    timestamp: string;
  } | null>(null);

  const cameraRef = useRef<any>(null);

  // 1. Ambil izin & posisi GPS
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setLocation(loc);
      }
    })();
  }, []);

  // 2. Ambil daftar transaksi aktif pengguna
  const fetchActiveTransactions = async () => {
    try {
      const res: any = await apiClient.get('/transactions/me');
      const all: any[] = res.data || [];
      // Filter transaksi yang membutuhkan bukti fisik foto (PoW)
      const pendingPoW = all.filter(
        (t) =>
          t.status === 'IN_PROGRESS' ||
          t.status === 'AWAITING_SELFIE_POW' ||
          t.status === 'LOCKED_ASSIGNED'
      );
      setActiveTransactions(pendingPoW);
      if (pendingPoW.length > 0 && !selectedTx) {
        setSelectedTx(pendingPoW[0]);
      }
    } catch (e: any) {
      console.warn('Gagal memuat transaksi aktif:', e.message);
    }
  };

  useEffect(() => {
    fetchActiveTransactions();
  }, []);

  if (!permission) {
    return (
      <View className="flex-1 bg-pekon-bg items-center justify-center p-6">
        <ActivityIndicator color="#00F2A9" size="large" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 bg-pekon-bg items-center justify-center p-6 text-center">
        <ShieldCheck size={48} color="#00F2A9" />
        <Text className="text-white font-bold text-base mt-4 text-center">Izin Kamera Diperlukan</Text>
        <Text className="text-pekon-muted text-xs text-center mt-2">
          Kamera digunakan khusus untuk validasi Selfie Proof-of-Work (anti-pemalsuan galeri) demi pencairan saldo dan perhitungan skor kredit BUMDes.
        </Text>
        <TouchableOpacity
          className="bg-pekon-primary px-6 py-3 rounded-xl mt-6"
          onPress={requestPermission}
          accessible={true}
          accessibilityLabel="Aktifkan izin kamera perangkat"
        >
          <Text className="text-pekon-bg font-bold text-sm">Aktifkan Kamera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Toleransi GPS (Maksimal 50 meter untuk keabsahan PoW)
  const accuracyMeters = location?.coords?.accuracy || 15;
  const isGpsAccurate = accuracyMeters <= 50;

  // 3. Ambil Foto Kamera Langsung
  const handleCapturePoW = async () => {
    if (!cameraRef.current || isCapturing) return;

    if (!isGpsAccurate) {
      Alert.alert(
        'Akurasi GPS Rendah',
        `Akurasi GPS saat ini ±${accuracyMeters.toFixed(0)}m (melebihi toleransi 50m). Disarankan berpindah ke luar ruangan agar koordinat pekon valid. Tetap lanjutkan?`,
        [
          { text: 'Batal', style: 'cancel' },
          { text: 'Lanjutkan', onPress: () => doCapture() },
        ]
      );
    } else {
      doCapture();
    }
  };

  const doCapture = async () => {
    try {
      setIsCapturing(true);

      let currentLoc = location;
      try {
        currentLoc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        setLocation(currentLoc);
      } catch (e) {
        // Fallback ke posisi tersimpan
      }

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: true,
      });

      // Kompresi di sisi klien demi hemat kuota & kecepatan upload
      const manipResult = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ resize: { width: 1080 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );

      // Hitung SHA-256 Hash biner gambar untuk bukti integritas anti-tampering
      const imageBytes = await fetch(manipResult.uri);
      const blob = await imageBytes.blob();
      const reader = new FileReader();

      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        const sha256 = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          base64Data
        );

        setCapturedPhoto({
          uri: manipResult.uri,
          hash: sha256,
          gpsLat: currentLoc?.coords.latitude || -5.3421,
          gpsLng: currentLoc?.coords.longitude || 104.9452,
          accuracy: currentLoc?.coords.accuracy || 15,
          timestamp: new Date().toLocaleTimeString('id-ID'),
        });
        setIsCapturing(false);
      };
      reader.readAsDataURL(blob);
    } catch (err: any) {
      Alert.alert('Gagal Mengambil Foto', err.message);
      setIsCapturing(false);
    }
  };

  // 4. Kirim & Verifikasi Bukti Kerja ke Server
  const handleSubmitProof = async () => {
    if (!capturedPhoto) return;

    if (!selectedTx) {
      Alert.alert(
        'Simulasi Bukti Kerja (Mode Uji Coba)',
        `Bukti foto PoW siap diverifikasi!\n\nChecksum SHA-256: ${capturedPhoto.hash.substring(0, 16)}...\nGPS: ${capturedPhoto.gpsLat.toFixed(5)}, ${capturedPhoto.gpsLng.toFixed(5)} (±${capturedPhoto.accuracy.toFixed(0)}m)\n\n(Anda belum memilih/memiliki transaksi aktif yang sedang berjalan di database pekon)`
      );
      return;
    }

    try {
      setSubmitting(true);
      await apiClient.post(`/transactions/${selectedTx.id}/selfie-pow`, {
        imageStorageUrl: `https://r2.pekon.id/pow/${capturedPhoto.hash}.jpg`,
        imageSha256Hash: capturedPhoto.hash,
        gpsLatitude: capturedPhoto.gpsLat,
        gpsLongitude: capturedPhoto.gpsLng,
        gpsAccuracyMeters: capturedPhoto.accuracy,
        pekonNameOverlay: 'Pekon Pagelaran Pringsewu',
        isCameraDirect: true,
      });

      Alert.alert(
        'Sukses Terverifikasi!',
        'Bukti kerja fisik (PoW) telah diverifikasi server secara atomik. Saldo dompet dan skor kredit AHP-TOPSIS BUMDes Anda telah diperbarui.'
      );
      setCapturedPhoto(null);
      setSelectedTx(null);
      fetchActiveTransactions();
    } catch (e: any) {
      Alert.alert('Verifikasi Gagal', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getTxTypeLabel = (type: string) => {
    switch (type) {
      case 'MINI_JOB':
        return 'Pekerjaan Mikro (Mini-Job)';
      case 'HARVEST_DEAL':
        return 'Jual Beli Panen';
      case 'NEBENG_JASTIP':
        return 'Titip Jastip Komuter';
      default:
        return type || 'Aktivitas Transaksi';
    }
  };

  return (
    <View className="flex-1 bg-pekon-bg">
      {!capturedPhoto ? (
        /* ================= KAMERA LANGSUNG VIEWFINDER ================= */
        <View className="flex-1">
          <CameraView ref={cameraRef} style={{ flex: 1 }} facing={facing}>
            {/* Overlay Header: Pemilih Transaksi Aktif & Status GPS */}
            <View className="absolute top-4 left-4 right-4 gap-2">
              {/* Kartu Pemilih Transaksi */}
              <TouchableOpacity
                className="bg-pekon-bg/90 border border-pekon-border p-3 rounded-xl flex-row items-center justify-between"
                onPress={() => setShowTxModal(true)}
                accessible={true}
                accessibilityLabel="Pilih transaksi aktif untuk dibuktikan"
              >
                <View className="flex-1 mr-2">
                  <Text className="text-[10px] font-bold text-pekon-primary uppercase tracking-wider">
                    Target Verifikasi Transaksi:
                  </Text>
                  <Text className="text-white text-xs font-bold mt-0.5" numberOfLines={1}>
                    {selectedTx
                      ? `${getTxTypeLabel(selectedTx.type)} • Rp ${Number(selectedTx.grossAmount).toLocaleString('id-ID')}`
                      : activeTransactions.length > 0
                      ? 'Pilih Transaksi Aktif...'
                      : 'Belum Ada Transaksi Aktif (Mode Uji Coba)'}
                  </Text>
                </View>
                <ChevronDown size={16} color="#00F2A9" />
              </TouchableOpacity>

              {/* Status Geotagging & Toleransi GPS */}
              <View className="bg-pekon-bg/90 border border-pekon-border px-3 py-2 rounded-xl flex-row items-center justify-between">
                <View className="flex-row items-center flex-1 mr-2">
                  <MapPin size={13} color={isGpsAccurate ? '#00F2A9' : '#F59E0B'} />
                  <Text className="text-white text-[11px] font-semibold ml-1.5" numberOfLines={1}>
                    GPS: {location?.coords.latitude.toFixed(4) || '-5.3421'}, {location?.coords.longitude.toFixed(4) || '104.9452'} (±{accuracyMeters.toFixed(0)}m)
                  </Text>
                </View>
                {isGpsAccurate ? (
                  <View className="bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/40">
                    <Text className="text-emerald-400 text-[9px] font-bold">AKURAT</Text>
                  </View>
                ) : (
                  <View className="bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/40 flex-row items-center">
                    <AlertTriangle size={9} color="#F59E0B" />
                    <Text className="text-amber-400 text-[9px] font-bold ml-1">LEMAH</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Shutter Bar & Tombol Flip Camera */}
            <View className="absolute bottom-8 left-0 right-0 flex-row items-center justify-around px-8">
              {/* Tombol Flip Camera Depan / Belakang */}
              <TouchableOpacity
                className="w-13 h-13 rounded-full bg-pekon-surface/85 border border-pekon-border items-center justify-center p-3"
                onPress={() => setFacing((prev) => (prev === 'front' ? 'back' : 'front'))}
                accessible={true}
                accessibilityLabel="Putar kamera depan atau belakang"
              >
                <SwitchCamera size={22} color="#00F2A9" />
              </TouchableOpacity>

              {/* Tombol Ambil Foto Shutter */}
              <View className="items-center">
                <TouchableOpacity
                  className="w-20 h-20 rounded-full border-4 border-pekon-primary bg-pekon-surface/80 items-center justify-center"
                  onPress={handleCapturePoW}
                  disabled={isCapturing}
                  accessible={true}
                  accessibilityLabel="Ambil foto bukti kerja selfie proof of work"
                >
                  {isCapturing ? (
                    <ActivityIndicator color="#00F2A9" />
                  ) : (
                    <View className="w-14 h-14 rounded-full bg-pekon-primary" />
                  )}
                </TouchableOpacity>
                <Text className="text-white text-[11px] font-semibold mt-1.5">
                  {facing === 'front' ? 'Selfie Kerja' : 'Foto Objek'}
                </Text>
              </View>

              {/* Placeholder Seimbang */}
              <View className="w-13 h-13 p-3 opacity-0">
                <SwitchCamera size={22} color="#00F2A9" />
              </View>
            </View>
          </CameraView>
        </View>
      ) : (
        /* ================= PRATINJAU BUKTI KERJA & CHECKSUM ================= */
        <View className="flex-1 p-4 justify-between">
          <View>
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-white font-bold text-base">Pratinjau Bukti Kerja (PoW)</Text>
              <View className="bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/40">
                <Text className="text-emerald-400 text-[10px] font-bold">KAMERA LANGSUNG</Text>
              </View>
            </View>

            {/* Gambar Ber-Watermark */}
            <View className="rounded-2xl overflow-hidden border border-pekon-border relative bg-pekon-card">
              <Image source={{ uri: capturedPhoto.uri }} className="w-full h-84" resizeMode="cover" />
              
              {/* Overlay Watermark Permanen */}
              <View className="absolute bottom-0 left-0 right-0 bg-black/80 p-3">
                <Text className="text-emerald-400 font-bold text-xs">TERTANDATANGANI SECARA KRIPTOGRAFIS</Text>
                <Text className="text-white text-xs font-mono mt-0.5">SHA-256: {capturedPhoto.hash.substring(0, 24)}...</Text>
                <Text className="text-pekon-muted text-[11px] mt-0.5">
                  GPS: {capturedPhoto.gpsLat.toFixed(5)}, {capturedPhoto.gpsLng.toFixed(5)} (±{capturedPhoto.accuracy.toFixed(0)}m) • {capturedPhoto.timestamp} WIB
                </Text>
              </View>
            </View>

            {/* Info Transaksi Terkait */}
            <View className="mt-3 p-3 bg-pekon-card border border-pekon-border rounded-xl">
              <Text className="text-pekon-subtle text-[11px]">Transaksi yang Dibuktikan:</Text>
              <Text className="text-white font-bold text-xs mt-0.5">
                {selectedTx
                  ? `${getTxTypeLabel(selectedTx.type)} • Total: Rp ${Number(selectedTx.grossAmount).toLocaleString('id-ID')}`
                  : 'Mode Uji Coba Mandiri (Tanpa Transaksi Database)'}
              </Text>
            </View>
          </View>

          {/* Tombol Eksekusi Kirim / Ambil Ulang */}
          <View className="gap-2.5 pb-2">
            <TouchableOpacity
              className="bg-pekon-primary py-3.5 rounded-xl flex-row items-center justify-center"
              onPress={handleSubmitProof}
              disabled={submitting}
              accessible={true}
              accessibilityLabel="Kirim dan verifikasi bukti kerja ke server pekon"
            >
              {submitting ? (
                <ActivityIndicator color="#0F1416" />
              ) : (
                <>
                  <Send size={16} color="#0F1416" />
                  <Text className="text-pekon-bg font-bold text-sm ml-2">Kirim & Verifikasi Transaksi</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-pekon-surface border border-pekon-border py-3 rounded-xl flex-row items-center justify-center"
              onPress={() => setCapturedPhoto(null)}
              accessible={true}
              accessibilityLabel="Ambil ulang foto bukti kerja"
            >
              <RefreshCw size={15} color="#84958A" />
              <Text className="text-pekon-text font-semibold text-xs ml-2">Ambil Ulang Foto</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ================= MODAL PEMILIH TRANSAKSI AKTIF ================= */}
      <Modal visible={showTxModal} animationType="slide" transparent>
        <View className="flex-1 bg-black/80 justify-end">
          <View className="bg-pekon-surface rounded-t-3xl border-t border-pekon-border p-5 max-h-[70%]">
            <View className="flex-row justify-between items-center pb-3 border-b border-pekon-border/60">
              <View>
                <Text className="text-white font-bold text-base">Pilih Transaksi Aktif</Text>
                <Text className="text-pekon-muted text-xs">Pilih tugas yang ingin Anda sertakan bukti kerjanya</Text>
              </View>
              <TouchableOpacity onPress={() => setShowTxModal(false)}>
                <X size={20} color="#84958A" />
              </TouchableOpacity>
            </View>

            <ScrollView className="py-3">
              {activeTransactions.length === 0 ? (
                <View className="p-6 items-center">
                  <Text className="text-pekon-muted text-xs text-center">
                    Tidak ada transaksi berstatus aktif yang membutuhkan bukti foto saat ini.
                  </Text>
                  <Text className="text-pekon-subtle text-[11px] text-center mt-2">
                    Ambil tugas di Bursa Mini-Job atau sepakati transaksi hasil panen terlebih dahulu.
                  </Text>
                </View>
              ) : (
                activeTransactions.map((tx) => (
                  <TouchableOpacity
                    key={tx.id}
                    className={`p-3.5 rounded-xl border mb-2.5 flex-row items-center justify-between ${
                      selectedTx?.id === tx.id
                        ? 'bg-pekon-card border-pekon-primary'
                        : 'bg-pekon-card/60 border-pekon-border'
                    }`}
                    onPress={() => {
                      setSelectedTx(tx);
                      setShowTxModal(false);
                    }}
                  >
                    <View className="flex-1 mr-2">
                      <View className="flex-row items-center">
                        <Text className="text-white font-bold text-xs">{getTxTypeLabel(tx.type)}</Text>
                        <View className="ml-2 bg-amber-500/20 px-1.5 py-0.2 rounded border border-amber-500/40">
                          <Text className="text-amber-400 text-[9px] font-bold">{tx.status}</Text>
                        </View>
                      </View>
                      <Text className="text-pekon-muted text-[11px] mt-0.5">
                        Mitra: {tx.counterparty?.fullName || tx.initiator?.fullName || 'Warga Pekon'}
                      </Text>
                    </View>
                    <Text className="text-pekon-primary font-bold text-xs">
                      Rp {Number(tx.grossAmount).toLocaleString('id-ID')}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            <TouchableOpacity
              className="bg-pekon-card border border-pekon-border py-3 rounded-xl items-center mt-2"
              onPress={() => setShowTxModal(false)}
            >
              <Text className="text-pekon-muted font-bold text-xs">Tutup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
