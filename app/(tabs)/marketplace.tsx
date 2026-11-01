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
  TextInput,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Sprout,
  Briefcase,
  CheckCircle2,
  HeartHandshake,
  Plus,
  X,
  Tag,
  Coins,
  Scale,
  ShieldCheck,
  Check,
  Building2,
  UserCheck,
} from 'lucide-react-native';
import { apiClient } from '@/services/api';

export default function MarketplaceScreen() {
  const [activeTab, setActiveTab] = useState<'PANEN' | 'MINI_JOB'>('MINI_JOB');
  const [miniJobFilter, setMiniJobFilter] = useState<'ALL' | 'DISABILITY' | 'OPEN'>('OPEN');

  const [harvests, setHarvests] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Modal States
  const [showCreateHarvestModal, setShowCreateHarvestModal] = useState(false);
  const [showBidModal, setShowBidModal] = useState(false);
  const [showCreateJobModal, setShowCreateJobModal] = useState(false);
  const [selectedHarvestForBid, setSelectedHarvestForBid] = useState<any>(null);

  // Form States - Create Harvest
  const [harvestCommodity, setHarvestCommodity] = useState('');
  const [harvestKg, setHarvestKg] = useState('');
  const [harvestMinPrice, setHarvestMinPrice] = useState('');

  // Form States - Place Bid
  const [bidPrice, setBidPrice] = useState('');
  const [bidReferralCode, setBidReferralCode] = useState('');

  // Form States - Create Mini Job
  const [jobTitle, setJobTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [jobWage, setJobWage] = useState('');
  const [jobIsDisabilityFriendly, setJobIsDisabilityFriendly] = useState(true);

  const fetchData = async () => {
    try {
      if (activeTab === 'MINI_JOB') {
        let endpoint = '/mini-jobs';
        if (miniJobFilter === 'DISABILITY') {
          endpoint = '/mini-jobs?isDisabilityFriendly=true&status=OPEN';
        } else if (miniJobFilter === 'OPEN') {
          endpoint = '/mini-jobs?status=OPEN';
        }
        const res: any = await apiClient.get(endpoint);
        setJobs(res.data || []);
      } else {
        const res: any = await apiClient.get('/harvests/listings?status=OPEN_BIDDING');
        setHarvests(res.data || []);
      }
    } catch (e: any) {
      console.warn('Gagal memuat data marketplace:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [activeTab, miniJobFilter]);

  // 1. Klaim Mini-Job
  const handleClaimJob = async (jobId: string, title: string) => {
    Alert.alert(
      'Kunci Tugas (Auto-Accept)',
      `Anda akan mengunci pekerjaan "${title}". Sistem melindungi hak kerja Anda tanpa seleksi fisik sepihak (Zero-Discrimination). Lanjutkan?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ambil & Kunci Tugas',
          onPress: async () => {
            try {
              await apiClient.post(
                `/mini-jobs/${jobId}/claim`,
                {},
                {
                  headers: {
                    'x-idempotency-key': `claim-${jobId}-${Date.now()}`,
                  },
                }
              );
              Alert.alert('Sukses Terkunci!', 'Pekerjaan berhasil Anda kunci. Selesaikan tugas dan unggah bukti di tab Selfie PoW.');
              fetchData();
            } catch (err: any) {
              Alert.alert('Gagal Mengunci', err.message);
            }
          },
        },
      ]
    );
  };

  // 2. Buat Lelang Panen Baru (Petani)
  const handleCreateHarvest = async () => {
    if (!harvestCommodity.trim() || !harvestKg || !harvestMinPrice) {
      Alert.alert('Peringatan', 'Harap isi seluruh field formulir lelang panen.');
      return;
    }
    const kg = parseFloat(harvestKg);
    const minPrice = parseFloat(harvestMinPrice);
    if (isNaN(kg) || kg <= 0) {
      Alert.alert('Peringatan', 'Estimasi berat panen harus lebih dari 0 kg.');
      return;
    }
    if (isNaN(minPrice) || minPrice < 100) {
      Alert.alert('Peringatan', 'Batas minimal harga penawaran harus minimal Rp 100/kg.');
      return;
    }

    try {
      setSubmitting(true);
      await apiClient.post('/harvests/listings', {
        commodityName: harvestCommodity.trim(),
        estimatedKg: kg,
        minPricePerKg: minPrice,
      });

      Alert.alert('Sukses!', `Lelang panen ${harvestCommodity} berhasil diposting ke bursa pekon.`);
      setHarvestCommodity('');
      setHarvestKg('');
      setHarvestMinPrice('');
      setShowCreateHarvestModal(false);
      fetchData();
    } catch (err: any) {
      Alert.alert('Gagal Posting Panen', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // 3. Ajukan Penawaran Pengepul (Bidding)
  const handlePlaceBid = async () => {
    if (!selectedHarvestForBid) return;
    if (!bidPrice) {
      Alert.alert('Peringatan', 'Harap masukkan nominal harga penawaran beli per kg.');
      return;
    }
    const price = parseFloat(bidPrice);
    const minAllowed = parseFloat(selectedHarvestForBid.minPricePerKg);
    if (isNaN(price) || price < minAllowed) {
      Alert.alert('Peringatan', `Harga penawaran harus minimal sama dengan batas Rp ${minAllowed.toLocaleString('id-ID')}/kg.`);
      return;
    }

    try {
      setSubmitting(true);
      await apiClient.post(`/harvests/listings/${selectedHarvestForBid.id}/bids`, {
        offeredPricePerKg: price,
        referralUsedCode: bidReferralCode.trim() || undefined,
      });

      Alert.alert('Tawaran Terkirim!', `Tawaran Rp ${price.toLocaleString('id-ID')}/kg telah diteruskan ke petani.`);
      setBidPrice('');
      setBidReferralCode('');
      setShowBidModal(false);
      setSelectedHarvestForBid(null);
      fetchData();
    } catch (err: any) {
      Alert.alert('Gagal Mengajukan Tawaran', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // 4. Petani Menyetujui Tawaran Pengepul
  const handleAcceptBid = (bidId: string, commodityName: string, offeredPrice: number) => {
    Alert.alert(
      'Kunci Transaksi Panen',
      `Setujui penawaran harga Rp ${Number(offeredPrice).toLocaleString('id-ID')}/kg untuk komoditas ${commodityName}? Lelang akan otomatis dikunci dan transaksi diterbitkan.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Setujui & Kunci',
          onPress: async () => {
            try {
              await apiClient.post(
                `/harvests/bids/${bidId}/accept`,
                {},
                {
                  headers: {
                    'x-idempotency-key': `accept-bid-${bidId}-${Date.now()}`,
                  },
                }
              );
              Alert.alert('Lelang Berhasil Dikunci!', 'Transaksi panen telah diterbitkan. Lakukan serah terima dan selesaikan bukti di tab Selfie PoW.');
              fetchData();
            } catch (err: any) {
              Alert.alert('Gagal Menyetujui Tawaran', err.message);
            }
          },
        },
      ]
    );
  };

  // 5. Buat Lowongan Mini-Job Baru (UMKM)
  const handleCreateJob = async () => {
    if (!jobTitle.trim() || !jobDescription.trim() || !jobWage) {
      Alert.alert('Peringatan', 'Harap lengkapi judul, deskripsi, dan upah pekerjaan.');
      return;
    }
    const wage = parseFloat(jobWage);
    if (isNaN(wage) || wage < 5000) {
      Alert.alert('Peringatan', 'Upah pekerjaan mikro minimal Rp 5.000.');
      return;
    }

    try {
      setSubmitting(true);
      await apiClient.post('/mini-jobs', {
        title: jobTitle.trim(),
        description: jobDescription.trim(),
        wageAmount: wage,
        isDisabilityFriendly: jobIsDisabilityFriendly,
      });

      Alert.alert('Lowongan Berhasil Diposting!', 'Pekerjaan mikro telah aktif di bursa desa.');
      setJobTitle('');
      setJobDescription('');
      setJobWage('');
      setShowCreateJobModal(false);
      fetchData();
    } catch (err: any) {
      Alert.alert('Gagal Membuat Lowongan', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-pekon-bg">
      {/* Tab Switcher Utama */}
      <View className="flex-row bg-pekon-surface p-2 border-b border-pekon-border">
        <TouchableOpacity
          className={`flex-1 flex-row items-center justify-center py-2.5 rounded-lg ${
            activeTab === 'MINI_JOB' ? 'bg-pekon-card border border-pekon-primary' : ''
          }`}
          onPress={() => setActiveTab('MINI_JOB')}
          accessible={true}
          accessibilityLabel="Buka Tab Bursa Mini Job"
        >
          <Briefcase size={16} color={activeTab === 'MINI_JOB' ? '#00F2A9' : '#84958A'} />
          <Text
            className={`text-xs font-bold ml-1.5 ${
              activeTab === 'MINI_JOB' ? 'text-pekon-primary' : 'text-pekon-muted'
            }`}
          >
            Bursa Mini-Job
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className={`flex-1 flex-row items-center justify-center py-2.5 rounded-lg ${
            activeTab === 'PANEN' ? 'bg-pekon-card border border-pekon-primary' : ''
          }`}
          onPress={() => setActiveTab('PANEN')}
          accessible={true}
          accessibilityLabel="Buka Tab Hasil Bumi Petani"
        >
          <Sprout size={16} color={activeTab === 'PANEN' ? '#00F2A9' : '#84958A'} />
          <Text
            className={`text-xs font-bold ml-1.5 ${
              activeTab === 'PANEN' ? 'text-pekon-primary' : 'text-pekon-muted'
            }`}
          >
            Hasil Bumi Petani
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sub-Header & Tombol Aksi */}
      <View className="bg-pekon-surface/70 px-4 py-2.5 border-b border-pekon-border/60 flex-row items-center justify-between">
        {activeTab === 'MINI_JOB' ? (
          <View className="flex-row gap-1.5 items-center flex-1 mr-2">
            <TouchableOpacity
              onPress={() => setMiniJobFilter('OPEN')}
              className={`px-2.5 py-1 rounded-md border ${
                miniJobFilter === 'OPEN'
                  ? 'bg-pekon-primary/20 border-pekon-primary'
                  : 'bg-pekon-card border-pekon-border'
              }`}
            >
              <Text className={`text-[11px] font-semibold ${miniJobFilter === 'OPEN' ? 'text-pekon-primary' : 'text-pekon-muted'}`}>
                Tersedia
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setMiniJobFilter('DISABILITY')}
              className={`px-2.5 py-1 rounded-md border ${
                miniJobFilter === 'DISABILITY'
                  ? 'bg-cyan-500/20 border-cyan-400'
                  : 'bg-pekon-card border-pekon-border'
              }`}
            >
              <Text className={`text-[11px] font-semibold ${miniJobFilter === 'DISABILITY' ? 'text-cyan-400' : 'text-pekon-muted'}`}>
                Disabilitas
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setMiniJobFilter('ALL')}
              className={`px-2.5 py-1 rounded-md border ${
                miniJobFilter === 'ALL'
                  ? 'bg-pekon-primary/20 border-pekon-primary'
                  : 'bg-pekon-card border-pekon-border'
              }`}
            >
              <Text className={`text-[11px] font-semibold ${miniJobFilter === 'ALL' ? 'text-pekon-primary' : 'text-pekon-muted'}`}>
                Semua
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="flex-1 mr-2">
            <Text className="text-white text-xs font-bold">Katalog Panen Terbuka</Text>
            <Text className="text-pekon-subtle text-[11px]">Harga wajar langsung dari petani desa</Text>
          </View>
        )}

        {/* Tombol Buat Baru */}
        {activeTab === 'MINI_JOB' ? (
          <TouchableOpacity
            className="bg-pekon-primary px-3 py-1.5 rounded-lg flex-row items-center"
            onPress={() => setShowCreateJobModal(true)}
            accessible={true}
            accessibilityLabel="Buka formulir posting lowongan kerja mikro"
          >
            <Plus size={14} color="#0F1416" />
            <Text className="text-pekon-bg text-xs font-bold ml-1">Pasang Tugas</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            className="bg-pekon-primary px-3 py-1.5 rounded-lg flex-row items-center"
            onPress={() => setShowCreateHarvestModal(true)}
            accessible={true}
            accessibilityLabel="Buka formulir posting hasil bumi petani"
          >
            <Plus size={14} color="#0F1416" />
            <Text className="text-pekon-bg text-xs font-bold ml-1">Pasang Panen</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Konten ScrollView */}
      <ScrollView
        className="flex-1 p-4"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchData();
            }}
            tintColor="#00F2A9"
          />
        }
      >
        {loading ? (
          <ActivityIndicator size="large" color="#00F2A9" className="my-8" />
        ) : activeTab === 'MINI_JOB' ? (
          /* ================= FEED BURSA MINI-JOB ================= */
          <View>
            <View className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 mb-4 flex-row items-center">
              <HeartHandshake size={20} color="#10B981" />
              <View className="ml-2 flex-1">
                <Text className="text-emerald-400 font-bold text-xs">Prinsip Zero-Discrimination</Text>
                <Text className="text-emerald-200/80 text-[11px]">
                  Tugas bertanda ramah disabilitas terkunci otomatis tanpa tombol tolak dari pemberi kerja.
                </Text>
              </View>
            </View>

            {jobs.length === 0 ? (
              <View className="bg-pekon-card border border-pekon-border rounded-xl p-6 items-center">
                <Text className="text-pekon-text text-sm">Belum ada lowongan mini-job pada kategori ini.</Text>
                <TouchableOpacity
                  className="mt-3 bg-pekon-surface border border-pekon-border px-3 py-1.5 rounded-lg"
                  onPress={() => setShowCreateJobModal(true)}
                >
                  <Text className="text-pekon-primary text-xs font-semibold">+ Buka Lowongan Sekarang</Text>
                </TouchableOpacity>
              </View>
            ) : (
              jobs.map((job) => (
                <View key={job.id} className="bg-pekon-card border border-pekon-border rounded-xl p-4 mb-3">
                  <View className="flex-row justify-between items-start">
                    <View className="flex-1 mr-2">
                      <Text className="text-white font-bold text-sm">{job.title}</Text>
                      <Text className="text-pekon-muted text-xs mt-1" numberOfLines={3}>
                        {job.description}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-pekon-primary font-bold text-sm">
                        Rp {Number(job.wageAmount).toLocaleString('id-ID')}
                      </Text>
                      <Text className="text-pekon-subtle text-[10px]">Upah Tunai</Text>
                    </View>
                  </View>

                  <View className="flex-row items-center gap-2 mt-3 pt-3 border-t border-pekon-border/60">
                    {job.isDisabilityFriendly ? (
                      <View className="bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 rounded">
                        <Text className="text-cyan-400 text-[10px] font-bold">RAMAH DISABILITAS</Text>
                      </View>
                    ) : (
                      <View className="bg-slate-700/30 px-2 py-0.5 rounded">
                        <Text className="text-slate-400 text-[10px] font-semibold">UMUM</Text>
                      </View>
                    )}

                    <View className="flex-1" />

                    {job.status === 'OPEN' ? (
                      <TouchableOpacity
                        className="bg-pekon-primary px-3 py-1.5 rounded-lg flex-row items-center"
                        onPress={() => handleClaimJob(job.id, job.title)}
                        accessible={true}
                        accessibilityLabel={`Ambil tugas ${job.title}`}
                      >
                        <CheckCircle2 size={13} color="#0F1416" />
                        <Text className="text-pekon-bg text-xs font-bold ml-1">Ambil Tugas</Text>
                      </TouchableOpacity>
                    ) : (
                      <View className="bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-lg">
                        <Text className="text-amber-400 text-xs font-semibold">Terkunci / Berjalan</Text>
                      </View>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        ) : (
          /* ================= FEED BURSA HASIL BUMI ================= */
          <View>
            {harvests.length === 0 ? (
              <View className="bg-pekon-card border border-pekon-border rounded-xl p-6 items-center">
                <Text className="text-pekon-text text-sm">Belum ada komoditas hasil bumi yang diposting.</Text>
                <TouchableOpacity
                  className="mt-3 bg-pekon-primary px-4 py-2 rounded-lg"
                  onPress={() => setShowCreateHarvestModal(true)}
                >
                  <Text className="text-pekon-bg text-xs font-bold">+ Posting Panen Baru</Text>
                </TouchableOpacity>
              </View>
            ) : (
              harvests.map((h) => (
                <View key={h.id} className="bg-pekon-card border border-pekon-border rounded-xl p-4 mb-4">
                  {/* Info Utama Komoditas */}
                  <View className="flex-row justify-between items-start">
                    <View className="flex-1 mr-2">
                      <Text className="text-white font-bold text-base">{h.commodityName}</Text>
                      <Text className="text-pekon-muted text-xs mt-0.5">
                        Petani: {h.farmer?.fullName || 'Warga Pekon'} • Pekon: {h.pekon?.namaPekon || 'Pringsewu'}
                      </Text>
                    </View>
                    <View className="bg-emerald-500/10 border border-emerald-500/30 px-2 py-1 rounded items-end">
                      <Text className="text-emerald-400 font-bold text-xs">
                        Batas Rp {Number(h.minPricePerKg).toLocaleString('id-ID')} / kg
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center gap-3 mt-2 text-xs">
                    <View className="bg-pekon-surface px-2.5 py-1 rounded border border-pekon-border flex-row items-center">
                      <Scale size={12} color="#00F2A9" />
                      <Text className="text-slate-200 text-xs font-semibold ml-1.5">
                        {Number(h.estimatedKg).toLocaleString('id-ID')} kg
                      </Text>
                    </View>
                    <Text className="text-pekon-subtle text-xs">
                      Estimasi Total: Rp {(Number(h.estimatedKg) * Number(h.minPricePerKg)).toLocaleString('id-ID')}
                    </Text>
                  </View>

                  {/* Tombol Ajukan Tawaran (Untuk Pengepul) */}
                  <View className="flex-row items-center mt-3 pt-2.5 border-t border-pekon-border/60 justify-between">
                    <Text className="text-pekon-muted text-xs font-semibold">
                      {h.bids?.length || 0} Penawaran Masuk
                    </Text>
                    <TouchableOpacity
                      className="bg-pekon-surface border border-pekon-primary px-3 py-1.5 rounded-lg flex-row items-center"
                      onPress={() => {
                        setSelectedHarvestForBid(h);
                        setBidPrice(String(h.minPricePerKg));
                        setShowBidModal(true);
                      }}
                      accessible={true}
                      accessibilityLabel={`Ajukan penawaran harga untuk ${h.commodityName}`}
                    >
                      <Coins size={13} color="#00F2A9" />
                      <Text className="text-pekon-primary text-xs font-bold ml-1">Tawar Harga</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Daftar Penawaran Masuk (Bids) */}
                  {h.bids && h.bids.length > 0 && (
                    <View className="mt-3 pt-2 border-t border-pekon-border/40 space-y-2">
                      <Text className="text-[11px] font-bold text-pekon-subtle uppercase tracking-wider mb-1">
                        Daftar Penawaran Pengepul:
                      </Text>
                      {h.bids.map((bid: any) => (
                        <View
                          key={bid.id}
                          className="bg-pekon-surface/80 p-2.5 rounded-lg border border-pekon-border/60 flex-row items-center justify-between"
                        >
                          <View className="flex-1 mr-2">
                            <View className="flex-row items-center">
                              <Text className="text-white font-semibold text-xs">
                                {bid.collector?.fullName || 'Pengepul Mitra'}
                              </Text>
                              {bid.collector?.isTrustedCollector && (
                                <View className="ml-1.5 bg-emerald-500/20 px-1.5 py-0.2 rounded">
                                  <Text className="text-emerald-400 text-[9px] font-bold">TERPERCAYA</Text>
                                </View>
                              )}
                            </View>
                            <Text className="text-pekon-primary font-bold text-xs mt-0.5">
                              Rp {Number(bid.offeredPricePerKg).toLocaleString('id-ID')} / kg
                            </Text>
                          </View>

                          <TouchableOpacity
                            className="bg-emerald-600 px-2.5 py-1 rounded-md flex-row items-center"
                            onPress={() => handleAcceptBid(bid.id, h.commodityName, bid.offeredPricePerKg)}
                            accessible={true}
                            accessibilityLabel={`Terima tawaran dari ${bid.collector?.fullName}`}
                          >
                            <Check size={12} color="#FFFFFF" />
                            <Text className="text-white text-[11px] font-bold ml-1">Terima & Kunci</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* ================= MODAL 1: FORM POSTING PANEN PETANI ================= */}
      <Modal visible={showCreateHarvestModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 bg-black/80 justify-end"
        >
          <View className="bg-pekon-surface rounded-t-3xl border-t border-pekon-border p-5 space-y-4">
            <View className="flex-row justify-between items-center pb-2 border-b border-pekon-border/60">
              <View>
                <Text className="text-white font-bold text-base">Posting Hasil Panen Baru</Text>
                <Text className="text-pekon-muted text-xs">Buka lelang hasil bumi ke jaringan pengepul jujur pekon</Text>
              </View>
              <TouchableOpacity onPress={() => setShowCreateHarvestModal(false)}>
                <X size={20} color="#84958A" />
              </TouchableOpacity>
            </View>

            <View className="space-y-3">
              <View>
                <Text className="text-slate-300 text-xs font-semibold mb-1">Nama Komoditas Panen</Text>
                <TextInput
                  className="bg-pekon-card border border-pekon-border rounded-xl p-3 text-white text-xs"
                  placeholder="Misal: Singkong Mukibat, Kakao Fermentasi, Ikan Nila"
                  placeholderTextColor="#84958A"
                  value={harvestCommodity}
                  onChangeText={setHarvestCommodity}
                />
              </View>

              <View>
                <Text className="text-slate-300 text-xs font-semibold mb-1">Estimasi Berat Panen (Kg)</Text>
                <TextInput
                  className="bg-pekon-card border border-pekon-border rounded-xl p-3 text-white text-xs"
                  placeholder="Contoh: 1500"
                  placeholderTextColor="#84958A"
                  keyboardType="numeric"
                  value={harvestKg}
                  onChangeText={setHarvestKg}
                />
              </View>

              <View>
                <Text className="text-slate-300 text-xs font-semibold mb-1">Batas Minimal Harga Jual (Rp/Kg)</Text>
                <TextInput
                  className="bg-pekon-card border border-pekon-border rounded-xl p-3 text-white text-xs"
                  placeholder="Contoh: 2500"
                  placeholderTextColor="#84958A"
                  keyboardType="numeric"
                  value={harvestMinPrice}
                  onChangeText={setHarvestMinPrice}
                />
              </View>
            </View>

            <View className="flex-row gap-3 pt-2">
              <TouchableOpacity
                className="flex-1 bg-pekon-card border border-pekon-border py-3 rounded-xl items-center"
                onPress={() => setShowCreateHarvestModal(false)}
              >
                <Text className="text-pekon-muted font-bold text-xs">Batal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-1 bg-pekon-primary py-3 rounded-xl items-center flex-row justify-center"
                onPress={handleCreateHarvest}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#0F1416" />
                ) : (
                  <Text className="text-pekon-bg font-bold text-xs">Posting ke Bursa</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ================= MODAL 2: FORM AJUKAN TAWARAN PENGEPUL ================= */}
      <Modal visible={showBidModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 bg-black/80 justify-end"
        >
          <View className="bg-pekon-surface rounded-t-3xl border-t border-pekon-border p-5 space-y-4">
            <View className="flex-row justify-between items-center pb-2 border-b border-pekon-border/60">
              <View>
                <Text className="text-white font-bold text-base">Ajukan Penawaran Harga</Text>
                <Text className="text-pekon-muted text-xs">
                  {selectedHarvestForBid?.commodityName} ({selectedHarvestForBid?.estimatedKg} kg)
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowBidModal(false)}>
                <X size={20} color="#84958A" />
              </TouchableOpacity>
            </View>

            <View className="bg-pekon-card p-3 rounded-xl border border-pekon-border/70">
              <Text className="text-pekon-subtle text-[11px]">Batas Bawah Harga Petani:</Text>
              <Text className="text-emerald-400 font-bold text-sm">
                Rp {Number(selectedHarvestForBid?.minPricePerKg || 0).toLocaleString('id-ID')} / kg
              </Text>
            </View>

            <View className="space-y-3">
              <View>
                <Text className="text-slate-300 text-xs font-semibold mb-1">Harga Beli yang Anda Tawarkan (Rp/Kg)</Text>
                <TextInput
                  className="bg-pekon-card border border-pekon-primary rounded-xl p-3 text-white text-xs font-bold"
                  placeholder="Misal: 2700"
                  placeholderTextColor="#84958A"
                  keyboardType="numeric"
                  value={bidPrice}
                  onChangeText={setBidPrice}
                />
              </View>

              <View>
                <Text className="text-slate-300 text-xs font-semibold mb-1">Kode Referral Mitra (Opsional)</Text>
                <TextInput
                  className="bg-pekon-card border border-pekon-border rounded-xl p-3 text-white text-xs font-mono"
                  placeholder="Misal: JUJUR-SURATNO"
                  placeholderTextColor="#84958A"
                  autoCapitalize="characters"
                  value={bidReferralCode}
                  onChangeText={setBidReferralCode}
                />
                <Text className="text-pekon-subtle text-[10px] mt-1">
                  Pemberi referral akan menerima komisi mikro Rp 5.000 + poin reputasi setelah transaksi terverifikasi.
                </Text>
              </View>
            </View>

            <View className="flex-row gap-3 pt-2">
              <TouchableOpacity
                className="flex-1 bg-pekon-card border border-pekon-border py-3 rounded-xl items-center"
                onPress={() => setShowBidModal(false)}
              >
                <Text className="text-pekon-muted font-bold text-xs">Batal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-1 bg-pekon-primary py-3 rounded-xl items-center flex-row justify-center"
                onPress={handlePlaceBid}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#0F1416" />
                ) : (
                  <Text className="text-pekon-bg font-bold text-xs">Kirim Tawaran</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ================= MODAL 3: FORM BUKA LOWONGAN MINI-JOB (UMKM) ================= */}
      <Modal visible={showCreateJobModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 bg-black/80 justify-end"
        >
          <View className="bg-pekon-surface rounded-t-3xl border-t border-pekon-border p-5 space-y-4">
            <View className="flex-row justify-between items-center pb-2 border-b border-pekon-border/60">
              <View>
                <Text className="text-white font-bold text-base">Buka Lowongan Kerja Mikro</Text>
                <Text className="text-pekon-muted text-xs">Berdayakan tenaga kerja warga desa dengan upah harian adil</Text>
              </View>
              <TouchableOpacity onPress={() => setShowCreateJobModal(false)}>
                <X size={20} color="#84958A" />
              </TouchableOpacity>
            </View>

            <View className="space-y-3">
              <View>
                <Text className="text-slate-300 text-xs font-semibold mb-1">Judul Pekerjaan</Text>
                <TextInput
                  className="bg-pekon-card border border-pekon-border rounded-xl p-3 text-white text-xs"
                  placeholder="Misal: Kupas Singkong 50kg, Kemas Gula Semut"
                  placeholderTextColor="#84958A"
                  value={jobTitle}
                  onChangeText={setJobTitle}
                />
              </View>

              <View>
                <Text className="text-slate-300 text-xs font-semibold mb-1">Deskripsi Tugas & Lokasi Pengerjaan</Text>
                <TextInput
                  className="bg-pekon-card border border-pekon-border rounded-xl p-3 text-white text-xs h-20"
                  placeholder="Jelaskan kebutuhan pekerjaan, lokasi pengerjaan di pekon, dan peralatan..."
                  placeholderTextColor="#84958A"
                  multiline
                  textAlignVertical="top"
                  value={jobDescription}
                  onChangeText={setJobDescription}
                />
              </View>

              <View>
                <Text className="text-slate-300 text-xs font-semibold mb-1">Upah Bersih Tunai (Rp)</Text>
                <TextInput
                  className="bg-pekon-card border border-pekon-border rounded-xl p-3 text-white text-xs"
                  placeholder="Minimal Rp 5.000"
                  placeholderTextColor="#84958A"
                  keyboardType="numeric"
                  value={jobWage}
                  onChangeText={setJobWage}
                />
              </View>

              {/* Toggle Ramah Disabilitas (Zero-Discrimination) */}
              <View className="bg-pekon-card p-3 rounded-xl border border-pekon-border flex-row items-center justify-between">
                <View className="flex-1 mr-3">
                  <Text className="text-white font-bold text-xs">Ramah Disabilitas & Lansia</Text>
                  <Text className="text-pekon-subtle text-[11px] mt-0.5">
                    Tugas langsung terkunci otomatis saat diklaim tanpa tombol penolakan manual.
                  </Text>
                </View>
                <Switch
                  value={jobIsDisabilityFriendly}
                  onValueChange={setJobIsDisabilityFriendly}
                  trackColor={{ false: '#3B4A41', true: '#00F2A9' }}
                  thumbColor={jobIsDisabilityFriendly ? '#0F1416' : '#84958A'}
                />
              </View>
            </View>

            <View className="flex-row gap-3 pt-2">
              <TouchableOpacity
                className="flex-1 bg-pekon-card border border-pekon-border py-3 rounded-xl items-center"
                onPress={() => setShowCreateJobModal(false)}
              >
                <Text className="text-pekon-muted font-bold text-xs">Batal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-1 bg-pekon-primary py-3 rounded-xl items-center flex-row justify-center"
                onPress={handleCreateJob}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#0F1416" />
                ) : (
                  <Text className="text-pekon-bg font-bold text-xs">Pasang Lowongan</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
