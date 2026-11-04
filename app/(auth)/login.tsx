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
import { Config } from '@/constants/Config';
import {
  Phone,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Leaf,
  HelpCircle,
  Globe,
  Check,
} from 'lucide-react-native';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { loginWithPassword } = useAuth();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!phoneNumber.trim() || !password.trim()) {
      Alert.alert('Perhatian', 'Nomor WhatsApp dan kata sandi wajib diisi.');
      return;
    }

    try {
      setLoading(true);
      console.log(`📱 [UI LOGIN SUBMIT] Mengirim kredensial untuk: ${phoneNumber.trim()}`);
      await loginWithPassword(phoneNumber.trim(), password);
      console.log('✅ [UI LOGIN SUCCESS] Pengalihan otomatis via Auth Guard dipicu.');
      // Auth Guard di Root Layout akan otomatis mengarahkan ke (tabs)
    } catch (err: any) {
      const errMsg =
        err?.response?.data?.message ||
        err?.message ||
        'Nomor WhatsApp atau kata sandi tidak cocok.';
      console.error('❌ [UI LOGIN ERROR]', errMsg);
      Alert.alert('Gagal Masuk', errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: '#DCE8EE' }}
    >
      <StatusBar style="dark" />

      {/* Ambient Atmospheric Blur Layers (Background Ornaments) */}
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
        {/* Top App Bar Header */}
        <View className="flex-row items-center justify-between mb-5">
          <View className="flex-row items-center space-x-2.5">
            <View className="w-10 h-10 rounded-2xl bg-white/80 items-center justify-center shadow-sm border border-white/60">
              <Leaf size={20} color="#006a42" />
            </View>
            <View>
              <Text className="text-[10px] font-bold uppercase tracking-wider text-[#3d4a41]/80">
                Pekon ID • Pringsewu
              </Text>
              <Text className="text-base font-extrabold text-[#1c1b1b]">
                Jejaring <Text className="text-[#006a42]">Sewu</Text>
              </Text>
            </View>
          </View>

          <View className="flex-row items-center space-x-2">
            <View className="h-8 px-2.5 rounded-full bg-white/80 border border-white/60 flex-row items-center space-x-1 shadow-sm">
              <Globe size={13} color="#3d4a41" />
              <Text className="text-[11px] font-bold text-[#3d4a41]">ID</Text>
            </View>
            <TouchableOpacity
              onPress={() =>
                Alert.alert(
                  'Bantuan Masuk',
                  `Layanan warga Jejaring-Sewu terhubung ke server Pekon:\n${Config.API_BASE_URL}\n\nGunakan nomor WhatsApp aktif Anda.`
                )
              }
              className="w-8 h-8 rounded-full bg-white/80 border border-white/60 items-center justify-center shadow-sm"
            >
              <HelpCircle size={16} color="#3d4a41" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Floating White Auth Card */}
        <View className="w-full bg-white rounded-[32px] shadow-xl border border-white/80 overflow-hidden mb-4">
          {/* Card Top Decorative Header */}
          <View className="relative bg-[#f6fbf8] pt-7 pb-5 px-6 items-center text-center border-b border-[#e5e2e1]/60">
            {/* Center Branded Logo Badge */}
            <View className="w-14 h-14 rounded-2xl bg-[#006a42] items-center justify-center shadow-md mb-2.5">
              <Leaf size={28} color="#96f6c2" />
            </View>
            <Text className="text-2xl font-black text-[#1c1b1b] tracking-tight">
              Selamat Datang
            </Text>
            <Text className="text-xs text-[#3d4a41] mt-1 text-center font-medium">
              Masuk untuk melanjutkan aktivitas gotong royong Pekon
            </Text>
          </View>

          {/* Form Body */}
          <View className="p-6">
            {/* Input Nomor WhatsApp / HP */}
            <View className="mb-4">
              <Text className="text-xs font-bold text-[#1c1b1b] mb-1.5 ml-1">
                Nomor WhatsApp / HP
              </Text>
              <View className="h-[52px] rounded-full bg-[#f6f3f2] flex-row items-center px-4 border border-[#e5e2e1] focus:border-[#006a42] focus:bg-white">
                <Phone size={18} color="#6d7a70" />
                <TextInput
                  className="flex-1 ml-3 text-[#1c1b1b] text-sm"
                  placeholder="Contoh: 081234567894"
                  placeholderTextColor="#6d7a70"
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  editable={!loading}
                />
              </View>
            </View>

            {/* Input Kata Sandi */}
            <View className="mb-4">
              <Text className="text-xs font-bold text-[#1c1b1b] mb-1.5 ml-1">
                Kata Sandi
              </Text>
              <View className="h-[52px] rounded-full bg-[#f6f3f2] flex-row items-center px-4 border border-[#e5e2e1] focus:border-[#006a42] focus:bg-white">
                <Lock size={18} color="#6d7a70" />
                <TextInput
                  className="flex-1 ml-3 text-[#1c1b1b] text-sm"
                  placeholder="••••••••••••"
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

            {/* Remember Me & Forgot Password Row */}
            <View className="flex-row items-center justify-between mb-5 px-1">
              <TouchableOpacity
                onPress={() => setRememberMe(!rememberMe)}
                className="flex-row items-center space-x-2"
                activeOpacity={0.8}
              >
                <View
                  className={`w-4 h-4 rounded border items-center justify-center ${rememberMe ? 'bg-[#006a42] border-[#006a42]' : 'border-[#6d7a70] bg-white'
                    }`}
                >
                  {rememberMe && <Check size={11} color="#ffffff" strokeWidth={3} />}
                </View>
                <Text className="text-xs text-[#3d4a41] font-medium">Ingat saya</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() =>
                  Alert.alert(
                    'Lupa Kata Sandi',
                    'Silakan hubungi Call Center BUMDes Pagelaran di 0812-3456-7891 untuk verifikasi identitas fisik dan reset sandi.'
                  )
                }
              >
                <Text className="text-xs font-bold text-[#006a42]">Lupa Sandi?</Text>
              </TouchableOpacity>
            </View>

            {/* Primary Submit Button */}
            <TouchableOpacity
              onPress={handleLogin}
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
                    Masuk Sekarang
                  </Text>
                  <ArrowRight size={17} color="#ffffff" strokeWidth={2.5} />
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Card Bottom Footer */}
          <View className="bg-[#f6f3f2]/90 px-6 py-4 items-center border-t border-[#e5e2e1]">
            <View className="flex-row items-center space-x-1.5 mb-1.5">
              <Text className="text-xs text-[#3d4a41]">Belum punya akun warga?</Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/register' as any)}>
                <Text className="text-xs font-bold text-[#006a42] underline">
                  Daftar Akun Baru
                </Text>
              </TouchableOpacity>
            </View>
            <View className="flex-row items-center space-x-1.5 text-[11px]">
              <ShieldCheck size={13} color="#006a42" />
              <Text className="text-[10px] text-[#6d7a70]">
                Terintegrasi Layanan BUMDes Pekon Pagelaran
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
