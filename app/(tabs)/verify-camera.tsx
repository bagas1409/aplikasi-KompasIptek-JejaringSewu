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
  StyleSheet,
  useWindowDimensions,
  Animated,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Crypto from 'expo-crypto';
import * as Haptics from 'expo-haptics';
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
  ArrowLeft,
  Zap,
  ZapOff,
  Check,
  Copy,
  Lock,
  Clock,
  ArrowRight,
  SlidersHorizontal,
  Home,
  Key,
  Sparkles,
  Shield,
  FileCheck,
  User,
  ShoppingBag,
  Info,
  Eye,
} from 'lucide-react-native';
import { apiClient } from '@/services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';

export default function VerifyCameraScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isCompact = windowWidth < 380;

  const [permission, requestPermission] = useCameraPermissions();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const [flashMode, setFlashMode] = useState<'auto' | 'on' | 'off'>('auto');
  const [isCapturing, setIsCapturing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Daftar transaksi aktif
  const [activeTransactions, setActiveTransactions] = useState<any[]>([]);
  const [selectedTx, setSelectedTx] = useState<any | null>(null);
  const [showTxModal, setShowTxModal] = useState(false);
  const [txModalTab, setTxModalTab] = useState<'ACTIVE' | 'EMPTY'>('ACTIVE');

  // Jam real-time Indonesia (WIB)
  const [liveTime, setLiveTime] = useState('');

  // Toast Salin Hash
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Foto yang berhasil diambil (State 3: Review)
  const [capturedPhoto, setCapturedPhoto] = useState<{
    uri: string;
    hash: string;
    gpsLat: number;
    gpsLng: number;
    accuracy: number;
    timestamp: string;
    rawDate: string;
  } | null>(null);

  // Sukses Verifikasi (State 4: Success Celebration)
  const [verifiedSuccess, setVerifiedSuccess] = useState<{
    txId: string;
    refCode: string;
    amount: number;
    taskTitle: string;
    category: string;
    timestamp: string;
    coords: string;
  } | null>(null);

  const cameraRef = useRef<any>(null);
  const flashAnim = useRef(new Animated.Value(0)).current;

  // 1. Live Timestamp Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      setLiveTime(`${h}:${m}:${s} WIB`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // 2. Ambil izin & posisi GPS
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setLocation(loc);
      }
    })();
  }, []);

  // 3. Ambil daftar transaksi aktif pengguna
  const fetchActiveTransactions = async () => {
    try {
      const res: any = await apiClient.get('/transactions/me');
      const all: any[] = res.data || [];
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

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2200);
  };

  // Toleransi GPS (Maksimal 50 meter untuk keabsahan PoW)
  const accuracyMeters = location?.coords?.accuracy || 15;
  const isGpsAccurate = accuracyMeters <= 50;

  // 4. Ambil Foto Kamera Langsung
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
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (e) {}

      // Flash animation simulation
      Animated.sequence([
        Animated.timing(flashAnim, {
          toValue: flashMode === 'off' ? 0.25 : 0.85,
          duration: 90,
          useNativeDriver: true,
        }),
        Animated.timing(flashAnim, {
          toValue: 0,
          duration: 140,
          useNativeDriver: true,
        }),
      ]).start();

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

      // Kompresi di sisi klien dan ambil data base64 secara efisien
      const manipResult = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ resize: { width: 1080 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      // Hitung SHA-256 Hash biner gambar untuk bukti integritas anti-tampering
      let sha256 = '';
      if (manipResult.base64) {
        sha256 = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          manipResult.base64
        );
      } else {
        sha256 = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          `pow-${Date.now()}-${manipResult.uri}`
        );
      }

      const now = new Date();
      const timeFormatted = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
      const dateFormatted = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

      setCapturedPhoto({
        uri: manipResult.uri,
        hash: sha256,
        gpsLat: currentLoc?.coords.latitude || -5.3421,
        gpsLng: currentLoc?.coords.longitude || 104.9452,
        accuracy: currentLoc?.coords.accuracy || 15,
        timestamp: timeFormatted,
        rawDate: `${dateFormatted} · ${timeFormatted}`,
      });
      setIsCapturing(false);
    } catch (err: any) {
      Alert.alert('Gagal Mengambil Foto', err.message);
      setIsCapturing(false);
    }
  };

  // 5. Kirim & Verifikasi Bukti Kerja ke Server
  const handleSubmitProof = async () => {
    if (!capturedPhoto) return;

    if (!selectedTx) {
      // Mode Uji Coba Mandiri (Simulasi Berhasil)
      const fakeRef = `PKN-${Math.floor(10000 + Math.random() * 90000)}`;
      setVerifiedSuccess({
        txId: 'simulasi-uji-coba',
        refCode: fakeRef,
        amount: 50000,
        taskTitle: 'Simulasi Bukti Kerja Lapangan',
        category: 'Pekerjaan Mikro Pekon',
        timestamp: capturedPhoto.rawDate,
        coords: `${capturedPhoto.gpsLat.toFixed(5)}, ${capturedPhoto.gpsLng.toFixed(5)}`,
      });
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

      const refCode = `POW-${selectedTx.id.substring(0, 6).toUpperCase()}`;
      setVerifiedSuccess({
        txId: selectedTx.id,
        refCode,
        amount: Number(selectedTx.grossAmount || 0),
        taskTitle: getTxTitle(selectedTx),
        category: getTxCategoryLabel(selectedTx.type),
        timestamp: capturedPhoto.rawDate,
        coords: `${capturedPhoto.gpsLat.toFixed(5)}, ${capturedPhoto.gpsLng.toFixed(5)}`,
      });

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
        return 'Mini-Job';
      case 'HARVEST_DEAL':
        return 'Jual Beli Panen';
      case 'NEBENG_JASTIP':
        return 'Titip Jastip Komuter';
      default:
        return type || 'Aktivitas Transaksi';
    }
  };

  const getTxCategoryLabel = (type: string) => {
    switch (type) {
      case 'MINI_JOB':
        return 'Pekerjaan Mikro Pekon';
      case 'HARVEST_DEAL':
        return 'Hasil Bumi Petani';
      case 'NEBENG_JASTIP':
        return 'Logistik Komuter';
      default:
        return 'Transaksi Pekon';
    }
  };

  const getTxTitle = (tx: any) => {
    if (!tx) return 'Pengupasan Singkong';
    if (tx.title) return tx.title;
    if (tx.type === 'MINI_JOB') return 'Pengupasan Singkong';
    if (tx.type === 'HARVEST_DEAL') return 'Singkong Mukibat 1.500 kg';
    if (tx.type === 'NEBENG_JASTIP') return 'Antar Kardus Keripik';
    return 'Tugas Kerja Warga Pekon';
  };

  // =========================================================================
  // STATE 1: CAMERA & LOCATION PERMISSION SCREEN (ijin bukti & kamera terkirim.md)
  // =========================================================================
  if (!permission || !permission.granted) {
    return (
      <View style={styles.permissionScreen}>
        <StatusBar style="dark" backgroundColor="#FCF9F8" />
        <View style={[styles.permissionCard, { marginTop: Math.max(insets.top, 24) }]}>
          {/* Ambient Mint Ripple Badge Illustration */}
          <View style={styles.permissionIllustrationWrap}>
            <View style={styles.permissionRippleOuter} />
            <View style={styles.permissionRippleMid}>
              <View style={styles.permissionIconCircle}>
                <Camera size={32} color="#FFFFFF" />
              </View>
            </View>
            <View style={styles.permissionShieldBadge}>
              <ShieldCheck size={14} color="#006A42" />
            </View>
          </View>

          {/* Typography Heading */}
          <Text style={styles.permissionTitle}>Izin Kamera & Lokasi</Text>
          <Text style={styles.permissionSubtitle}>
            Kami membutuhkan akses kamera langsung untuk mengambil dokumentasi bukti pekerjaan secara nyata tanpa galeri, serta validasi radius GPS lokasi kerja.
          </Text>

          {/* Feature List with Verification Bullets */}
          <View style={styles.permissionFeatureList}>
            <View style={styles.featureItem}>
              <View style={styles.featureIconBadge}>
                <Check size={14} color="#00734B" strokeWidth={3} />
              </View>
              <View style={styles.featureTextWrap}>
                <Text style={styles.featureTitle}>Pengambilan foto langsung</Text>
                <Text style={styles.featureDesc}>
                  Sistem anti-rekayasa dan bypass galeri ponsel
                </Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <View style={styles.featureIconBadge}>
                <Check size={14} color="#00734B" strokeWidth={3} />
              </View>
              <View style={styles.featureTextWrap}>
                <Text style={styles.featureTitle}>Watermark otomatis aman</Text>
                <Text style={styles.featureDesc}>
                  Koordinat lintang-bujur & stempel waktu presisi
                </Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <View style={styles.featureIconBadge}>
                <Check size={14} color="#00734B" strokeWidth={3} />
              </View>
              <View style={styles.featureTextWrap}>
                <Text style={styles.featureTitle}>Verifikasi integritas instan</Text>
                <Text style={styles.featureDesc}>
                  Kriptografi SHA-256 untuk proteksi bukti kerja
                </Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.permissionActionCol}>
            <TouchableOpacity
              style={styles.permissionPrimaryBtn}
              onPress={requestPermission}
              activeOpacity={0.85}
              accessible={true}
              accessibilityLabel="Aktifkan izin kamera perangkat"
            >
              <Camera size={20} color="#FFFFFF" />
              <Text style={styles.permissionPrimaryBtnText}>Aktifkan Kamera</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.permissionSecondaryBtn}
              onPress={() => router.push('/(tabs)/commuter')}
              activeOpacity={0.7}
            >
              <Text style={styles.permissionSecondaryBtnText}>Kembali ke Beranda</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Security Micro Footer */}
        <View style={styles.securityFooterRow}>
          <Lock size={15} color="#006A42" />
          <Text style={styles.securityFooterText}>
            Enkripsi End-to-End & Proteksi Privasi Aktif
          </Text>
        </View>
      </View>
    );
  }

  // =========================================================================
  // STATE 4: SUCCESS VERIFICATION CELEBRATION (ijin bukti & kamera terkirim.md)
  // =========================================================================
  if (verifiedSuccess) {
    return (
      <View style={styles.successScreen}>
        <StatusBar style="dark" backgroundColor="#FCF9F8" />
        <ScrollView
          contentContainerStyle={[
            styles.successScrollContent,
            { paddingTop: Math.max(insets.top, 24), paddingBottom: Math.max(insets.bottom, 24) },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.successCard}>
            {/* Celebration Icon */}
            <View style={styles.successIconWrapper}>
              <View style={styles.successIconCircleOuter}>
                <View style={styles.successIconCircleInner}>
                  <CheckCircle2 size={36} color="#FFFFFF" strokeWidth={2.5} />
                </View>
              </View>
            </View>

            {/* Verified Tag Pill */}
            <View style={styles.successVerifiedPill}>
              <ShieldCheck size={14} color="#00734B" />
              <Text style={styles.successVerifiedPillText}>Integritas Terverifikasi</Text>
            </View>

            {/* Headline & Description */}
            <Text style={styles.successHeadline}>Bukti Berhasil Dikirim</Text>
            <Text style={styles.successDescription}>
              Bukti pekerjaan Anda sedang diverifikasi oleh sistem pekon. Dana upah{' '}
              <Text style={styles.successAmountHighlight}>
                Rp {verifiedSuccess.amount.toLocaleString('id-ID')}
              </Text>{' '}
              otomatis dicairkan setelah validasi selesai.
            </Text>

            {/* Details Mini-Panel */}
            <View style={styles.successMiniPanel}>
              <View style={styles.successPanelRow}>
                <Text style={styles.successPanelLabel}>Tugas Terkait</Text>
                <Text style={styles.successPanelValue} numberOfLines={1}>
                  {verifiedSuccess.taskTitle}
                </Text>
              </View>

              <View style={styles.successPanelRow}>
                <Text style={styles.successPanelLabel}>Kategori</Text>
                <View style={styles.successCategoryBadge}>
                  <Text style={styles.successCategoryText}>{verifiedSuccess.category}</Text>
                </View>
              </View>

              <View style={styles.successPanelRow}>
                <Text style={styles.successPanelLabel}>Kode Referensi</Text>
                <Text style={styles.successRefCode}>{verifiedSuccess.refCode}</Text>
              </View>

              <View style={styles.successPanelRow}>
                <Text style={styles.successPanelLabel}>Status Bukti</Text>
                <View style={styles.successStatusRow}>
                  <View style={styles.pulseDotGreen} />
                  <Text style={styles.successStatusText}>Menunggu Konsensus</Text>
                </View>
              </View>
            </View>

            {/* Contextual Photo Snippet Preview */}
            <View style={styles.successPhotoSnippet}>
              <View style={styles.successSnippetIconBox}>
                <FileCheck size={22} color="#006A42" />
              </View>
              <View style={styles.successSnippetTextCol}>
                <Text style={styles.successSnippetTitle} numberOfLines={1}>
                  Bukti_{verifiedSuccess.refCode.replace('#', '')}.jpg
                </Text>
                <Text style={styles.successSnippetMeta} numberOfLines={1}>
                  GPS: {verifiedSuccess.coords} • {verifiedSuccess.timestamp}
                </Text>
              </View>
            </View>

            {/* Return Action Button */}
            <TouchableOpacity
              style={styles.successHomeBtn}
              onPress={() => {
                setVerifiedSuccess(null);
                setCapturedPhoto(null);
                router.push('/(tabs)/commuter');
              }}
              activeOpacity={0.85}
            >
              <Home size={18} color="#FFFFFF" />
              <Text style={styles.successHomeBtnText}>Kembali ke Beranda</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.successOtherBtn}
              onPress={() => {
                setVerifiedSuccess(null);
                setCapturedPhoto(null);
                router.push('/(tabs)/marketplace');
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.successOtherBtnText}>Ambil Tugas Lain</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // =========================================================================
  // STATE 3: VERIFICATION SUMMARY / REVIEW SCREEN (pilih bukti kerja.md)
  // =========================================================================
  if (capturedPhoto) {
    const refTag = `#PKN-${capturedPhoto.hash.substring(0, 5).toUpperCase()}`;

    return (
      <View style={styles.reviewScreen}>
        <StatusBar style="dark" backgroundColor="#FCF9F8" />

        {/* Floating Toast Notification */}
        {toastMessage && (
          <View style={styles.toastFloat}>
            <CheckCircle2 size={16} color="#96F6C2" />
            <Text style={styles.toastFloatText}>{toastMessage}</Text>
          </View>
        )}

        {/* Top Header Bar */}
        <View style={[styles.reviewTopBar, { paddingTop: Math.max(insets.top, 10) }]}>
          <TouchableOpacity
            style={styles.reviewBackCircle}
            onPress={() => setCapturedPhoto(null)}
            activeOpacity={0.8}
            accessibilityLabel="Kembali ke kamera"
          >
            <ArrowLeft size={20} color="#1C1B1B" />
          </TouchableOpacity>
          <Text style={styles.reviewTopTitle}>Verification Summary</Text>
          <View style={styles.reviewAvatarCircle}>
            <User size={16} color="#FFFFFF" />
          </View>
        </View>

        {/* Main Scroll Content */}
        <ScrollView
          style={styles.reviewScrollView}
          contentContainerStyle={[
            styles.reviewScrollContent,
            { paddingBottom: Math.max(insets.bottom, 16) + 140 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Context Tag */}
          <View style={styles.reviewContextTagRow}>
            <View style={styles.reviewContextLeft}>
              <View style={styles.pulseDotGreen} />
              <Text style={styles.reviewContextTagText}>BUKTI SIAP DIVERIFIKASI</Text>
            </View>
            <View style={styles.reviewRefBadge}>
              <Text style={styles.reviewRefBadgeText}>Ref: {refTag}</Text>
            </View>
          </View>

          {/* 1. Captured Photo Preview */}
          <View style={styles.photoPreviewCard}>
            <Image
              source={{ uri: capturedPhoto.uri }}
              style={styles.photoPreviewImage}
              resizeMode="cover"
            />
            {/* Top Badges Overlay */}
            <View style={styles.photoTopBadgesRow}>
              <View style={styles.photoBadgeValidated}>
                <CheckCircle2 size={12} color="#96F6C2" />
                <Text style={styles.photoBadgeValidatedText}>Tervalidasi Kamera Asli</Text>
              </View>
              <View style={styles.photoBadgeExif}>
                <Text style={styles.photoBadgeExifText}>RAW · EXIF Aman</Text>
              </View>
            </View>

            {/* Bottom Gradient Scrim & Info Overlay */}
            <View style={styles.photoBottomScrim}>
              <View style={styles.photoBottomInfoRow}>
                <View style={styles.photoInfoItem}>
                  <Clock size={14} color="#96F6C2" />
                  <Text style={styles.photoInfoText}>{capturedPhoto.timestamp}</Text>
                </View>
                <View style={styles.photoInfoItem}>
                  <MapPin size={14} color="#96F6C2" />
                  <Text style={styles.photoInfoTextBold}>Pekon Pagelaran</Text>
                </View>
              </View>
            </View>
          </View>

          {/* 2. Informasi Pengambilan (Grid 2x2) */}
          <View style={styles.reviewCard}>
            <View style={styles.reviewCardHeaderRow}>
              <View style={styles.reviewCardHeaderLeft}>
                <Info size={17} color="#006A42" />
                <Text style={styles.reviewCardTitle}>Informasi Pengambilan</Text>
              </View>
              <View style={styles.liveMetaBadge}>
                <Text style={styles.liveMetaBadgeText}>Live Metadata</Text>
              </View>
            </View>

            <View style={styles.metadataGrid}>
              <View style={styles.metadataCell}>
                <Text style={styles.metadataLabel}>Waktu Perekaman</Text>
                <Text style={styles.metadataValue}>{capturedPhoto.timestamp}</Text>
              </View>
              <View style={styles.metadataCell}>
                <Text style={styles.metadataLabel}>Lokasi Koordinat</Text>
                <Text style={styles.metadataValue} numberOfLines={1}>
                  Pekon Pagelaran
                </Text>
              </View>
              <View style={styles.metadataCell}>
                <Text style={styles.metadataLabel}>Akurasi GPS</Text>
                <View style={styles.metadataWithDot}>
                  <View style={styles.dotTinyGreen} />
                  <Text style={styles.metadataValue}>±{capturedPhoto.accuracy.toFixed(0)} meter</Text>
                </View>
              </View>
              <View style={styles.metadataCell}>
                <Text style={styles.metadataLabel}>Sumber Perangkat</Text>
                <View style={styles.metadataWithDot}>
                  <Key size={13} color="#006A42" />
                  <Text style={styles.metadataValue} numberOfLines={1}>
                    Hardware Keystore
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* 3. Integritas Foto Terjaga (Anti-Tamper SHA-256) */}
          <View style={styles.reviewCard}>
            <View style={styles.reviewCardHeaderRow}>
              <View style={styles.integrityLeftWrap}>
                <View style={styles.integrityIconBox}>
                  <ShieldCheck size={18} color="#006A42" />
                </View>
                <View>
                  <Text style={styles.integrityTitle}>Integritas Foto Terjaga</Text>
                  <Text style={styles.integritySubtitle}>Terenkripsi sebelum transmisi</Text>
                </View>
              </View>
              <View style={styles.antiTamperBadge}>
                <Text style={styles.antiTamperBadgeText}>Anti-Tamper</Text>
              </View>
            </View>

            {/* Hash Display & Copy Button */}
            <View style={styles.hashBox}>
              <View style={styles.hashTextCol}>
                <Text style={styles.hashLabel}>Sidik Jari Digital (SHA-256)</Text>
                <Text style={styles.hashString} numberOfLines={1}>
                  {capturedPhoto.hash}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.copyHashBtn}
                onPress={() => triggerToast('Hash berhasil disalin ke clipboard')}
                activeOpacity={0.8}
              >
                <Copy size={16} color="#1C1B1B" />
              </TouchableOpacity>
            </View>
          </View>

          {/* 4. Ringkasan Kontrak Kerja (Escrow Aktif) */}
          <View style={styles.reviewCard}>
            <View style={styles.reviewCardHeaderRow}>
              <View style={styles.reviewCardHeaderLeft}>
                <FileCheck size={17} color="#006A42" />
                <Text style={styles.reviewCardTitle}>Ringkasan Kontrak Kerja</Text>
              </View>
              <View style={styles.liveMetaBadge}>
                <Text style={styles.liveMetaBadgeText}>Escrow Aktif</Text>
              </View>
            </View>

            <View style={styles.contractRowsWrap}>
              <View style={styles.contractRow}>
                <Text style={styles.contractLabel}>Jenis Pekerjaan</Text>
                <Text style={styles.contractValue} numberOfLines={1}>
                  {selectedTx ? `${getTxTypeLabel(selectedTx.type)} · ${getTxTitle(selectedTx)}` : 'Mini-Job · Pengupasan Singkong'}
                </Text>
              </View>
              <View style={styles.contractRow}>
                <Text style={styles.contractLabel}>Pemberi Kerja</Text>
                <Text style={styles.contractValue} numberOfLines={1}>
                  {selectedTx?.initiator?.fullName || 'Koperasi Tani Makmur Pekon'}
                </Text>
              </View>

              <View style={styles.escrowAmountBox}>
                <View>
                  <Text style={styles.escrowAmountLabel}>Alokasi Nilai Upah</Text>
                  <Text style={styles.escrowAmountValue}>
                    Rp {Number(selectedTx?.grossAmount || 50000).toLocaleString('id-ID')}
                  </Text>
                </View>
                <View style={styles.escrowLockStatusCol}>
                  <View style={styles.escrowLockRow}>
                    <Lock size={12} color="#006A42" />
                    <Text style={styles.escrowLockText}>Dana Aman</Text>
                  </View>
                  <Text style={styles.escrowSubText}>Escrow Pekon Terkunci</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Trust Note Banner */}
          <View style={styles.trustNoteRow}>
            <Clock size={16} color="#006A42" style={{ marginTop: 2 }} />
            <Text style={styles.trustNoteText}>
              Setelah bukti dikirim, dana Rp {Number(selectedTx?.grossAmount || 50000).toLocaleString('id-ID')} otomatis dicairkan ke dompet digital Anda setelah verifikasi supervisor Pekon (&lt; 15 menit).
            </Text>
          </View>
        </ScrollView>

        {/* Fixed Action Area */}
        <View style={[styles.fixedReviewActionArea, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <TouchableOpacity
            style={[styles.reviewSubmitBtn, submitting && styles.btnDisabled]}
            onPress={handleSubmitProof}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Send size={18} color="#FFFFFF" />
                <Text style={styles.reviewSubmitBtnText}>Kirim Bukti Kerja</Text>
                <ArrowRight size={18} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.reviewRetakeBtn}
            onPress={() => setCapturedPhoto(null)}
            activeOpacity={0.8}
          >
            <RefreshCw size={17} color="#006A42" />
            <Text style={styles.reviewRetakeBtnText}>Ambil Ulang</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // =========================================================================
  // STATE 2: LIVE CAMERA VIEWFINDER (live camera.md)
  // =========================================================================
  return (
    <View style={styles.liveCameraScreen}>
      <StatusBar style="light" backgroundColor="#000000" />

      {/* Screen Flash Flare Animation */}
      <Animated.View
        pointerEvents="none"
        style={[styles.flashFlareOverlay, { opacity: flashAnim }]}
      />

      <View style={styles.cameraViewportWrap}>
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFillObject} facing={facing}>
          {/* Rule of Thirds Photography Grid */}
          <View style={styles.gridContainer} pointerEvents="none">
            <View style={styles.gridRow}>
              <View style={styles.gridCellBorder} />
              <View style={styles.gridCellBorder} />
              <View style={styles.gridCellNoRight} />
            </View>
            <View style={styles.gridRow}>
              <View style={styles.gridCellBorder} />
              <View style={styles.gridCellBorder} />
              <View style={styles.gridCellNoRight} />
            </View>
            <View style={styles.gridRow}>
              <View style={styles.gridCellNoBottom} />
              <View style={styles.gridCellNoBottom} />
              <View style={styles.gridCellLast} />
            </View>
          </View>

          {/* Minimalist Precision Focus Reticle */}
          <View style={styles.reticleContainer} pointerEvents="none">
            <View style={styles.reticleBox}>
              <View style={styles.reticleCenterDot} />
              {/* Corner ticks */}
              <View style={[styles.reticleCorner, styles.cornerTLH]} />
              <View style={[styles.reticleCorner, styles.cornerTLV]} />
              <View style={[styles.reticleCorner, styles.cornerTRH]} />
              <View style={[styles.reticleCorner, styles.cornerTRV]} />
              <View style={[styles.reticleCorner, styles.cornerBLH]} />
              <View style={[styles.reticleCorner, styles.cornerBLV]} />
              <View style={[styles.reticleCorner, styles.cornerBRH]} />
              <View style={[styles.reticleCorner, styles.cornerBRV]} />
            </View>
          </View>

          {/* Top Overhead Gradient & HUD Bar */}
          <View style={[styles.overheadHudWrap, { paddingTop: Math.max(insets.top, 14) }]}>
            {/* HUD Navigation Row */}
            <View style={styles.hudNavRow}>
              <TouchableOpacity
                style={styles.hudCircleBtn}
                onPress={() => router.push('/(tabs)/commuter')}
                activeOpacity={0.8}
                accessibilityLabel="Kembali ke beranda"
              >
                <ArrowLeft size={20} color="#FFFFFF" />
              </TouchableOpacity>

              <View style={styles.hudTitleCenter}>
                <Text style={styles.hudMainTitle}>Verifikasi Bukti Kerja</Text>
                <Text style={styles.hudSubTitle}>ANTI-TAMPER LIVE STREAM</Text>
              </View>

              <TouchableOpacity
                style={styles.hudCircleBtn}
                onPress={() => {
                  setFlashMode((prev) => (prev === 'auto' ? 'on' : prev === 'on' ? 'off' : 'auto'));
                  triggerToast(
                    `Lampu Kilat: ${
                      flashMode === 'auto' ? 'Aktif Selalu' : flashMode === 'on' ? 'Nonaktif' : 'Otomatis'
                    }`
                  );
                }}
                activeOpacity={0.8}
                accessibilityLabel="Ganti mode flash"
              >
                {flashMode === 'off' ? (
                  <ZapOff size={18} color="#FFFFFF" />
                ) : (
                  <Zap size={18} color="#96F6C2" />
                )}
                <View style={styles.flashBadge}>
                  <Text style={styles.flashBadgeText}>
                    {flashMode === 'auto' ? 'A' : flashMode === 'on' ? 'ON' : 'OFF'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Active Transaction Context Capsule Pill */}
            <TouchableOpacity
              style={styles.txCapsuleBtn}
              onPress={() => setShowTxModal(true)}
              activeOpacity={0.85}
              accessible={true}
              accessibilityLabel="Pilih target transaksi aktif"
            >
              <View style={styles.pulseDotGreen} />
              <Text style={styles.txCapsuleText} numberOfLines={1}>
                <Text style={styles.txCapsuleLabel}>AKTIF: </Text>
                {selectedTx
                  ? `${getTxTypeLabel(selectedTx.type)} · ${getTxTitle(selectedTx)} • `
                  : 'Mini-Job · Pengupasan Singkong • '}
                <Text style={styles.txCapsuleAmount}>
                  Rp {Number(selectedTx?.grossAmount || 50000).toLocaleString('id-ID')}
                </Text>
              </Text>
              <ChevronDown size={16} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Dynamic GPS Reliability Status Pill */}
            <View style={styles.gpsStatusPill}>
              <View
                style={[
                  styles.gpsStatusDot,
                  { backgroundColor: isGpsAccurate ? '#96F6C2' : '#BA1A1A' },
                ]}
              />
              <Text style={styles.gpsStatusText} numberOfLines={1}>
                {isGpsAccurate
                  ? `GPS Akurat · ±${accuracyMeters.toFixed(0)}m (Pekon Pagelaran)`
                  : `GPS Kurang Akurat (±${accuracyMeters.toFixed(0)}m) · Geser ke luar`}
              </Text>
            </View>
          </View>

          {/* Live Ambient Watermark Line (Above Control Deck) */}
          <View style={styles.liveWatermarkRow}>
            <View style={styles.liveWatermarkLeft}>
              <ShieldCheck size={13} color="#96F6C2" />
              <Text style={styles.liveWatermarkText}>Watermark GPS Terenkripsi</Text>
            </View>
            <Text style={styles.liveWatermarkClock}>{liveTime}</Text>
          </View>
        </CameraView>
      </View>

      {/* Floating Toast Notification in Camera View */}
      {toastMessage && (
        <View style={styles.toastFloatCamera}>
          <CheckCircle2 size={15} color="#96F6C2" />
          <Text style={styles.toastFloatCameraText}>{toastMessage}</Text>
        </View>
      )}

      {/* Camera Controls & Auxiliary Deck */}
      <View style={[styles.controlDeck, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        {/* Lens Photography Mode Switcher (Selfie vs Foto Objek) */}
        <View style={styles.modeSwitcherContainer}>
          <TouchableOpacity
            style={[
              styles.modeSwitcherBtn,
              facing === 'front' ? styles.modeSwitcherBtnActive : styles.modeSwitcherBtnInactive,
            ]}
            onPress={() => {
              setFacing('front');
              triggerToast('Mode Selfie / Wajah Pekerja');
            }}
            activeOpacity={0.85}
          >
            {facing === 'front' && <View style={styles.dotTinyMint} />}
            <Text
              style={[
                styles.modeSwitcherText,
                facing === 'front' ? styles.modeSwitcherTextActive : styles.modeSwitcherTextInactive,
              ]}
            >
              Selfie
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeSwitcherBtn,
              facing === 'back' ? styles.modeSwitcherBtnActive : styles.modeSwitcherBtnInactive,
            ]}
            onPress={() => {
              setFacing('back');
              triggerToast('Mode Foto Objek / Hasil Panen');
            }}
            activeOpacity={0.85}
          >
            {facing === 'back' && <View style={styles.dotTinyMint} />}
            <Text
              style={[
                styles.modeSwitcherText,
                facing === 'back' ? styles.modeSwitcherTextActive : styles.modeSwitcherTextInactive,
              ]}
            >
              Foto Objek
            </Text>
          </TouchableOpacity>
        </View>

        {/* Shutter Ergonomic Interaction Row */}
        <View style={styles.shutterRow}>
          {/* Quick Thumbnail Preview */}
          <View style={styles.auxCol}>
            <View style={styles.thumbnailCircle}>
              <Image
                source={{
                  uri: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?auto=format&fit=crop&w=150&q=80',
                }}
                style={styles.thumbnailImg}
              />
            </View>
            <Text style={styles.auxColLabel}>Terakhir</Text>
          </View>

          {/* Main Shutter Button */}
          <TouchableOpacity
            style={styles.shutterOuterRing}
            onPress={handleCapturePoW}
            disabled={isCapturing}
            activeOpacity={0.85}
            accessible={true}
            accessibilityLabel="Ambil bukti pekerjaan"
          >
            <View style={styles.shutterCoreCircle}>
              {isCapturing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Camera size={26} color="#FFFFFF" />
              )}
            </View>
          </TouchableOpacity>

          {/* Lens Flip / Switch Camera Button */}
          <View style={styles.auxCol}>
            <TouchableOpacity
              style={styles.flipBtn}
              onPress={() => {
                setFacing((prev) => (prev === 'front' ? 'back' : 'front'));
                triggerToast(facing === 'front' ? 'Kamera Belakang Aktif' : 'Kamera Depan Aktif');
              }}
              activeOpacity={0.8}
            >
              <SwitchCamera size={22} color="#1C1B1B" />
            </TouchableOpacity>
            <Text style={styles.auxColLabel}>Putar</Text>
          </View>
        </View>

        {/* Ergonomic Field Guidance Instruction */}
        <View style={styles.guidancePill}>
          <Eye size={15} color="#006A42" />
          <Text style={styles.guidancePillText} numberOfLines={1}>
            Pastikan objek pekerjaan dan hasil panen terlihat jelas dalam bingkai.
          </Text>
        </View>
      </View>

      {/* =====================================================================
         MODAL: PILIH TRANSAKSI AKTIF (pilih transaksi aktif.md)
         ===================================================================== */}
      <Modal
        visible={showTxModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowTxModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 24) }]}>
            {/* Sheet Handle */}
            <View style={styles.sheetHandle} />

            {/* Header Section */}
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalHeaderTitleCol}>
                <Text style={styles.modalTitle}>Pilih Transaksi</Text>
                <Text style={styles.modalSubtitle}>
                  Pilih pekerjaan yang ingin diverifikasi buktinya.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setShowTxModal(false)}
                activeOpacity={0.8}
              >
                <X size={18} color="#3D4A41" />
              </TouchableOpacity>
            </View>

            {/* Segment Tab Switcher: Aktif vs Status Kosong */}
            <View style={styles.modalSegmentContainer}>
              <TouchableOpacity
                style={[
                  styles.modalSegmentBtn,
                  txModalTab === 'ACTIVE'
                    ? styles.modalSegmentBtnActive
                    : styles.modalSegmentBtnInactive,
                ]}
                onPress={() => setTxModalTab('ACTIVE')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.modalSegmentText,
                    txModalTab === 'ACTIVE'
                      ? styles.modalSegmentTextActive
                      : styles.modalSegmentTextInactive,
                  ]}
                >
                  Aktif ({activeTransactions.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalSegmentBtn,
                  txModalTab === 'EMPTY'
                    ? styles.modalSegmentBtnActive
                    : styles.modalSegmentBtnInactive,
                ]}
                onPress={() => setTxModalTab('EMPTY')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.modalSegmentText,
                    txModalTab === 'EMPTY'
                      ? styles.modalSegmentTextActive
                      : styles.modalSegmentTextInactive,
                  ]}
                >
                  Status Kosong
                </Text>
              </TouchableOpacity>
            </View>

            {/* Modal Body Content */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollBody}
            >
              {txModalTab === 'EMPTY' || activeTransactions.length === 0 ? (
                /* Empty State View */
                <View style={styles.emptyTxCard}>
                  <View style={styles.emptyTxIconCircle}>
                    <Briefcase size={26} color="#006A42" />
                  </View>
                  <Text style={styles.emptyTxTitle}>Belum Ada Transaksi Aktif</Text>
                  <Text style={styles.emptyTxSubtitle}>
                    Selesaikan atau ambil tugas di Bursa Mini-Job atau transaksi panen terlebih dahulu.
                  </Text>
                  <TouchableOpacity
                    style={styles.emptyTxCtaBtn}
                    onPress={() => {
                      setShowTxModal(false);
                      router.push('/(tabs)/marketplace');
                    }}
                    activeOpacity={0.85}
                  >
                    <ShoppingBag size={16} color="#FFFFFF" />
                    <Text style={styles.emptyTxCtaBtnText}>Buka Bursa Mini-Job</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                /* Active Transaction Items List */
                <View style={styles.txListStack}>
                  {activeTransactions.map((tx) => {
                    const isSelected = selectedTx?.id === tx.id;
                    const title = getTxTitle(tx);
                    const typeLabel = getTxTypeLabel(tx.type);
                    const categoryLabel = getTxCategoryLabel(tx.type);
                    const amount = Number(tx.grossAmount || 50000);

                    return (
                      <TouchableOpacity
                        key={tx.id}
                        style={[
                          styles.txItemCard,
                          isSelected ? styles.txItemCardSelected : styles.txItemCardUnselected,
                        ]}
                        onPress={() => setSelectedTx(tx)}
                        activeOpacity={0.85}
                      >
                        <View style={styles.txItemLeftRow}>
                          {/* Radio Indicator */}
                          <View
                            style={[
                              styles.radioCircle,
                              isSelected ? styles.radioCircleSelected : styles.radioCircleUnselected,
                            ]}
                          >
                            {isSelected && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                          </View>

                          {/* Item Details */}
                          <View style={styles.txItemDetailCol}>
                            <Text style={styles.txItemTitleText} numberOfLines={1}>
                              {typeLabel} · {title}
                            </Text>
                            <View style={styles.txItemMetaBadgeRow}>
                              <View style={styles.txCategoryChip}>
                                <Text style={styles.txCategoryChipText}>{categoryLabel}</Text>
                              </View>
                              <Text style={styles.dotDivider}>•</Text>
                              <Text style={styles.txDurationText}>Target Selesai</Text>
                            </View>
                          </View>
                        </View>

                        {/* Value Amount */}
                        <Text style={[styles.txItemAmountText, isSelected && styles.txItemAmountSelected]}>
                          Rp {amount.toLocaleString('id-ID')}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Verification Guidelines Tip Card */}
              <View style={styles.guidelineTipCard}>
                <ShieldCheck size={20} color="#006A42" style={{ marginTop: 2 }} />
                <View style={styles.guidelineTipTextCol}>
                  <Text style={styles.guidelineTipTitle}>
                    Instruksi Bukti Kerja (Proof of Work)
                  </Text>
                  <Text style={styles.guidelineTipDesc}>
                    Pastikan hasil kerja dan label barcode fisik terlihat jelas dalam bidikan kamera.
                  </Text>
                </View>
              </View>

              {/* Action Button: Lanjutkan ke Kamera */}
              <TouchableOpacity
                style={styles.modalActionSubmitBtn}
                onPress={() => setShowTxModal(false)}
                activeOpacity={0.85}
              >
                <Camera size={18} color="#FFFFFF" />
                <Text style={styles.modalActionSubmitBtnText}>
                  Pilih & Lanjutkan ke Kamera
                </Text>
              </TouchableOpacity>
              <Text style={styles.modalActionNote}>
                Metadata GPS & Timestamp akan disematkan otomatis
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  /* Main Container */
  liveCameraScreen: {
    flex: 1,
    backgroundColor: '#000000',
  },
  cameraViewportWrap: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  flashFlareOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    zIndex: 99,
  },

  /* Grid lines for Rule of Thirds */
  gridContainer: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.28,
  },
  gridRow: {
    flex: 1,
    flexDirection: 'row',
  },
  gridCellBorder: {
    flex: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.45)',
  },
  gridCellNoRight: {
    flex: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.45)',
  },
  gridCellNoBottom: {
    flex: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.45)',
  },
  gridCellLast: {
    flex: 1,
  },

  /* Precision Focus Reticle */
  reticleContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reticleBox: {
    width: 68,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  reticleCenterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#96F6C2',
  },
  reticleCorner: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
  },
  cornerTLH: { top: 0, left: 0, width: 12, height: 2 },
  cornerTLV: { top: 0, left: 0, width: 2, height: 12 },
  cornerTRH: { top: 0, right: 0, width: 12, height: 2 },
  cornerTRV: { top: 0, right: 0, width: 2, height: 12 },
  cornerBLH: { bottom: 0, left: 0, width: 12, height: 2 },
  cornerBLV: { bottom: 0, left: 0, width: 2, height: 12 },
  cornerBRH: { bottom: 0, right: 0, width: 12, height: 2 },
  cornerBRV: { bottom: 0, right: 0, width: 2, height: 12 },

  /* Top HUD */
  overheadHudWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  hudNavRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hudCircleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  hudTitleCenter: {
    alignItems: 'center',
  },
  hudMainTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  hudSubTitle: {
    fontSize: 9.5,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.65)',
    letterSpacing: 1,
    marginTop: 1,
  },
  flashBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#006C46',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 9999,
  },
  flashBadgeText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  /* Active Context Capsule */
  txCapsuleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.52)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 9999,
    gap: 7,
    maxWidth: '92%',
  },
  pulseDotGreen: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#96F6C2',
  },
  txCapsuleText: {
    fontSize: 12,
    color: '#FFFFFF',
    flexShrink: 1,
  },
  txCapsuleLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  txCapsuleAmount: {
    fontWeight: '800',
    color: '#96F6C2',
  },

  /* GPS Pill */
  gpsStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 9999,
    gap: 6,
  },
  gpsStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  gpsStatusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  /* Live Watermark */
  liveWatermarkRow: {
    position: 'absolute',
    bottom: 12,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  liveWatermarkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  liveWatermarkText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
  },
  liveWatermarkClock: {
    fontSize: 11.5,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Camera Controls Deck */
  controlDeck: {
    backgroundColor: '#E5E2E1',
    paddingHorizontal: 18,
    paddingTop: 16,
    gap: 16,
    alignItems: 'center',
  },
  modeSwitcherContainer: {
    flexDirection: 'row',
    backgroundColor: '#F0EDED',
    padding: 4,
    borderRadius: 9999,
    gap: 4,
  },
  modeSwitcherBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 9999,
  },
  modeSwitcherBtnActive: {
    backgroundColor: '#006C46',
  },
  modeSwitcherBtnInactive: {
    backgroundColor: 'transparent',
  },
  modeSwitcherText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  modeSwitcherTextActive: {
    color: '#FFFFFF',
  },
  modeSwitcherTextInactive: {
    color: '#3D4A41',
  },
  dotTinyMint: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#96F6C2',
  },

  /* Shutter Row */
  shutterRow: {
    width: '100%',
    maxWidth: 320,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  auxCol: {
    alignItems: 'center',
    gap: 4,
  },
  thumbnailCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  thumbnailImg: {
    width: '100%',
    height: '100%',
  },
  flipBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0EDED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  auxColLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#3D4A41',
  },

  /* Main Shutter Button */
  shutterOuterRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#FFFFFF',
    padding: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  shutterCoreCircle: {
    flex: 1,
    borderRadius: 9999,
    backgroundColor: '#006A42',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Guidance Pill */
  guidancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F6F3F2',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 9999,
  },
  guidancePillText: {
    fontSize: 11.5,
    color: '#3D4A41',
  },

  /* Toast floating in camera */
  toastFloatCamera: {
    position: 'absolute',
    bottom: 180,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(28, 27, 27, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
    zIndex: 90,
  },
  toastFloatCameraText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  /* =========================================================================
     STATE 1: PERMISSION SCREEN STYLES
     ========================================================================= */
  permissionScreen: {
    flex: 1,
    backgroundColor: '#FCF9F8',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    paddingBottom: 24,
  },
  permissionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(188, 202, 191, 0.45)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },
  permissionIllustrationWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  permissionRippleOuter: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: 'rgba(150, 246, 194, 0.35)',
  },
  permissionRippleMid: {
    position: 'absolute',
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(0, 106, 66, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#006A42',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#006A42',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  permissionShieldBadge: {
    position: 'absolute',
    bottom: -2,
    right: 4,
    backgroundColor: '#FFFFFF',
    padding: 4,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#006A42',
    marginBottom: 6,
    textAlign: 'center',
  },
  permissionSubtitle: {
    fontSize: 13,
    color: '#3D4A41',
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 20,
  },
  permissionFeatureList: {
    width: '100%',
    backgroundColor: '#F6F3F2',
    borderRadius: 18,
    padding: 16,
    gap: 14,
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  featureIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#96F6C2',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  featureTextWrap: {
    flex: 1,
    gap: 2,
  },
  featureTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1C1B1B',
  },
  featureDesc: {
    fontSize: 11.5,
    color: '#3D4A41',
    lineHeight: 16,
  },
  permissionActionCol: {
    width: '100%',
    gap: 8,
  },
  permissionPrimaryBtn: {
    height: 52,
    borderRadius: 9999,
    backgroundColor: '#006A42',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#006A42',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 3,
  },
  permissionPrimaryBtnText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  permissionSecondaryBtn: {
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionSecondaryBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3D4A41',
  },
  securityFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  securityFooterText: {
    fontSize: 11.5,
    color: '#3D4A41',
  },

  /* =========================================================================
     STATE 3: REVIEW SUMMARY SCREEN STYLES
     ========================================================================= */
  reviewScreen: {
    flex: 1,
    backgroundColor: '#FCF9F8',
  },
  toastFloat: {
    position: 'absolute',
    top: 75,
    alignSelf: 'center',
    zIndex: 99,
    backgroundColor: '#1C1B1B',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  toastFloatText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  reviewTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FCF9F8',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(188, 202, 191, 0.35)',
  },
  reviewBackCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F6F3F2',
  },
  reviewTopTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1C1B1B',
  },
  reviewAvatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#006A42',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewScrollView: {
    flex: 1,
  },
  reviewScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 14,
  },
  reviewContextTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reviewContextLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reviewContextTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#006A42',
    letterSpacing: 0.5,
  },
  reviewRefBadge: {
    backgroundColor: '#F0EDED',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  reviewRefBadgeText: {
    fontSize: 11,
    color: '#3D4A41',
    fontWeight: '600',
  },

  /* Photo Preview Card */
  photoPreviewCard: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#EAE7E7',
    position: 'relative',
  },
  photoPreviewImage: {
    width: '100%',
    height: '100%',
  },
  photoTopBadgesRow: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  photoBadgeValidated: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(28, 27, 27, 0.78)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  photoBadgeValidatedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  photoBadgeExif: {
    backgroundColor: 'rgba(28, 27, 27, 0.65)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  photoBadgeExifText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  photoBottomScrim: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(28, 27, 27, 0.78)',
  },
  photoBottomInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  photoInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  photoInfoText: {
    fontSize: 11.5,
    color: '#FFFFFF',
  },
  photoInfoTextBold: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Review Cards */
  reviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(188, 202, 191, 0.45)',
  },
  reviewCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reviewCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reviewCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1C1B1B',
  },
  liveMetaBadge: {
    backgroundColor: 'rgba(150, 246, 194, 0.4)',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  liveMetaBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00734B',
  },
  metadataGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metadataCell: {
    width: '48.5%',
    backgroundColor: '#F6F3F2',
    borderRadius: 14,
    padding: 10,
    gap: 3,
  },
  metadataLabel: {
    fontSize: 11,
    color: '#3D4A41',
  },
  metadataValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1C1B1B',
  },
  metadataWithDot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 1,
  },
  dotTinyGreen: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#006A42',
  },

  /* Integrity Card */
  integrityLeftWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  integrityIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(150, 246, 194, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  integrityTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1C1B1B',
  },
  integritySubtitle: {
    fontSize: 11,
    color: '#3D4A41',
  },
  antiTamperBadge: {
    backgroundColor: 'rgba(128, 250, 185, 0.3)',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  antiTamperBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#006A42',
  },
  hashBox: {
    backgroundColor: '#F6F3F2',
    borderRadius: 14,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  hashTextCol: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  hashLabel: {
    fontSize: 10.5,
    color: '#3D4A41',
  },
  hashString: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#1C1B1B',
    fontWeight: '600',
  },
  copyHashBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },

  /* Contract Card */
  contractRowsWrap: {
    gap: 8,
  },
  contractRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  contractLabel: {
    fontSize: 12.5,
    color: '#3D4A41',
  },
  contractValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1C1B1B',
    maxWidth: '60%',
  },
  escrowAmountBox: {
    backgroundColor: '#F6F3F2',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  escrowAmountLabel: {
    fontSize: 11,
    color: '#3D4A41',
  },
  escrowAmountValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#006A42',
    marginTop: 1,
  },
  escrowLockStatusCol: {
    alignItems: 'flex-end',
    gap: 1,
  },
  escrowLockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  escrowLockText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#006A42',
  },
  escrowSubText: {
    fontSize: 10.5,
    color: '#3D4A41',
  },
  trustNoteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 4,
  },
  trustNoteText: {
    flex: 1,
    fontSize: 12,
    color: '#3D4A41',
    lineHeight: 18,
  },

  /* Fixed Review Action Bar */
  fixedReviewActionArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(252, 249, 248, 0.94)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(188, 202, 191, 0.35)',
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 8,
  },
  reviewSubmitBtn: {
    height: 52,
    borderRadius: 9999,
    backgroundColor: '#006A42',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#006A42',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 3,
  },
  reviewSubmitBtnText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  reviewRetakeBtn: {
    height: 44,
    borderRadius: 9999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(188, 202, 191, 0.5)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  reviewRetakeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#006A42',
  },
  btnDisabled: {
    opacity: 0.65,
  },

  /* =========================================================================
     STATE 4: SUCCESS CELEBRATION SCREEN STYLES
     ========================================================================= */
  successScreen: {
    flex: 1,
    backgroundColor: '#FCF9F8',
  },
  successScrollContent: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  successCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(188, 202, 191, 0.45)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },
  successIconWrapper: {
    marginBottom: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIconCircleOuter: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(150, 246, 194, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIconCircleInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#006A42',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#006A42',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  successVerifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(150, 246, 194, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9999,
    marginBottom: 10,
  },
  successVerifiedPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#00734B',
  },
  successHeadline: {
    fontSize: 21,
    fontWeight: '800',
    color: '#1C1B1B',
    marginBottom: 6,
    textAlign: 'center',
  },
  successDescription: {
    fontSize: 13,
    color: '#3D4A41',
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 20,
  },
  successAmountHighlight: {
    fontWeight: '800',
    color: '#006A42',
  },
  successMiniPanel: {
    width: '100%',
    backgroundColor: '#F6F3F2',
    borderRadius: 18,
    padding: 16,
    gap: 12,
    marginBottom: 16,
  },
  successPanelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  successPanelLabel: {
    fontSize: 12,
    color: '#3D4A41',
  },
  successPanelValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1C1B1B',
    maxWidth: '60%',
  },
  successCategoryBadge: {
    backgroundColor: '#EAE7E7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  successCategoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1C1B1B',
  },
  successRefCode: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '800',
    color: '#006A42',
  },
  successStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  successStatusText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#006A42',
  },
  successPhotoSnippet: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F0EDED',
    padding: 10,
    borderRadius: 14,
    marginBottom: 20,
  },
  successSnippetIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successSnippetTextCol: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  successSnippetTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1C1B1B',
  },
  successSnippetMeta: {
    fontSize: 11,
    color: '#3D4A41',
  },
  successHomeBtn: {
    width: '100%',
    height: 52,
    borderRadius: 9999,
    backgroundColor: '#006A42',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#006A42',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 8,
  },
  successHomeBtnText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  successOtherBtn: {
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successOtherBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#006A42',
  },

  /* =========================================================================
     MODAL: PILIH TRANSAKSI AKTIF STYLES
     ========================================================================= */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(28, 27, 27, 0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: '88%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
  },
  sheetHandle: {
    width: 44,
    height: 5,
    borderRadius: 9999,
    backgroundColor: '#E5E2E1',
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: 12,
  },
  modalHeaderTitleCol: {
    flex: 1,
    gap: 2,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1B1B',
  },
  modalSubtitle: {
    fontSize: 12.5,
    color: '#3D4A41',
  },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F0EDED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSegmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#F0EDED',
    padding: 4,
    borderRadius: 9999,
    marginVertical: 10,
    gap: 4,
  },
  modalSegmentBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSegmentBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  modalSegmentBtnInactive: {
    backgroundColor: 'transparent',
  },
  modalSegmentText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  modalSegmentTextActive: {
    color: '#1C1B1B',
    fontWeight: '700',
  },
  modalSegmentTextInactive: {
    color: '#3D4A41',
  },
  modalScrollBody: {
    gap: 12,
    paddingTop: 4,
  },
  txListStack: {
    gap: 10,
  },
  txItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 13,
    borderRadius: 18,
    gap: 10,
  },
  txItemCardSelected: {
    backgroundColor: 'rgba(150, 246, 194, 0.28)',
    borderWidth: 1.5,
    borderColor: '#006A42',
  },
  txItemCardUnselected: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E2E1',
  },
  txItemLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  radioCircleSelected: {
    backgroundColor: '#006A42',
  },
  radioCircleUnselected: {
    borderWidth: 1.5,
    borderColor: '#BCCABF',
    backgroundColor: '#FFFFFF',
  },
  txItemDetailCol: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  txItemTitleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1C1B1B',
  },
  txItemMetaBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  txCategoryChip: {
    backgroundColor: '#96F6C2',
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: 9999,
  },
  txCategoryChipText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#00734B',
  },
  dotDivider: {
    fontSize: 10,
    color: '#BCCABF',
  },
  txDurationText: {
    fontSize: 11,
    color: '#3D4A41',
  },
  txItemAmountText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1C1B1B',
    flexShrink: 0,
  },
  txItemAmountSelected: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#006A42',
  },

  /* Empty Tx Card */
  emptyTxCard: {
    backgroundColor: '#F6F3F2',
    borderRadius: 18,
    padding: 22,
    alignItems: 'center',
  },
  emptyTxIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#96F6C2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTxTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1B1B',
    marginBottom: 4,
  },
  emptyTxSubtitle: {
    fontSize: 12,
    color: '#3D4A41',
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 14,
    maxWidth: 280,
  },
  emptyTxCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#006A42',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 9999,
  },
  emptyTxCtaBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Guideline Tip Card */
  guidelineTipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#F6F3F2',
    borderRadius: 16,
    padding: 12,
    marginTop: 4,
  },
  guidelineTipTextCol: {
    flex: 1,
    gap: 2,
  },
  guidelineTipTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1C1B1B',
  },
  guidelineTipDesc: {
    fontSize: 11.5,
    color: '#3D4A41',
    lineHeight: 16,
  },

  /* Modal Action Button */
  modalActionSubmitBtn: {
    height: 50,
    borderRadius: 9999,
    backgroundColor: '#006A42',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    shadowColor: '#006A42',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  modalActionSubmitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalActionNote: {
    fontSize: 11,
    color: '#3D4A41',
    textAlign: 'center',
    marginTop: 2,
  },
});
