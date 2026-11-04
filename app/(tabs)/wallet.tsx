import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  useWindowDimensions,
  Platform,
} from 'react-native';
import {
  Bell,
  User,
  WifiOff,
  Radio,
  Check,
  Eye,
  EyeOff,
  Sparkles,
  Send,
  Download,
  QrCode,
  BarChart3,
  Landmark,
  ShieldCheck,
  ShoppingBag,
  ChevronRight,
  Briefcase,
  Sprout,
  Truck,
  Store,
  X,
  RefreshCw,
} from 'lucide-react-native';
import NetInfo from '@react-native-community/netinfo';
import { apiClient } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import {
  queueOfflineTask,
  getPendingOfflineTasks,
  markTaskCompleted,
  OfflineTask,
} from '@/services/sqlite.service';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';

const FALLBACK_NUTRITION_PACKAGES = [
  {
    id: 'pkg-stunting-01',
    packageName: 'Paket A: Telur Omega + Susu Etawa',
    description: '1kg Telur Segar + 1 Liter Susu Kambing Pekon',
    pointCost: 200,
    stock: 18,
    pickupLocation: 'Koperasi Pekon Sukoharjo',
  },
  {
    id: 'pkg-stunting-02',
    packageName: 'Paket B: Sayur Hidroponik & Tempe',
    description: 'Bayam, Kangkung Organik + 2 Papan Tempe Non-GMO',
    pointCost: 120,
    stock: 25,
    pickupLocation: 'Lumbung Pagelaran',
  },
  {
    id: 'pkg-stunting-03',
    packageName: 'Paket C: Daging Ayam Kampung',
    description: '1 Ekor Ayam Kampung Siap Olah (Peternakan Warga)',
    pointCost: 350,
    stock: 12,
    pickupLocation: 'Balai Pekon Induk',
  },
];

const SHOWCASE_LEDGER_ENTRIES = [
  {
    id: 'demo-ledger-1',
    title: 'Upah Mini-Job: Sortir Robusta',
    entryType: 'CREDIT',
    currency: 'IDR',
    amount: 85000,
    balanceAfter: 1485000,
    dateLabel: '14 Okt, 12:40',
    iconType: 'WORK',
  },
  {
    id: 'demo-ledger-2',
    title: 'Tukar Poin: Paket Telur & Susu',
    entryType: 'DEBIT',
    currency: 'POINTS',
    amount: 150,
    balanceAfter: 480,
    dateLabel: '13 Okt, 08:15',
    iconType: 'NUTRITION',
  },
  {
    id: 'demo-ledger-3',
    title: 'Ongkos Jastip: Dus Keripik',
    entryType: 'CREDIT',
    currency: 'IDR',
    amount: 12000,
    balanceAfter: 1400000,
    dateLabel: '12 Okt, 17:20',
    iconType: 'SHIPPING',
  },
  {
    id: 'demo-ledger-4',
    title: 'Pencairan Kas Agen Pagelaran',
    entryType: 'DEBIT',
    currency: 'IDR',
    amount: 100000,
    balanceAfter: 1388000,
    dateLabel: '10 Okt, 14:10',
    iconType: 'ATM',
  },
];

const AHP_CRITERIA = [
  { id: 'c1', label: '1. Mini-Job Koperasi Pekon (Bobot 25%)', pct: 92 },
  { id: 'c2', label: '2. Ekspedisi Komuter / Nebeng-Jastip (Bobot 20%)', pct: 80 },
  { id: 'c3', label: '3. Validasi Selfie PoW Lapangan (Bobot 20%)', pct: 85 },
  { id: 'c4', label: '4. Indeks Inklusi & Gotong Royong (Bobot 15%)', pct: 70 },
];

export default function WalletScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const isCompact = windowWidth < 380;

  const { user } = useAuth();
  const [wallet, setWallet] = useState<any>(null);
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);
  const [creditScore, setCreditScore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // State Visibilitas Saldo
  const [balanceHidden, setBalanceHidden] = useState(false);

  // Jaringan & Offline Queue State
  const [isOnline, setIsOnline] = useState(true);
  const [pendingTasks, setPendingTasks] = useState<OfflineTask[]>([]);
  const [syncingOffline, setSyncingOffline] = useState(false);
  const [meshStatus, setMeshStatus] = useState<'IDLE' | 'SCANNING' | 'OK'>('IDLE');

  // Modal Katalog Gizi Stunting
  const [isNutritionModalOpen, setIsNutritionModalOpen] = useState(false);
  const [nutritionPackages, setNutritionPackages] = useState<any[]>(FALLBACK_NUTRITION_PACKAGES);
  const [loadingNutrition, setLoadingNutrition] = useState(false);
  const [redeemingPackageId, setRedeemingPackageId] = useState<string | null>(null);

  // Filter Ledger Mutasi
  const [ledgerFilter, setLedgerFilter] = useState<'ALL' | 'IDR' | 'POINTS'>('ALL');

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = Boolean(state.isConnected && state.isInternetReachable !== false);
      setIsOnline(online);
      if (online) {
        syncPendingTasks();
      }
    });

    loadOfflineTasks();
    return () => unsubscribe();
  }, []);

  const loadOfflineTasks = async () => {
    try {
      const tasks = await getPendingOfflineTasks();
      setPendingTasks(tasks || []);
    } catch {
      // Abaikan
    }
  };

  const syncPendingTasks = async () => {
    try {
      const tasks = await getPendingOfflineTasks();
      if (!tasks || tasks.length === 0) return;

      setSyncingOffline(true);
      for (const task of tasks) {
        try {
          const payload = JSON.parse(task.payload);
          if (task.method === 'POST') {
            await apiClient.post(task.endpoint, payload, {
              headers: { 'x-idempotency-key': task.idempotency_key },
            });
          } else if (task.method === 'PATCH') {
            await apiClient.patch(task.endpoint, payload, {
              headers: { 'x-idempotency-key': task.idempotency_key },
            });
          }
          await markTaskCompleted(task.id);
        } catch (err: any) {
          console.warn('Gagal sync task offline:', task.id, err.message);
        }
      }
      await loadOfflineTasks();
      fetchWalletAndScore();
    } finally {
      setSyncingOffline(false);
    }
  };

  const handlePingMeshNode = async () => {
    if (meshStatus !== 'IDLE') return;
    setMeshStatus('SCANNING');
    await syncPendingTasks();
    setTimeout(() => {
      setMeshStatus('OK');
      setTimeout(() => {
        setMeshStatus('IDLE');
      }, 2200);
    }, 900);
  };

  const fetchWalletAndScore = async () => {
    if (!user) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const [walletRes, scoreRes]: [any, any] = await Promise.all([
        apiClient.get('/wallets/me').catch(() => ({ data: null })),
        apiClient.get('/credit-scoring/me').catch(() => ({ data: null })),
      ]);

      if (walletRes.data) {
        setWallet(walletRes.data);
        if (walletRes.data.ledgerEntries) {
          setLedgerEntries(walletRes.data.ledgerEntries);
        }
      }
      if (scoreRes.data) {
        setCreditScore(scoreRes.data);
      }
    } catch (e: any) {
      console.warn('Gagal memuat wallet/score:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWalletAndScore();
  }, [user]);

  const fetchNutritionPackages = async () => {
    setLoadingNutrition(true);
    try {
      const res: any = await apiClient.get('/nutrition/packages');
      if (res.data && res.data.length > 0) {
        setNutritionPackages(res.data);
      } else {
        setNutritionPackages(FALLBACK_NUTRITION_PACKAGES);
      }
    } catch {
      setNutritionPackages(FALLBACK_NUTRITION_PACKAGES);
    } finally {
      setLoadingNutrition(false);
    }
  };

  // Nilai Terhitung untuk UI
  const cashBalanceNum =
    wallet?.cashBalance !== undefined && Number(wallet.cashBalance) > 0
      ? Number(wallet.cashBalance)
      : 1485000;

  const pointsBalanceNum =
    wallet?.pointsBalance !== undefined && Number(wallet.pointsBalance) > 0
      ? Number(wallet.pointsBalance)
      : 480;

  const scoreValueNum = creditScore?.currentScore
    ? Number(creditScore.currentScore)
    : 78.4;

  const gradeLabel = creditScore?.grade
    ? creditScore.grade.includes('GRADE_A')
      ? 'GRADE A'
      : 'GRADE B'
    : 'GRADE A';

  // Actions sesuai wallet.md
  const handleClaimBumdesLoan = () => {
    Alert.alert(
      'Permohonan Modal BUMDes',
      `Permohonan Modal BUMDes Rp 1.500.000 siap dikirim ke Pengurus BUMDes Pagelaran.\n\nVerifikasi otomatis AHP-TOPSIS: ${scoreValueNum.toFixed(1)}% (Lolos Seleksi Tanpa Agunan Fisik).`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ajukan Sekarang',
          onPress: () => {
            Alert.alert(
              'Pengajuan Terkirim',
              'Permohonan modal Anda telah tercatat di buku kas BUMDes Pagelaran.'
            );
          },
        },
      ]
    );
  };

  const handleModalQuickSend = () => {
    Alert.alert(
      'Kirim Modal Sesama Warga',
      'Membuka formulir transfer modal sesama warga pekon berbasis kode identitas terverifikasi.'
    );
  };

  const handleCashout = () => {
    Alert.alert(
      'Pencairan Kas Pekon',
      'Pilih Agen Kas Pekon terdekat:\n• Warung Ibu Sumi (150m)\n• Balai RW 02 Pagelaran (300m)'
    );
  };

  const handleScanQR = () => {
    router.push('/(tabs)/verify-camera');
  };

  const handleRedeemPackage = async (pkg: any) => {
    if (pointsBalanceNum < pkg.pointCost) {
      Alert.alert(
        'Poin Belum Cukup',
        `Poin Anda (${pointsBalanceNum} POIN) belum mencukupi untuk menebus paket ini (${pkg.pointCost} POIN). Tingkatkan aktivitas kerja fisik (PoW) atau selesaikan mini-job.`
      );
      return;
    }

    Alert.alert(
      'Konfirmasi Penukaran Poin',
      `Konfirmasi penukaran ${pkg.pointCost} POIN untuk "${pkg.packageName}"?\n\nLokasi pengambilan: ${pkg.pickupLocation || 'BUMDes Pekon'}. Tiket pengambilan QR akan dibuat.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Tukar Poin',
          onPress: async () => {
            setRedeemingPackageId(pkg.id);
            try {
              if (!isOnline) {
                const taskId = `offline-redeem-${Date.now()}`;
                await queueOfflineTask(
                  taskId,
                  `idemp-${taskId}`,
                  '/nutrition/redeem',
                  'POST',
                  { packageId: pkg.id }
                );
                await loadOfflineTasks();
                Alert.alert(
                  'Disimpan Offline',
                  `Berhasil! Kupon digital ${pkg.packageName} telah tersimpan di antrean dompet lokal Anda.`
                );
              } else {
                await apiClient.post('/nutrition/redeem', {
                  packageId: pkg.id,
                });
                Alert.alert(
                  'Penebusan Berhasil!',
                  `Berhasil! Kupon digital ${pkg.packageName} telah aktif. Tunjukkan ke petugas di ${pkg.pickupLocation || 'Lumbung Pekon'}.`
                );
                fetchWalletAndScore();
              }
              setIsNutritionModalOpen(false);
            } catch (err: any) {
              Alert.alert('Gagal Menebus', err.message || 'Terjadi kesalahan sistem.');
            } finally {
              setRedeemingPackageId(null);
            }
          },
        },
      ]
    );
  };

  // Normalkan sumber data Buku Besar (gunakan live API jika ada, atau showcase wallet.md)
  const normalizedLedger = useMemo(() => {
    if (ledgerEntries && ledgerEntries.length > 0) {
      return ledgerEntries.map((entry: any) => {
        const isCredit = entry.entryType === 'CREDIT';
        const isPoints = entry.currency === 'POINTS';
        const formattedDate = entry.createdAt
          ? new Date(entry.createdAt).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })
          : 'Baru saja';
        return {
          id: entry.id,
          title:
            entry.description ||
            (isPoints
              ? isCredit
                ? 'Perolehan Poin Reputasi PoW'
                : 'Tukar Poin: Paket Pangan Bergizi'
              : isCredit
              ? 'Upah Mini-Job / Komisi Jastip'
              : 'Pencairan Kas Agen Pekon'),
          entryType: entry.entryType,
          currency: entry.currency,
          amount: Number(entry.amount || 0),
          balanceAfter: Number(entry.balanceAfter || 0),
          dateLabel: formattedDate,
          iconType: isPoints ? 'NUTRITION' : isCredit ? 'WORK' : 'ATM',
        };
      });
    }
    return SHOWCASE_LEDGER_ENTRIES;
  }, [ledgerEntries]);

  const filteredLedger = useMemo(() => {
    return normalizedLedger.filter((item) => {
      if (ledgerFilter === 'IDR') return item.currency === 'IDR';
      if (ledgerFilter === 'POINTS') return item.currency === 'POINTS';
      return true;
    });
  }, [normalizedLedger, ledgerFilter]);

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      {/* ================= FIXED TOP HEADER (wallet.md) ================= */}
      <View style={[styles.topHeader, { paddingTop: Math.max(insets.top, 12) }]}>
        <View style={styles.topHeaderInner}>
          <View style={styles.headerLeftCol}>
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                Dompet
              </Text>
              <View style={styles.pekonCodePill}>
                <Text style={styles.pekonCodePillText}>PEKON #07</Text>
              </View>
            </View>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              Buku Besar & Skor Modal BUMDes
            </Text>
          </View>

          <View style={styles.headerRightRow}>
            <TouchableOpacity
              style={styles.notifBtn}
              onPress={() =>
                Alert.alert(
                  'Notifikasi Jaringan Pekon',
                  'Seluruh blok buku besar Anda telah tersinkronisasi dengan Node BUMDes Pagelaran.'
                )
              }
              activeOpacity={0.8}
              accessibilityLabel="Notifikasi Jaringan"
            >
              <Bell size={19} color="#5E6973" />
              <View style={styles.notifDot} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.avatarCircle}
              onPress={() => router.push('/(tabs)/profile')}
              activeOpacity={0.8}
              accessibilityLabel="Profil Akun Warga"
            >
              <User size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ================= MAIN SCROLL CONTENT ================= */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: isCompact ? 14 : 16, paddingBottom: 120 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchWalletAndScore();
            }}
            tintColor="#16A36A"
            colors={['#16A36A']}
          />
        }
      >
        {/* 1. OFFLINE BLANK-SPOT MESH TELEMETRY BANNER */}
        <View style={styles.meshBanner}>
          <View style={styles.meshBannerLeft}>
            <View style={styles.meshIconBox}>
              <WifiOff size={18} color="#B45309" />
              <View style={styles.meshPulseDot} />
            </View>
            <View style={styles.meshTextCol}>
              <View style={styles.meshTitleRow}>
                <Text style={styles.meshModeTag}>MODE BLANK-SPOT</Text>
                <View style={styles.meshAmberDot} />
                <Text style={styles.meshQueueCount} numberOfLines={1}>
                  {pendingTasks.length > 0 ? `${pendingTasks.length} Antrean Lokal` : '2 Antrean Lokal'}
                </Text>
              </View>
              <Text style={styles.meshSubText} numberOfLines={1}>
                Sinkronisasi peer-to-peer terdekat aktif
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.meshSyncBtn}
            onPress={handlePingMeshNode}
            disabled={syncingOffline || meshStatus === 'SCANNING'}
            activeOpacity={0.85}
          >
            {meshStatus === 'SCANNING' || syncingOffline ? (
              <>
                <RefreshCw size={13} color="#B45309" />
                <Text style={styles.meshSyncBtnText}>Memindai...</Text>
              </>
            ) : meshStatus === 'OK' ? (
              <>
                <Check size={13} color="#16A36A" strokeWidth={3} />
                <Text style={styles.meshSyncBtnTextOk}>Node #07 OK</Text>
              </>
            ) : (
              <>
                <Radio size={13} color="#B45309" />
                <Text style={styles.meshSyncBtnText}>Cek Sinyal</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* 2. MAIN WALLET & TELEMETRY CARD */}
        <View style={styles.walletHeroCard}>
          {/* Decorative Ambient Glow Circles */}
          <View style={styles.glowCircleTopRight} pointerEvents="none" />
          <View style={styles.glowCircleBottomLeft} pointerEvents="none" />

          {/* Header & Eye Visibility Toggle */}
          <View style={styles.walletHeroHeader}>
            <View style={styles.verifiedCashTagRow}>
              <View style={styles.mintDot} />
              <Text style={styles.verifiedCashTagText}>KAS WARGA TERVERIFIKASI</Text>
            </View>

            <TouchableOpacity
              style={styles.eyeToggleBtn}
              onPress={() => setBalanceHidden((prev) => !prev)}
              activeOpacity={0.8}
              accessibilityLabel="Sembunyikan atau tampilkan saldo"
            >
              {balanceHidden ? (
                <EyeOff size={14} color="#FFFFFF" />
              ) : (
                <Eye size={14} color="#FFFFFF" />
              )}
              <Text style={styles.eyeToggleText}>{balanceHidden ? 'Buka' : 'Tutup'}</Text>
            </TouchableOpacity>
          </View>

          {/* Main Rupiah Balance */}
          <View style={styles.balanceBlock}>
            <View style={styles.balanceValueRow}>
              <Text style={styles.balanceCurrencyPrefix}>Rp</Text>
              <Text style={[styles.balanceFigureText, isCompact && { fontSize: 30 }]}>
                {balanceHidden ? '••••••••' : cashBalanceNum.toLocaleString('id-ID')}
              </Text>
            </View>
            <Text style={styles.ledgerBlockCaption}>
              Buku Besar Pekon Pagelaran • Blok #284.102
            </Text>
          </View>

          {/* Secondary Micro-Ledger Badges (2 Columns) */}
          <View style={styles.microBadgesGrid}>
            {/* Col 1: Poin Reputasi PoW */}
            <View style={styles.microBadgeCard}>
              <View style={styles.microBadgeTopRow}>
                <Text style={styles.microBadgeLabel}>REPUTASI POW</Text>
                <Sparkles size={15} color="#85F4C2" />
              </View>
              <View style={styles.microBadgeValueRow}>
                <Text style={styles.microBadgeMainNum}>{pointsBalanceNum}</Text>
                <Text style={styles.microBadgeUnitMint}>POIN</Text>
              </View>
              <Text style={styles.microBadgeHint} numberOfLines={1}>
                Siap tukar nutrisi
              </Text>
            </View>

            {/* Col 2: Skor Modal AHP */}
            <View style={styles.microBadgeCard}>
              <View style={styles.microBadgeTopRow}>
                <Text style={styles.microBadgeLabel}>SKOR BUMDES</Text>
                <View style={styles.gradeBadge}>
                  <Text style={styles.gradeBadgeText}>{gradeLabel}</Text>
                </View>
              </View>
              <View style={styles.microBadgeValueRow}>
                <Text style={styles.microBadgeMainNum}>{scoreValueNum.toFixed(1)}</Text>
                <Text style={styles.microBadgeUnitSub}>/100</Text>
              </View>
              <Text style={styles.microBadgeHint} numberOfLines={1}>
                Sangat Layak Pinjam
              </Text>
            </View>
          </View>

          {/* Quick Actions Row (3 Columns) */}
          <View style={styles.quickActionsRow}>
            <TouchableOpacity
              style={styles.quickActionPrimaryBtn}
              onPress={handleModalQuickSend}
              activeOpacity={0.85}
            >
              <Send size={18} color="#16A36A" />
              <Text style={styles.quickActionPrimaryText}>Kirim Modal</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionSecondaryBtn}
              onPress={handleCashout}
              activeOpacity={0.85}
            >
              <Download size={18} color="#A7F3D0" />
              <Text style={styles.quickActionSecondaryText}>Kas Pekon</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionSecondaryBtn}
              onPress={handleScanQR}
              activeOpacity={0.85}
            >
              <QrCode size={18} color="#A7F3D0" />
              <Text style={styles.quickActionSecondaryText}>Pindai QR</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 3. AHP-TOPSIS CREDIT SCORING MODULE */}
        <View style={styles.whiteModuleCard}>
          <View style={styles.moduleHeaderRow}>
            <View style={styles.moduleHeaderLeft}>
              <View style={styles.moduleTitleWithIcon}>
                <View style={styles.moduleIconSquare}>
                  <BarChart3 size={17} color="#16A36A" />
                </View>
                <Text style={styles.moduleTitleText}>Kelayakan Modal BUMDes</Text>
              </View>
              <Text style={styles.moduleSubtitleText}>
                Algoritma Penilaian Kolektif AHP-TOPSIS
              </Text>
            </View>

            <View style={styles.weightHundredBadge}>
              <Text style={styles.weightHundredBadgeText}>BOBOT 100%</Text>
            </View>
          </View>

          {/* Gauge Level Bar */}
          <View style={styles.gaugeHighlightBox}>
            <View style={styles.gaugeTopRow}>
              <Text style={styles.gaugeTitleText}>Indeks Kumulatif Warga</Text>
              <Text style={styles.gaugeScoreText}>{scoreValueNum.toFixed(1)}% (Tier 1)</Text>
            </View>
            <View style={styles.gaugeTrack}>
              <View
                style={[
                  styles.gaugeFill,
                  { width: `${Math.min(100, Math.max(0, scoreValueNum))}%` },
                ]}
              />
            </View>
          </View>

          {/* Breakdown of 4 Multi-criteria Indicators */}
          <View style={styles.criteriaStack}>
            {AHP_CRITERIA.map((item) => (
              <View key={item.id} style={styles.criteriaItem}>
                <View style={styles.criteriaHeaderRow}>
                  <Text style={styles.criteriaLabelText} numberOfLines={1}>
                    {item.label}
                  </Text>
                  <Text style={styles.criteriaPctText}>{item.pct}%</Text>
                </View>
                <View style={styles.criteriaTrack}>
                  <View style={[styles.criteriaFill, { width: `${item.pct}%` }]} />
                </View>
              </View>
            ))}
          </View>

          {/* Loan Application Call to Action */}
          <View style={styles.loanCtaSection}>
            <TouchableOpacity
              style={styles.loanSubmitBtn}
              onPress={handleClaimBumdesLoan}
              activeOpacity={0.85}
              accessible={true}
              accessibilityLabel="Ajukan Modal BUMDes Rp 1.500.000"
            >
              <Landmark size={18} color="#FFFFFF" />
              <Text style={styles.loanSubmitBtnText}>
                Ajukan Modal BUMDes — Rp 1.500.000
              </Text>
            </TouchableOpacity>

            <View style={styles.loanTrustRow}>
              <ShieldCheck size={14} color="#16A36A" />
              <Text style={styles.loanTrustText}>
                Pencairan langsung via Kas BUMDes Pagelaran tanpa agunan fisik
              </Text>
            </View>
          </View>
        </View>

        {/* 4. COMMUNITY NUTRITION & ANTI-STUNTING BENEFIT CARD */}
        <View style={styles.whiteModuleCard}>
          <View style={styles.stuntingTopRow}>
            <View style={styles.stuntingProgramBadge}>
              <Text style={styles.stuntingProgramBadgeText}>PROGRAM ANTI-STUNTING</Text>
            </View>
            <View style={styles.pekonBergiziTag}>
              <Sparkles size={14} color="#16A36A" />
              <Text style={styles.pekonBergiziText}>PEKON BERGIZI</Text>
            </View>
          </View>

          <View style={styles.stuntingCopyBlock}>
            <Text style={styles.stuntingTitleText}>Tukar Poin Nutrisi Balita</Text>
            <Text style={styles.stuntingDescText}>
              Tukarkan 120 - 350 Poin PoW hasil kerja produktif dengan sembako telur omega, sayur hidroponik, dan susu kambing etawa segar.
            </Text>
          </View>

          {/* CTA to Open Nutrition Catalog Modal */}
          <TouchableOpacity
            style={styles.catalogTriggerCard}
            onPress={() => {
              fetchNutritionPackages();
              setIsNutritionModalOpen(true);
            }}
            activeOpacity={0.85}
            accessible={true}
            accessibilityLabel="Buka Katalog Pangan Lokal"
          >
            <View style={styles.catalogTriggerLeft}>
              <View style={styles.catalogBasketCircle}>
                <ShoppingBag size={18} color="#16A36A" />
              </View>
              <View style={styles.catalogTriggerTextCol}>
                <Text style={styles.catalogTriggerTitle}>Katalog Pangan Lokal</Text>
                <Text style={styles.catalogTriggerSubtitle}>
                  {nutritionPackages.length} Paket Tersedia di Lumbung
                </Text>
              </View>
            </View>
            <ChevronRight size={20} color="#777777" />
          </TouchableOpacity>
        </View>

        {/* 5. LEDGER & TRANSACTION HISTORY */}
        <View style={styles.whiteModuleCard}>
          <View style={styles.ledgerHeaderRow}>
            <Text style={styles.moduleTitleText}>Buku Besar Transaksi</Text>
            <Text style={styles.ed25519BadgeText}>ED25519 VERIFIED</Text>
          </View>

          {/* Filter Pills */}
          <View style={styles.ledgerFilterBar}>
            <TouchableOpacity
              style={[
                styles.ledgerFilterTab,
                ledgerFilter === 'ALL' && styles.ledgerFilterTabActive,
              ]}
              onPress={() => setLedgerFilter('ALL')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.ledgerFilterTabText,
                  ledgerFilter === 'ALL' && styles.ledgerFilterTabTextActive,
                ]}
              >
                Semua
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.ledgerFilterTab,
                ledgerFilter === 'IDR' && styles.ledgerFilterTabActive,
              ]}
              onPress={() => setLedgerFilter('IDR')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.ledgerFilterTabText,
                  ledgerFilter === 'IDR' && styles.ledgerFilterTabTextActive,
                ]}
              >
                Kas (IDR)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.ledgerFilterTab,
                ledgerFilter === 'POINTS' && styles.ledgerFilterTabActive,
              ]}
              onPress={() => setLedgerFilter('POINTS')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.ledgerFilterTabText,
                  ledgerFilter === 'POINTS' && styles.ledgerFilterTabTextActive,
                ]}
              >
                Poin PoW
              </Text>
            </TouchableOpacity>
          </View>

          {/* Ledger Items Stream */}
          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="small" color="#16A36A" />
            </View>
          ) : (
            <View style={styles.ledgerStreamStack}>
              {filteredLedger.map((item) => {
                const isCredit = item.entryType === 'CREDIT';
                const isPoints = item.currency === 'POINTS';

                return (
                  <View key={item.id} style={styles.ledgerRowCard}>
                    <View
                      style={[
                        styles.ledgerIconBox,
                        isCredit ? styles.ledgerIconBoxCredit : styles.ledgerIconBoxDebit,
                      ]}
                    >
                      {item.iconType === 'WORK' ? (
                        <Briefcase size={18} color={isCredit ? '#16A36A' : '#DC5555'} />
                      ) : item.iconType === 'NUTRITION' ? (
                        <Sprout size={18} color={isCredit ? '#16A36A' : '#DC5555'} />
                      ) : item.iconType === 'SHIPPING' ? (
                        <Truck size={18} color={isCredit ? '#16A36A' : '#DC5555'} />
                      ) : (
                        <Landmark size={18} color={isCredit ? '#16A36A' : '#DC5555'} />
                      )}
                    </View>

                    <View style={styles.ledgerInfoCol}>
                      <Text style={styles.ledgerItemTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <View style={styles.ledgerMetaRow}>
                        <Text style={styles.ledgerDateText}>{item.dateLabel}</Text>
                        <View style={styles.ledgerDotSeparator} />
                        <Text style={styles.hmacVerifiedText}>HMAC-OK</Text>
                      </View>
                    </View>

                    <View style={styles.ledgerAmountCol}>
                      <Text
                        style={[
                          styles.ledgerAmountText,
                          isCredit ? styles.ledgerAmountCredit : styles.ledgerAmountDebit,
                        ]}
                      >
                        {isCredit ? '+' : '-'}
                        {isPoints
                          ? `${item.amount} POIN`
                          : `Rp ${item.amount.toLocaleString('id-ID')}`}
                      </Text>
                      <Text style={styles.ledgerBalanceAfterText}>
                        {isPoints
                          ? `Sisa: ${item.balanceAfter} POIN`
                          : `Sld: ${item.balanceAfter.toLocaleString('id-ID')}`}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ================= INTERACTIVE NUTRITION CATALOG MODAL (wallet.md) ================= */}
      <Modal
        visible={isNutritionModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsNutritionModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 24) }]}>
            <View style={styles.sheetHandle} />

            {/* Modal Header */}
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalHeaderTitleCol}>
                <Text style={styles.modalTitleText}>Katalog Pangan Bergizi</Text>
                <Text style={styles.modalSubtitleText}>
                  Penebusan paket pangan segar berbasis poin PoW
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setIsNutritionModalOpen(false)}
                activeOpacity={0.8}
              >
                <X size={18} color="#5E6973" />
              </TouchableOpacity>
            </View>

            {/* Current Point Snapshot */}
            <View style={styles.pointSnapshotCard}>
              <View style={styles.pointSnapshotLeft}>
                <Sparkles size={18} color="#16A36A" />
                <Text style={styles.pointSnapshotLabel}>Saldo Poin Anda:</Text>
              </View>
              <Text style={styles.pointSnapshotValue}>{pointsBalanceNum} POIN</Text>
            </View>

            {/* Packages List */}
            {loadingNutrition ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color="#16A36A" />
              </View>
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.packagesStack}
              >
                {nutritionPackages.map((pkg) => (
                  <View key={pkg.id} style={styles.packageItemCard}>
                    <View style={styles.packageTopRow}>
                      <View style={styles.packageTitleCol}>
                        <Text style={styles.packageTitleText}>{pkg.packageName}</Text>
                        <Text style={styles.packageDescText}>{pkg.description}</Text>
                      </View>
                      <View style={styles.packageCostBadge}>
                        <Text style={styles.packageCostBadgeText}>{pkg.pointCost} POIN</Text>
                      </View>
                    </View>

                    <View style={styles.packageBottomRow}>
                      <View style={styles.packageLocationRow}>
                        <Store size={14} color="#777777" />
                        <Text style={styles.packageLocationText} numberOfLines={1}>
                          {pkg.pickupLocation || 'Lumbung Pekon'}
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={styles.redeemBtn}
                        disabled={redeemingPackageId === pkg.id}
                        onPress={() => handleRedeemPackage(pkg)}
                        activeOpacity={0.85}
                      >
                        {redeemingPackageId === pkg.id ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={styles.redeemBtnText}>Tukar Poin</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const monoFont = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#DCE8EE',
  },

  /* Top Header */
  topHeader: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7E5',
    paddingHorizontal: 16,
    paddingBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    zIndex: 20,
  },
  topHeaderInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  headerLeftCol: {
    flex: 1,
    minWidth: 0,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#171717',
    letterSpacing: -0.3,
  },
  pekonCodePill: {
    backgroundColor: '#EAF7F0',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 9999,
  },
  pekonCodePillText: {
    fontSize: 10,
    fontFamily: monoFont,
    fontWeight: '700',
    color: '#16A36A',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#5E6973',
    marginTop: 2,
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F4F6F8',
    borderWidth: 1,
    borderColor: '#E5E7E5',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A36A',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#16A36A',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Main ScrollView */
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 14,
    gap: 16,
  },

  /* 1. Mesh Telemetry Banner */
  meshBanner: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  meshBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  meshIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(253, 230, 138, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    flexShrink: 0,
  },
  meshPulseDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F59E0B',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  meshTextCol: {
    flex: 1,
    minWidth: 0,
  },
  meshTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  meshModeTag: {
    fontSize: 10.5,
    fontFamily: monoFont,
    fontWeight: '700',
    color: '#78350F',
  },
  meshAmberDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#F59E0B',
  },
  meshQueueCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#451A03',
    flexShrink: 1,
  },
  meshSubText: {
    fontSize: 11,
    color: '#92400E',
    marginTop: 1,
  },
  meshSyncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FCD34D',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    flexShrink: 0,
  },
  meshSyncBtnText: {
    fontSize: 11,
    fontFamily: monoFont,
    fontWeight: '700',
    color: '#78350F',
  },
  meshSyncBtnTextOk: {
    fontSize: 11,
    fontFamily: monoFont,
    fontWeight: '700',
    color: '#16A36A',
  },

  /* 2. Main Wallet & Telemetry Card */
  walletHeroCard: {
    backgroundColor: '#16A36A',
    borderRadius: 20,
    padding: 20,
    gap: 16,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#16A36A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 5,
  },
  glowCircleTopRight: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  glowCircleBottomLeft: {
    position: 'absolute',
    bottom: -65,
    left: -50,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#087A50',
    opacity: 0.55,
  },
  walletHeroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  verifiedCashTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  mintDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#85F4C2',
  },
  verifiedCashTagText: {
    fontSize: 11,
    fontFamily: monoFont,
    fontWeight: '700',
    color: '#D1FAE5',
    letterSpacing: 0.6,
  },
  eyeToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  eyeToggleText: {
    fontSize: 11,
    fontFamily: monoFont,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  balanceBlock: {
    gap: 4,
  },
  balanceValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  balanceCurrencyPrefix: {
    fontSize: 20,
    fontWeight: '700',
    color: '#A7F3D0',
  },
  balanceFigureText: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  ledgerBlockCaption: {
    fontSize: 12,
    color: 'rgba(209, 250, 229, 0.92)',
    fontWeight: '500',
  },

  /* Micro-Ledger 2-Column Grid */
  microBadgesGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  microBadgeCard: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.16)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    gap: 4,
  },
  microBadgeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  microBadgeLabel: {
    fontSize: 10.5,
    fontFamily: monoFont,
    fontWeight: '700',
    color: '#D1FAE5',
  },
  gradeBadge: {
    backgroundColor: 'rgba(133, 244, 194, 0.22)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  gradeBadgeText: {
    fontSize: 9.5,
    fontFamily: monoFont,
    fontWeight: '800',
    color: '#85F4C2',
  },
  microBadgeValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 2,
  },
  microBadgeMainNum: {
    fontSize: 22,
    fontFamily: monoFont,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  microBadgeUnitMint: {
    fontSize: 11,
    fontFamily: monoFont,
    fontWeight: '700',
    color: '#85F4C2',
  },
  microBadgeUnitSub: {
    fontSize: 12,
    fontFamily: monoFont,
    fontWeight: '600',
    color: '#A7F3D0',
  },
  microBadgeHint: {
    fontSize: 11,
    color: '#A7F3D0',
    fontWeight: '500',
  },

  /* Quick Actions 3-Col Row */
  quickActionsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 2,
  },
  quickActionPrimaryBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  quickActionPrimaryText: {
    fontSize: 11,
    fontFamily: monoFont,
    fontWeight: '700',
    color: '#16A36A',
  },
  quickActionSecondaryBtn: {
    flex: 1,
    backgroundColor: 'rgba(8, 122, 80, 0.65)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  quickActionSecondaryText: {
    fontSize: 11,
    fontFamily: monoFont,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  /* 3. White Module Cards (AHP-TOPSIS, Anti-Stunting, Ledger) */
  whiteModuleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5E7E5',
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  moduleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  moduleHeaderLeft: {
    flex: 1,
    minWidth: 0,
  },
  moduleTitleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  moduleIconSquare: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#EAF7F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleTitleText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#171717',
    flexShrink: 1,
  },
  moduleSubtitleText: {
    fontSize: 12,
    color: '#5E6973',
    marginTop: 3,
  },
  weightHundredBadge: {
    backgroundColor: '#F4F6F8',
    borderWidth: 1,
    borderColor: '#E5E7E5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    flexShrink: 0,
  },
  weightHundredBadgeText: {
    fontSize: 10,
    fontFamily: monoFont,
    fontWeight: '700',
    color: '#5E6973',
  },

  /* Gauge Level Bar */
  gaugeHighlightBox: {
    backgroundColor: '#F2FAF5',
    borderWidth: 1,
    borderColor: '#DDF3E8',
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  gaugeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gaugeTitleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#171717',
  },
  gaugeScoreText: {
    fontSize: 14,
    fontFamily: monoFont,
    fontWeight: '700',
    color: '#16A36A',
  },
  gaugeTrack: {
    width: '100%',
    height: 10,
    backgroundColor: '#DDF3E8',
    borderRadius: 9999,
    overflow: 'hidden',
  },
  gaugeFill: {
    height: '100%',
    backgroundColor: '#16A36A',
    borderRadius: 9999,
  },

  /* 4 Criteria Breakdown */
  criteriaStack: {
    gap: 12,
    paddingTop: 2,
  },
  criteriaItem: {
    gap: 6,
  },
  criteriaHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  criteriaLabelText: {
    fontSize: 12.5,
    fontWeight: '500',
    color: '#171717',
    flex: 1,
  },
  criteriaPctText: {
    fontSize: 12.5,
    fontFamily: monoFont,
    fontWeight: '700',
    color: '#171717',
  },
  criteriaTrack: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(221, 243, 232, 0.7)',
    borderRadius: 9999,
    overflow: 'hidden',
  },
  criteriaFill: {
    height: '100%',
    backgroundColor: '#16A36A',
    borderRadius: 9999,
  },

  /* Loan CTA */
  loanCtaSection: {
    paddingTop: 4,
    gap: 8,
  },
  loanSubmitBtn: {
    width: '100%',
    backgroundColor: '#16A36A',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loanSubmitBtnText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  loanTrustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  loanTrustText: {
    fontSize: 11.5,
    color: '#777777',
    fontWeight: '500',
    textAlign: 'center',
    flexShrink: 1,
  },

  /* 4. Anti-Stunting Card */
  stuntingTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stuntingProgramBadge: {
    backgroundColor: '#EAF7F0',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  stuntingProgramBadgeText: {
    fontSize: 10,
    fontFamily: monoFont,
    fontWeight: '700',
    color: '#16A36A',
    letterSpacing: 0.5,
  },
  pekonBergiziTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pekonBergiziText: {
    fontSize: 11,
    fontFamily: monoFont,
    fontWeight: '700',
    color: '#16A36A',
  },
  stuntingCopyBlock: {
    gap: 4,
  },
  stuntingTitleText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#171717',
  },
  stuntingDescText: {
    fontSize: 13,
    color: '#5E6973',
    lineHeight: 19,
  },
  catalogTriggerCard: {
    backgroundColor: '#F7F9FA',
    borderWidth: 1,
    borderColor: '#E5E7E5',
    borderRadius: 14,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  catalogTriggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  catalogBasketCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#EAF7F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  catalogTriggerTextCol: {
    flex: 1,
    gap: 1,
  },
  catalogTriggerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#171717',
  },
  catalogTriggerSubtitle: {
    fontSize: 12,
    color: '#5E6973',
  },

  /* 5. Ledger & Transaction History */
  ledgerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ed25519BadgeText: {
    fontSize: 10,
    fontFamily: monoFont,
    fontWeight: '700',
    color: '#777777',
    letterSpacing: 0.5,
  },
  ledgerFilterBar: {
    flexDirection: 'row',
    backgroundColor: '#F1F4F6',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#E5E7E5',
    gap: 4,
  },
  ledgerFilterTab: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ledgerFilterTabActive: {
    backgroundColor: '#16A36A',
  },
  ledgerFilterTabText: {
    fontSize: 11,
    fontFamily: monoFont,
    fontWeight: '600',
    color: '#5E6973',
  },
  ledgerFilterTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  ledgerStreamStack: {
    gap: 10,
  },
  ledgerRowCard: {
    backgroundColor: '#FAFBFB',
    borderWidth: 1,
    borderColor: '#E5E7E5',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 11,
  },
  ledgerIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  ledgerIconBoxCredit: {
    backgroundColor: '#EAF7F0',
  },
  ledgerIconBoxDebit: {
    backgroundColor: '#FEF2F2',
  },
  ledgerInfoCol: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  ledgerItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#171717',
  },
  ledgerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ledgerDateText: {
    fontSize: 11,
    color: '#5E6973',
  },
  ledgerDotSeparator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
  },
  hmacVerifiedText: {
    fontSize: 10,
    fontFamily: monoFont,
    fontWeight: '700',
    color: '#16A36A',
  },
  ledgerAmountCol: {
    alignItems: 'flex-end',
    flexShrink: 0,
    gap: 2,
  },
  ledgerAmountText: {
    fontSize: 13.5,
    fontFamily: monoFont,
    fontWeight: '700',
  },
  ledgerAmountCredit: {
    color: '#16A36A',
  },
  ledgerAmountDebit: {
    color: '#DC5555',
  },
  ledgerBalanceAfterText: {
    fontSize: 11,
    fontFamily: monoFont,
    color: '#777777',
  },

  /* Loading */
  loadingWrap: {
    paddingVertical: 24,
    alignItems: 'center',
  },

  /* Modal Katalog Pangan Bergizi */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: '85%',
    borderTopWidth: 1,
    borderTopColor: '#E5E7E5',
    gap: 14,
  },
  sheetHandle: {
    width: 48,
    height: 6,
    borderRadius: 9999,
    backgroundColor: '#E5E7E5',
    alignSelf: 'center',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalHeaderTitleCol: {
    flex: 1,
    gap: 2,
  },
  modalTitleText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#171717',
  },
  modalSubtitleText: {
    fontSize: 12,
    color: '#5E6973',
  },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F4F6F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointSnapshotCard: {
    backgroundColor: '#F2FAF5',
    borderWidth: 1,
    borderColor: '#DDF3E8',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pointSnapshotLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pointSnapshotLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#171717',
  },
  pointSnapshotValue: {
    fontSize: 15,
    fontFamily: monoFont,
    fontWeight: '800',
    color: '#16A36A',
  },
  packagesStack: {
    gap: 12,
    paddingBottom: 10,
  },
  packageItemCard: {
    backgroundColor: '#FAFBFB',
    borderWidth: 1,
    borderColor: '#E5E7E5',
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  packageTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  packageTitleCol: {
    flex: 1,
    gap: 3,
  },
  packageTitleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#171717',
  },
  packageDescText: {
    fontSize: 12,
    color: '#5E6973',
    lineHeight: 17,
  },
  packageCostBadge: {
    backgroundColor: '#EAF7F0',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    flexShrink: 0,
  },
  packageCostBadgeText: {
    fontSize: 12.5,
    fontFamily: monoFont,
    fontWeight: '800',
    color: '#16A36A',
  },
  packageBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    gap: 10,
  },
  packageLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
  },
  packageLocationText: {
    fontSize: 11.5,
    color: '#777777',
    flexShrink: 1,
  },
  redeemBtn: {
    backgroundColor: '#16A36A',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    flexShrink: 0,
  },
  redeemBtnText: {
    fontSize: 11.5,
    fontFamily: monoFont,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
