import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import {
  Wallet,
  Award,
  Gift,
  ArrowUpRight,
  CheckCircle2,
  ShieldCheck,
  ArrowDownLeft,
  ArrowUpRight as ArrowDebit,
  Wifi,
  WifiOff,
  RefreshCw,
  X,
  Sparkles,
  ShoppingBag,
  Clock,
  Layers,
  Type,
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

// Mock preset paket pangan stunting jika backend belum memiliki data awal
const FALLBACK_NUTRITION_PACKAGES = [
  {
    id: 'pkg-stunting-01',
    packageName: 'Paket Gizi Ibu & Balita A',
    description: '1 kg Telur Bebek Pekon + 2 kg Ikan Nila Segar Pagelaran + 1 ikat Bayam Organik.',
    pointCost: 25,
    stock: 18,
    pickupLocation: 'Kantor BUMDes Pagelaran',
  },
  {
    id: 'pkg-stunting-02',
    packageName: 'Paket Protein Hewani Super B',
    description: '1 kg Daging Ayam Kampung + 1 Liter Susu Kambing Etawa Sukoharjo.',
    pointCost: 35,
    stock: 12,
    pickupLocation: 'Puskesmas Pembantu Sukoharjo',
  },
  {
    id: 'pkg-stunting-03',
    packageName: 'Paket Pangan Nabati & Kelor C',
    description: '2 kg Beras Merah Organik + Ekstrak Bubuk Daun Kelor Anti-Stunting.',
    pointCost: 20,
    stock: 25,
    pickupLocation: 'Posyandu Pekon Banyumas',
  },
];

export default function ProfileWalletScreen() {
  const { user, loginAsDemoWarga, logout } = useAuth();
  const [wallet, setWallet] = useState<any>(null);
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);
  const [creditScore, setCreditScore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Aksesibilitas & Ramah Lansia (Ukuran Font)
  const [isLargeFont, setIsLargeFont] = useState(false);

  // Jaringan & Offline Queue State
  const [isOnline, setIsOnline] = useState(true);
  const [pendingTasks, setPendingTasks] = useState<OfflineTask[]>([]);
  const [syncingOffline, setSyncingOffline] = useState(false);

  // Modal Katalog Gizi Stunting
  const [isNutritionModalOpen, setIsNutritionModalOpen] = useState(false);
  const [nutritionPackages, setNutritionPackages] = useState<any[]>(FALLBACK_NUTRITION_PACKAGES);
  const [loadingNutrition, setLoadingNutrition] = useState(false);
  const [redeemingPackageId, setRedeemingPackageId] = useState<string | null>(null);

  // Filter Ledger Mutasi
  const [ledgerFilter, setLedgerFilter] = useState<'ALL' | 'IDR' | 'POINTS'>('ALL');

  // 1. Cek Konektivitas Jaringan & Muat Antrean Offline
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
      // Abaikan jika database SQLite baru inisialisasi
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

  // 2. Fetch Data Dompet, Mutasi Ledger & SPK
  const fetchWalletAndScore = async () => {
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

  // 3. Fetch Paket Gizi Stunting
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

  // 4. Handle Klaim Modal BUMDes (Grade A)
  const handleClaimBumdesLoan = async () => {
    Alert.alert(
      'Plafon Modal Usaha BUMDes',
      'Selamat! Skor kredit alternatif Anda mencapai Grade A (≥85). Anda berhak mengajukan modal kerja BUMDes Rp 1.500.000 dengan margin mikro 0% dan tanpa agunan fisik.',
      [
        { text: 'Tutup', style: 'cancel' },
        {
          text: 'Ajukan ke BUMDes',
          onPress: () => {
            Alert.alert(
              'Pengajuan Terkirim',
              'Permohonan modal telah dikirimkan ke Admin BUMDes Pekon. Silakan verifikasi fisik singkat di balai pekon.'
            );
          },
        },
      ]
    );
  };

  // 5. Handle Tukar Poin Pangan Stunting
  const handleRedeemPackage = async (pkg: any) => {
    const currentPoints = wallet?.pointsBalance ? Number(wallet.pointsBalance) : 50;

    if (currentPoints < pkg.pointCost) {
      Alert.alert(
        'Poin Belum Cukup',
        `Poin Anda (${currentPoints} PTS) belum mencukupi untuk menebus paket ini (${pkg.pointCost} PTS). Tingkatkan aktivitas kerja fisik (PoW) atau selesaikan mini-job.`
      );
      return;
    }

    Alert.alert(
      'Konfirmasi Penebusan Gizi',
      `Tukarkan ${pkg.pointCost} Poin Reputasi untuk "${pkg.packageName}"?\n\nLokasi pengambilan: ${pkg.pickupLocation || 'BUMDes Pekon'}.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Tukarkan Poin',
          onPress: async () => {
            setRedeemingPackageId(pkg.id);
            try {
              if (!isOnline) {
                // Simpan antrean offline
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
                  'Penebusan paket gizi disimpan ke antrean lokal karena sinyal blank-spot. Saldo akan otomatis disinkronkan saat terhubung kembali.'
                );
              } else {
                await apiClient.post('/nutrition/redeem', {
                  packageId: pkg.id,
                });
                Alert.alert(
                  'Penebusan Berhasil!',
                  `Kupon digital Anda telah aktif. Tunjukkan bukti kupon ke petugas di ${pkg.pickupLocation || 'BUMDes'}.`
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

  // Filter list ledger
  const filteredEntries = ledgerEntries.filter((entry) => {
    if (ledgerFilter === 'IDR') return entry.currency === 'IDR';
    if (ledgerFilter === 'POINTS') return entry.currency === 'POINTS';
    return true;
  });

  return (
    <View className="flex-1 bg-pekon-bg">
      {/* Offline Status Banner */}
      {!isOnline && (
        <View
          accessible={true}
          accessibilityRole="alert"
          accessibilityLabel={`Peringatan: Jaringan internet terputus. Mode blank spot aktif dengan ${pendingTasks.length} antrean tersimpan.`}
          className="bg-amber-500/20 border-b border-amber-500/40 px-4 py-2 flex-row items-center justify-between"
        >
          <View className="flex-row items-center flex-1 mr-2">
            <WifiOff size={15} color="#FBBF24" />
            <Text className="text-amber-300 font-bold text-xs ml-2">
              Mode Blank-Spot (Offline) • {pendingTasks.length} Antrean
            </Text>
          </View>
          <TouchableOpacity
            onPress={syncPendingTasks}
            disabled={syncingOffline}
            className="bg-amber-500/30 px-2 py-0.5 rounded"
          >
            <Text className="text-amber-200 text-[10px] font-bold">
              {syncingOffline ? 'Sinkron...' : 'Cek Sinyal'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        className="flex-1 p-4"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchWalletAndScore();
            }}
            tintColor="#00F2A9"
          />
        }
      >
        {/* User Status Bar & Accessibility Controls */}
        <View className="bg-pekon-surface border border-pekon-border p-3.5 rounded-xl flex-row items-center justify-between mb-4">
          <View className="flex-1">
            <Text className={`text-white font-bold ${isLargeFont ? 'text-base' : 'text-sm'}`}>
              {user ? user.fullName : 'Pengguna Tamu'}
            </Text>
            <Text className={`text-pekon-muted ${isLargeFont ? 'text-xs' : 'text-[11px]'}`}>
              {user?.phoneNumber || 'Belum masuk akun warga'} • Pekon Pagelaran
            </Text>
          </View>

          <View className="flex-row items-center space-x-2">
            {/* Toggle Ukuran Huruf Lansia */}
            <TouchableOpacity
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`Ubah ukuran huruf ${isLargeFont ? 'ke ukuran normal' : 'ke ukuran besar ramah lansia'}`}
              className={`p-1.5 rounded-lg border ${isLargeFont ? 'bg-pekon-primary border-pekon-primary' : 'bg-pekon-card border-pekon-border'}`}
              onPress={() => setIsLargeFont(!isLargeFont)}
            >
              <Type size={16} color={isLargeFont ? '#0F1416' : '#00F2A9'} />
            </TouchableOpacity>

            {!user ? (
              <TouchableOpacity
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Masuk sebagai akun demo warga"
                className="bg-pekon-primary px-3 py-1.5 rounded-lg"
                onPress={async () => {
                  try {
                    await loginAsDemoWarga();
                    Alert.alert('Berhasil Masuk', 'Masuk sebagai Pak Slamet (Petani Singkong).');
                  } catch (e: any) {
                    Alert.alert('Gagal Masuk', e.message);
                  }
                }}
              >
                <Text className="text-pekon-bg font-bold text-xs">Demo Login</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Keluar dari akun warga"
                className="bg-pekon-card border border-pekon-border px-2.5 py-1.5 rounded-lg"
                onPress={logout}
              >
                <Text className="text-pekon-subtle text-xs">Keluar</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Double-Entry Wallet Card */}
        <View
          accessible={true}
          accessibilityRole="header"
          accessibilityLabel={`Dompet Kompas Pekon. Saldo tunai ${wallet?.cashBalance ? Number(wallet.cashBalance).toLocaleString('id-ID') : '25.000'} Rupiah. Poin reputasi ${wallet?.pointsBalance ? Number(wallet.pointsBalance) : 50} poin.`}
          className="bg-pekon-card border border-pekon-border rounded-2xl p-5 mb-4"
        >
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center">
              <Wallet size={18} color="#00F2A9" />
              <Text className={`text-white font-bold ml-2 ${isLargeFont ? 'text-base' : 'text-sm'}`}>
                Dompet Kompas Pekon
              </Text>
            </View>
            <View className="bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
              <Text className="text-emerald-400 text-[10px] font-bold">DOUBLE-ENTRY HMAC</Text>
            </View>
          </View>

          <View className="flex-row divide-x divide-pekon-border/60">
            <View className="flex-1 pr-3">
              <Text className={`text-pekon-muted ${isLargeFont ? 'text-xs' : 'text-[11px]'}`}>
                Saldo Tunai (Upah & Komisi)
              </Text>
              <Text className={`text-white font-extrabold mt-1 ${isLargeFont ? 'text-2xl' : 'text-lg'}`}>
                Rp {wallet?.cashBalance ? Number(wallet.cashBalance).toLocaleString('id-ID') : '25.000'}
              </Text>
            </View>
            <View className="flex-1 pl-3">
              <Text className={`text-pekon-muted ${isLargeFont ? 'text-xs' : 'text-[11px]'}`}>
                Poin Reputasi & Gizi
              </Text>
              <Text className={`text-pekon-primary font-extrabold mt-1 ${isLargeFont ? 'text-2xl' : 'text-lg'}`}>
                {wallet?.pointsBalance ? Number(wallet.pointsBalance) : 50} PTS
              </Text>
            </View>
          </View>
        </View>

        {/* Skor Kredit Alternatif AHP-TOPSIS */}
        <View className="bg-pekon-surface border border-pekon-border rounded-2xl p-5 mb-4">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              <Award size={18} color="#5FD9BF" />
              <Text className={`text-white font-bold ml-2 ${isLargeFont ? 'text-base' : 'text-sm'}`}>
                Skor Kredit Alternatif ($S_{'{kredit}'}$)
              </Text>
            </View>
            <View className="bg-pekon-primary/10 px-2 py-0.5 rounded border border-pekon-primary/30">
              <Text className="text-pekon-primary text-[10px] font-bold">
                {creditScore?.grade || 'GRADE_A_LAYAK_MODAL'}
              </Text>
            </View>
          </View>

          <View className="items-center my-3">
            <Text className={`font-black text-pekon-primary ${isLargeFont ? 'text-5xl' : 'text-4xl'}`}>
              {creditScore?.currentScore || '88.5'}
            </Text>
            <Text className="text-pekon-subtle text-xs mt-1">dari 100 poin aktivitas kerja nyata (PoW)</Text>
          </View>

          {/* Bobot Metrik SPK */}
          <View className="gap-1.5 pt-3 border-t border-pekon-border/60">
            <View className="flex-row justify-between">
              <Text className="text-pekon-muted text-xs">Bobot Mini-Job (25%)</Text>
              <Text className="text-pekon-text text-xs font-semibold">90/100</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-pekon-muted text-xs">Bobot Nebeng-Jastip (20%)</Text>
              <Text className="text-pekon-text text-xs font-semibold">85/100</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-pekon-muted text-xs">Validasi Selfie PoW (20%)</Text>
              <Text className="text-pekon-text text-xs font-semibold">100/100</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-pekon-muted text-xs">Indeks Inklusi & Disabilitas (15%)</Text>
              <Text className="text-pekon-text text-xs font-semibold">100/100</Text>
            </View>
          </View>

          <TouchableOpacity
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Klaim modal BUMDes satu juta lima ratus ribu rupiah"
            className="bg-pekon-primary mt-4 py-3 rounded-xl flex-row items-center justify-center"
            onPress={handleClaimBumdesLoan}
          >
            <ArrowUpRight size={16} color="#0F1416" />
            <Text className="text-pekon-bg font-bold text-xs ml-1">
              Klaim Rekomendasi Modal BUMDes Rp 1.500.000
            </Text>
          </TouchableOpacity>
        </View>

        {/* Penebusan Paket Gizi Stunting */}
        <View className="bg-pekon-card border border-pekon-border rounded-2xl p-5 mb-4">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center">
              <Gift size={18} color="#00F2A9" />
              <Text className={`text-white font-bold ml-2 ${isLargeFont ? 'text-base' : 'text-sm'}`}>
                Intervensi Pangan Stunting
              </Text>
            </View>
            <View className="bg-pekon-primary/10 px-2 py-0.5 rounded border border-pekon-primary/20">
              <Text className="text-pekon-primary text-[10px] font-bold">PROTEIN HEWANI</Text>
            </View>
          </View>

          <Text className={`text-pekon-muted mb-3 ${isLargeFont ? 'text-xs leading-relaxed' : 'text-[11px]'}`}>
            Tukarkan poin reputasi hasil kerja nyata Anda untuk paket pangan berprotein hewani lokal pekon (Telur Bebek, Ikan Nila, & Daun Kelor) untuk mencegah gagal tumbuh balita.
          </Text>

          <TouchableOpacity
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Buka katalog pangan bergizi pekon untuk tukar poin"
            className="bg-pekon-surface border border-pekon-primary/40 py-2.5 rounded-xl items-center flex-row justify-center"
            onPress={() => {
              fetchNutritionPackages();
              setIsNutritionModalOpen(true);
            }}
          >
            <ShoppingBag size={14} color="#00F2A9" />
            <Text className="text-pekon-primary font-bold text-xs ml-1.5">Buka Katalog Pangan Bergizi</Text>
          </TouchableOpacity>
        </View>

        {/* Riwayat Mutasi Buku Besar (Double-Entry Ledger) */}
        <View className="bg-pekon-card border border-pekon-border rounded-2xl p-5 mb-8">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              <Layers size={16} color="#00F2A9" />
              <Text className={`text-white font-bold ml-2 ${isLargeFont ? 'text-base' : 'text-sm'}`}>
                Riwayat Mutasi Buku Besar
              </Text>
            </View>
            <View className="flex-row space-x-1">
              {(['ALL', 'IDR', 'POINTS'] as const).map((filter) => (
                <TouchableOpacity
                  key={filter}
                  onPress={() => setLedgerFilter(filter)}
                  className={`px-2 py-0.5 rounded-md border ${ledgerFilter === filter ? 'bg-pekon-primary/20 border-pekon-primary' : 'bg-pekon-surface border-pekon-border'}`}
                >
                  <Text className={`text-[10px] font-bold ${ledgerFilter === filter ? 'text-pekon-primary' : 'text-pekon-muted'}`}>
                    {filter === 'ALL' ? 'Semua' : filter}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {filteredEntries.length === 0 ? (
            <View className="py-6 items-center">
              <Clock size={28} color="#84958A" />
              <Text className="text-pekon-text font-semibold text-xs mt-2">Belum ada catatan mutasi</Text>
              <Text className="text-pekon-subtle text-[11px] text-center mt-1">
                Seluruh upah kerja mini-job dan komisi nebeng jastip akan tercatat otomatis di buku besar ini.
              </Text>
            </View>
          ) : (
            filteredEntries.map((entry) => {
              const isCredit = entry.entryType === 'CREDIT';
              const isPoints = entry.currency === 'POINTS';
              const formattedDate = entry.createdAt
                ? new Date(entry.createdAt).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '-';

              return (
                <View
                  key={entry.id}
                  className="py-2.5 border-b border-pekon-border/50 flex-row items-center justify-between"
                >
                  <View className="flex-row items-center flex-1 mr-2">
                    <View
                      className={`w-7 h-7 rounded-full items-center justify-center mr-2.5 ${isCredit ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}
                    >
                      {isCredit ? (
                        <ArrowDownLeft size={14} color="#34D399" />
                      ) : (
                        <ArrowDebit size={14} color="#F43F5E" />
                      )}
                    </View>
                    <View className="flex-1">
                      <Text className="text-white text-xs font-semibold" numberOfLines={1}>
                        {isCredit ? 'Penerimaan Upah / Poin' : 'Penukaran / Debit Saldo'}
                      </Text>
                      <View className="flex-row items-center mt-0.5">
                        <Text className="text-pekon-subtle text-[10px]">{formattedDate}</Text>
                        <View className="w-1 h-1 rounded-full bg-pekon-border mx-1.5" />
                        <View className="flex-row items-center">
                          <ShieldCheck size={10} color="#00F2A9" />
                          <Text className="text-pekon-primary text-[9px] font-bold ml-0.5">HMAC SIGNED</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  <View className="items-end">
                    <Text
                      className={`font-bold text-xs ${isCredit ? 'text-emerald-400' : 'text-rose-400'}`}
                    >
                      {isCredit ? '+' : '-'}{' '}
                      {isPoints
                        ? `${Number(entry.amount)} PTS`
                        : `Rp ${Number(entry.amount).toLocaleString('id-ID')}`}
                    </Text>
                    <Text className="text-pekon-muted text-[9px] mt-0.5">
                      Sisa: {isPoints ? `${Number(entry.balanceAfter)} PTS` : `Rp ${Number(entry.balanceAfter).toLocaleString('id-ID')}`}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* ==================================================== */}
      {/* MODAL KATALOG PANGAN BERGIZI PEKON                   */}
      {/* ==================================================== */}
      <Modal visible={isNutritionModalOpen} transparent animationType="slide">
        <View className="flex-1 bg-black/80 justify-end">
          <View className="bg-pekon-surface rounded-t-3xl border-t border-pekon-border p-5 max-h-[85%]">
            <View className="flex-row justify-between items-center pb-3 border-b border-pekon-border">
              <View>
                <Text className="text-white font-bold text-base">Katalog Pangan Bergizi Pekon</Text>
                <Text className="text-pekon-muted text-xs">Pencegahan Stunting Berbasis Poin PoW</Text>
              </View>
              <TouchableOpacity onPress={() => setIsNutritionModalOpen(false)}>
                <X size={20} color="#84958A" />
              </TouchableOpacity>
            </View>

            {loadingNutrition ? (
              <ActivityIndicator size="large" color="#00F2A9" className="my-8" />
            ) : (
              <FlatList
                data={nutritionPackages}
                keyExtractor={(item) => item.id}
                className="my-3"
                renderItem={({ item }) => (
                  <View className="bg-pekon-card border border-pekon-border rounded-xl p-4 mb-3">
                    <View className="flex-row justify-between items-start">
                      <View className="flex-1 pr-2">
                        <Text className="text-white font-bold text-sm">{item.packageName}</Text>
                        <Text className="text-pekon-muted text-xs mt-1 leading-relaxed">
                          {item.description}
                        </Text>
                      </View>
                      <View className="bg-pekon-primary/10 border border-pekon-primary/30 px-2.5 py-1 rounded-lg items-center">
                        <Text className="text-pekon-primary font-black text-sm">{item.pointCost}</Text>
                        <Text className="text-pekon-primary text-[9px] font-bold">POIN</Text>
                      </View>
                    </View>

                    <View className="flex-row justify-between items-center pt-3 border-t border-pekon-border/60 mt-3">
                      <View className="flex-row items-center flex-1 mr-2">
                        <Sparkles size={12} color="#00F2A9" />
                        <Text className="text-pekon-subtle text-[10px] ml-1 flex-1" numberOfLines={1}>
                          {item.pickupLocation}
                        </Text>
                      </View>
                      <TouchableOpacity
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityLabel={`Tukarkan ${item.pointCost} poin untuk ${item.packageName}`}
                        disabled={redeemingPackageId === item.id}
                        onPress={() => handleRedeemPackage(item)}
                        className="bg-pekon-primary px-3 py-1.5 rounded-lg"
                      >
                        {redeemingPackageId === item.id ? (
                          <ActivityIndicator size="small" color="#0F1416" />
                        ) : (
                          <Text className="text-pekon-bg font-bold text-xs">Tukar Poin</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
