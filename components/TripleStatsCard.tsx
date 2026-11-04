import React from 'react';
import { View, Text } from 'react-native';

interface TripleStatsCardProps {
  creditScore?: number | string;
  grade?: string;
  cashBalance?: number | string;
  pointsBalance?: number | string;
}

export default function TripleStatsCard({
  creditScore = '88.5',
  grade = 'Grade A',
  cashBalance = '25.000',
  pointsBalance = '50',
}: TripleStatsCardProps) {
  const formattedCash =
    typeof cashBalance === 'number'
      ? cashBalance >= 1000
        ? `${(cashBalance / 1000).toFixed(0)} Rb`
        : cashBalance.toString()
      : cashBalance;

  return (
    <View
      className="bg-[#151C1E] rounded-2xl p-4 flex-row justify-between items-center border border-[#2A363A]"
      style={{
        shadowColor: '#00F2A9',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      {/* METRIK 1: SKOR SPK */}
      <View className="flex-1 items-center border-r border-[#2A363A] pr-2">
        <Text className="text-[9px] text-pekon-muted font-extrabold uppercase tracking-widest mb-0.5">
          Skor Kredit
        </Text>
        <Text className="text-base font-black text-[#00F2A9]">
          {creditScore}
        </Text>
        <Text className="text-[10px] text-[#34D399] font-bold">
          {grade}
        </Text>
      </View>

      {/* METRIK 2: SALDO TUNAI */}
      <View className="flex-1 items-center border-r border-[#2A363A] px-2">
        <Text className="text-[9px] text-pekon-muted font-extrabold uppercase tracking-widest mb-0.5">
          Saldo Tunai
        </Text>
        <Text className="text-base font-black text-white" numberOfLines={1}>
          Rp {formattedCash}
        </Text>
        <Text className="text-[10px] text-pekon-muted font-medium">
          Upah Kerja
        </Text>
      </View>

      {/* METRIK 3: POIN GIZI */}
      <View className="flex-1 items-center pl-2">
        <Text className="text-[9px] text-pekon-muted font-extrabold uppercase tracking-widest mb-0.5">
          Poin Gizi
        </Text>
        <Text className="text-base font-black text-[#00F2A9]">
          {pointsBalance} PTS
        </Text>
        <Text className="text-[10px] text-pekon-muted font-medium">
          Pangan Balita
        </Text>
      </View>
    </View>
  );
}

