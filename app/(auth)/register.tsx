import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/context/AuthContext';
import {
  ChevronLeft,
  User,
  CreditCard,
  Phone,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  Heart,
  ShieldCheck,
  Check,
  Leaf,
  Info,
  ArrowRight,
} from 'lucide-react-native';

const VULNERABILITY_OPTIONS = [
  { id: 'NONE', label: 'Warga Umum' },
  { id: 'DISABILITAS_FISIK', label: 'Disabilitas Fisik' },
  { id: 'LANSIA', label: 'Lansia Produktif' },
  { id: 'KELUARGA_RISIKO_STUNTING', label: 'Keluarga Risiko Stunting' },
];

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { register } = useAuth();

  const [fullName, setFullName] = useState('');
  const [nik, setNik] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedVulnerability, setSelectedVulnerability] = useState('NONE');
  const [termsAgreed, setTermsAgreed] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    // 1. Validasi Nama
    if (!fullName.trim() || fullName.trim().length < 3) {
      Alert.alert('Perhatian', 'Nama lengkap minimal 3 karakter sesuai KTP.');
      return;
    }

    // 2. Validasi NIK
    if (!nik.trim() || nik.trim().length !== 16 || !/^\d{16}$/.test(nik.trim())) {
      Alert.alert('Perhatian', 'NIK wajib terdiri dari 16 digit angka sesuai KTP.');
      return;
    }

    // 3. Validasi Nomor Telepon
    let formattedPhone = phoneNumber.trim();
    if (!formattedPhone || formattedPhone.length < 8) {
      Alert.alert('Perhatian', 'Nomor WhatsApp / HP tidak valid.');
      return;
    }
    // Jika user mengetik tanpa 0 di depan (karena prefix +62), pastikan diawali 08
    if (!formattedPhone.startsWith('0') && !formattedPhone.startsWith('+62') && !formattedPhone.startsWith('62')) {
      formattedPhone = `0${formattedPhone}`;
    }

    // 4. Validasi Kata Sandi
    if (!password.trim() || password.length < 8) {
      Alert.alert('Perhatian', 'Kata sandi minimal 8 karakter.');
      return;
    }
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumberOrSymbol = /[\d\W]/.test(password);
    if (!hasUpperCase || !hasLowerCase || !hasNumberOrSymbol) {
      Alert.alert(
        'Kata Sandi Belum Memenuhi Standar',
        'Kata sandi wajib mengandung kombinasi huruf besar (A-Z), huruf kecil (a-z), dan angka/simbol (0-9/!). Contoh: Pekon123!'
      );
      return;
    }

    // 5. Validasi Konfirmasi Sandi
    if (password !== confirmPassword) {
      Alert.alert('Perhatian', 'Konfirmasi kata sandi tidak cocok.');
      return;
    }

    // 6. Validasi Persetujuan Ketentuan
    if (!termsAgreed) {
      Alert.alert('Perhatian', 'Mohon setujui Ketentuan Layanan & Kebijakan Privasi.');
      return;
    }

    try {
      setLoading(true);
      console.log(`📱 [UI REGISTER SUBMIT] Mendaftarkan warga: ${fullName.trim()} (${formattedPhone})`);
      await register({
        nik: nik.trim(),
        fullName: fullName.trim(),
        phoneNumber: formattedPhone,
        password: password.trim(),
        vulnerabilityFlags: [selectedVulnerability],
      });
      console.log('✅ [UI REGISTER SUCCESS] Pendaftaran berhasil di server.');

      Alert.alert(
        'Pendaftaran Berhasil!',
        `Akun warga atas nama ${fullName.trim()} berhasil didaftarkan. Silakan masuk menggunakan nomor HP dan kata sandi Anda.`,
        [
          {
            text: 'Masuk Sekarang',
            onPress: () => router.replace('/(auth)/login'),
          },
        ]
      );
    } catch (err: any) {
      const errMsg =
        err?.response?.data?.message ||
        err?.message ||
        'Gagal mendaftarkan akun. Periksa kembali NIK atau Nomor HP Anda.';
      console.error('❌ [UI REGISTER ERROR]', errMsg);
      Alert.alert('Pendaftaran Gagal', errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: '#DCE8EE' }}
    >
      <StatusBar style="dark" backgroundColor="#DCE8EE" />

      {/* Ambient Atmospheric Blur Layers */}
      <View pointerEvents="none" className="absolute inset-0 overflow-hidden">
        <View
          style={{
            position: 'absolute',
            top: -60,
            left: -40,
            width: 280,
            height: 280,
            borderRadius: 140,
            backgroundColor: '#96f6c2',
            opacity: 0.35,
          }}
        />
        <View
          style={{
            position: 'absolute',
            top: '40%',
            right: -80,
            width: 320,
            height: 320,
            borderRadius: 160,
            backgroundColor: '#d2e8dd',
            opacity: 0.45,
          }}
        />
        <View
          style={{
            position: 'absolute',
            bottom: -50,
            left: 20,
            width: 260,
            height: 260,
            borderRadius: 130,
            backgroundColor: '#80fab9',
            opacity: 0.25,
          }}
        />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingTop: Math.max(insets.top + 8, 20),
          paddingBottom: Math.max(insets.bottom + 24, 40),
          paddingHorizontal: 20,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Top App Bar Header with Back Button */}
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center space-x-3">
            <TouchableOpacity
              onPress={() => router.back()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              className="w-10 h-10 rounded-full bg-white/80 border border-white/60 items-center justify-center shadow-sm"
            >
              <ChevronLeft size={20} color="#1c1b1b" />
            </TouchableOpacity>
            <View>
              <Text className="text-[10px] font-bold uppercase tracking-wider text-[#3d4a41]/80">
                Pekon ID
              </Text>
              <Text className="text-base font-extrabold text-[#1c1b1b]">
                Daftar Warga Baru
              </Text>
            </View>
          </View>

          <View className="w-9 h-9 rounded-full bg-[#006a42] items-center justify-center shadow-sm">
            <Leaf size={16} color="#96f6c2" />
          </View>
        </View>

        {/* Floating White Registration Card */}
        <View className="w-full bg-white rounded-[32px] shadow-xl border border-white/80 overflow-hidden mb-4">
          {/* Top Decorative Header */}
          <View className="relative bg-[#f6fbf8] pt-6 pb-4 px-6 items-center text-center border-b border-[#e5e2e1]/60">
            <View className="w-13 h-13 rounded-2xl bg-[#006a42] p-3 items-center justify-center shadow-md mb-2">
              <Leaf size={24} color="#96f6c2" />
            </View>
            <Text className="text-xl font-black text-[#1c1b1b] tracking-tight">
              Buat Akun Warga Baru
            </Text>
            <Text className="text-xs text-[#3d4a41] mt-0.5 text-center font-medium">
              Lengkapi data kependudukan untuk akses logistik & mini-job Pekon
            </Text>
          </View>

          {/* Form Body */}
          <View className="p-6">
            {/* Input Nama Lengkap */}
            <View className="mb-3.5">
              <Text className="text-xs font-bold text-[#1c1b1b] mb-1 ml-1">
                Nama Lengkap (Sesuai KTP)
              </Text>
              <View className="h-[50px] rounded-full bg-[#f6f3f2] flex-row items-center px-4 border border-[#e5e2e1] focus:border-[#006a42] focus:bg-white">
                <User size={18} color="#6d7a70" />
                <TextInput
                  className="flex-1 ml-3 text-[#1c1b1b] text-sm"
                  placeholder="Contoh: Budi Santoso"
                  placeholderTextColor="#6d7a70"
                  value={fullName}
                  onChangeText={setFullName}
                  editable={!loading}
                />
              </View>
            </View>

            {/* Input NIK */}
            <View className="mb-3.5">
              <Text className="text-xs font-bold text-[#1c1b1b] mb-1 ml-1">
                NIK (Nomor Induk Kependudukan 16 Digit)
              </Text>
              <View className="h-[50px] rounded-full bg-[#f6f3f2] flex-row items-center px-4 border border-[#e5e2e1] focus:border-[#006a42] focus:bg-white">
                <CreditCard size={18} color="#6d7a70" />
                <TextInput
                  className="flex-1 ml-3 text-[#1c1b1b] text-sm tracking-wider"
                  placeholder="16 Digit NIK KTP Anda"
                  placeholderTextColor="#6d7a70"
                  keyboardType="numeric"
                  maxLength={16}
                  value={nik}
                  onChangeText={setNik}
                  editable={!loading}
                />
              </View>
              <View className="flex-row items-center space-x-1.5 mt-1 px-2">
                <Info size={12} color="#6d7a70" />
                <Text className="text-[11px] text-[#6d7a70]">
                  NIK wajib 16 digit angka valid terdaftar di Pekon.
                </Text>
              </View>
            </View>

            {/* Input Nomor WhatsApp / HP */}
            <View className="mb-3.5 ">
              <Text className="text-xs font-bold text-[#1c1b1b] mb-1 ml-1">
                Nomor WhatsApp Aktif
              </Text>
              <View className="flex-row items-center space-x-2">
                <View className="h-[50px] px-3.5 rounded-full bg-[#f6f3f2] border border-[#e5e2e1] flex-row items-center space-x-1.5">
                  <Text className="text-xs">🇮🇩</Text>
                  <Text className="text-xs font-bold text-[#1c1b1b]">+62</Text>
                </View>
                <View className="flex-1 h-[50px] ml-2 rounded-full bg-[#f6f3f2] flex-row items-center px-4 border border-[#e5e2e1] focus:border-[#006a42] focus:bg-white">
                  <Phone size={17} color="#6d7a70" />
                  <TextInput
                    className="flex-1 ml-2.5 text-[#1c1b1b] text-sm"
                    placeholder="812 3456 7890"
                    placeholderTextColor="#6d7a70"
                    keyboardType="phone-pad"
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    editable={!loading}
                  />
                </View>
              </View>
            </View>

            {/* Input Kata Sandi */}
            <View className="mb-3.5">
              <Text className="text-xs font-bold text-[#1c1b1b] mb-1 ml-1">
                Kata Sandi
              </Text>
              <View className="h-[50px] rounded-full bg-[#f6f3f2] flex-row items-center px-4 border border-[#e5e2e1] focus:border-[#006a42] focus:bg-white">
                <Lock size={18} color="#6d7a70" />
                <TextInput
                  className="flex-1 ml-3 text-[#1c1b1b] text-sm"
                  placeholder="Min 8 karakter (Huruf besar, kecil, angka)"
                  placeholderTextColor="#6d7a70"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  editable={!loading}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  className="p-1"
                >
                  {showPassword ? (
                    <EyeOff size={18} color="#6d7a70" />
                  ) : (
                    <Eye size={18} color="#6d7a70" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Input Konfirmasi Kata Sandi */}
            <View className="mb-4">
              <Text className="text-xs font-bold text-[#1c1b1b] mb-1 ml-1">
                Konfirmasi Kata Sandi
              </Text>
              <View className="h-[50px] rounded-full bg-[#f6f3f2] flex-row items-center px-4 border border-[#e5e2e1] focus:border-[#006a42] focus:bg-white">
                <Lock size={18} color="#6d7a70" />
                <TextInput
                  className="flex-1 ml-3 text-[#1c1b1b] text-sm"
                  placeholder="Ulangi kata sandi"
                  placeholderTextColor="#6d7a70"
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  editable={!loading}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  className="p-1"
                >
                  {showConfirmPassword ? (
                    <EyeOff size={18} color="#6d7a70" />
                  ) : (
                    <Eye size={18} color="#6d7a70" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Kategori Inklusif Warga */}
            <View className="mb-4">
              <View className="flex-row items-center space-x-1.5 mb-1 px-1">
                <Heart size={14} color="#006a42" />
                <Text className="text-xs font-bold text-[#1c1b1b] uppercase tracking-wider">
                  Kategori Inklusif Warga (Zero-Discrimination)
                </Text>
              </View>
              <Text className="text-[11px] text-[#6d7a70] mb-2 px-1">
                Pilih jika memenuhi kriteria afirmasi Mini-Job prioritas BUMDes:
              </Text>

              <View className="flex-row flex-wrap gap-2">
                {VULNERABILITY_OPTIONS.map((item) => {
                  const isSelected = selectedVulnerability === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => setSelectedVulnerability(item.id)}
                      className={`px-3 py-2 rounded-full border flex-row items-center space-x-1.5 ${isSelected
                        ? 'bg-[#d2e8dd] border-[#006a42]'
                        : 'bg-[#f6f3f2] border-[#e5e2e1]'
                        }`}
                    >
                      {isSelected && <CheckCircle2 size={13} color="#006a42" />}
                      <Text
                        className={`text-xs ${isSelected ? 'text-[#006a42] font-bold' : 'text-[#3d4a41]'
                          }`}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Terms & Privacy Agreement */}
            <TouchableOpacity
              onPress={() => setTermsAgreed(!termsAgreed)}
              activeOpacity={0.8}
              className="flex-row items-start space-x-2.5 mb-5 px-1"
            >
              <View
                className={`w-4 h-4 rounded border mt-0.5 items-center justify-center ${termsAgreed ? 'bg-[#006a42] border-[#006a42]' : 'border-[#6d7a70] bg-white'
                  }`}
              >
                {termsAgreed && <Check size={11} color="#ffffff" strokeWidth={3} />}
              </View>
              <Text className="flex-1 text-[11px] text-[#3d4a41] leading-relaxed">
                Saya menyetujui{' '}
                <Text className="text-[#006a42] font-bold underline">
                  Ketentuan Layanan
                </Text>{' '}
                dan{' '}
                <Text className="text-[#006a42] font-bold underline">
                  Kebijakan Privasi
                </Text>{' '}
                Pekon Pringsewu.
              </Text>
            </TouchableOpacity>

            {/* Primary Action Button */}
            <TouchableOpacity
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.85}
              className={`w-full h-[52px] rounded-full flex-row items-center justify-center space-x-2 shadow-md ${loading ? 'bg-[#006a42]/70' : 'bg-[#006a42] active:bg-[#008655]'
                }`}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <>
                  <Text className="text-white font-bold text-sm tracking-wide">
                    Daftarkan Akun Warga
                  </Text>
                  <ArrowRight size={17} color="#ffffff" strokeWidth={2.5} />
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Card Bottom Footer */}
          <View className="bg-[#f6f3f2]/90 px-6 py-4 items-center border-t border-[#e5e2e1]">
            <View className="flex-row items-center space-x-1.5 mb-1.5">
              <Text className="text-xs text-[#3d4a41]">Sudah terdaftar sebagai warga?</Text>
              <TouchableOpacity onPress={() => router.replace('/(auth)/login' as any)}>
                <Text className="text-xs font-bold text-[#006a42] underline">
                  Masuk Sekarang
                </Text>
              </TouchableOpacity>
            </View>
            <View className="flex-row items-center space-x-1.5 text-[11px]">
              <ShieldCheck size={13} color="#006a42" />
              <Text className="text-[10px] text-[#6d7a70]">
                Integrasi Validasi Database Pekon Pagelaran
              </Text>
            </View>
          </View>
        </View>

        {/* Supplementary Security Micro-Card */}
        <View className="self-center px-4 py-2 rounded-full bg-white/70 border border-white/80 flex-row items-center space-x-2 shadow-sm">
          <View className="w-2 h-2 rounded-full bg-[#006a42]" />
          <Text className="text-[11px] ml-2 font-semibold text-[#3d4a41]">
            Enkripsi NIK AES-256 & Integritas Buku Besar Pekon
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
