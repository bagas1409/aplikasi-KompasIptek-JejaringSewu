import React from 'react';
import { Tabs } from 'expo-router';
import { Navigation, ShoppingBag, Camera, Wallet } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#00F2A9',
        tabBarInactiveTintColor: '#84958A',
        tabBarStyle: {
          backgroundColor: '#151C1E',
          borderTopColor: '#3B4A41',
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: '#0F1416',
          borderBottomColor: '#3B4A41',
          borderBottomWidth: 1,
        },
        headerTintColor: '#DFE2EB',
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 17,
        },
      }}
    >
      <Tabs.Screen
        name="commuter"
        options={{
          title: 'Nebeng-Jastip',
          tabBarIcon: ({ color, size }) => <Navigation size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="marketplace"
        options={{
          title: 'Bursa & Job',
          tabBarIcon: ({ color, size }) => <ShoppingBag size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="verify-camera"
        options={{
          title: 'Selfie PoW',
          tabBarIcon: ({ color, size }) => <Camera size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile-wallet"
        options={{
          title: 'Dompet & SPK',
          tabBarIcon: ({ color, size }) => <Wallet size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}
