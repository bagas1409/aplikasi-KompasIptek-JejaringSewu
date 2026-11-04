import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Linking,
  StyleSheet,
  useWindowDimensions,
  Platform,
} from 'react-native';
import {
  CircleUser,
  ShieldCheck,
  ShieldAlert,
  LogOut,
  MapPin,
  ChevronRight,
  Wheat,
  Truck,
  HeartHandshake,
  Check,
  Star,
  Sprout,
  ArrowLeftRight,
  MessageCircle,
  HelpCircle,
  Lock,
  Power,
  Type,
  X,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/services/api';
import { StatusBar } from 'expo-status-bar';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const isCompact = windowWidth < 380;

  const {
    user,
    isLoading,
    loginAsPetani,
    loginAsPengepul,
    loginAsPekerjaDisabilitas,
    logout,
  } = useAuth();

  const [submittingAuth, setSubmittingAuth] = useState(false);
  const [isLargeFont, setIsLargeFont] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Status simulasi NIK KTP (Memungkinkan demo perubahan status)
  const [simulatedNikStatus, setSimulatedNikStatus] = useState<boolean | null>(null);

  // Live Wallet & Scoring Snapshot
  const [walletData, setWalletData] = useState<any>(null);
  const [scoreData, setCreditScoreData] = useState<any>(null);

  useEffect(() => {
    if (user) {
      apiClient
        .get('/wallets/me')
        .then((res: any) => setWalletData(res.data))
        .catch(() => {});
      apiClient
        .get('/credit-scoring/me')
        .then((res: any) => setCreditScoreData(res.data))
        .catch(() => {});
    }
  }, [user]);

  // Switcher Akun Demo 1-Klik
  const handleDemoSwitch = async (roleName: string, action: () => Promise<any>) => {
    setSubmittingAuth(true);
    try {
      const loggedUser = await action();
      Alert.alert('Berhasil Beralih Akun', `Masuk sebagai ${loggedUser.fullName} (${roleName}).`);
    } catch (err: any) {
      Alert.alert('Gagal Beralih Akun', err.message || 'Terjadi gangguan saat beralih akun.');
    } finally {
      setSubmittingAuth(false);
    }
  };

  // Konfirmasi Logout
  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      setShowLogoutModal(false);
    } catch (err: any) {
      Alert.alert('Gagal Keluar', err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Buka WhatsApp BUMDes Resmi
  const handleOpenWhatsApp = () => {
    const waUrl = 'https://wa.me/6281234567891?text=Halo%20BUMDes%20Pagelaran,%20saya%20warga%20pekon%20ingin%20bertanya%20layanan.';
    Linking.canOpenURL(waUrl)
      .then((supported) => {
        if (supported) {
          Linking.openURL(waUrl);
        } else {
          Alert.alert('Kontak BUMDes', 'Nomor WhatsApp Resmi BUMDes Pagelaran: 0812-3456-7891');
        }
      })
      .catch(() => {
        Alert.alert('Kontak BUMDes', 'Nomor WhatsApp Resmi BUMDes Pagelaran: 0812-3456-7891');
      });
  };

  if (isLoading || !user) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#006A42" />
        <Text style={styles.loadingText}>Memuat profil warga...</Text>
      </View>
    );
  }

  const fullName = user.fullName || 'Warga Pekon';
  const userInitials = fullName
    ? fullName
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'WP';

  // Penentuan status verifikasi NIK (real atau simulasi)
  const isNikValid = simulatedNikStatus !== null ? simulatedNikStatus : Boolean(user.isNikVerified);

  // Penentuan peran aktif untuk styling kartu peran
  const currentRole = user.role || '';
  const isPetaniActive = currentRole === 'FARMER' || fullName.toLowerCase().includes('slamet');
  const isPengepulActive = currentRole === 'COLLECTOR' || fullName.toLowerCase().includes('suratno');
  const isInklusifActive = currentRole === 'WORKER' || fullName.toLowerCase().includes('yanti');

  // Skor BUMDes terhitung
  const currentScoreNum = scoreData?.currentScore ? Number(scoreData.currentScore) : 78.4;
  const gradeLabel = scoreData?.grade
    ? scoreData.grade.includes('GRADE_A')
      ? 'Grade A'
      : 'Grade B'
    : 'Grade A';

  // Kas Warga terhitung
  const cashBalanceFormatted = walletData?.cashBalance
    ? `Rp ${Number(walletData.cashBalance).toLocaleString('id-ID')}`
    : 'Rp 1,48M';

  // Poin PoW terhitung
  const pointsBalanceNum = walletData?.pointsBalance ? Number(walletData.pointsBalance) : 480;

  return (
    <View style={styles.screen}>
      <StatusBar style="light" backgroundColor="#006A42" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* =====================================================================
           1. TOP PROFILE HERO SECTION (desain/profile/profile.md)
           ===================================================================== */}
        <View style={[styles.heroHeader, { paddingTop: Math.max(insets.top, 16) }]}>
          {/* Subtle Ambient Decorative Circles */}
          <View style={styles.heroAmbientCircleRight} pointerEvents="none" />
          <View style={styles.heroAmbientCircleLeft} pointerEvents="none" />

          {/* Header Top Row: Title + Large Font Accessibility Switcher */}
          <View style={styles.heroTopRow}>
            <View style={styles.heroTitleWrap}>
              <CircleUser size={26} color="#80FAB9" />
              <Text
                style={[
                  styles.heroMainTitle,
                  isLargeFont && { fontSize: 22 },
                ]}
              >
                Profil Saya
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.fontToggleBtn,
                isLargeFont && styles.fontToggleBtnActive,
              ]}
              onPress={() => setIsLargeFont((prev) => !prev)}
              activeOpacity={0.85}
              accessible={true}
              accessibilityLabel="Ubah ukuran teks aksesibilitas"
            >
              <Type size={16} color="#FFFFFF" />
              <Text style={styles.fontToggleBtnText}>
                {isLargeFont ? 'Font: Besar' : 'Font: Normal'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* User Identity Block */}
          <View style={styles.userIdentityBlock}>
            {/* Avatar Circle with Verification Badge */}
            <View style={styles.avatarWrap}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarInitialsText}>{userInitials}</Text>
              </View>
              <View style={styles.avatarVerifiedBadge}>
                <Check size={13} color="#FFFFFF" strokeWidth={3} />
              </View>
            </View>

            {/* Identity Details */}
            <View style={styles.identityDetailsCol}>
              <Text
                style={[
                  styles.userNameText,
                  isLargeFont && { fontSize: 21 },
                ]}
                numberOfLines={1}
              >
                {fullName}
              </Text>
              <Text style={styles.userPhoneText}>{user.phoneNumber || '0813-8821-9042'}</Text>
              <View style={styles.pekonLocationPill}>
                <MapPin size={12} color="#80FAB9" />
                <Text style={styles.pekonLocationPillText} numberOfLines={1}>
                  Pekon Pagelaran • Petani Binaan BUMDes
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* =====================================================================
           2. MAIN CONTENT SPACE (Overlapping & Flow)
           ===================================================================== */}
        <View style={[styles.mainBodyContainer, { paddingHorizontal: isCompact ? 14 : 18 }]}>
          {/* A. Community Financial Summary Card (TripleStatsCard) */}
          <View style={styles.whiteModuleCard}>
            <View style={styles.statsCardHeaderRow}>
              <View style={styles.statsCardHeaderLeft}>
                <Sprout size={17} color="#006A42" />
                <Text
                  style={[
                    styles.statsCardHeaderTitle,
                    isLargeFont && { fontSize: 14.5 },
                  ]}
                >
                  Ringkasan Finansial Warga
                </Text>
              </View>
              <View style={styles.seasonBadge}>
                <Text style={styles.seasonBadgeText}>Musim Tanam 2</Text>
              </View>
            </View>

            {/* 3-Column Divide */}
            <View style={styles.statsThreeColsRow}>
              {/* Col 1: BUMDes Score */}
              <View style={styles.statsCol}>
                <View style={styles.statsNumberRow}>
                  <Text style={[styles.statsMainNum, { color: '#006A42' }]}>
                    {currentScoreNum.toFixed(1)}
                  </Text>
                  <Text style={styles.statsSubUnit}>/100</Text>
                </View>
                <View style={styles.gradePill}>
                  <Text style={styles.gradePillText}>{gradeLabel}</Text>
                </View>
                <Text style={styles.statsColLabel}>Skor BUMDes</Text>
              </View>

              <View style={styles.statsDivider} />

              {/* Col 2: Cash Balance */}
              <View style={styles.statsCol}>
                <Text
                  style={[styles.statsMainNum, { color: '#1C1B1B' }]}
                  numberOfLines={1}
                >
                  {cashBalanceFormatted}
                </Text>
                <View style={styles.liquidPill}>
                  <Text style={styles.liquidPillText}>Likuid</Text>
                </View>
                <Text style={styles.statsColLabel}>Kas Warga</Text>
              </View>

              <View style={styles.statsDivider} />

              {/* Col 3: PoW Reputation */}
              <View style={styles.statsCol}>
                <View style={styles.statsNumberRow}>
                  <Text style={[styles.statsMainNum, { color: '#006A42' }]}>
                    {pointsBalanceNum}
                  </Text>
                  <Star size={14} color="#006C46" fill="#006C46" style={{ marginTop: 2 }} />
                </View>
                <View style={styles.reputationPill}>
                  <Text style={styles.reputationPillText}>Tinggi</Text>
                </View>
                <Text style={styles.statsColLabel}>Poin PoW</Text>
              </View>
            </View>
          </View>

          {/* B. NIK Verification Status Card with Toggle Interaction */}
          <View style={styles.whiteModuleCard}>
            <View style={styles.nikCardTopRow}>
              <View
                style={[
                  styles.nikIconBox,
                  isNikValid ? styles.nikIconBoxValid : styles.nikIconBoxPending,
                ]}
              >
                {isNikValid ? (
                  <ShieldCheck size={22} color="#006A42" />
                ) : (
                  <ShieldAlert size={22} color="#4D6058" />
                )}
              </View>

              <View style={styles.nikTextCol}>
                <View style={styles.nikHeaderTitleRow}>
                  <Text
                    style={[
                      styles.nikTitleText,
                      isLargeFont && { fontSize: 15 },
                    ]}
                  >
                    {isNikValid
                      ? 'Identitas NIK Terverifikasi'
                      : 'Menunggu Validasi KTP'}
                  </Text>
                  <View
                    style={[
                      styles.nikStatusPill,
                      isNikValid ? styles.nikStatusPillValid : styles.nikStatusPillPending,
                    ]}
                  >
                    <Text
                      style={[
                        styles.nikStatusPillText,
                        isNikValid ? styles.nikStatusPillTextValid : styles.nikStatusPillTextPending,
                      ]}
                    >
                      {isNikValid ? 'Valid' : 'Proses'}
                    </Text>
                  </View>
                </View>

                <Text
                  style={[
                    styles.nikDescText,
                    isLargeFont && { fontSize: 13, lineHeight: 18 },
                  ]}
                >
                  {isNikValid
                    ? 'Akun terhubung resmi dengan database kependudukan Dinas Kominfo & Desa Pekon Pagelaran.'
                    : 'Berkas kartu kependudukan sedang diverifikasi petugas kantor desa Pekon Pagelaran.'}
                </Text>
              </View>
            </View>

            {/* Simulation State Switcher Pill */}
            <View style={styles.nikSimBar}>
              <Text style={styles.nikSimPromptText}>Simulasi Status Verifikasi:</Text>
              <TouchableOpacity
                style={styles.nikSimBtn}
                onPress={() => setSimulatedNikStatus((prev) => (prev === false ? true : false))}
                activeOpacity={0.8}
              >
                <Text style={styles.nikSimBtnText}>
                  {isNikValid ? 'Uji Status Review' : 'Kembalikan Valid'}
                </Text>
                <ArrowLeftRight size={13} color="#006C46" />
              </TouchableOpacity>
            </View>
          </View>

          {/* C. Demo Account Role Switcher */}
          <View style={styles.roleSectionWrap}>
            <View style={styles.roleSectionHeaderRow}>
              <View style={styles.roleHeaderTitleWrap}>
                <Text
                  style={[
                    styles.roleSectionTitle,
                    isLargeFont && { fontSize: 18 },
                  ]}
                >
                  Beralih Peran (Demo)
                </Text>
                <Text style={styles.roleSectionSubtitle}>
                  Jelajahi alur aplikasi dari berbagai sudut pandang warga.
                </Text>
              </View>
            </View>

            {/* Role 1: Petani (Pak Slamet) */}
            <TouchableOpacity
              style={[
                styles.roleCard,
                isPetaniActive && styles.roleCardActive,
              ]}
              disabled={submittingAuth}
              onPress={() => handleDemoSwitch('Petani Singkong', loginAsPetani)}
              activeOpacity={0.85}
              accessible={true}
              accessibilityLabel="Beralih ke akun Pak Slamet Petani"
            >
              <View style={styles.roleCardInnerRow}>
                <View style={styles.roleIconBoxPetani}>
                  <Wheat size={20} color="#006A42" />
                </View>
                <View style={styles.roleTextCol}>
                  <View style={styles.roleNameTagRow}>
                    <Text style={styles.rolePersonName}>Pak Slamet</Text>
                    <View style={styles.roleTagPillPetani}>
                      <Text style={styles.roleTagPillTextPetani}>Petani</Text>
                    </View>
                  </View>
                  <Text style={styles.roleDescText}>Posting Panen • Nebeng Jastip Logistik</Text>
                </View>
              </View>

              {isPetaniActive ? (
                <View style={styles.activeRolePill}>
                  <Check size={12} color="#FFFFFF" strokeWidth={3} />
                  <Text style={styles.activeRolePillText}>Aktif</Text>
                </View>
              ) : (
                <ChevronRight size={18} color="#6D7A70" />
              )}
            </TouchableOpacity>

            {/* Role 2: Pengepul (H. Suratno) */}
            <TouchableOpacity
              style={[
                styles.roleCard,
                isPengepulActive && styles.roleCardActive,
              ]}
              disabled={submittingAuth}
              onPress={() => handleDemoSwitch('Pengepul Jujur', loginAsPengepul)}
              activeOpacity={0.85}
              accessible={true}
              accessibilityLabel="Beralih ke akun H. Suratno Pengepul"
            >
              <View style={styles.roleCardInnerRow}>
                <View style={styles.roleIconBoxPengepul}>
                  <Truck size={20} color="#4D6058" />
                </View>
                <View style={styles.roleTextCol}>
                  <View style={styles.roleNameTagRow}>
                    <Text style={styles.rolePersonName}>H. Suratno</Text>
                    <View style={styles.roleTagPillPengepul}>
                      <Text style={styles.roleTagPillTextPengepul}>Pengepul</Text>
                    </View>
                  </View>
                  <Text style={styles.roleDescText}>Tawar Hasil Bumi • Kode Rujukan Angkut</Text>
                </View>
              </View>

              {isPengepulActive ? (
                <View style={styles.activeRolePill}>
                  <Check size={12} color="#FFFFFF" strokeWidth={3} />
                  <Text style={styles.activeRolePillText}>Aktif</Text>
                </View>
              ) : (
                <ChevronRight size={18} color="#6D7A70" />
              )}
            </TouchableOpacity>

            {/* Role 3: Pekerja Inklusif (Mbak Yanti) */}
            <TouchableOpacity
              style={[
                styles.roleCard,
                isInklusifActive && styles.roleCardActive,
              ]}
              disabled={submittingAuth}
              onPress={() => handleDemoSwitch('Pekerja Disabilitas', loginAsPekerjaDisabilitas)}
              activeOpacity={0.85}
              accessible={true}
              accessibilityLabel="Beralih ke akun Mbak Yanti Pekerja Inklusif"
            >
              <View style={styles.roleCardInnerRow}>
                <View style={styles.roleIconBoxInklusif}>
                  <HeartHandshake size={20} color="#384B43" />
                </View>
                <View style={styles.roleTextCol}>
                  <View style={styles.roleNameTagRow}>
                    <Text style={styles.rolePersonName}>Mbak Yanti</Text>
                    <View style={styles.roleTagPillInklusif}>
                      <Text style={styles.roleTagPillTextInklusif}>Pekerja Inklusif</Text>
                    </View>
                  </View>
                  <Text style={styles.roleDescText}>Mini-Job Prioritas • Validasi Foto PoW</Text>
                </View>
              </View>

              {isInklusifActive ? (
                <View style={styles.activeRolePill}>
                  <Check size={12} color="#FFFFFF" strokeWidth={3} />
                  <Text style={styles.activeRolePillText}>Aktif</Text>
                </View>
              ) : (
                <ChevronRight size={18} color="#6D7A70" />
              )}
            </TouchableOpacity>
          </View>

          {/* D. Help & Support Section */}
          <View style={styles.whiteModuleCard}>
            <View style={styles.helpTopRow}>
              <View style={styles.helpIconCircle}>
                <HelpCircle size={20} color="#006A42" />
              </View>
              <View style={styles.helpTextCol}>
                <Text
                  style={[
                    styles.helpTitleText,
                    isLargeFont && { fontSize: 15 },
                  ]}
                >
                  Call Center BUMDes Pagelaran
                </Text>
                <Text
                  style={[
                    styles.helpDescText,
                    isLargeFont && { fontSize: 13, lineHeight: 18 },
                  ]}
                >
                  Butuh panduan pendaftaran kelompok tani fisik atau informasi pencairan modal kerja?
                </Text>
              </View>
            </View>

            <View style={styles.helpBottomRow}>
              <View>
                <Text style={styles.helpWaLabel}>WhatsApp BUMDes Resmi</Text>
                <Text style={styles.helpWaNumber}>0812-3456-7891</Text>
              </View>

              <TouchableOpacity
                style={styles.helpContactBtn}
                onPress={handleOpenWhatsApp}
                activeOpacity={0.85}
                accessible={true}
                accessibilityLabel="Hubungi WhatsApp BUMDes"
              >
                <MessageCircle size={15} color="#00734B" />
                <Text style={styles.helpContactBtnText}>Hubungi</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* E. Logout Trigger Button */}
          <View style={styles.logoutWrap}>
            <TouchableOpacity
              style={styles.logoutTriggerBtn}
              onPress={() => setShowLogoutModal(true)}
              activeOpacity={0.85}
              accessible={true}
              accessibilityLabel="Keluar dari Akun"
            >
              <LogOut size={18} color="#BA1A1A" />
              <Text
                style={[
                  styles.logoutTriggerBtnText,
                  isLargeFont && { fontSize: 16 },
                ]}
              >
                Keluar dari Akun
              </Text>
            </TouchableOpacity>

            <View style={styles.appVersionFooter}>
              <Text style={styles.appVersionText}>
                KompasIptek • Jejaring Pekon v2.4.0
              </Text>
              <View style={styles.encryptionFooterRow}>
                <Lock size={12} color="#BCCABF" />
                <Text style={styles.encryptionFooterText}>
                  Terenkripsi Standar Kependudukan Desa
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* =====================================================================
         LOGOUT CONFIRMATION MODAL DIALOG (desain/profile/profile.md)
         ===================================================================== */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.logoutDialogCard}>
            <View style={styles.logoutIconCircle}>
              <Power size={26} color="#BA1A1A" />
            </View>

            <Text style={styles.logoutDialogTitle}>Keluar Akun Warga?</Text>
            <Text style={styles.logoutDialogDesc}>
              Sesi Anda pada perangkat ini akan diakhiri. Pastikan pengiriman laporan panen harian telah tersimpan.
            </Text>

            <View style={styles.logoutDialogActions}>
              <TouchableOpacity
                style={[styles.confirmLogoutBtn, isLoggingOut && { opacity: 0.7 }]}
                disabled={isLoggingOut}
                onPress={handleConfirmLogout}
                activeOpacity={0.85}
              >
                {isLoggingOut ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmLogoutBtnText}>Ya, Keluar Sekarang</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelLogoutBtn}
                onPress={() => setShowLogoutModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelLogoutBtnText}>Batal</Text>
              </TouchableOpacity>
            </View>
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
    backgroundColor: '#FCF9F8',
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: '#FCF9F8',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: '#3D4A41',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 110,
  },

  /* 1. Hero Header Section */
  heroHeader: {
    backgroundColor: '#006A42',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingHorizontal: 20,
    paddingBottom: 40,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#006A42',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 4,
  },
  heroAmbientCircleRight: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  heroAmbientCircleLeft: {
    position: 'absolute',
    bottom: -40,
    left: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(150, 246, 194, 0.1)',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    zIndex: 10,
  },
  heroTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroMainTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  fontToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
  },
  fontToggleBtnActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  fontToggleBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  /* User Identity Block */
  userIdentityBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    zIndex: 10,
  },
  avatarWrap: {
    position: 'relative',
    flexShrink: 0,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  avatarInitialsText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#006A42',
    letterSpacing: 0.5,
  },
  avatarVerifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#008655',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#006A42',
  },
  identityDetailsCol: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  userNameText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userPhoneText: {
    fontSize: 12.5,
    fontFamily: monoFont,
    color: '#80FAB9',
    letterSpacing: 0.4,
  },
  pekonLocationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(150, 246, 194, 0.22)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 9999,
    alignSelf: 'flex-start',
    marginTop: 3,
    maxWidth: '100%',
  },
  pekonLocationPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    flexShrink: 1,
  },

  /* 2. Main Body Container (Overlapping) */
  mainBodyContainer: {
    marginTop: -24,
    gap: 16,
    zIndex: 20,
  },

  /* Common White Module Card */
  whiteModuleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(188, 202, 191, 0.45)',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },

  /* A. Triple Stats Card */
  statsCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EDED',
  },
  statsCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statsCardHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1C1B1B',
  },
  seasonBadge: {
    backgroundColor: 'rgba(150, 246, 194, 0.4)',
    paddingHorizontal: 9,
    paddingVertical: 2.5,
    borderRadius: 9999,
  },
  seasonBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#006C46',
  },
  statsThreeColsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  statsCol: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 4,
  },
  statsDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#E5E2E1',
  },
  statsNumberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  statsMainNum: {
    fontSize: 17,
    fontWeight: '800',
  },
  statsSubUnit: {
    fontSize: 11,
    color: '#6D7A70',
    fontWeight: '500',
  },
  gradePill: {
    backgroundColor: 'rgba(128, 250, 185, 0.4)',
    paddingHorizontal: 8,
    paddingVertical: 1.5,
    borderRadius: 9999,
  },
  gradePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#006C46',
  },
  liquidPill: {
    backgroundColor: '#F0EDED',
    paddingHorizontal: 8,
    paddingVertical: 1.5,
    borderRadius: 9999,
  },
  liquidPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#3D4A41',
  },
  reputationPill: {
    backgroundColor: 'rgba(150, 246, 194, 0.4)',
    paddingHorizontal: 8,
    paddingVertical: 1.5,
    borderRadius: 9999,
  },
  reputationPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#002112',
  },
  statsColLabel: {
    fontSize: 11,
    color: '#6D7A70',
    marginTop: 1,
  },

  /* B. NIK Status Card */
  nikCardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  nikIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  nikIconBoxValid: {
    backgroundColor: 'rgba(150, 246, 194, 0.45)',
  },
  nikIconBoxPending: {
    backgroundColor: '#E5E2E1',
  },
  nikTextCol: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  nikHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  nikTitleText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1C1B1B',
    flex: 1,
  },
  nikStatusPill: {
    paddingHorizontal: 9,
    paddingVertical: 2,
    borderRadius: 9999,
    flexShrink: 0,
  },
  nikStatusPillValid: {
    backgroundColor: '#006A42',
  },
  nikStatusPillPending: {
    backgroundColor: '#4D6058',
  },
  nikStatusPillText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  nikStatusPillTextValid: {
    color: '#FFFFFF',
  },
  nikStatusPillTextPending: {
    color: '#FFFFFF',
  },
  nikDescText: {
    fontSize: 12,
    color: '#6D7A70',
    lineHeight: 17,
  },
  nikSimBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0EDED',
  },
  nikSimPromptText: {
    fontSize: 11,
    color: '#6D7A70',
  },
  nikSimBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  nikSimBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#006C46',
  },

  /* C. Demo Role Switcher */
  roleSectionWrap: {
    gap: 8,
  },
  roleSectionHeaderRow: {
    paddingHorizontal: 2,
  },
  roleHeaderTitleWrap: {
    gap: 2,
  },
  roleSectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1C1B1B',
  },
  roleSectionSubtitle: {
    fontSize: 12,
    color: '#6D7A70',
  },
  roleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 13,
    borderWidth: 1,
    borderColor: 'rgba(188, 202, 191, 0.45)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  roleCardActive: {
    borderColor: '#006A42',
    borderWidth: 1.5,
    backgroundColor: '#FFFFFF',
  },
  roleCardInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  roleIconBoxPetani: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(128, 250, 185, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  roleIconBoxPengepul: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EAE7E7',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  roleIconBoxInklusif: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(210, 232, 221, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  roleTextCol: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  roleNameTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rolePersonName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1C1B1B',
  },
  roleTagPillPetani: {
    backgroundColor: 'rgba(128, 250, 185, 0.5)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  roleTagPillTextPetani: {
    fontSize: 10,
    fontWeight: '700',
    color: '#006C46',
  },
  roleTagPillPengepul: {
    backgroundColor: '#EAE7E7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  roleTagPillTextPengepul: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4D6058',
  },
  roleTagPillInklusif: {
    backgroundColor: '#D2E8DD',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  roleTagPillTextInklusif: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0C1F19',
  },
  roleDescText: {
    fontSize: 11.5,
    color: '#6D7A70',
  },
  activeRolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#006A42',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  activeRolePillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* D. Help & Support Card */
  helpTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  helpIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(128, 250, 185, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  helpTextCol: {
    flex: 1,
    gap: 2,
  },
  helpTitleText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1C1B1B',
  },
  helpDescText: {
    fontSize: 12,
    color: '#6D7A70',
    lineHeight: 17,
  },
  helpBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0EDED',
  },
  helpWaLabel: {
    fontSize: 10.5,
    color: '#6D7A70',
  },
  helpWaNumber: {
    fontSize: 13.5,
    fontFamily: monoFont,
    fontWeight: '700',
    color: '#1C1B1B',
    marginTop: 1,
  },
  helpContactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#96F6C2',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 9999,
  },
  helpContactBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00734B',
  },

  /* E. Logout Trigger */
  logoutWrap: {
    paddingTop: 4,
    gap: 14,
  },
  logoutTriggerBtn: {
    width: '100%',
    height: 50,
    borderRadius: 9999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(188, 202, 191, 0.45)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  logoutTriggerBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#BA1A1A',
  },
  appVersionFooter: {
    alignItems: 'center',
    gap: 3,
  },
  appVersionText: {
    fontSize: 11.5,
    color: '#6D7A70',
  },
  encryptionFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  encryptionFooterText: {
    fontSize: 10.5,
    color: '#BCCABF',
  },

  /* Logout Confirmation Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(49, 48, 48, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  logoutDialogCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(188, 202, 191, 0.45)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 8,
  },
  logoutIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFDAD6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoutDialogTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1C1B1B',
    marginBottom: 6,
    textAlign: 'center',
  },
  logoutDialogDesc: {
    fontSize: 12.5,
    color: '#6D7A70',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  logoutDialogActions: {
    width: '100%',
    gap: 8,
  },
  confirmLogoutBtn: {
    width: '100%',
    height: 46,
    borderRadius: 9999,
    backgroundColor: '#BA1A1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmLogoutBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cancelLogoutBtn: {
    width: '100%',
    height: 44,
    borderRadius: 9999,
    backgroundColor: '#F0EDED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelLogoutBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3D4A41',
  },
});
