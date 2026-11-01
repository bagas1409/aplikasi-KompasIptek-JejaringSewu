import React, { useEffect, useState, useRef } from 'react';
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
} from 'react-native';
import {
  MapPin,
  ArrowRight,
  PlusCircle,
  PackageCheck,
  Fuel,
  AlertCircle,
  Radio,
  Navigation,
  CheckCircle,
  Clock,
  ShieldCheck,
  User,
  Phone,
  RefreshCw,
  X,
  Compass,
} from 'lucide-react-native';
import * as Location from 'expo-location';
import { apiClient } from '@/services/api';

// Preset Lokasi Pekon & Sentra Ekonomi Kabupaten Pringsewu
const PRESET_LOCATIONS = [
  { name: 'Pekon Pagelaran', lat: -5.3421, lng: 104.9452 },
  { name: 'Pekon Sukoharjo', lat: -5.3051, lng: 104.9921 },
  { name: 'Pekon Gadingrejo', lat: -5.3789, lng: 105.0312 },
  { name: 'Pekon Banyumas', lat: -5.2891, lng: 104.9123 },
  { name: 'Pekon Pardasuka', lat: -5.4215, lng: 104.9782 },
  { name: 'Pekon Ambarawa', lat: -5.3621, lng: 104.9812 },
  { name: 'Pasar Induk Pringsewu', lat: -5.3582, lng: 104.9744 },
  { name: 'RSUD Pringsewu', lat: -5.3712, lng: 104.9651 },
  { name: 'Terminal Pringsewu', lat: -5.3521, lng: 104.9811 },
  { name: 'Komplek Pemkab Pringsewu', lat: -5.3601, lng: 104.9902 },
];

export default function CommuterScreen() {
  const [activeTab, setActiveTab] = useState<'warga' | 'kurir'>('warga');
  const [routes, setRoutes] = useState<any[]>([]);
  const [myRoute, setMyRoute] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [radiusKm, setRadiusKm] = useState<number>(25);

  // GPS User State
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [isBroadcastingGps, setIsBroadcastingGps] = useState(false);
  const [lastPingTime, setLastPingTime] = useState<string | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Modal Buka Rute Kurir
  const [isCreateRouteModalOpen, setIsCreateRouteModalOpen] = useState(false);
  const [originName, setOriginName] = useState('');
  const [destinationName, setDestinationName] = useState('');
  const [originLat, setOriginLat] = useState<number>(-5.3421);
  const [originLng, setOriginLng] = useState<number>(104.9452);
  const [destLat, setDestLat] = useState<number>(-5.3582);
  const [destLng, setDestLng] = useState<number>(104.9744);
  const [vehicleType, setVehicleType] = useState('Motor (Bagasi Sedang)');
  const [submittingRoute, setSubmittingRoute] = useState(false);

  // Modal Pesan Jastip Warga
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedRouteForOrder, setSelectedRouteForOrder] = useState<any | null>(null);
  const [itemDescription, setItemDescription] = useState('');
  const [fuelShareCost, setFuelShareCost] = useState('7500');
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // 1. Dapatkan Lokasi GPS Perangkat
  const detectUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCurrentCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      setGpsAccuracy(loc.coords.accuracy ? Math.round(loc.coords.accuracy) : null);
      return loc.coords;
    } catch {
      // Default ke titik Pringsewu jika gagal
      setCurrentCoords({ lat: -5.3582, lng: 104.9744 });
    }
  };

  // 2. Fetch Data
  const fetchData = async () => {
    try {
      const coords = currentCoords || (await detectUserLocation()) || { lat: -5.3582, lng: 104.9744 };

      // Fetch nearby active routes
      try {
        const res: any = await apiClient.get(
          `/commuters/routes/nearby?lat=${coords.lat}&lng=${coords.lng}&radiusKm=${radiusKm}`
        );
        setRoutes(res.data || []);
      } catch (err: any) {
        console.warn('Gagal memuat rute komuter nearby:', err.message);
      }

      // Fetch my active route (sebagai kurir)
      try {
        const myRes: any = await apiClient.get('/commuters/routes/my-active');
        setMyRoute(myRes.data || null);
      } catch (err: any) {
        console.warn('Gagal memuat rute saya:', err.message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    detectUserLocation().then(() => fetchData());
  }, [radiusKm]);

  // 3. Ping GPS Function
  const sendGpsPing = async (routeId: string) => {
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      await apiClient.patch(`/commuters/routes/${routeId}/ping`, {
        currentLat: loc.coords.latitude,
        currentLng: loc.coords.longitude,
      });
      const now = new Date();
      setLastPingTime(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`);
      // Refresh status rute sendiri
      const myRes: any = await apiClient.get('/commuters/routes/my-active');
      setMyRoute(myRes.data || null);
    } catch (err: any) {
      console.warn('Gagal ping GPS:', err.message);
    }
  };

  // 4. Toggle GPS Broadcast Otomatis
  const toggleGpsBroadcast = (enable: boolean) => {
    if (!myRoute) return;
    setIsBroadcastingGps(enable);
    if (enable) {
      sendGpsPing(myRoute.id);
      pingIntervalRef.current = setInterval(() => {
        sendGpsPing(myRoute.id);
      }, 15000); // Ping setiap 15 detik
      Alert.alert('GPS Broadcast Aktif', 'Koordinat Anda kini disiarkan ke warga penitip secara real-time setiap 15 detik.');
    } else {
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
      Alert.alert('GPS Broadcast Nonaktif', 'Penyiaran posisi otomatis telah dijeda.');
    }
  };

  useEffect(() => {
    return () => {
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
    };
  }, []);

  // 5. Handle Buka Rute Baru
  const handleStartRoute = async () => {
    if (!originName.trim() || !destinationName.trim()) {
      Alert.alert('Peringatan', 'Mohon isi nama asal dan tujuan pekon perjalanan Anda.');
      return;
    }

    setSubmittingRoute(true);
    try {
      const res: any = await apiClient.post('/commuters/routes/start', {
        originName,
        destinationName,
        originLat,
        originLng,
        destLat,
        destLng,
      });

      Alert.alert('Rute Berhasil Dibuka', `Rute ${originName} -> ${destinationName} telah aktif dan dapat menerima titipan warga.`);
      setIsCreateRouteModalOpen(false);
      setMyRoute(res.data);
      setActiveTab('kurir');
      fetchData();
    } catch (err: any) {
      Alert.alert('Gagal Buka Rute', err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setSubmittingRoute(false);
    }
  };

  // 6. Handle Selesaikan Rute Perjalanan
  const handleFinishRoute = async (routeId: string) => {
    Alert.alert(
      'Selesaikan Perjalanan',
      'Apakah Anda sudah sampai di tujuan akhir dan menyelesaikan seluruh pengantaran?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ya, Selesai',
          onPress: async () => {
            try {
              if (pingIntervalRef.current) {
                clearInterval(pingIntervalRef.current);
                pingIntervalRef.current = null;
              }
              setIsBroadcastingGps(false);
              await apiClient.patch(`/commuters/routes/${routeId}/finish`);
              Alert.alert('Perjalanan Selesai', 'Rute komuter telah ditutup. Terima kasih telah membantu logistik pekon!');
              setMyRoute(null);
              fetchData();
            } catch (e: any) {
              Alert.alert('Gagal', e.message || 'Gagal menyelesaikan rute.');
            }
          },
        },
      ]
    );
  };

  // 7. Handle Pesan Jastip (Warga)
  const handleSendOrder = async () => {
    if (!selectedRouteForOrder) return;
    if (!itemDescription.trim()) {
      Alert.alert('Peringatan', 'Mohon tuliskan deskripsi barang titipan Anda.');
      return;
    }

    const cost = parseInt(fuelShareCost, 10);
    if (isNaN(cost) || cost < 1000) {
      Alert.alert('Peringatan', 'Patungan bensin minimal Rp 1.000.');
      return;
    }

    setSubmittingOrder(true);
    try {
      const coords = currentCoords || (await detectUserLocation()) || { lat: -5.3582, lng: 104.9744 };

      await apiClient.post(`/commuters/routes/${selectedRouteForOrder.id}/orders`, {
        itemDescription,
        fuelShareCost: cost,
        pickupLat: coords.lat,
        pickupLng: coords.lng,
      });

      Alert.alert(
        'Pesanan Dikirim!',
        'Permintaan titip barang berhasil diteruskan ke kurir komuter. Tunggu konfirmasi penerimaan dari kurir.',
        [{ text: 'OK', onPress: () => setIsOrderModalOpen(false) }]
      );
      setItemDescription('');
      fetchData();
    } catch (e: any) {
      Alert.alert('Gagal Mengirim Titipan', e.message || 'Gagal membuat pesanan.');
    } finally {
      setSubmittingOrder(false);
    }
  };

  // 8. Handle Terima Titipan (Kurir)
  const handleAcceptOrder = async (orderId: string) => {
    Alert.alert(
      'Konfirmasi Titipan',
      'Apakah Anda bersedia membawa titipan ini dan mengunci transaksi patungan bensin?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Terima Titipan',
          onPress: async () => {
            try {
              const res: any = await apiClient.patch(
                `/commuters/orders/${orderId}/accept`,
                {},
                {
                  headers: {
                    'x-idempotency-key': `accept-commuter-${orderId}-${Date.now()}`,
                  },
                }
              );
              Alert.alert('Sukses', res.data?.message || 'Titipan jastip diterima! Transaksi telah terkunci.');
              fetchData();
            } catch (e: any) {
              Alert.alert('Gagal', e.message || 'Gagal menerima pesanan.');
            }
          },
        },
      ]
    );
  };

  return (
    <View className="flex-1 bg-pekon-bg">
      {/* Header Info Banner */}
      <View className="bg-pekon-surface border-b border-pekon-border p-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-2">
            <Text className="text-white font-bold text-lg">Logistik Komuter Pekon</Text>
            <Text className="text-pekon-muted text-xs mt-0.5">
              Nebeng barang searah rute harian warga. Hemat bensin hingga 60% dan minim emisi.
            </Text>
          </View>
          <View className="items-end">
            <View className="flex-row items-center bg-pekon-card border border-pekon-border px-2.5 py-1 rounded-full">
              <Compass size={12} color="#00F2A9" />
              <Text className="text-pekon-primary text-[10px] font-bold ml-1">
                {gpsAccuracy ? `GPS ±${gpsAccuracy}m` : 'GPS Siap'}
              </Text>
            </View>
          </View>
        </View>

        {/* Sub-Tab Switcher */}
        <View className="flex-row mt-3 bg-pekon-bg p-1 rounded-xl border border-pekon-border">
          <TouchableOpacity
            accessible={true}
            accessibilityRole="tab"
            accessibilityLabel="Tab Titip Barang Warga"
            className={`flex-1 py-2 rounded-lg items-center ${activeTab === 'warga' ? 'bg-pekon-primary' : 'bg-transparent'}`}
            onPress={() => setActiveTab('warga')}
          >
            <Text className={`text-xs font-bold ${activeTab === 'warga' ? 'text-pekon-bg' : 'text-pekon-muted'}`}>
              Titip Barang (Warga)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessible={true}
            accessibilityRole="tab"
            accessibilityLabel="Tab Rute Saya Kurir"
            className={`flex-1 py-2 rounded-lg items-center ${activeTab === 'kurir' ? 'bg-pekon-primary' : 'bg-transparent'}`}
            onPress={() => setActiveTab('kurir')}
          >
            <View className="flex-row items-center">
              <Text className={`text-xs font-bold ${activeTab === 'kurir' ? 'text-pekon-bg' : 'text-pekon-muted'}`}>
                Rute Saya (Kurir)
              </Text>
              {myRoute && (
                <View className="w-2 h-2 rounded-full bg-emerald-400 ml-1.5" />
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>

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
        {/* ==================================================== */}
        {/* TAB 1: WARGA - CARI TEBENGAN SEARAH                   */}
        {/* ==================================================== */}
        {activeTab === 'warga' && (
          <View>
            {/* Filter Radius Pills */}
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-white font-semibold text-sm">Rute Aktif Sekitar Anda</Text>
              <View className="flex-row space-x-1.5">
                {[10, 25, 50].map((km) => (
                  <TouchableOpacity
                    key={km}
                    onPress={() => setRadiusKm(km)}
                    className={`px-2.5 py-1 rounded-full border ${radiusKm === km ? 'bg-pekon-primary/20 border-pekon-primary' : 'bg-pekon-card border-pekon-border'}`}
                  >
                    <Text className={`text-[10px] font-bold ${radiusKm === km ? 'text-pekon-primary' : 'text-pekon-muted'}`}>
                      {km} km
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {loading ? (
              <ActivityIndicator size="large" color="#00F2A9" className="my-8" />
            ) : routes.length === 0 ? (
              <View className="bg-pekon-card border border-pekon-border rounded-xl p-6 items-center my-4">
                <Fuel size={36} color="#84958A" />
                <Text className="text-pekon-text font-semibold text-sm mt-3">Belum ada rute komuter aktif</Text>
                <Text className="text-pekon-subtle text-xs text-center mt-1">
                  Belum ada pengemudi searah dalam radius {radiusKm} km. Anda bisa beralih ke tab Kurir untuk membuka rute perjalanan!
                </Text>
                <TouchableOpacity
                  className="mt-4 bg-pekon-primary px-4 py-2 rounded-xl"
                  onPress={() => {
                    setActiveTab('kurir');
                    setIsCreateRouteModalOpen(true);
                  }}
                >
                  <Text className="text-pekon-bg font-bold text-xs">Buka Rute Sebagai Kurir</Text>
                </TouchableOpacity>
              </View>
            ) : (
              routes.map((item) => {
                const distanceKm = item.distance_meters ? (item.distance_meters / 1000).toFixed(1) : null;

                return (
                  <View key={item.id} className="bg-pekon-card border border-pekon-border rounded-xl p-4 mb-3">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center">
                        <View className="w-6 h-6 rounded-full bg-pekon-primary/20 items-center justify-center mr-2">
                          <User size={13} color="#00F2A9" />
                        </View>
                        <Text className="text-white font-bold text-xs">
                          {item.commuter?.fullName || 'Warga Komuter'}
                        </Text>
                      </View>
                      <View className="flex-row items-center bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                        <Radio size={10} color="#34D399" />
                        <Text className="text-emerald-400 text-[10px] font-bold ml-1">AKTIF SEARAH</Text>
                      </View>
                    </View>

                    {/* Geospasial Route Card Visualizer */}
                    <View className="bg-pekon-bg border border-pekon-border/60 rounded-lg p-3 my-2.5">
                      <View className="flex-row items-center justify-between mb-2">
                        <View className="flex-row items-center flex-1 mr-2">
                          <MapPin size={14} color="#00F2A9" />
                          <Text className="text-white text-xs font-semibold ml-1.5 flex-1" numberOfLines={1}>
                            {item.originName}
                          </Text>
                        </View>
                        <ArrowRight size={14} color="#84958A" className="mx-1" />
                        <View className="flex-row items-center flex-1 ml-2 justify-end">
                          <MapPin size={14} color="#EF4444" />
                          <Text className="text-white text-xs font-semibold ml-1.5 flex-1 text-right" numberOfLines={1}>
                            {item.destinationName}
                          </Text>
                        </View>
                      </View>

                      {/* Mini Route Progress Indicator */}
                      <View className="h-1.5 bg-pekon-surface rounded-full flex-row overflow-hidden my-1">
                        <View className="w-1/2 bg-pekon-primary rounded-full" />
                      </View>

                      <View className="flex-row justify-between items-center mt-1">
                        <Text className="text-pekon-muted text-[10px]">
                          {distanceKm ? `Posisi kurir ~${distanceKm} km dari Anda` : 'Dalam jangkauan pekon'}
                        </Text>
                        <Text className="text-pekon-primary text-[10px] font-bold">Patungan hemat 60%</Text>
                      </View>
                    </View>

                    <View className="flex-row justify-between items-center pt-2 border-t border-pekon-border/60 mt-1">
                      <View className="flex-row items-center">
                        <PackageCheck size={14} color="#84958A" />
                        <Text className="text-pekon-muted text-xs ml-1">
                          {item.orders?.length || 0} titipan dalam perjalanan
                        </Text>
                      </View>
                      <TouchableOpacity
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityLabel={`Titip barang ke rute ${item.destinationName}`}
                        className="bg-pekon-primary px-3.5 py-1.5 rounded-lg flex-row items-center"
                        onPress={() => {
                          setSelectedRouteForOrder(item);
                          setIsOrderModalOpen(true);
                        }}
                      >
                        <PlusCircle size={13} color="#0F1416" />
                        <Text className="text-pekon-bg text-xs font-bold ml-1">Titip Barang</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ==================================================== */}
        {/* TAB 2: KURIR - MANAJEMEN RUTE & BROADCAST GPS        */}
        {/* ==================================================== */}
        {activeTab === 'kurir' && (
          <View>
            {!myRoute ? (
              /* Kurir Belum Punya Rute Aktif */
              <View className="bg-pekon-card border border-pekon-border rounded-xl p-5 items-center my-2">
                <View className="w-14 h-14 rounded-full bg-pekon-primary/10 items-center justify-center mb-3">
                  <Navigation size={28} color="#00F2A9" />
                </View>
                <Text className="text-white font-bold text-base text-center">Anda Belum Membuka Rute Hari Ini</Text>
                <Text className="text-pekon-muted text-xs text-center mt-1 leading-relaxed">
                  Apakah Anda hendak bepergian dari pekon ke pasar atau kantor kota? Buka rute perjalanan Anda untuk membawa titipan barang tetangga dan dapatkan patungan bensin otomatis!
                </Text>
                <TouchableOpacity
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel="Buka Perjalanan Komuter Baru"
                  className="mt-5 bg-pekon-primary px-5 py-2.5 rounded-xl flex-row items-center"
                  onPress={() => setIsCreateRouteModalOpen(true)}
                >
                  <PlusCircle size={16} color="#0F1416" />
                  <Text className="text-pekon-bg font-bold text-xs ml-1.5">Buka Rute Perjalanan Baru</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* Kurir Punya Rute Aktif */
              <View>
                {/* Status Card Rute Aktif */}
                <View className="bg-pekon-card border border-pekon-primary/60 rounded-xl p-4 mb-3">
                  <View className="flex-row justify-between items-center pb-2 border-b border-pekon-border">
                    <View className="flex-row items-center">
                      <View className="w-3 h-3 rounded-full bg-emerald-400 animate-ping mr-2" />
                      <Text className="text-white font-bold text-sm">Rute Perjalanan Anda Aktif</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleFinishRoute(myRoute.id)}
                      className="bg-red-500/10 border border-red-500/30 px-2.5 py-1 rounded-lg"
                    >
                      <Text className="text-red-400 text-[10px] font-bold">Akhiri Rute</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Geospatial Visualizer Route Line */}
                  <View className="my-3 bg-pekon-bg p-3.5 rounded-xl border border-pekon-border">
                    <View className="flex-row items-center justify-between mb-3">
                      <View className="items-start flex-1">
                        <Text className="text-pekon-muted text-[10px] font-semibold">ASAL (START)</Text>
                        <Text className="text-white font-bold text-xs mt-0.5">{myRoute.originName}</Text>
                      </View>
                      <View className="px-2">
                        <ArrowRight size={16} color="#00F2A9" />
                      </View>
                      <View className="items-end flex-1">
                        <Text className="text-pekon-muted text-[10px] font-semibold">TUJUAN (FINISH)</Text>
                        <Text className="text-white font-bold text-xs mt-0.5 text-right">{myRoute.destinationName}</Text>
                      </View>
                    </View>

                    {/* Progress Track */}
                    <View className="relative h-2 bg-pekon-surface rounded-full my-1 justify-center">
                      <View className="h-full bg-gradient-to-r from-pekon-primary to-emerald-400 rounded-full w-3/5" />
                      <View className="absolute left-[60%] w-4 h-4 bg-pekon-primary border-2 border-pekon-bg rounded-full -ml-2 items-center justify-center">
                        <View className="w-1.5 h-1.5 bg-pekon-bg rounded-full" />
                      </View>
                    </View>

                    <View className="flex-row justify-between items-center mt-2 pt-2 border-t border-pekon-border/50">
                      <Text className="text-pekon-subtle text-[10px]">
                        Koordinat Terakhir: {myRoute.currentLat ? `${Number(myRoute.currentLat).toFixed(4)}, ${Number(myRoute.currentLng).toFixed(4)}` : 'Sesuai Asal'}
                      </Text>
                      {lastPingTime && (
                        <Text className="text-pekon-primary text-[10px] font-medium">
                          Ping {lastPingTime}
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Live GPS Broadcast Switcher */}
                  <View className="bg-pekon-surface/70 border border-pekon-border rounded-xl p-3 flex-row items-center justify-between">
                    <View className="flex-1 pr-3">
                      <View className="flex-row items-center">
                        <Radio size={14} color={isBroadcastingGps ? '#00F2A9' : '#84958A'} />
                        <Text className="text-white font-bold text-xs ml-1.5">Live Broadcast GPS (15s)</Text>
                      </View>
                      <Text className="text-pekon-muted text-[10px] mt-0.5">
                        {isBroadcastingGps
                          ? 'Posisi kendaraan Anda otomatis disiarkan ke warga penitip'
                          : 'Aktifkan agar warga dapat memantau kedatangan Anda'}
                      </Text>
                    </View>
                    <Switch
                      value={isBroadcastingGps}
                      onValueChange={toggleGpsBroadcast}
                      trackColor={{ false: '#262D30', true: '#00F2A9' }}
                      thumbColor={isBroadcastingGps ? '#0F1416' : '#84958A'}
                    />
                  </View>

                  {/* Tombol Ping Manual */}
                  <TouchableOpacity
                    className="mt-2.5 bg-pekon-surface border border-pekon-border py-2 rounded-xl flex-row items-center justify-center"
                    onPress={() => sendGpsPing(myRoute.id)}
                  >
                    <RefreshCw size={13} color="#00F2A9" />
                    <Text className="text-pekon-primary font-bold text-xs ml-1.5">Perbarui Posisi GPS Sekarang</Text>
                  </TouchableOpacity>
                </View>

                {/* Daftar Titipan Masuk dari Warga */}
                <View className="mt-2">
                  <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-white font-semibold text-sm">Pesanan Titipan Masuk</Text>
                    <View className="bg-pekon-card px-2 py-0.5 rounded-full border border-pekon-border">
                      <Text className="text-pekon-primary text-[10px] font-bold">
                        {myRoute.orders?.length || 0} Permintaan
                      </Text>
                    </View>
                  </View>

                  {(!myRoute.orders || myRoute.orders.length === 0) ? (
                    <View className="bg-pekon-card border border-pekon-border rounded-xl p-5 items-center my-1">
                      <PackageCheck size={28} color="#84958A" />
                      <Text className="text-pekon-text font-semibold text-xs mt-2">Belum ada pesanan titipan masuk</Text>
                      <Text className="text-pekon-subtle text-[11px] text-center mt-1">
                        Warga sekitar pekon Anda akan segera melihat rute ini dan mengajukan titipan barang.
                      </Text>
                    </View>
                  ) : (
                    myRoute.orders.map((order: any) => {
                      const isRequested = order.status === 'REQUESTED';
                      const isAccepted = order.status === 'ACCEPTED';

                      return (
                        <View key={order.id} className="bg-pekon-card border border-pekon-border rounded-xl p-3.5 mb-2.5">
                          <View className="flex-row justify-between items-center pb-2 border-b border-pekon-border/60">
                            <View className="flex-row items-center">
                              <User size={13} color="#00F2A9" />
                              <Text className="text-white font-bold text-xs ml-1.5">
                                {order.requester?.fullName || 'Warga Penitip'}
                              </Text>
                            </View>
                            <View className={`px-2 py-0.5 rounded border ${isAccepted ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
                              <Text className={`text-[10px] font-bold ${isAccepted ? 'text-emerald-400' : 'text-amber-400'}`}>
                                {isAccepted ? 'TERKUNCI / DITERIMA' : 'MENUNGGU KONFIRMASI'}
                              </Text>
                            </View>
                          </View>

                          <View className="my-2">
                            <Text className="text-pekon-text text-xs font-semibold">{order.itemDescription}</Text>
                            <View className="flex-row items-center justify-between mt-1.5">
                              <View className="flex-row items-center">
                                <Fuel size={12} color="#00F2A9" />
                                <Text className="text-pekon-primary text-xs font-bold ml-1">
                                  Rp {Number(order.fuelShareCost).toLocaleString('id-ID')}
                                </Text>
                                <Text className="text-pekon-muted text-[10px] ml-1">(Patungan Bensin)</Text>
                              </View>
                              {order.requester?.phoneNumber && (
                                <View className="flex-row items-center">
                                  <Phone size={11} color="#84958A" />
                                  <Text className="text-pekon-muted text-[10px] ml-1">{order.requester.phoneNumber}</Text>
                                </View>
                              )}
                            </View>
                          </View>

                          {isRequested && (
                            <TouchableOpacity
                              accessible={true}
                              accessibilityRole="button"
                              accessibilityLabel={`Terima titipan dari ${order.requester?.fullName || 'warga'}`}
                              className="mt-1 bg-pekon-primary py-2 rounded-lg items-center"
                              onPress={() => handleAcceptOrder(order.id)}
                            >
                              <Text className="text-pekon-bg font-bold text-xs">Terima Titipan & Kunci Transaksi</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      );
                    })
                  )}
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* ==================================================== */}
      {/* MODAL 1: BUKA RUTE BARU (KURIR KOMUTER)              */}
      {/* ==================================================== */}
      <Modal visible={isCreateRouteModalOpen} transparent animationType="slide">
        <View className="flex-1 bg-black/80 justify-end">
          <View className="bg-pekon-surface rounded-t-3xl border-t border-pekon-border p-5 max-h-[90%]">
            <View className="flex-row justify-between items-center pb-3 border-b border-pekon-border">
              <Text className="text-white font-bold text-base">Buka Rute Perjalanan Komuter</Text>
              <TouchableOpacity onPress={() => setIsCreateRouteModalOpen(false)}>
                <X size={20} color="#84958A" />
              </TouchableOpacity>
            </View>

            <ScrollView className="my-3">
              {/* Asal Perjalanan */}
              <Text className="text-pekon-muted text-xs font-semibold mb-1">Pekon Asal Perjalanan *</Text>
              <TextInput
                value={originName}
                onChangeText={setOriginName}
                placeholder="Contoh: Pekon Pagelaran Utara"
                placeholderTextColor="#84958A"
                className="bg-pekon-card border border-pekon-border rounded-xl p-3 text-white text-xs mb-2"
              />

              {/* Preset Quick Select Asal */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
                {PRESET_LOCATIONS.slice(0, 5).map((loc) => (
                  <TouchableOpacity
                    key={loc.name}
                    onPress={() => {
                      setOriginName(loc.name);
                      setOriginLat(loc.lat);
                      setOriginLng(loc.lng);
                    }}
                    className="mr-1.5 bg-pekon-card border border-pekon-border px-2.5 py-1 rounded-full"
                  >
                    <Text className="text-pekon-muted text-[10px]">{loc.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Tujuan Perjalanan */}
              <Text className="text-pekon-muted text-xs font-semibold mb-1">Tujuan Perjalanan (Pasar/Kota) *</Text>
              <TextInput
                value={destinationName}
                onChangeText={setDestinationName}
                placeholder="Contoh: Pasar Induk Pringsewu"
                placeholderTextColor="#84958A"
                className="bg-pekon-card border border-pekon-border rounded-xl p-3 text-white text-xs mb-2"
              />

              {/* Preset Quick Select Tujuan */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
                {PRESET_LOCATIONS.slice(5).map((loc) => (
                  <TouchableOpacity
                    key={loc.name}
                    onPress={() => {
                      setDestinationName(loc.name);
                      setDestLat(loc.lat);
                      setDestLng(loc.lng);
                    }}
                    className="mr-1.5 bg-pekon-card border border-pekon-border px-2.5 py-1 rounded-full"
                  >
                    <Text className="text-pekon-muted text-[10px]">{loc.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Jenis Kendaraan / Bagasi */}
              <Text className="text-pekon-muted text-xs font-semibold mb-1">Kapasitas Bagasi Kendaraan</Text>
              <View className="flex-row space-x-2 mb-4">
                {['Motor (Kardus Sedang)', 'Mobil (Bagasi Luas)'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    onPress={() => setVehicleType(type)}
                    className={`flex-1 p-2.5 rounded-xl border items-center ${vehicleType === type ? 'bg-pekon-primary/10 border-pekon-primary' : 'bg-pekon-card border-pekon-border'}`}
                  >
                    <Text className={`text-xs font-bold ${vehicleType === type ? 'text-pekon-primary' : 'text-pekon-muted'}`}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl mb-3 flex-row items-center">
                <ShieldCheck size={18} color="#34D399" />
                <Text className="text-emerald-300 text-[11px] ml-2 flex-1">
                  Rute Anda akan diverifikasi geospasial via GPS dan terdaftar di Bursa Komuter Pekon.
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Mulai dan Buka Rute Perjalanan"
              disabled={submittingRoute}
              onPress={handleStartRoute}
              className={`p-3.5 rounded-xl items-center ${submittingRoute ? 'bg-pekon-border' : 'bg-pekon-primary'}`}
            >
              {submittingRoute ? (
                <ActivityIndicator color="#0F1416" size="small" />
              ) : (
                <Text className="text-pekon-bg font-bold text-sm">Mulai & Buka Rute Perjalanan</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ==================================================== */}
      {/* MODAL 2: PESAN TITIP JASTIP SEARAH (WARGA)          */}
      {/* ==================================================== */}
      <Modal visible={isOrderModalOpen} transparent animationType="slide">
        <View className="flex-1 bg-black/80 justify-end">
          <View className="bg-pekon-surface rounded-t-3xl border-t border-pekon-border p-5 max-h-[85%]">
            <View className="flex-row justify-between items-center pb-3 border-b border-pekon-border">
              <Text className="text-white font-bold text-base">Titip Barang Searah</Text>
              <TouchableOpacity onPress={() => setIsOrderModalOpen(false)}>
                <X size={20} color="#84958A" />
              </TouchableOpacity>
            </View>

            {selectedRouteForOrder && (
              <View className="bg-pekon-card border border-pekon-border rounded-xl p-3 my-3">
                <Text className="text-pekon-muted text-[10px] uppercase font-bold">Rute Kurir Komuter</Text>
                <Text className="text-white font-bold text-xs mt-0.5">
                  {selectedRouteForOrder.originName} ➔ {selectedRouteForOrder.destinationName}
                </Text>
              </View>
            )}

            <ScrollView className="my-1">
              <Text className="text-pekon-muted text-xs font-semibold mb-1">Deskripsi Barang Titipan *</Text>
              <TextInput
                value={itemDescription}
                onChangeText={setItemDescription}
                placeholder="Contoh: Paket dokumen KTP pekon, atau 2 botol madu hutan"
                placeholderTextColor="#84958A"
                multiline
                numberOfLines={3}
                className="bg-pekon-card border border-pekon-border rounded-xl p-3 text-white text-xs mb-3 text-start"
              />

              <Text className="text-pekon-muted text-xs font-semibold mb-1">Patungan Bensin yang Ditawarkan (Rp) *</Text>
              <TextInput
                value={fuelShareCost}
                onChangeText={setFuelShareCost}
                placeholder="7500"
                keyboardType="numeric"
                placeholderTextColor="#84958A"
                className="bg-pekon-card border border-pekon-border rounded-xl p-3 text-white text-xs mb-3"
              />

              {/* Titik Jemput GPS Info */}
              <View className="bg-pekon-bg border border-pekon-border p-3 rounded-xl mb-3 flex-row items-center">
                <MapPin size={16} color="#00F2A9" />
                <View className="ml-2.5 flex-1">
                  <Text className="text-white text-xs font-semibold">Titik Jemput Otomatis (GPS)</Text>
                  <Text className="text-pekon-muted text-[10px]">
                    {currentCoords ? `Lat: ${currentCoords.lat.toFixed(4)}, Lng: ${currentCoords.lng.toFixed(4)}` : 'Mendeteksi koordinat...'}
                  </Text>
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Kirim Permintaan Titipan Jastip"
              disabled={submittingOrder}
              onPress={handleSendOrder}
              className={`p-3.5 rounded-xl items-center ${submittingOrder ? 'bg-pekon-border' : 'bg-pekon-primary'}`}
            >
              {submittingOrder ? (
                <ActivityIndicator color="#0F1416" size="small" />
              ) : (
                <Text className="text-pekon-bg font-bold text-sm">Kirim Permintaan Titipan</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
