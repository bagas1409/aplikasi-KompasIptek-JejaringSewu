import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Wheat,
  Briefcase,
  Navigation,
  Camera,
  Coins,
  Gift,
} from 'lucide-react-native';

const SERVICES = [
  {
    key: 'harvest',
    title: 'Bursa Panen',
    subtitle: 'Komoditas Petani',
    route: '/(tabs)/marketplace',
    icon: Wheat,
    color: '#00F2A9',
    bgColor: 'rgba(0, 242, 169, 0.1)',
  },
  {
    key: 'minijob',
    title: 'Mini-Job',
    subtitle: 'Kerja Inklusif',
    route: '/(tabs)/marketplace',
    icon: Briefcase,
    color: '#C084FC',
    bgColor: 'rgba(192, 132, 252, 0.1)',
  },
  {
    key: 'commuter',
    title: 'Nebeng Jastip',
    subtitle: 'Rute Komuter',
    route: '/(tabs)/commuter',
    icon: Navigation,
    color: '#60A5FA',
    bgColor: 'rgba(96, 165, 250, 0.1)',
  },
  {
    key: 'pow',
    title: 'Selfie PoW',
    subtitle: 'Bukti Kerja Fisik',
    route: '/(tabs)/verify-camera',
    icon: Camera,
    color: '#34D399',
    bgColor: 'rgba(52, 211, 153, 0.1)',
  },
  {
    key: 'loan',
    title: 'Modal BUMDes',
    subtitle: 'Pinjaman Rp 1.5 Jt',
    route: '/(tabs)/wallet',
    icon: Coins,
    color: '#FBBF24',
    bgColor: 'rgba(251, 191, 36, 0.1)',
  },
  {
    key: 'nutrition',
    title: 'Pangan Gizi',
    subtitle: 'Tukar Poin Stunting',
    route: '/(tabs)/wallet',
    icon: Gift,
    color: '#F43F5E',
    bgColor: 'rgba(244, 63, 94, 0.1)',
  },
];

export default function QuickServiceGrid() {
  const router = useRouter();

  return (
    <View className="mt-4">
      <View className="flex-row justify-between items-center mb-3 px-1">
        <Text className="text-sm font-bold text-white uppercase tracking-wider">
          Layanan Unggulan Pekon
        </Text>
        <Text className="text-[11px] font-bold text-[#00F2A9]">
          Terpadu 6 Modul
        </Text>
      </View>

      <View className="flex-row flex-wrap justify-between">
        {SERVICES.map((s) => {
          const IconComp = s.icon;
          return (
            <TouchableOpacity
              key={s.key}
              activeOpacity={0.7}
              onPress={() => router.push(s.route as any)}
              className="w-[31%] items-center mb-3"
            >
              <View
                className="w-full aspect-square bg-[#151C1E] rounded-2xl items-center justify-center p-3 border border-[#2A363A]"
                style={{
                  shadowColor: s.color,
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.15,
                  shadowRadius: 6,
                  elevation: 3,
                }}
              >
                <View
                  style={{ backgroundColor: s.bgColor }}
                  className="w-10 h-10 rounded-xl items-center justify-center"
                >
                  <IconComp size={22} color={s.color} strokeWidth={2.2} />
                </View>
                <Text
                  className="text-[11px] font-bold text-white mt-1.5 text-center"
                  numberOfLines={1}
                >
                  {s.title}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

