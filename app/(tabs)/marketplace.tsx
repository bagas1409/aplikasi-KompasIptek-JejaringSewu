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
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import {
  Sprout,
  Briefcase,
  CheckCircle2,
  HeartHandshake,
  Plus,
  X,
  Coins,
  Scale,
  ShieldCheck,
  Check,
  Store,
  MapPin,
  Clock,
  ArrowRight,
  Lock,
  User,
  Gavel,
  Star,
  Send,
  Eye,
  ChevronDown,
  ChevronUp,
  Truck,
  Navigation,
  Accessibility,
  Sparkles,
} from 'lucide-react-native';
import { apiClient } from '@/services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';

type CommodityCategory = 'ALL' | 'UMBI' | 'KOPI_KAKAO' | 'SAYUR' | 'TERNAK';

const COMMODITY_FILTERS: { key: CommodityCategory; label: string }[] = [
  { key: 'ALL', label: 'Semua Komoditas' },
  { key: 'UMBI', label: 'Umbi & Singkong' },
  { key: 'KOPI_KAKAO', label: 'Kopi & Kakao' },
  { key: 'SAYUR', label: 'Sayur Mayur' },
  { key: 'TERNAK', label: 'Ikan & Ternak' },
];

function getCommodityVisual(commodityName: string = '') {
  const lower = commodityName.toLowerCase();
  if (lower.includes('kakao') || lower.includes('cokelat') || lower.includes('kopi')) {
    return {
      uri: 'https://images.unsplash.com/photo-1511537190424-bbbab87ac5eb?auto=format&fit=crop&w=400&q=80',
      badge: 'Grade A',
      isGrade: true,
    };
  }
  if (lower.includes('ikan') || lower.includes('nila') || lower.includes('lele') || lower.includes('ternak')) {
    return {
      uri: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=400&q=80',
      badge: 'Segar',
      isGrade: false,
    };
  }
  if (lower.includes('cabai') || lower.includes('sayur') || lower.includes('tomat') || lower.includes('bawang')) {
    return {
      uri: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=400&q=80',
      badge: 'Segar',
      isGrade: false,
    };
  }
  return {
    uri: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?auto=format&fit=crop&w=400&q=80',
    badge: 'Segar',
    isGrade: false,
  };
}

function matchesCommodityCategory(commodityName: string = '', category: CommodityCategory): boolean {
  if (category === 'ALL') return true;
  const lower = commodityName.toLowerCase();
  if (category === 'UMBI') {
    return (
      lower.includes('singkong') ||
      lower.includes('umbi') ||
      lower.includes('ubi') ||
      lower.includes('talas') ||
      lower.includes('porang') ||
      lower.includes('mukibat')
    );
  }
  if (category === 'KOPI_KAKAO') {
    return (
      lower.includes('kopi') ||
      lower.includes('kakao') ||
      lower.includes('cokelat') ||
      lower.includes('robusta') ||
      lower.includes('arabika') ||
      lower.includes('aren') ||
      lower.includes('lada')
    );
  }
  if (category === 'SAYUR') {
    return (
      lower.includes('sayur') ||
      lower.includes('cabai') ||
      lower.includes('cabe') ||
      lower.includes('tomat') ||
      lower.includes('bawang') ||
      lower.includes('jagung') ||
      lower.includes('padi') ||
      lower.includes('beras') ||
      lower.includes('pisang')
    );
  }
  if (category === 'TERNAK') {
    return (
      lower.includes('ikan') ||
      lower.includes('nila') ||
      lower.includes('lele') ||
      lower.includes('gurame') ||
      lower.includes('ayam') ||
      lower.includes('telur') ||
      lower.includes('kambing') ||
      lower.includes('sapi') ||
      lower.includes('madu')
    );
  }
  return true;
}

export default function MarketplaceScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const isCompact = windowWidth < 380;

  const [activeTab, setActiveTab] = useState<'MINI_JOB' | 'PANEN'>('MINI_JOB');
  const [miniJobFilter, setMiniJobFilter] = useState<'OPEN' | 'DISABILITY' | 'ALL'>('OPEN');
  const [commodityFilter, setCommodityFilter] = useState<CommodityCategory>('ALL');
  const [showEmptyHarvestPreview, setShowEmptyHarvestPreview] = useState(false);

  const [harvests, setHarvests] = useState<any[]>([]);
  const [allJobs, setAllJobs] = useState<any[]>([]);
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
  const [jobLocation, setJobLocation] = useState('');
  const [jobWage, setJobWage] = useState('');
  const [jobIsDisabilityFriendly, setJobIsDisabilityFriendly] = useState(true);

  const fetchData = async () => {
    try {
      if (activeTab === 'MINI_JOB') {
        const res: any = await apiClient.get('/mini-jobs');
        setAllJobs(res.data || []);
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
  }, [activeTab]);

  // Hitung jumlah per kategori Mini-Job secara dinamis
  const jobCounts = useMemo(() => {
    const open = allJobs.filter((j) => j.status === 'OPEN').length;
    const disability = allJobs.filter((j) => j.isDisabilityFriendly && j.status === 'OPEN').length;
    const all = allJobs.length;
    return { open, disability, all };
  }, [allJobs]);

  // Filter daftar Mini-Job sesuai chip aktif
  const filteredJobs = useMemo(() => {
    if (miniJobFilter === 'OPEN') {
      return allJobs.filter((j) => j.status === 'OPEN');
    }
    if (miniJobFilter === 'DISABILITY') {
      return allJobs.filter((j) => j.isDisabilityFriendly && j.status === 'OPEN');
    }
    return allJobs;
  }, [allJobs, miniJobFilter]);

  // Filter daftar Hasil Bumi sesuai chip komoditas
  const filteredHarvests = useMemo(() => {
    return harvests.filter((h) => matchesCommodityCategory(h.commodityName, commodityFilter));
  }, [harvests, commodityFilter]);

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
              Alert.alert(
                'Sukses Terkunci!',
                'Pekerjaan berhasil Anda kunci. Selesaikan tugas dan unggah bukti di tab Selfie PoW.'
              );
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
      Alert.alert(
        'Peringatan',
        `Harga penawaran harus minimal sama dengan batas Rp ${minAllowed.toLocaleString('id-ID')}/kg.`
      );
      return;
    }

    try {
      setSubmitting(true);
      await apiClient.post(`/harvests/listings/${selectedHarvestForBid.id}/bids`, {
        offeredPricePerKg: price,
        referralUsedCode: bidReferralCode.trim() || undefined,
      });

      Alert.alert(
        'Tawaran Terkirim!',
        `Tawaran Rp ${price.toLocaleString('id-ID')}/kg telah diteruskan ke petani.`
      );
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
              Alert.alert(
                'Lelang Berhasil Dikunci!',
                'Transaksi panen telah diterbitkan. Lakukan serah terima dan selesaikan bukti di tab Selfie PoW.'
              );
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
    const combinedDescription = [jobDescription.trim(), jobLocation.trim()]
      .filter(Boolean)
      .join(' • Lokasi: ');

    if (!jobTitle.trim() || !combinedDescription || !jobWage) {
      Alert.alert('Peringatan', 'Harap lengkapi judul pekerjaan, upah tunai, dan lokasi/deskripsi.');
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
        description: combinedDescription,
        wageAmount: wage,
        isDisabilityFriendly: jobIsDisabilityFriendly,
      });

      Alert.alert('Lowongan Berhasil Diposting!', 'Pekerjaan mikro telah aktif di bursa desa.');
      setJobTitle('');
      setJobDescription('');
      setJobLocation('');
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
    <View style={styles.screen}>
      <StatusBar style="dark" backgroundColor="#FCF9F8" />

      {/* ================= FIXED TOP APP BAR ================= */}
      <View style={[styles.topHeader, { paddingTop: Math.max(insets.top, 12) }]}>
        <View style={styles.topHeaderInner}>
          <View style={styles.brandRow}>
            <View style={styles.brandIconCircle}>
              <Truck size={20} color="#006A42" />
            </View>
            <View style={styles.brandTextWrap}>
              <Text style={styles.brandTitle} numberOfLines={1}>
                Marketplace
              </Text>
              <View style={styles.activeStatusRow}>
                <View style={styles.pulseDotSmall} />
                <Text style={styles.activeStatusText} numberOfLines={1}>
                  Pekon Sewu Active
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.headerRightActions}>
            <View style={styles.gpsBadge}>
              <Navigation size={12} color="#006A42" />
              <Text style={styles.gpsBadgeText}>GPS Aktif</Text>
            </View>
            <TouchableOpacity
              style={styles.avatarButton}
              onPress={() => router.push('/(tabs)/profile')}
              activeOpacity={0.8}
              accessibilityLabel="Buka Profil Akun"
            >
              <User size={16} color="#FFFFFF" />
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
              fetchData();
            }}
            tintColor="#006A42"
            colors={['#006A42']}
          />
        }
      >
        {/* ================= ECOSYSTEM PILL & SEGMENTED TABS ================= */}
        <View style={styles.switcherSection}>
          <View style={styles.ecosystemPill}>
            <ShieldCheck size={14} color="#006A42" />
            <Text style={styles.ecosystemPillText}>Pasar Digital Warga Pekon • KompasIptek</Text>
          </View>

          <View style={styles.segmentedContainer}>
            <TouchableOpacity
              style={[
                styles.segmentButton,
                activeTab === 'MINI_JOB' ? styles.segmentButtonActive : styles.segmentButtonInactive,
              ]}
              onPress={() => setActiveTab('MINI_JOB')}
              activeOpacity={0.85}
              accessible={true}
              accessibilityLabel="Buka Tab Bursa Mini Job"
            >
              <Briefcase
                size={16}
                color={activeTab === 'MINI_JOB' ? '#FFFFFF' : '#3D4A41'}
              />
              <Text
                style={[
                  styles.segmentButtonText,
                  activeTab === 'MINI_JOB'
                    ? styles.segmentButtonTextActive
                    : styles.segmentButtonTextInactive,
                ]}
              >
                Bursa Mini-Job
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.segmentButton,
                activeTab === 'PANEN' ? styles.segmentButtonActive : styles.segmentButtonInactive,
              ]}
              onPress={() => setActiveTab('PANEN')}
              activeOpacity={0.85}
              accessible={true}
              accessibilityLabel="Buka Tab Hasil Bumi Petani"
            >
              <Sprout
                size={16}
                color={activeTab === 'PANEN' ? '#FFFFFF' : '#3D4A41'}
              />
              <Text
                style={[
                  styles.segmentButtonText,
                  activeTab === 'PANEN'
                    ? styles.segmentButtonTextActive
                    : styles.segmentButtonTextInactive,
                ]}
              >
                Hasil Bumi Petani
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {activeTab === 'MINI_JOB' ? (
          /* =====================================================================
             TAB 1: BURSA MINI-JOB (Mengacu pada desain/marketplace/burst mini job.md)
             ===================================================================== */
          <View style={styles.tabBody}>
            {/* Section Header with Primary Action */}
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleWrap}>
                <Text style={styles.sectionTitle}>Bursa Mini-Job</Text>
                <Text style={styles.sectionSubtitle} numberOfLines={2}>
                  Pekerjaan mikro & peluang upah warga sekitar pekon.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.primaryActionPill}
                onPress={() => setShowCreateJobModal(true)}
                activeOpacity={0.85}
                accessible={true}
                accessibilityLabel="Pasang Tugas Baru"
              >
                <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={styles.primaryActionPillText}>Pasang Tugas</Text>
              </TouchableOpacity>
            </View>

            {/* Filter Horizontal Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalChipsContainer}
            >
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  miniJobFilter === 'OPEN' ? styles.filterChipActive : styles.filterChipInactive,
                ]}
                onPress={() => setMiniJobFilter('OPEN')}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.chipStatusDot,
                    { backgroundColor: miniJobFilter === 'OPEN' ? '#006A42' : '#6D7A70' },
                  ]}
                />
                <Text
                  style={[
                    styles.filterChipText,
                    miniJobFilter === 'OPEN'
                      ? styles.filterChipTextActive
                      : styles.filterChipTextInactive,
                  ]}
                >
                  Tersedia ({jobCounts.open})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterChip,
                  miniJobFilter === 'DISABILITY'
                    ? styles.filterChipActive
                    : styles.filterChipInactive,
                ]}
                onPress={() => setMiniJobFilter('DISABILITY')}
                activeOpacity={0.8}
              >
                <Accessibility
                  size={14}
                  color={miniJobFilter === 'DISABILITY' ? '#00734B' : '#3D4A41'}
                />
                <Text
                  style={[
                    styles.filterChipText,
                    miniJobFilter === 'DISABILITY'
                      ? styles.filterChipTextActive
                      : styles.filterChipTextInactive,
                  ]}
                >
                  Disabilitas ({jobCounts.disability})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterChip,
                  miniJobFilter === 'ALL' ? styles.filterChipActive : styles.filterChipInactive,
                ]}
                onPress={() => setMiniJobFilter('ALL')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    miniJobFilter === 'ALL'
                      ? styles.filterChipTextActive
                      : styles.filterChipTextInactive,
                  ]}
                >
                  Semua ({jobCounts.all})
                </Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Zero-Discrimination Information Banner */}
            <View style={styles.zeroDiscriminationBanner}>
              <View style={styles.zeroDiscIconCircle}>
                <HeartHandshake size={20} color="#006A42" />
              </View>
              <View style={styles.zeroDiscContent}>
                <View style={styles.zeroDiscTitleRow}>
                  <Text style={styles.zeroDiscTitle}>Prinsip Zero-Discrimination</Text>
                  <ShieldCheck size={14} color="#006A42" />
                </View>
                <Text style={styles.zeroDiscDesc}>
                  Tugas bertanda khusus ramah disabilitas dikunci otomatis tanpa seleksi fisik sepihak demi kesetaraan warga.
                </Text>
              </View>
            </View>

            {/* Mini-Job Listings Stack */}
            {loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color="#006A42" />
                <Text style={styles.loadingText}>Memuat bursa pekerjaan mikro...</Text>
              </View>
            ) : filteredJobs.length === 0 ? (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIconCircle}>
                  <Briefcase size={28} color="#006A42" />
                </View>
                <Text style={styles.emptyTitle}>Belum Ada Lowongan Mikro</Text>
                <Text style={styles.emptySubtitle}>
                  Belum ada tugas warga pada kategori filter ini. Anda dapat membuka lowongan baru untuk tetangga pekon.
                </Text>
                <TouchableOpacity
                  style={styles.emptyCtaButton}
                  onPress={() => setShowCreateJobModal(true)}
                  activeOpacity={0.85}
                >
                  <Plus size={16} color="#FFFFFF" />
                  <Text style={styles.emptyCtaButtonText}>Buka Lowongan Sekarang</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.cardsStack}>
                {filteredJobs.map((job) => {
                  const isOpen = job.status === 'OPEN';
                  return (
                    <View
                      key={job.id}
                      style={[
                        styles.jobCard,
                        !isOpen && styles.jobCardLocked,
                        { padding: isCompact ? 16 : 20 },
                      ]}
                    >
                      {/* Top Header Row: Badges + Title on Left, Wage on Right */}
                      <View style={styles.jobHeaderRow}>
                        <View style={styles.jobHeaderLeft}>
                          <View style={styles.jobBadgesWrap}>
                            {job.isDisabilityFriendly ? (
                              <View
                                style={[
                                  styles.disabilityBadge,
                                  !isOpen && styles.disabilityBadgeLocked,
                                ]}
                              >
                                <Accessibility
                                  size={12}
                                  color={isOpen ? '#006A42' : '#3D4A41'}
                                />
                                <Text
                                  style={[
                                    styles.disabilityBadgeText,
                                    !isOpen && styles.badgeTextLocked,
                                  ]}
                                >
                                  Ramah Disabilitas
                                </Text>
                              </View>
                            ) : (
                              <View style={styles.generalBadge}>
                                <Text style={styles.generalBadgeText}>Umum</Text>
                              </View>
                            )}

                            <View
                              style={[
                                styles.statusPillBadge,
                                !isOpen && styles.statusPillBadgeLocked,
                              ]}
                            >
                              <View
                                style={[
                                  styles.statusDotSmall,
                                  { backgroundColor: isOpen ? '#006A42' : '#6D7A70' },
                                ]}
                              />
                              <Text style={styles.statusPillText}>
                                {isOpen ? 'Tersedia' : 'Sedang Berjalan'}
                              </Text>
                            </View>
                          </View>

                          <Text style={styles.jobTitleText}>{job.title}</Text>
                        </View>

                        <View style={styles.jobWageColumn}>
                          <Text style={styles.jobWageLabel}>Upah Tunai</Text>
                          <Text
                            style={[
                              styles.jobWageValue,
                              !isOpen && styles.jobWageValueLocked,
                            ]}
                          >
                            Rp {Number(job.wageAmount || 0).toLocaleString('id-ID')}
                          </Text>
                        </View>
                      </View>

                      {/* Location / Description Box */}
                      <View
                        style={[
                          styles.jobDescriptionBox,
                          !isOpen && styles.jobDescriptionBoxLocked,
                        ]}
                      >
                        {!isOpen ? (
                          <Lock size={16} color="#3D4A41" style={styles.jobDescIcon} />
                        ) : job.isDisabilityFriendly ? (
                          <Store size={16} color="#3D4A41" style={styles.jobDescIcon} />
                        ) : (
                          <MapPin size={16} color="#3D4A41" style={styles.jobDescIcon} />
                        )}
                        <Text style={styles.jobDescriptionText}>{job.description}</Text>
                      </View>

                      {/* Bottom Footer Row: Metadata on Left, Action Button on Right */}
                      <View style={styles.jobFooterRow}>
                        {isOpen ? (
                          <View style={styles.jobMetaLeft}>
                            <Clock size={15} color="#006A42" />
                            <Text style={styles.jobMetaText}>
                              {job.employer?.fullName
                                ? `Pemberi: ${job.employer.fullName}`
                                : 'Estimasi: 1.5 - 2.5 Jam'}
                            </Text>
                          </View>
                        ) : (
                          <View style={styles.jobMetaLeft}>
                            <User size={15} color="#3D4A41" />
                            <Text style={styles.jobMetaText}>
                              {job.worker?.fullName
                                ? `${job.worker.fullName} • Sedang berjalan`
                                : 'Warga Pekon • Sedang dikerjakan'}
                            </Text>
                          </View>
                        )}

                        {isOpen ? (
                          <TouchableOpacity
                            style={styles.claimJobButton}
                            onPress={() => handleClaimJob(job.id, job.title)}
                            activeOpacity={0.85}
                            accessible={true}
                            accessibilityLabel={`Ambil tugas ${job.title}`}
                          >
                            <Text style={styles.claimJobButtonText}>Ambil Tugas</Text>
                            <ArrowRight size={15} color="#FFFFFF" />
                          </TouchableOpacity>
                        ) : (
                          <View style={styles.claimedLockedBadge}>
                            <Lock size={13} color="#3D4A41" />
                            <Text style={styles.claimedLockedText}>Telah Diklaim</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        ) : (
          /* =====================================================================
             TAB 2: HASIL BUMI PETANI (Mengacu pada desain/marketplace/hasil bumi petani.md)
             ===================================================================== */
          <View style={styles.tabBody}>
            {/* Section Header */}
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleWrap}>
                <Text style={styles.sectionTitleLarge}>Katalog Hasil Bumi</Text>
                <Text style={styles.sectionSubtitle}>
                  Harga wajar langsung dari petani pekon.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.primaryActionPill}
                onPress={() => setShowCreateHarvestModal(true)}
                activeOpacity={0.85}
                accessible={true}
                accessibilityLabel="Pasang Panen Baru"
              >
                <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={styles.primaryActionPillText}>Pasang Panen</Text>
              </TouchableOpacity>
            </View>

            {/* Commodity Filter Chips (Horizontal Scrollable) */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalChipsContainer}
            >
              {COMMODITY_FILTERS.map((item) => {
                const isSelected = commodityFilter === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[
                      styles.commodityChip,
                      isSelected ? styles.commodityChipActive : styles.commodityChipInactive,
                    ]}
                    onPress={() => setCommodityFilter(item.key)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.commodityChipText,
                        isSelected
                          ? styles.commodityChipTextActive
                          : styles.commodityChipTextInactive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Listings List Container */}
            {loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color="#006A42" />
                <Text style={styles.loadingText}>Memuat katalog hasil bumi petani...</Text>
              </View>
            ) : filteredHarvests.length === 0 ? (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIconCircle}>
                  <Sprout size={30} color="#006A42" />
                </View>
                <Text style={styles.emptyTitle}>Belum Ada Hasil Panen</Text>
                <Text style={styles.emptySubtitle}>
                  Petani pekon sedang masa tanam atau belum ada lelang panen baru pada kategori ini. Mulai pasang hasil panen Anda sekarang!
                </Text>
                <TouchableOpacity
                  style={styles.emptyCtaButton}
                  onPress={() => setShowCreateHarvestModal(true)}
                  activeOpacity={0.85}
                >
                  <Plus size={16} color="#FFFFFF" />
                  <Text style={styles.emptyCtaButtonText}>Daftarkan Hasil Kebun</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.cardsStackLarge}>
                {filteredHarvests.map((h) => {
                  const visual = getCommodityVisual(h.commodityName);
                  const minPrice = Number(h.minPricePerKg || 0);
                  const estKg = Number(h.estimatedKg || 0);
                  const totalValue = minPrice * estKg;
                  const bids = Array.isArray(h.bids) ? h.bids : [];

                  return (
                    <View
                      key={h.id}
                      style={[styles.harvestCard, { padding: isCompact ? 14 : 16 }]}
                    >
                      {/* 1. Media & Info Row */}
                      <View style={styles.harvestTopRow}>
                        <View style={styles.harvestMediaBox}>
                          <Image
                            source={{ uri: visual.uri }}
                            style={styles.harvestImage}
                            resizeMode="cover"
                          />
                          <View style={styles.harvestImageBadge}>
                            {visual.isGrade ? (
                              <Star size={10} color="#006A42" fill="#006A42" />
                            ) : (
                              <Sparkles size={10} color="#006A42" />
                            )}
                            <Text style={styles.harvestImageBadgeText}>{visual.badge}</Text>
                          </View>
                        </View>

                        <View style={styles.harvestInfoCol}>
                          <View>
                            <View style={styles.pekonLocationBadge}>
                              <Text style={styles.pekonLocationBadgeText} numberOfLines={1}>
                                📍 Kebun {h.pekon?.namaPekon || 'Pagelaran Utara'}
                              </Text>
                            </View>
                            <Text style={styles.harvestCommodityTitle} numberOfLines={2}>
                              {h.commodityName}
                            </Text>
                            <Text style={styles.harvestFarmerSubtitle} numberOfLines={1}>
                              {h.farmer?.fullName || 'Petani Warga'} •{' '}
                              {h.pekon?.namaPekon ? `Pekon ${h.pekon.namaPekon}` : 'Pringsewu'}
                            </Text>
                          </View>

                          <View style={styles.verifiedFarmerRow}>
                            <CheckCircle2 size={14} color="#006A42" />
                            <Text style={styles.verifiedFarmerText}>Petani Terverifikasi</Text>
                          </View>
                        </View>
                      </View>

                      {/* 2. Pricing Highlight Box */}
                      <View style={styles.pricingHighlightBox}>
                        <View style={styles.pricingHeaderRow}>
                          <Text style={styles.pricingHeaderLabel}>HARGA MINIMUM PETANI</Text>
                          <Text style={styles.pricingMainValue}>
                            Rp {minPrice.toLocaleString('id-ID')}{' '}
                            <Text style={styles.pricingUnitText}>/ kg</Text>
                          </Text>
                        </View>

                        <View style={styles.pricingSubGrid}>
                          <View style={styles.pricingSubItem}>
                            <Scale size={17} color="#4D6058" />
                            <View style={styles.pricingSubTextCol}>
                              <Text style={styles.pricingSubLabel}>Estimasi Panen</Text>
                              <Text style={styles.pricingSubValue} numberOfLines={1}>
                                {estKg.toLocaleString('id-ID')} kg
                              </Text>
                            </View>
                          </View>

                          <View style={styles.pricingSubDivider} />

                          <View style={styles.pricingSubItem}>
                            <Coins size={17} color="#4D6058" />
                            <View style={styles.pricingSubTextCol}>
                              <Text style={styles.pricingSubLabel}>Estimasi Total</Text>
                              <Text style={styles.pricingSubValueHighlight} numberOfLines={1}>
                                Rp {totalValue.toLocaleString('id-ID')}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>

                      {/* 3. Live Bidding Status Bar */}
                      <View style={styles.liveBiddingStatusBar}>
                        <View style={styles.liveBiddingLeft}>
                          <View style={styles.pulseDotSmall} />
                          <Text style={styles.liveBiddingCountText}>
                            {bids.length} Tawaran Masuk
                          </Text>
                        </View>
                        <Text style={styles.liveBiddingDeadlineText}>
                          Batas akhir: Lelang Terbuka
                        </Text>
                      </View>

                      {/* 4. Collector Bidding Section */}
                      {bids.length > 0 && (
                        <View style={styles.collectorBiddingContainer}>
                          <Text style={styles.collectorBiddingSectionTitle}>
                            Daftar Penawaran Pengepul
                          </Text>

                          {bids.map((bid: any, idx: number) => {
                            const offered = Number(bid.offeredPricePerKg || 0);
                            const diff = Math.max(0, offered - minPrice);
                            const isTopOffer = idx === 0;

                            return (
                              <View
                                key={bid.id || idx}
                                style={[
                                  styles.bidItemCard,
                                  !isTopOffer && styles.bidItemCardSecondary,
                                ]}
                              >
                                <View style={styles.bidderInfoCol}>
                                  <View style={styles.bidderNameRow}>
                                    <Text style={styles.bidderNameText} numberOfLines={1}>
                                      {bid.collector?.fullName || 'Pengepul Mitra Pekon'}
                                    </Text>
                                    {(bid.collector?.isTrustedCollector || isTopOffer) && (
                                      <Star size={13} color="#006A42" fill="#006A42" />
                                    )}
                                  </View>

                                  <View style={styles.bidderPriceRow}>
                                    <Text
                                      style={[
                                        styles.bidderOfferedPrice,
                                        !isTopOffer && styles.bidderOfferedPriceSecondary,
                                      ]}
                                    >
                                      Rp {offered.toLocaleString('id-ID')} / kg
                                    </Text>
                                    {diff > 0 && (
                                      <View style={styles.bidDiffPill}>
                                        <Text style={styles.bidDiffPillText}>
                                          +Rp {diff.toLocaleString('id-ID')}
                                        </Text>
                                      </View>
                                    )}
                                  </View>
                                </View>

                                <TouchableOpacity
                                  style={styles.acceptBidButton}
                                  onPress={() =>
                                    handleAcceptBid(bid.id, h.commodityName, bid.offeredPricePerKg)
                                  }
                                  activeOpacity={0.85}
                                  accessible={true}
                                  accessibilityLabel={`Terima tawaran dari ${bid.collector?.fullName || 'Pengepul'}`}
                                >
                                  <Check size={13} color="#FFFFFF" strokeWidth={2.5} />
                                  <Text style={styles.acceptBidButtonText}>Terima & Kunci</Text>
                                </TouchableOpacity>
                              </View>
                            );
                          })}
                        </View>
                      )}

                      {/* 5. Action Button: Ajukan Tawaran Harga */}
                      <TouchableOpacity
                        style={styles.placeBidActionButton}
                        onPress={() => {
                          setSelectedHarvestForBid(h);
                          setBidPrice(String(h.minPricePerKg));
                          setShowBidModal(true);
                        }}
                        activeOpacity={0.85}
                        accessible={true}
                        accessibilityLabel={`Ajukan tawaran harga untuk ${h.commodityName}`}
                      >
                        <Gavel size={18} color="#006A42" />
                        <Text style={styles.placeBidActionButtonText}>
                          Ajukan Tawaran Harga
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}

                {/* Interactive Empty State Preview Accordion (Sesuai hasil bumi petani.md) */}
                <View style={styles.emptyPreviewAccordionCard}>
                  <TouchableOpacity
                    style={styles.accordionHeaderBtn}
                    onPress={() => setShowEmptyHarvestPreview((prev) => !prev)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.accordionHeaderLeft}>
                      <Eye size={18} color="#006A42" />
                      <Text style={styles.accordionHeaderTitle}>
                        Tampilan Saat Panen Kosong (Preview)
                      </Text>
                    </View>
                    {showEmptyHarvestPreview ? (
                      <ChevronUp size={20} color="#3D4A41" />
                    ) : (
                      <ChevronDown size={20} color="#3D4A41" />
                    )}
                  </TouchableOpacity>

                  {showEmptyHarvestPreview && (
                    <View style={styles.accordionEmptyBody}>
                      <View style={styles.emptyIconCircle}>
                        <Sprout size={30} color="#006A42" />
                      </View>
                      <Text style={styles.emptyTitle}>Belum Ada Hasil Panen</Text>
                      <Text style={styles.emptySubtitle}>
                        Petani pekon sedang masa tanam atau belum ada lelang panen baru hari ini. Mulai pasang hasil panen Anda sekarang!
                      </Text>
                      <TouchableOpacity
                        style={styles.emptyCtaButton}
                        onPress={() => setShowCreateHarvestModal(true)}
                        activeOpacity={0.85}
                      >
                        <Plus size={16} color="#FFFFFF" />
                        <Text style={styles.emptyCtaButtonText}>Daftarkan Hasil Kebun</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* =====================================================================
         MODAL 1: BUKA LOWONGAN KERJA MIKRO (Mengacu pada burst mini job.md)
         ===================================================================== */}
      <Modal
        visible={showCreateJobModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCreateJobModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 24) }]}>
            <View style={styles.sheetHandle} />

            {/* Modal Header */}
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalHeaderTitleCol}>
                <Text style={styles.modalTitle}>Buka Lowongan Kerja Mikro</Text>
                <Text style={styles.modalSubtitle}>
                  Bantu tetangga pekon sekaligus tuntaskan tugas harian.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowCreateJobModal(false)}
                activeOpacity={0.8}
              >
                <X size={18} color="#3D4A41" />
              </TouchableOpacity>
            </View>

            {/* Form Inputs */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalFormContent}
            >
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Judul Pekerjaan / Tugas</Text>
                <TextInput
                  style={styles.pillInput}
                  placeholder="Contoh: Kupas Kelapa Parut 30 Butir"
                  placeholderTextColor="#6D7A70"
                  value={jobTitle}
                  onChangeText={setJobTitle}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Besaran Upah Tunai (Rp)</Text>
                <View style={styles.currencyInputWrapper}>
                  <Text style={styles.currencyPrefixText}>Rp</Text>
                  <TextInput
                    style={styles.currencyPillInput}
                    placeholder="50.000"
                    placeholderTextColor="#6D7A70"
                    keyboardType="numeric"
                    value={jobWage}
                    onChangeText={setJobWage}
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Lokasi / Titik Penyerahan</Text>
                <TextInput
                  style={styles.pillInput}
                  placeholder="Dusun 2, Belakang Balai Pekon"
                  placeholderTextColor="#6D7A70"
                  value={jobLocation}
                  onChangeText={setJobLocation}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Rincian Tugas & Peralatan</Text>
                <TextInput
                  style={styles.multilineRoundedInput}
                  placeholder="Jelaskan rincian pekerjaan dan peralatan yang disediakan..."
                  placeholderTextColor="#6D7A70"
                  multiline
                  textAlignVertical="top"
                  value={jobDescription}
                  onChangeText={setJobDescription}
                />
              </View>

              {/* Inclusivity Checkbox Toggle */}
              <TouchableOpacity
                style={styles.inclusivityToggleCard}
                onPress={() => setJobIsDisabilityFriendly((prev) => !prev)}
                activeOpacity={0.85}
              >
                <View
                  style={[
                    styles.checkboxSquare,
                    jobIsDisabilityFriendly && styles.checkboxSquareChecked,
                  ]}
                >
                  {jobIsDisabilityFriendly && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                </View>
                <View style={styles.inclusivityTextCol}>
                  <Text style={styles.inclusivityTitle}>Tugas Ramah Disabilitas</Text>
                  <Text style={styles.inclusivitySubtitle}>
                    Tugas dapat diselesaikan dengan posisi duduk & tanpa mobilitas berat.
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.modalPrimarySubmitBtn, submitting && styles.buttonDisabled]}
                onPress={handleCreateJob}
                disabled={submitting}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Send size={18} color="#FFFFFF" />
                    <Text style={styles.modalPrimarySubmitBtnText}>
                      Terbitkan Pekerjaan Mikro
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* =====================================================================
         MODAL 2: FORM POSTING PANEN PETANI
         ===================================================================== */}
      <Modal
        visible={showCreateHarvestModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCreateHarvestModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 24) }]}>
            <View style={styles.sheetHandle} />

            <View style={styles.modalHeaderRow}>
              <View style={styles.modalHeaderTitleCol}>
                <Text style={styles.modalTitle}>Pasang Hasil Panen Baru</Text>
                <Text style={styles.modalSubtitle}>
                  Buka lelang hasil bumi ke jaringan pengepul jujur pekon.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowCreateHarvestModal(false)}
                activeOpacity={0.8}
              >
                <X size={18} color="#3D4A41" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalFormContent}
            >
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Nama Komoditas Panen</Text>
                <TextInput
                  style={styles.pillInput}
                  placeholder="Contoh: Singkong Mukibat Super, Kakao Fermentasi"
                  placeholderTextColor="#6D7A70"
                  value={harvestCommodity}
                  onChangeText={setHarvestCommodity}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Estimasi Berat Panen (Kg)</Text>
                <TextInput
                  style={styles.pillInput}
                  placeholder="Contoh: 1500"
                  placeholderTextColor="#6D7A70"
                  keyboardType="numeric"
                  value={harvestKg}
                  onChangeText={setHarvestKg}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Harga Minimum Petani (Rp / Kg)</Text>
                <View style={styles.currencyInputWrapper}>
                  <Text style={styles.currencyPrefixText}>Rp</Text>
                  <TextInput
                    style={styles.currencyPillInput}
                    placeholder="Contoh: 2500"
                    placeholderTextColor="#6D7A70"
                    keyboardType="numeric"
                    value={harvestMinPrice}
                    onChangeText={setHarvestMinPrice}
                  />
                </View>
              </View>

              {Number(harvestKg) > 0 && Number(harvestMinPrice) > 0 && (
                <View style={styles.harvestEstimatePreviewBox}>
                  <Text style={styles.harvestEstimatePreviewLabel}>
                    Estimasi Nilai Total Panen:
                  </Text>
                  <Text style={styles.harvestEstimatePreviewValue}>
                    Rp {(Number(harvestKg) * Number(harvestMinPrice)).toLocaleString('id-ID')}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.modalPrimarySubmitBtn, submitting && styles.buttonDisabled]}
                onPress={handleCreateHarvest}
                disabled={submitting}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Sprout size={18} color="#FFFFFF" />
                    <Text style={styles.modalPrimarySubmitBtnText}>
                      Daftarkan Hasil Kebun
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* =====================================================================
         MODAL 3: FORM AJUKAN TAWARAN PENGEPUL (BIDDING)
         ===================================================================== */}
      <Modal
        visible={showBidModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowBidModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 24) }]}>
            <View style={styles.sheetHandle} />

            <View style={styles.modalHeaderRow}>
              <View style={styles.modalHeaderTitleCol}>
                <Text style={styles.modalTitle}>Ajukan Penawaran Harga</Text>
                <Text style={styles.modalSubtitle}>
                  {selectedHarvestForBid?.commodityName || 'Komoditas Panen'} (
                  {Number(selectedHarvestForBid?.estimatedKg || 0).toLocaleString('id-ID')} kg)
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowBidModal(false)}
                activeOpacity={0.8}
              >
                <X size={18} color="#3D4A41" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalFormContent}
            >
              {/* Selected Commodity Floor Price Highlight */}
              <View style={styles.bidFloorInfoCard}>
                <View style={styles.bidFloorRow}>
                  <Text style={styles.bidFloorLabel}>Harga Minimum Petani</Text>
                  <Text style={styles.bidFloorValue}>
                    Rp {Number(selectedHarvestForBid?.minPricePerKg || 0).toLocaleString('id-ID')} / kg
                  </Text>
                </View>
                <Text style={styles.bidFloorHelper}>
                  Tawaran Anda harus sama atau lebih tinggi dari batas minimum petani.
                </Text>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Harga Beli yang Anda Tawarkan (Rp / Kg)</Text>
                <View style={styles.currencyInputWrapper}>
                  <Text style={styles.currencyPrefixText}>Rp</Text>
                  <TextInput
                    style={styles.currencyPillInput}
                    placeholder="Contoh: 2700"
                    placeholderTextColor="#6D7A70"
                    keyboardType="numeric"
                    value={bidPrice}
                    onChangeText={setBidPrice}
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Kode Referral Mitra (Opsional)</Text>
                <TextInput
                  style={styles.pillInput}
                  placeholder="Contoh: JUJUR-SURATNO"
                  placeholderTextColor="#6D7A70"
                  autoCapitalize="characters"
                  value={bidReferralCode}
                  onChangeText={setBidReferralCode}
                />
                <Text style={styles.fieldHelperText}>
                  Pemberi referral menerima komisi mikro Rp 5.000 + poin reputasi setelah transaksi selesai.
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.modalPrimarySubmitBtn, submitting && styles.buttonDisabled]}
                onPress={handlePlaceBid}
                disabled={submitting}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Gavel size={18} color="#FFFFFF" />
                    <Text style={styles.modalPrimarySubmitBtnText}>Kirim Penawaran Harga</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FCF9F8',
  },
  /* Top App Bar */
  topHeader: {
    backgroundColor: '#FCF9F8',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(188, 202, 191, 0.35)',
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
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  brandIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#96F6C2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  brandTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#1C1B1B',
    letterSpacing: -0.3,
  },
  activeStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 1,
  },
  pulseDotSmall: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#006A42',
  },
  activeStatusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#006A42',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  gpsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F6F3F2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
  },
  gpsBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3D4A41',
  },
  avatarButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#006A42',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Scroll Container */
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 14,
  },

  /* Ecosystem Pill & Segmented Switcher */
  switcherSection: {
    gap: 10,
    marginBottom: 16,
  },
  ecosystemPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: '#F6F3F2',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(188, 202, 191, 0.35)',
  },
  ecosystemPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3D4A41',
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: '#F0EDED',
    padding: 5,
    borderRadius: 9999,
    gap: 6,
  },
  segmentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 9999,
  },
  segmentButtonActive: {
    backgroundColor: '#006A42',
    shadowColor: '#006A42',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentButtonInactive: {
    backgroundColor: '#FFFFFF',
  },
  segmentButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  segmentButtonTextActive: {
    color: '#FFFFFF',
  },
  segmentButtonTextInactive: {
    color: '#3D4A41',
  },

  /* Section Header */
  tabBody: {
    gap: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1B1B',
    letterSpacing: -0.3,
  },
  sectionTitleLarge: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1C1B1B',
    letterSpacing: -0.4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#3D4A41',
    marginTop: 2,
    lineHeight: 18,
  },
  primaryActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#006A42',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 9999,
    flexShrink: 0,
    shadowColor: '#006A42',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryActionPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Filter Horizontal Chips */
  horizontalChipsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9999,
  },
  filterChipActive: {
    backgroundColor: '#96F6C2',
  },
  filterChipInactive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(188, 202, 191, 0.5)',
  },
  chipStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#00734B',
    fontWeight: '700',
  },
  filterChipTextInactive: {
    color: '#3D4A41',
  },

  /* Commodity Filter Chips */
  commodityChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
  },
  commodityChipActive: {
    backgroundColor: '#96F6C2',
  },
  commodityChipInactive: {
    backgroundColor: '#F6F3F2',
  },
  commodityChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  commodityChipTextActive: {
    color: '#00734B',
    fontWeight: '700',
  },
  commodityChipTextInactive: {
    color: '#3D4A41',
  },

  /* Zero-Discrimination Banner */
  zeroDiscriminationBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: 'rgba(150, 246, 194, 0.32)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 106, 66, 0.14)',
  },
  zeroDiscIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 106, 66, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  zeroDiscContent: {
    flex: 1,
    gap: 3,
  },
  zeroDiscTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  zeroDiscTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#006A42',
  },
  zeroDiscDesc: {
    fontSize: 12.5,
    color: '#3D4A41',
    lineHeight: 18,
  },

  /* Mini-Job Cards Stack */
  cardsStack: {
    gap: 14,
  },
  cardsStackLarge: {
    gap: 18,
  },
  jobCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(188, 202, 191, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  jobCardLocked: {
    backgroundColor: '#F6F3F2',
    opacity: 0.92,
  },
  jobHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  jobHeaderLeft: {
    flex: 1,
    gap: 6,
    minWidth: 0,
  },
  jobBadgesWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  disabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(150, 246, 194, 0.45)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  disabilityBadgeLocked: {
    backgroundColor: 'rgba(150, 246, 194, 0.25)',
  },
  disabilityBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#006A42',
  },
  badgeTextLocked: {
    color: '#3D4A41',
  },
  generalBadge: {
    backgroundColor: '#EAE7E7',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  generalBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3D4A41',
  },
  statusPillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F6F3F2',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  statusPillBadgeLocked: {
    backgroundColor: '#E5E2E1',
  },
  statusDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3D4A41',
  },
  jobTitleText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1B1B',
    lineHeight: 24,
  },
  jobWageColumn: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  jobWageLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3D4A41',
  },
  jobWageValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#006A42',
    marginTop: 1,
  },
  jobWageValueLocked: {
    color: '#3D4A41',
  },
  jobDescriptionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    backgroundColor: 'rgba(246, 243, 242, 0.85)',
    padding: 12,
    borderRadius: 14,
  },
  jobDescriptionBoxLocked: {
    backgroundColor: '#F0EDED',
  },
  jobDescIcon: {
    marginTop: 2,
    flexShrink: 0,
  },
  jobDescriptionText: {
    flex: 1,
    fontSize: 13,
    color: '#3D4A41',
    lineHeight: 19,
  },
  jobFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingTop: 2,
  },
  jobMetaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: 0,
  },
  jobMetaText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3D4A41',
    flexShrink: 1,
  },
  claimJobButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#006A42',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 9999,
    flexShrink: 0,
  },
  claimJobButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  claimedLockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#E5E2E1',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9999,
    flexShrink: 0,
  },
  claimedLockedText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#3D4A41',
  },

  /* Harvest Bursa Card */
  harvestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(188, 202, 191, 0.45)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  harvestTopRow: {
    flexDirection: 'row',
    gap: 12,
  },
  harvestMediaBox: {
    width: 92,
    height: 92,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#EAE7E7',
    flexShrink: 0,
    position: 'relative',
  },
  harvestImage: {
    width: '100%',
    height: '100%',
  },
  harvestImageBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(252, 249, 248, 0.92)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  harvestImageBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#006A42',
  },
  harvestInfoCol: {
    flex: 1,
    justifyContent: 'space-between',
    minWidth: 0,
    gap: 6,
  },
  pekonLocationBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#96F6C2',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 9999,
    marginBottom: 4,
    maxWidth: '100%',
  },
  pekonLocationBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00734B',
  },
  harvestCommodityTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1B1B',
    lineHeight: 23,
  },
  harvestFarmerSubtitle: {
    fontSize: 12.5,
    color: '#3D4A41',
    marginTop: 2,
  },
  verifiedFarmerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  verifiedFarmerText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#006A42',
  },

  /* Pricing Highlight Box */
  pricingHighlightBox: {
    backgroundColor: '#F6F3F2',
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  pricingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  pricingHeaderLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3D4A41',
    letterSpacing: 0.5,
  },
  pricingMainValue: {
    fontSize: 19,
    fontWeight: '800',
    color: '#006A42',
  },
  pricingUnitText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#3D4A41',
  },
  pricingSubGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderRadius: 12,
    padding: 10,
    gap: 8,
  },
  pricingSubItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  pricingSubDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(188, 202, 191, 0.5)',
  },
  pricingSubTextCol: {
    flex: 1,
    minWidth: 0,
  },
  pricingSubLabel: {
    fontSize: 11,
    color: '#3D4A41',
  },
  pricingSubValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1C1B1B',
    marginTop: 1,
  },
  pricingSubValueHighlight: {
    fontSize: 13,
    fontWeight: '800',
    color: '#006A42',
    marginTop: 1,
  },

  /* Live Bidding Status Bar */
  liveBiddingStatusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  liveBiddingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveBiddingCountText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1C1B1B',
  },
  liveBiddingDeadlineText: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#3D4A41',
  },

  /* Collector Bidding Section */
  collectorBiddingContainer: {
    backgroundColor: '#F6F3F2',
    borderRadius: 16,
    padding: 12,
    gap: 8,
  },
  collectorBiddingSectionTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#3D4A41',
  },
  bidItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  bidItemCardSecondary: {
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
  },
  bidderInfoCol: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  bidderNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  bidderNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1C1B1B',
    flexShrink: 1,
  },
  bidderPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  bidderOfferedPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: '#006A42',
  },
  bidderOfferedPriceSecondary: {
    color: '#3D4A41',
    fontWeight: '700',
  },
  bidDiffPill: {
    backgroundColor: '#96F6C2',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  bidDiffPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#00734B',
  },
  acceptBidButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#006A42',
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 9999,
    flexShrink: 0,
  },
  acceptBidButtonText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Place Bid CTA */
  placeBidActionButton: {
    width: '100%',
    paddingVertical: 13,
    borderRadius: 9999,
    backgroundColor: '#F6F3F2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 106, 66, 0.16)',
  },
  placeBidActionButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#006A42',
  },

  /* Empty State & Preview Accordion */
  emptyPreviewAccordionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(188, 202, 191, 0.45)',
  },
  accordionHeaderBtn: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  accordionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  accordionHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1C1B1B',
  },
  accordionEmptyBody: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 6,
    alignItems: 'center',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(188, 202, 191, 0.45)',
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#96F6C2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1B1B',
    marginBottom: 4,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#3D4A41',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 16,
  },
  emptyCtaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#006A42',
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 9999,
  },
  emptyCtaButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Loading */
  loadingWrap: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: '#3D4A41',
    fontWeight: '500',
  },

  /* Bottom-Sheet Modals */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(28, 27, 27, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
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
    width: 48,
    height: 6,
    borderRadius: 9999,
    backgroundColor: '#E5E2E1',
    alignSelf: 'center',
    marginBottom: 14,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(188, 202, 191, 0.35)',
  },
  modalHeaderTitleCol: {
    flex: 1,
    gap: 2,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#1C1B1B',
  },
  modalSubtitle: {
    fontSize: 12.5,
    color: '#3D4A41',
    lineHeight: 18,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0EDED',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  modalFormContent: {
    paddingTop: 16,
    gap: 16,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1C1B1B',
  },
  fieldHelperText: {
    fontSize: 11.5,
    color: '#3D4A41',
    lineHeight: 16,
    marginTop: 2,
  },
  pillInput: {
    height: 52,
    paddingHorizontal: 18,
    borderRadius: 9999,
    backgroundColor: '#F6F3F2',
    fontSize: 14,
    color: '#1C1B1B',
    borderWidth: 1,
    borderColor: 'rgba(188, 202, 191, 0.45)',
  },
  currencyInputWrapper: {
    height: 52,
    borderRadius: 9999,
    backgroundColor: '#F6F3F2',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: 'rgba(188, 202, 191, 0.45)',
  },
  currencyPrefixText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#006A42',
    marginRight: 10,
  },
  currencyPillInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1B1B',
  },
  multilineRoundedInput: {
    minHeight: 88,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 20,
    backgroundColor: '#F6F3F2',
    fontSize: 14,
    color: '#1C1B1B',
    borderWidth: 1,
    borderColor: 'rgba(188, 202, 191, 0.45)',
  },
  inclusivityToggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(150, 246, 194, 0.25)',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(0, 106, 66, 0.18)',
  },
  checkboxSquare: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#006A42',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkboxSquareChecked: {
    backgroundColor: '#006A42',
  },
  inclusivityTextCol: {
    flex: 1,
    gap: 2,
  },
  inclusivityTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#006A42',
  },
  inclusivitySubtitle: {
    fontSize: 12,
    color: '#3D4A41',
    lineHeight: 17,
  },
  harvestEstimatePreviewBox: {
    backgroundColor: 'rgba(150, 246, 194, 0.28)',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  harvestEstimatePreviewLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#3D4A41',
  },
  harvestEstimatePreviewValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#006A42',
  },
  bidFloorInfoCard: {
    backgroundColor: 'rgba(150, 246, 194, 0.28)',
    borderRadius: 18,
    padding: 14,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 106, 66, 0.16)',
  },
  bidFloorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bidFloorLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3D4A41',
  },
  bidFloorValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#006A42',
  },
  bidFloorHelper: {
    fontSize: 11.5,
    color: '#3D4A41',
  },
  modalPrimarySubmitBtn: {
    height: 52,
    borderRadius: 9999,
    backgroundColor: '#006A42',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
    shadowColor: '#006A42',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 3,
  },
  modalPrimarySubmitBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.65,
  },
});
