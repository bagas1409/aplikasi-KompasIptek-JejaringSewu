import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Animated, Platform } from 'react-native';
import { Radio, ShieldCheck, Sparkles, MapPin, Zap } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';

interface PekonHeroHeaderProps {
  onAvatarPress?: () => void;
  subtitle?: string;
}

export default function PekonHeroHeader({ onAvatarPress, subtitle }: PekonHeroHeaderProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  // Animasi denyut / pulse pada ikon node
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [pulseColorIndex, setPulseColorIndex] = useState(0);
  const pulseColors = ['#00F2A9', '#34D399', '#60A5FA']; // Mint, Emerald, Cyan

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.18, duration: 180, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1.1, duration: 180, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    ).start();

    const interval = setInterval(() => {
      setPulseColorIndex((prev) => (prev + 1) % pulseColors.length);
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  const fullName = user?.fullName || 'Warga Tamu';
  const displayName = fullName.length > 20 ? fullName.slice(0, 20) + '...' : fullName;
  const userInitials = fullName
    ? fullName
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'WP';

  const roleLabel = user?.role === 'PENGEPUL' ? 'Mitra Pengepul' : user?.role === 'WARGA' ? 'Warga Produktif' : 'Tamu Pekon';

  return (
    <View
      style={{
        paddingTop: Math.max(insets.top, 14),
        shadowColor: '#00F2A9',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 8,
      }}
      className="bg-[#151C1E] px-5 pb-5 rounded-b-[28px] border-b border-[#2A363A]"
    >
      {/* BARIS 1: Sapaan & Avatar Inisial */}
      <View className="flex-row justify-between items-center mb-3">
        <View className="flex-1 pr-3">
          <View className="flex-row items-center mb-0.5">
            <Text className="text-pekon-muted text-xs font-bold tracking-widest uppercase">
              TABIK PUN,
            </Text>
            <View className="w-1.5 h-1.5 rounded-full bg-[#00F2A9] mx-1.5" />
            <Text className="text-[#00F2A9] text-[10px] font-bold">
              {roleLabel}
            </Text>
          </View>
          <Text className="text-white text-lg font-black tracking-tight" numberOfLines={1}>
            {displayName}
          </Text>
          <View className="flex-row items-center mt-0.5">
            <MapPin size={11} color="#84958A" />
            <Text className="text-pekon-muted text-[11px] ml-1">
              {subtitle || 'Node Pekon Pagelaran • Kab. Pringsewu'}
            </Text>
          </View>
        </View>

        {/* AVATAR INISIAL (Curved Circle dengan Ring Emerald) */}
        <TouchableOpacity
          onPress={onAvatarPress}
          activeOpacity={0.8}
          className="rounded-full bg-[#1E2629] border-2 border-[#00F2A9]/60 p-0.5"
          style={{
            shadowColor: '#00F2A9',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 6,
            elevation: 4,
          }}
        >
          <View className="h-11 w-11 rounded-full bg-[#0B0F10] items-center justify-center">
            <Text className="text-[#00F2A9] font-black text-sm tracking-wider">
              {userInitials}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* BARIS 2: WELCOME HERO CARD DENGAN ANIMATED PULSE */}
      <View className="rounded-2xl overflow-hidden bg-[#1E2629] border border-[#2A363A]">
        <View className="p-3.5 flex-row justify-between items-center bg-[#182124]">
          <View className="flex-1 mr-3">
            <View className="flex-row items-center mb-0.5">
              <Sparkles size={11} color="#00F2A9" />
              <Text className="text-[#00F2A9] text-[10px] font-extrabold uppercase tracking-widest ml-1">
                JEJARING-SEWU
              </Text>
            </View>
            <Text className="text-white text-sm font-bold leading-tight">
              Sinergi Ekonomi & Logistik Pekon
            </Text>
            <Text className="text-pekon-muted text-[10px] mt-0.5 leading-normal" numberOfLines={1}>
              Platform Terintegrasi BAPPERIDA & BUMDes Pringsewu
            </Text>
          </View>

          {/* ANIMATED PULSING NODE RADAR */}
          <Animated.View
            className="h-11 w-11 bg-[#12181A] rounded-xl items-center justify-center border border-[#2A363A]"
            style={{
              elevation: 4,
              shadowColor: pulseColors[pulseColorIndex],
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.5,
              shadowRadius: 8,
              transform: [{ scale: scaleAnim }],
            }}
          >
            <Zap size={20} color={pulseColors[pulseColorIndex]} strokeWidth={2.4} />
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

