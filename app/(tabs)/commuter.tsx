import React, { useEffect, useState, useRef, useMemo } from 'react';
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
  Linking,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import {
  MapPin,
  ArrowRight,
  PlusCircle,
  Package,
  Fuel,
  Radio,
  Navigation,
  CheckCircle,
  Clock,
  ShieldCheck,
  RefreshCw,
  X,
  Compass,
  Inbox,
  Star,
  Bike,
  Truck,
  MessageSquare,
  Sparkles,
  Lock,
} from 'lucide-react-native';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { apiClient } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
// Preset Lokasi Pekon & Sentra Ekonomi Kabupaten Pringsewu
const PRESET_DESTINATIONS = [
  { name: 'Pasar Induk Pringsewu', lat: -5.3582, lng: 104.9744 },
  { name: 'RSUD Pringsewu', lat: -5.3712, lng: 104.9651 },
  { name: 'Terminal Pringsewu', lat: -5.3521, lng: 104.9811 },
  { name: 'Komplek Pemkab Pringsewu', lat: -5.3601, lng: 104.9902 },
  { name: 'Pekon Pagelaran', lat: -5.3421, lng: 104.9452 },
  { name: 'Pekon Sukoharjo', lat: -5.3051, lng: 104.9921 },
  { name: 'Pekon Gadingrejo', lat: -5.3789, lng: 105.0312 },
];
// Helper untuk mengambil inisial nama secara dinamis
function getInitials(name?: string): string {
  if (!name) return 'WK';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
export default function CommuterScreen() {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const isCompactScreen = screenWidth < 365;
  const { user } = useAuth();
  // 3 Segmen Utama: 'titip' | 'kurir' | 'pesanan'
  const [activeTab, setActiveTab] = useState<'titip' | 'kurir' | 'pesanan'>('titip');
  const [routes, setRoutes] = useState<any[]>([]);
  const [myRoute, setMyRoute] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [radiusKm, setRadiusKm] = useState<number>(25);
  // Filter Status Pesanan Masuk (All / Pending / Accepted)
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | 'pending' | 'accepted'>('all');
  // GPS User State
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [isBroadcastingGps, setIsBroadcastingGps] = useState(false);
  const [lastPingTime, setLastPingTime] = useState<string | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // Modal Buka Rute Kurir
  const [isCreateRouteModalOpen, setIsCreateRouteModalOpen] = useState(false);
  const [originName, setOriginName] = useState('Pekon Pagelaran');
  const [destinationName, setDestinationName] = useState('Pasar Induk Pringsewu');
  const [originLat, setOriginLat] = useState<number>(-5.3421);
  const [originLng, setOriginLng] = useState<number>(104.9452);
  const [destLat, setDestLat] = useState<number>(-5.3582);
  const [destLng, setDestLng] = useState<number>(104.9744);
  const [vehicleType, setVehicleType] = useState<'motor' | 'mobil'>('motor');
  const [submittingRoute, setSubmittingRoute] = useState(false);
  // Modal Titip Barang Warga
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedRouteForOrder, setSelectedRouteForOrder] = useState<any | null>(null);
  const [itemDescription, setItemDescription] = useState('');
  const [fuelShareCost, setFuelShareCost] = useState('10000');
  const [submittingOrder, setSubmittingOrder] = useState(false);
  // 1. Dapatkan Lokasi GPS Perangkat
  const detectUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        const fallback = { latitude: -5.3582, longitude: 104.9744 };
        setCurrentCoords({ lat: fallback.latitude, lng: fallback.longitude });
        return fallback;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCurrentCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      setGpsAccuracy(loc.coords.accuracy ? Math.round(loc.coords.accuracy) : 4);
      return loc.coords;
    } catch {
      const fallback = { latitude: -5.3582, longitude: 104.9744 };
      setCurrentCoords({ lat: fallback.latitude, lng: fallback.longitude });
      return fallback;
    }
  };
  // 2. Fetch Data (Rute Sekitar & Rute Aktif Saya)
  const fetchData = async () => {
    try {
      const loc: any = currentCoords
        ? { latitude: currentCoords.lat, longitude: currentCoords.lng }
        : await detectUserLocation();
      const lat = loc?.latitude ?? currentCoords?.lat ?? -5.3582;
      const lng = loc?.longitude ?? currentCoords?.lng ?? 104.9744;
      try {
        const res: any = await apiClient.get(
          `/commuters/routes/nearby?lat=${lat}&lng=${lng}&radiusKm=${radiusKm}`
        );
        setRoutes(res.data || []);
      } catch (err: any) {
        console.warn('Gagal memuat rute komuter nearby:', err.message);
      }
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
      setLastPingTime(
        `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
      );
      const myRes: any = await apiClient.get('/commuters/routes/my-active');
      setMyRoute(myRes.data || null);
      Alert.alert('GPS Sinkron', 'Koordinat real-time telah disiarkan ke warga penitip.');
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
      }, 15000);
      Alert.alert(
        'Live Broadcast GPS Aktif',
        'Koordinat Anda kini disiarkan ke warga penitip secara real-time setiap 15 detik.'
      );
    } else {
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
      Alert.alert('GPS Broadcast Dijeda', 'Penyiaran posisi otomatis telah dijeda.');
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
      Alert.alert('Peringatan', 'Mohon pilih atau isi asal dan tujuan perjalanan Anda.');
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
      Alert.alert(
        'Rute Dibuka!',
        `Rute ${originName} ➔ ${destinationName} kini aktif dan siap menerima titipan warga.`
      );
      setIsCreateRouteModalOpen(false);
      setMyRoute(res.data);
      setActiveTab('kurir');
      fetchData();
    } catch (err: any) {
      Alert.alert('Gagal Membuka Rute', err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setSubmittingRoute(false);
    }
  };
  // 6. Handle Selesaikan Rute Perjalanan
  const handleFinishRoute = async (routeId: string) => {
    Alert.alert(
      'Akhiri Rute Perjalanan',
      'Apakah Anda sudah sampai di tujuan akhir dan menyelesaikan pengantaran seluruh barang titipan?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ya, Akhiri Rute',
          style: 'destructive',
          onPress: async () => {
            try {
              if (pingIntervalRef.current) {
                clearInterval(pingIntervalRef.current);
                pingIntervalRef.current = null;
              }
              setIsBroadcastingGps(false);
              await apiClient.patch(`/commuters/routes/${routeId}/finish`);
              Alert.alert(
                'Perjalanan Selesai',
                'Rute komuter ditutup. Terima kasih telah membantu logistik pekon!'
              );
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
      const coords =
        currentCoords || (await detectUserLocation()) || { lat: -5.3582, lng: 104.9744 };
      await apiClient.post(`/commuters/routes/${selectedRouteForOrder.id}/orders`, {
        itemDescription,
        fuelShareCost: cost,
        pickupLat: coords.lat,
        pickupLng: coords.lng,
      });
      Alert.alert(
        'Permintaan Terkirim! 🎉',
        `Titipan barang berhasil diajukan ke ${
          selectedRouteForOrder.commuter?.fullName || 'pengemudi komuter'
        }. Pantau status penerimaan di tab Pesanan.`,
        [{ text: 'Selesai', onPress: () => setIsOrderModalOpen(false) }]
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
  const handleAcceptOrder = async (orderId: string, requesterName: string) => {
    Alert.alert(
      'Kunci Transaksi Titipan',
      `Apakah Anda bersedia membawa titipan dari ${requesterName} dan mengunci patungan bensin ke rute aktif Anda?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Terima & Kunci',
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
              Alert.alert(
                'Titipan Diterima! ✅',
                res.data?.message || 'Transaksi telah terkunci dalam jadwal perjalanan.'
              );
              fetchData();
            } catch (e: any) {
              Alert.alert('Gagal', e.message || 'Gagal menerima pesanan.');
            }
          },
        },
      ]
    );
  };
  // 9. Buka WhatsApp Warga
  const handleContactWhatsApp = (phone?: string, name?: string) => {
    if (!phone) {
      Alert.alert('Kontak Tidak Tersedia', 'Nomor telepon warga belum terdaftar.');
      return;
    }
    const cleanPhone = phone.replace(/^0/, '62').replace(/\D/g, '');
    const message = encodeURIComponent(
      `Halo ${name || 'Bapak/Ibu'}, saya kurir Komuter Pekon Sinergi. Terkait titipan barang Anda, saya sedang bersiap di rute perjalanan.`
    );
    const url = `https://wa.me/${cleanPhone}?text=${message}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Gagal', 'Tidak dapat membuka aplikasi WhatsApp.');
    });
  };
  // Kalkulasi Metrik Pesanan Masuk secara Dinamis
  const orderStats = useMemo(() => {
    const orders: any[] = myRoute?.orders || [];
    const totalCount = orders.length;
    const pendingCount = orders.filter((o) => o.status === 'REQUESTED').length;
    const acceptedCount = orders.filter((o) => o.status === 'ACCEPTED').length;
    const totalBounty = orders.reduce((acc, curr) => acc + (Number(curr.fuelShareCost) || 0), 0);
    return { totalCount, pendingCount, acceptedCount, totalBounty };
  }, [myRoute]);
  // Filter List Orders secara Dinamis
  const filteredOrders = useMemo(() => {
    const orders: any[] = myRoute?.orders || [];
    if (orderStatusFilter === 'pending') return orders.filter((o) => o.status === 'REQUESTED');
    if (orderStatusFilter === 'accepted') return orders.filter((o) => o.status === 'ACCEPTED');
    return orders;
  }, [myRoute, orderStatusFilter]);
  return (
    <View style={styles.screenContainer}>
      <StatusBar style="dark" backgroundColor="#FFFFFF" />
      {/* ========================================================================= */}
      {/* TOP HEADER BAR & 3-SEGMENTED NAVIGATION                                   */}
      {/* ========================================================================= */}
      <View style={[styles.topHeader, { paddingTop: Math.max(insets.top, 14) }]}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerBrandRow}>
            <View style={styles.brandIconCircle}>
              <Truck size={20} color="#087A50" />
            </View>
            <View style={{ flexShrink: 1 }}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {activeTab === 'titip'
                  ? 'Titip Barang'
                  : activeTab === 'kurir'
                  ? 'Rute Kurir'
                  : 'Pesanan Masuk'}
              </Text>
              <View style={styles.headerStatusRow}>
                <View style={styles.onlineDot} />
                <Text style={styles.headerSubtitle}>Pringsewu Pekon Active</Text>
              </View>
            </View>
          </View>
          <View style={styles.headerRightRow}>
            <View style={styles.gpsChip}>
              <Compass size={13} color="#16A36A" />
              <Text style={styles.gpsChipText}>
                {gpsAccuracy ? `±${gpsAccuracy}m` : 'GPS Siap'}
              </Text>
            </View>
            <View style={styles.avatarSmall}>
              <Text style={styles.avatarSmallText}>{getInitials(user?.fullName)}</Text>
            </View>
          </View>
        </View>
        {/* 3-Segmented Switcher Bar */}
        <View style={styles.segmentedBar}>
          <TouchableOpacity
            accessible={true}
            accessibilityRole="tab"
            style={[styles.segmentBtn, activeTab === 'titip' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('titip')}
          >
            <Package size={14} color={activeTab === 'titip' ? '#FFFFFF' : '#64746B'} />
            <Text
              numberOfLines={1}
              style={[styles.segmentText, activeTab === 'titip' && styles.segmentTextActive]}
            >
              Titip Warga
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessible={true}
            accessibilityRole="tab"
            style={[styles.segmentBtn, activeTab === 'kurir' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('kurir')}
          >
            <Bike size={14} color={activeTab === 'kurir' ? '#FFFFFF' : '#64746B'} />
            <Text
              numberOfLines={1}
              style={[styles.segmentText, activeTab === 'kurir' && styles.segmentTextActive]}
            >
              Rute Kurir
            </Text>
            {myRoute && (
              <View
                style={[
                  styles.segmentDot,
                  { backgroundColor: activeTab === 'kurir' ? '#96F6C2' : '#16A36A' },
                ]}
              />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            accessible={true}
            accessibilityRole="tab"
            style={[styles.segmentBtn, activeTab === 'pesanan' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('pesanan')}
          >
            <Inbox size={14} color={activeTab === 'pesanan' ? '#FFFFFF' : '#64746B'} />
            <Text
              numberOfLines={1}
              style={[styles.segmentText, activeTab === 'pesanan' && styles.segmentTextActive]}
            >
              Pesanan
            </Text>
            {orderStats.totalCount > 0 && (
              <View
                style={[
                  styles.segmentBadge,
                  {
                    backgroundColor: activeTab === 'pesanan' ? '#FFFFFF' : '#DDF3E8',
                  },
                ]}
              >
                <Text style={styles.segmentBadgeText}>{orderStats.totalCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
      {/* ========================================================================= */}
      {/* MAIN SCROLLABLE CONTENT                                                   */}
      {/* ========================================================================= */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchData();
            }}
            tintColor="#16A36A"
          />
        }
      >
        {/* ======================================================================= */}
        {/* TAB 1: TITIP BARANG (WARGA PEKON)                                       */}
        {/* ======================================================================= */}
        {activeTab === 'titip' && (
          <View style={styles.tabSection}>
            {/* Screen Narrative Card */}
            <View style={[styles.card, isCompactScreen && { padding: 14, gap: 12 }]}>
              <View style={styles.rowBetween}>
                <View style={styles.badgeSoftGreen}>
                  <View style={styles.onlineDot} />
                  <Text style={styles.badgeSoftGreenText}>
                    GPS Pekon Aktif • Akurasi ±{gpsAccuracy || 4}m
                  </Text>
                </View>
                <View style={styles.badgeNeutral}>
                  <Text style={styles.badgeNeutralText}>Pringsewu</Text>
                </View>
              </View>
              <View style={{ gap: 4 }}>
                <Text style={styles.narrativeTitle}>Logistik Komuter Pekon</Text>
                <Text style={styles.narrativeBody}>
                  Nebeng barang searah rute harian warga. Hemat biaya transportasi hingga 60% dan perkuat ekonomi pekon.
                </Text>
              </View>
              <View style={styles.cardFooterDivider}>
                <MapPin size={14} color="#16A36A" />
                <Text style={styles.locationFooterText} numberOfLines={1}>
                  {currentCoords
                    ? `Koordinat Pekon (${currentCoords.lat.toFixed(3)}, ${currentCoords.lng.toFixed(3)})`
                    : 'Pekon Pagelaran — Kec. Pagelaran'}
                </Text>
              </View>
            </View>
            {/* Filter Radius & Header Section */}
            <View style={styles.filterHeaderRow}>
              <View style={styles.rowCenterGap8}>
                <Text style={styles.sectionTitle}>Rute Aktif Sekitar</Text>
                <View style={styles.countPill}>
                  <Text style={styles.countPillText}>{routes.length} Kurir</Text>
                </View>
              </View>
              <View style={styles.radiusPillGroup}>
                {[10, 25, 50].map((km) => {
                  const active = radiusKm === km;
                  return (
                    <TouchableOpacity
                      key={km}
                      onPress={() => setRadiusKm(km)}
                      style={[styles.radiusPill, active && styles.radiusPillActive]}
                    >
                      <Text style={[styles.radiusPillText, active && styles.radiusPillTextActive]}>
                        {km} km
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            {/* Stream Kartu Driver Rute Aktif */}
            {loading ? (
              <View style={styles.emptyStateBox}>
                <ActivityIndicator size="large" color="#16A36A" />
                <Text style={styles.emptySubtitle}>Memindai rute komuter aktif di sekitar Anda...</Text>
              </View>
            ) : routes.length === 0 ? (
              <View style={styles.cardEmpty}>
                <View style={styles.emptyIconCircle}>
                  <Fuel size={26} color="#087A50" />
                </View>
                <Text style={styles.emptyTitle}>Belum Ada Pengemudi Aktif</Text>
                <Text style={styles.emptySubtitle}>
                  Belum ada warga pekon yang membuka rute dalam radius {radiusKm} km saat ini. Anda dapat membuka rute perjalanan sebagai kurir!
                </Text>
                <TouchableOpacity
                  style={styles.primaryPillBtn}
                  onPress={() => {
                    setActiveTab('kurir');
                    setIsCreateRouteModalOpen(true);
                  }}
                >
                  <PlusCircle size={16} color="#FFFFFF" />
                  <Text style={styles.primaryPillBtnText}>Buka Rute Sebagai Kurir</Text>
                </TouchableOpacity>
              </View>
            ) : (
              routes.map((item) => {
                const distanceKm = item.distance_meters
                  ? (Number(item.distance_meters) / 1000).toFixed(1)
                  : null;
                const activeOrderCount = item.orders?.length || 0;
                const driverName = item.commuter?.fullName || 'Warga Komuter';
                return (
                  <View key={item.id} style={[styles.card, isCompactScreen && { padding: 14, gap: 12 }]}>
                    {/* ZONA 1: Driver Header (Dinamis & Proporsional) */}
                    <View style={styles.driverHeaderRow}>
                      <View style={styles.driverProfileGroup}>
                        <View style={styles.avatarDriver}>
                          <Text style={styles.avatarDriverText}>{getInitials(driverName)}</Text>
                          <View style={styles.avatarOnlineBadge} />
                        </View>
                        <View style={styles.driverTitleBox}>
                          <View style={styles.driverNameRow}>
                            <Text style={styles.driverNameText} numberOfLines={1}>
                              {driverName}
                            </Text>
                            <View style={styles.ratingBadge}>
                              <Star size={11} color="#D97706" fill="#F59E0B" />
                              <Text style={styles.ratingText}>4.9</Text>
                            </View>
                          </View>
                          <Text style={styles.driverMetaSub} numberOfLines={1}>
                            Kurir Komuter Pekon • Terverifikasi
                          </Text>
                        </View>
                      </View>
                      <View style={styles.statusActiveBadge}>
                        <Radio size={11} color="#087A50" />
                        <Text style={styles.statusActiveText}>SEARAH</Text>
                      </View>
                    </View>
                    {/* ZONA 2: Dynamic Connected Vertical Route Timeline */}
                    <View style={styles.routeTimelineBox}>
                      <View style={styles.timelineRow}>
                        {/* Kolom Kiri: Pin & Garis Konektor */}
                        <View style={styles.timelineTrackCol}>
                          <View style={styles.pinOriginDot}>
                            <View style={styles.pinInnerWhite} />
                          </View>
                          <View style={styles.timelineConnectorLine} />
                          <View style={styles.pinDestDot}>
                            <View style={styles.pinInnerWhite} />
                          </View>
                        </View>
                        {/* Kolom Kanan: Nama Lokasi Lebar Penuh (Tidak Terpotong) */}
                        <View style={styles.timelineContentCol}>
                          <View style={styles.locationBlock}>
                            <Text style={styles.locationLabel}>TITIK KEBERANGKATAN</Text>
                            <Text style={styles.locationValue} numberOfLines={2}>
                              {item.originName}
                            </Text>
                          </View>
                          <View style={styles.timelineHorizontalDivider} />
                          <View style={styles.locationBlock}>
                            <Text style={styles.locationLabelDest}>TUJUAN AKHIR</Text>
                            <Text style={styles.locationValue} numberOfLines={2}>
                              {item.destinationName}
                            </Text>
                          </View>
                        </View>
                      </View>
                      {/* Sub-bar Info Waktu & Jarak */}
                      <View style={styles.routeMetaFooter}>
                        <View style={styles.rowCenterGap6}>
                          <Clock size={12} color="#087A50" />
                          <Text style={styles.routeMetaHighlight}>Rute Aktif Sekarang</Text>
                        </View>
                        <Text style={styles.routeMetaSub}>
                          {distanceKm ? `± ${distanceKm} km dari lokasi Anda` : 'Dalam jangkauan pekon'}
                        </Text>
                      </View>
                    </View>
                    {/* ZONA 3: Dynamic 3-Column Metrics Grid */}
                    <View style={styles.metricsRow}>
                      <View style={styles.metricCell}>
                        <Text style={styles.metricLabel}>Jarak Kurir</Text>
                        <Text style={styles.metricValue} numberOfLines={1}>
                          {distanceKm ? `${distanceKm} km` : 'Dekat'}
                        </Text>
                      </View>
                      <View style={styles.metricCell}>
                        <Text style={styles.metricLabel}>Muatan</Text>
                        <Text style={[styles.metricValue, { color: '#087A50' }]} numberOfLines={1}>
                          {activeOrderCount}/3 Titipan
                        </Text>
                      </View>
                      <View style={styles.metricCell}>
                        <Text style={styles.metricLabel}>Patungan</Text>
                        <Text style={styles.metricValue} numberOfLines={1}>
                          Mulai 8rb
                        </Text>
                      </View>
                    </View>
                    {/* ZONA 4: Adaptive Action Footer */}
                    <View style={styles.cardActionFooter}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={styles.savingHintTitle}>Hemat Ongkir ~60%</Text>
                        <Text style={styles.savingHintSub}>Titip dokumen, paket, atau hasil tani</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.ctaOrderBtn}
                        onPress={() => {
                          setSelectedRouteForOrder(item);
                          setIsOrderModalOpen(true);
                        }}
                      >
                        <PlusCircle size={15} color="#FFFFFF" />
                        <Text style={styles.ctaOrderBtnText}>Titip Barang</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
            {/* Neighborhood Safety Assurance Card */}
            <View style={styles.assuranceBanner}>
              <View style={styles.assuranceIconBox}>
                <ShieldCheck size={20} color="#087A50" />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.assuranceTitle}>Komunitas Warga Terverifikasi</Text>
                <Text style={styles.assuranceSub}>
                  Seluruh kurir komuter adalah warga pekon resmi dengan KTP terdata di sistem SINERGI-PEKON.
                </Text>
              </View>
            </View>
          </View>
        )}
        {/* ======================================================================= */}
        {/* TAB 2: RUTE SAYA (KURIR KOMUTER)                                        */}
        {/* ======================================================================= */}
        {activeTab === 'kurir' && (
          <View style={styles.tabSection}>
            {/* Driver Profile Snapshot Card */}
            <View style={[styles.card, isCompactScreen && { padding: 14, gap: 12 }]}>
              <View style={styles.rowBetween}>
                <View style={styles.driverProfileGroup}>
                  <View style={[styles.avatarDriver, { backgroundColor: '#DDF3E8' }]}>
                    <Text style={styles.avatarDriverText}>{getInitials(user?.fullName)}</Text>
                  </View>
                  <View style={styles.driverTitleBox}>
                    <Text style={styles.driverNameText} numberOfLines={1}>
                      {user?.fullName || 'Warga Kurir Pekon'}
                    </Text>
                    <View style={styles.rowCenterGap6}>
                      <View
                        style={[
                          styles.onlineDot,
                          { backgroundColor: myRoute ? '#16A36A' : '#94A3B8' },
                        ]}
                      />
                      <Text style={styles.driverMetaSub} numberOfLines={1}>
                        {myRoute ? 'Rute Aktif di Jalur Utama' : 'Siap Membuka Rute Baru'}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.bountyBox}>
                  <Text style={styles.bountyBoxLabel}>Terkumpul</Text>
                  <Text style={styles.bountyBoxValue}>
                    Rp {orderStats.totalBounty.toLocaleString('id-ID')}
                  </Text>
                </View>
              </View>
            </View>
            {/* KONDISI 1: Kurir Belum Punya Rute Aktif */}
            {!myRoute ? (
              <View style={{ gap: 14 }}>
                <View style={styles.cardEmpty}>
                  <View style={styles.emptyIconCircle}>
                    <Navigation size={26} color="#087A50" />
                  </View>
                  <Text style={styles.emptyTitle}>Anda Belum Membuka Rute Hari Ini</Text>
                  <Text style={styles.emptySubtitle}>
                    Hendak pergi dari pekon ke pasar atau pusat kota? Buka rute perjalanan Anda untuk mengangkut titipan tetangga dan dapatkan uang patungan bensin otomatis!
                  </Text>
                  <TouchableOpacity
                    style={[styles.primaryPillBtn, { width: '100%', justifyContent: 'center' }]}
                    onPress={() => setIsCreateRouteModalOpen(true)}
                  >
                    <PlusCircle size={16} color="#FFFFFF" />
                    <Text style={styles.primaryPillBtnText}>
                      Buka Rute Perjalanan Komuter Baru
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={[styles.card, isCompactScreen && { padding: 14, gap: 12 }]}>
                  <View style={styles.rowCenterGap8}>
                    <Sparkles size={16} color="#16A36A" />
                    <Text style={styles.sectionTitle}>Keuntungan Kurir Komuter Pekon</Text>
                  </View>
                  <View style={{ gap: 8 }}>
                    <Text style={styles.bulletItem}>
                      • Hemat biaya bensin harian dengan uang patungan warga searah.
                    </Text>
                    <Text style={styles.bulletItem}>
                      • Muatan barang ringan: dokumen, obat, bahan pangan, atau paket UMKM.
                    </Text>
                    <Text style={styles.bulletItem}>
                      • Verifikasi posisi otomatis menggunakan GPS real-time yang aman.
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              /* KONDISI 2: Kurir Memiliki Rute Aktif */
              <View style={{ gap: 14 }}>
                {/* Active Route State Card */}
                <View style={[styles.card, { borderColor: '#16A36A', borderWidth: 1.5 }]}>
                  <View style={styles.driverHeaderRow}>
                    <View style={styles.rowCenterGap8}>
                      <View style={styles.onlineDot} />
                      <Text style={styles.sectionTitle}>Rute Perjalanan Aktif</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleFinishRoute(myRoute.id)}
                      style={styles.dangerOutlineBtn}
                    >
                      <Text style={styles.dangerOutlineBtnText}>Akhiri Rute</Text>
                    </TouchableOpacity>
                  </View>
                  {/* Dynamic Vertical Timeline Rute Saya */}
                  <View style={styles.routeTimelineBox}>
                    <View style={styles.timelineRow}>
                      <View style={styles.timelineTrackCol}>
                        <View style={styles.pinOriginDot}>
                          <View style={styles.pinInnerWhite} />
                        </View>
                        <View style={styles.timelineConnectorLine} />
                        <View style={styles.pinDestDot}>
                          <View style={styles.pinInnerWhite} />
                        </View>
                      </View>
                      <View style={styles.timelineContentCol}>
                        <View style={styles.locationBlock}>
                          <Text style={styles.locationLabel}>PEKON ASAL (START)</Text>
                          <Text style={styles.locationValue} numberOfLines={2}>
                            {myRoute.originName}
                          </Text>
                        </View>
                        <View style={styles.timelineHorizontalDivider} />
                        <View style={styles.locationBlock}>
                          <Text style={styles.locationLabelDest}>TUJUAN AKHIR (FINISH)</Text>
                          <Text style={styles.locationValue} numberOfLines={2}>
                            {myRoute.destinationName}
                          </Text>
                        </View>
                      </View>
                    </View>
                    {/* Koordinat GPS Terkini */}
                    <View style={styles.routeMetaFooter}>
                      <View style={styles.rowCenterGap6}>
                        <Compass size={13} color="#087A50" />
                        <Text style={styles.coordMonoText}>
                          {myRoute.currentLat
                            ? `${Number(myRoute.currentLat).toFixed(4)}, ${Number(
                                myRoute.currentLng
                              ).toFixed(4)}`
                            : 'Titik Keberangkatan'}
                        </Text>
                      </View>
                      <Text style={styles.routeMetaHighlight}>
                        {lastPingTime ? `Update ${lastPingTime}` : 'GPS Terhubung'}
                      </Text>
                    </View>
                  </View>
                </View>
                {/* Prominent Live Broadcast GPS Card */}
                <View style={[styles.card, { backgroundColor: '#EFF9F3', borderColor: '#CBEAD8' }]}>
                  <View style={styles.rowBetweenAlignStart}>
                    <View style={styles.gpsBroadcastTitleGroup}>
                      <View style={styles.radarCircle}>
                        <Radio size={18} color="#FFFFFF" />
                      </View>
                      <View style={{ flex: 1, gap: 3 }}>
                        <Text style={styles.sectionTitle}>Live Broadcast GPS (15s)</Text>
                        <Text style={styles.narrativeBody}>
                          Bagikan posisi kendaraan Anda secara real-time kepada warga penitip di sepanjang rute.
                        </Text>
                      </View>
                    </View>
                    <Switch
                      value={isBroadcastingGps}
                      onValueChange={toggleGpsBroadcast}
                      trackColor={{ false: '#CBD5E1', true: '#16A36A' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>
                  <View style={styles.broadcastStatusStrip}>
                    <View style={styles.rowCenterGap6}>
                      <View
                        style={[
                          styles.onlineDot,
                          { backgroundColor: isBroadcastingGps ? '#16A36A' : '#64746B' },
                        ]}
                      />
                      <Text style={styles.broadcastStatusText}>
                        {isBroadcastingGps
                          ? 'GPS Sedang Disiarkan Publik'
                          : 'Penyiaran GPS Otomatis Dijeda'}
                      </Text>
                    </View>
                    <Text style={styles.routeMetaSub}>
                      {orderStats.totalCount} Penitip
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.secondaryWhiteBtn}
                    onPress={() => sendGpsPing(myRoute.id)}
                  >
                    <RefreshCw size={14} color="#087A50" />
                    <Text style={styles.secondaryWhiteBtnText}>Perbarui Posisi GPS Sekarang</Text>
                  </TouchableOpacity>
                </View>
                {/* Shortcut Lihat Pesanan Masuk */}
                <TouchableOpacity
                  style={styles.cardRowShortcut}
                  onPress={() => setActiveTab('pesanan')}
                >
                  <View style={styles.rowCenterGap12}>
                    <View style={styles.brandIconCircle}>
                      <Inbox size={18} color="#087A50" />
                    </View>
                    <View style={{ gap: 2 }}>
                      <Text style={styles.sectionTitle}>
                        Kelola {orderStats.totalCount} Pesanan Titipan Masuk
                      </Text>
                      <Text style={styles.routeMetaSub}>
                        {orderStats.pendingCount} permintaan menunggu konfirmasi Anda
                      </Text>
                    </View>
                  </View>
                  <ArrowRight size={18} color="#087A50" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
        {/* ======================================================================= */}
        {/* TAB 3: PESANAN MASUK (KURIR KOMUTER)                                    */}
        {/* ======================================================================= */}
        {activeTab === 'pesanan' && (
          <View style={styles.tabSection}>
            {/* Metrics 2-Card Grid */}
            <View style={styles.metricsTwoColGrid}>
              <View style={styles.statMetricCard}>
                <View style={styles.rowBetween}>
                  <Text style={styles.metricLabel}>Total Masuk</Text>
                  <Inbox size={15} color="#16A36A" />
                </View>
                <View style={styles.statValueBaseline}>
                  <Text style={styles.statBigNumber}>{orderStats.totalCount}</Text>
                  <Text style={styles.metricLabel}>permintaan</Text>
                </View>
                <Text style={styles.statFootNote} numberOfLines={1}>
                  {orderStats.pendingCount} menunggu • {orderStats.acceptedCount} terkunci
                </Text>
              </View>
              <View style={styles.statMetricCard}>
                <View style={styles.rowBetween}>
                  <Text style={styles.metricLabel}>Patungan Bensin</Text>
                  <Fuel size={15} color="#16A36A" />
                </View>
                <View style={styles.statValueBaseline}>
                  <Text style={[styles.statBigNumber, { color: '#087A50' }]} numberOfLines={1}>
                    Rp {orderStats.totalBounty.toLocaleString('id-ID')}
                  </Text>
                </View>
                <Text style={styles.statFootNote} numberOfLines={1}>
                  Akumulasi rute aktif ini
                </Text>
              </View>
            </View>
            {/* Filter Status Pills */}
            <View style={styles.filterPillsRow}>
              {[
                { key: 'all', label: `Semua (${orderStats.totalCount})` },
                { key: 'pending', label: `Menunggu (${orderStats.pendingCount})` },
                { key: 'accepted', label: `Diterima (${orderStats.acceptedCount})` },
              ].map((tab) => {
                const active = orderStatusFilter === tab.key;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    onPress={() => setOrderStatusFilter(tab.key as any)}
                    style={[styles.filterTabPill, active && styles.filterTabPillActive]}
                  >
                    <Text
                      style={[styles.filterTabPillText, active && styles.filterTabPillTextActive]}
                    >
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {/* Feed Daftar Pesanan */}
            {filteredOrders.length === 0 ? (
              <View style={styles.cardEmpty}>
                <View style={styles.emptyIconCircle}>
                  <CheckCircle size={26} color="#087A50" />
                </View>
                <Text style={styles.emptyTitle}>Belum Ada Pesanan pada Kategori Ini</Text>
                <Text style={styles.emptySubtitle}>
                  Permintaan titip barang dari warga sekitar rute komuter Anda akan otomatis muncul di halaman ini.
                </Text>
              </View>
            ) : (
              filteredOrders.map((order) => {
                const isRequested = order.status === 'REQUESTED';
                const isAccepted = order.status === 'ACCEPTED';
                const requesterName = order.requester?.fullName || 'Warga Penitip';
                return (
                  <View key={order.id} style={[styles.card, isCompactScreen && { padding: 14, gap: 12 }]}>
                    {/* ZONA 1: Header Pemesan */}
                    <View style={styles.driverHeaderRow}>
                      <View style={styles.driverProfileGroup}>
                        <View style={[styles.avatarDriver, { backgroundColor: '#DDF3E8' }]}>
                          <Text style={styles.avatarDriverText}>{getInitials(requesterName)}</Text>
                        </View>
                        <View style={styles.driverTitleBox}>
                          <View style={styles.driverNameRow}>
                            <Text style={styles.driverNameText} numberOfLines={1}>
                              {requesterName}
                            </Text>
                            <ShieldCheck size={14} color="#16A36A" />
                          </View>
                          <Text style={styles.driverMetaSub} numberOfLines={1}>
                            {order.requester?.phoneNumber || 'Warga Pekon Terverifikasi'}
                          </Text>
                        </View>
                      </View>
                      <View
                        style={[
                          styles.orderStatusBadge,
                          isAccepted ? styles.badgeAccepted : styles.badgePending,
                        ]}
                      >
                        <Text
                          style={[
                            styles.orderStatusBadgeText,
                            isAccepted ? styles.badgeAcceptedText : styles.badgePendingText,
                          ]}
                        >
                          {isAccepted ? 'TERKUNCI' : 'MENUNGGU'}
                        </Text>
                      </View>
                    </View>
                    {/* ZONA 2: Deskripsi Barang Titipan */}
                    <View style={styles.packageDetailBox}>
                      <View style={styles.packageIconWrap}>
                        <Package size={18} color="#087A50" />
                      </View>
                      <View style={{ flex: 1, gap: 3 }}>
                        <Text style={styles.locationLabel}>DESKRIPSI BARANG TITIPAN</Text>
                        <Text style={styles.packageDescriptionText}>{order.itemDescription}</Text>
                      </View>
                    </View>
                    {/* ZONA 3: Waypoint Jemput & Tujuan */}
                    <View style={styles.routeTimelineBox}>
                      <View style={styles.timelineRow}>
                        <View style={styles.timelineTrackCol}>
                          <View style={styles.pinOriginDot}>
                            <View style={styles.pinInnerWhite} />
                          </View>
                          <View style={styles.timelineConnectorLine} />
                          <View style={styles.pinDestDot}>
                            <View style={styles.pinInnerWhite} />
                          </View>
                        </View>
                        <View style={styles.timelineContentCol}>
                          <View style={styles.locationBlock}>
                            <Text style={styles.locationLabel}>TITIK JEMPUT WARGA (GPS)</Text>
                            <Text style={styles.locationValue} numberOfLines={1}>
                              {order.pickupLat
                                ? `Koordinat (${Number(order.pickupLat).toFixed(4)}, ${Number(
                                    order.pickupLng
                                  ).toFixed(4)})`
                                : 'Sesuai Titik Pekon Warga'}
                            </Text>
                          </View>
                          <View style={styles.timelineHorizontalDivider} />
                          <View style={styles.locationBlock}>
                            <Text style={styles.locationLabelDest}>TUJUAN PENGANTARAN</Text>
                            <Text style={styles.locationValue} numberOfLines={1}>
                              {myRoute?.destinationName || 'Sesuai Tujuan Rute Kurir'}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                    {/* ZONA 4: Highlight Patungan Bensin */}
                    <View style={styles.bountyHighlightStrip}>
                      <View style={styles.rowCenterGap8}>
                        <Fuel size={16} color="#087A50" />
                        <Text style={styles.bountyStripLabel}>Tawaran Patungan Bensin</Text>
                      </View>
                      <Text style={styles.bountyStripAmount}>
                        Rp {Number(order.fuelShareCost).toLocaleString('id-ID')}
                      </Text>
                    </View>
                    {/* ZONA 5: Action Buttons */}
                    <View style={styles.orderActionsCol}>
                      {isRequested && (
                        <TouchableOpacity
                          style={styles.acceptOrderPrimaryBtn}
                          onPress={() => handleAcceptOrder(order.id, requesterName)}
                        >
                          <Lock size={15} color="#FFFFFF" />
                          <Text style={styles.acceptOrderPrimaryBtnText}>
                            Terima Titipan & Kunci Transaksi
                          </Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={styles.whatsappBtn}
                        onPress={() =>
                          handleContactWhatsApp(order.requester?.phoneNumber, requesterName)
                        }
                      >
                        <MessageSquare size={15} color="#087A50" />
                        <Text style={styles.whatsappBtnText}>Hubungi Warga (WhatsApp)</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>
      {/* ========================================================================= */}
      {/* MODAL 1: BUKA RUTE BARU (KURIR KOMUTER)                                    */}
      {/* ========================================================================= */}
      <Modal visible={isCreateRouteModalOpen} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalSheet}>
            <View style={styles.sheetDragHandle} />
            {/* Modal Header */}
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.modalTitle}>Buka Rute Perjalanan Komuter</Text>
                <Text style={styles.modalSubtitle}>
                  Isi detail perjalanan Anda untuk menerima titipan warga searah.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsCreateRouteModalOpen(false)}
                style={styles.modalCloseBtn}
              >
                <X size={18} color="#171717" />
              </TouchableOpacity>
            </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ marginTop: 16 }}
              contentContainerStyle={{ gap: 18, paddingBottom: 16 }}
            >
              {/* Field 1: Pekon Asal */}
              <View style={{ gap: 8 }}>
                <Text style={styles.inputLabel}>Pekon Asal Perjalanan</Text>
                <TextInput
                  value={originName}
                  onChangeText={setOriginName}
                  placeholder="Contoh: Pekon Pagelaran"
                  placeholderTextColor="#94A3B8"
                  style={styles.textInputSingle}
                />
              </View>
              {/* Field 2: Tujuan Perjalanan + Quick Presets */}
              <View style={{ gap: 8 }}>
                <View style={styles.rowBetween}>
                  <Text style={styles.inputLabel}>Tujuan Perjalanan (Pasar / Kota)</Text>
                  <Text style={styles.inputHelperAccent}>Pilih Cepat</Text>
                </View>
                <TextInput
                  value={destinationName}
                  onChangeText={setDestinationName}
                  placeholder="Contoh: Pasar Induk Pringsewu"
                  placeholderTextColor="#94A3B8"
                  style={styles.textInputSingle}
                />
                <View style={styles.presetChipWrap}>
                  {PRESET_DESTINATIONS.map((dest) => {
                    const selected = destinationName === dest.name;
                    return (
                      <TouchableOpacity
                        key={dest.name}
                        onPress={() => {
                          setDestinationName(dest.name);
                          setDestLat(dest.lat);
                          setDestLng(dest.lng);
                        }}
                        style={[styles.presetChip, selected && styles.presetChipActive]}
                      >
                        <Text
                          style={[styles.presetChipText, selected && styles.presetChipTextActive]}
                        >
                          {dest.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
              {/* Field 3: Kapasitas Bagasi Kendaraan */}
              <View style={{ gap: 8 }}>
                <Text style={styles.inputLabel}>Kapasitas Bagasi Kendaraan</Text>
                <View style={styles.vehicleSelectorRow}>
                  <TouchableOpacity
                    onPress={() => setVehicleType('motor')}
                    style={[
                      styles.vehicleOptionCard,
                      vehicleType === 'motor' && styles.vehicleOptionCardActive,
                    ]}
                  >
                    <Bike size={20} color={vehicleType === 'motor' ? '#16A36A' : '#64746B'} />
                    <Text style={styles.vehicleOptionTitle}>Motor Roda Dua</Text>
                    <Text style={styles.vehicleOptionSub}>Kardus Sedang (Maks 15kg)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setVehicleType('mobil')}
                    style={[
                      styles.vehicleOptionCard,
                      vehicleType === 'mobil' && styles.vehicleOptionCardActive,
                    ]}
                  >
                    <Truck size={20} color={vehicleType === 'mobil' ? '#16A36A' : '#64746B'} />
                    <Text style={styles.vehicleOptionTitle}>Mobil / Pikap</Text>
                    <Text style={styles.vehicleOptionSub}>Bagasi Luas (Maks 150kg)</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {/* GPS Security Info */}
              <View style={styles.gpsModalCard}>
                <View style={styles.gpsModalIconBox}>
                  <ShieldCheck size={18} color="#16A36A" />
                </View>
                <Text style={[styles.helperText, { flex: 1, marginTop: 0 }]}>
                  Rute diverifikasi otomatis dengan GPS real-time demi keamanan amanah barang warga pekon.
                </Text>
              </View>
            </ScrollView>
            <TouchableOpacity
              disabled={submittingRoute}
              onPress={handleStartRoute}
              style={[styles.modalPrimaryCta, submittingRoute && styles.modalPrimaryCtaDisabled]}
            >
              {submittingRoute ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.modalPrimaryCtaText}>Mulai & Buka Rute Perjalanan</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      {/* ========================================================================= */}
      {/* MODAL 2: TITIP BARANG SEARAH (WARGA) — DYNAMIC & RESPONSIVE HIERARCHY      */}
      {/* ========================================================================= */}
      <Modal visible={isOrderModalOpen} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalSheet}>
            <View style={styles.sheetDragHandle} />
            {/* A. Modal Header */}
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.modalTitle}>Titip Barang Searah</Text>
                <Text style={styles.modalSubtitle}>
                  Kirim barang bersama kurir dengan rute yang sama.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsOrderModalOpen(false)}
                style={styles.modalCloseBtn}
                accessibilityLabel="Tutup modal titip barang"
              >
                <X size={18} color="#171717" />
              </TouchableOpacity>
            </View>
            {/* Scrollable Body */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ marginTop: 16 }}
              contentContainerStyle={{ gap: 20, paddingBottom: 16 }}
            >
              {/* B. Selected Route Information Card (Dynamic Vertical Timeline) */}
              {selectedRouteForOrder && (
                <View style={styles.selectedRouteModalCard}>
                  <View style={styles.selectedRouteHeader}>
                    <View style={styles.rowCenterGap6}>
                      <Truck size={14} color="#087A50" />
                      <Text style={styles.selectedRouteTag}>RUTE KURIR</Text>
                    </View>
                    <Text style={styles.selectedRouteDriver} numberOfLines={1}>
                      {selectedRouteForOrder.commuter?.fullName || 'Warga Pekon'}
                    </Text>
                  </View>
                  {/* Dynamic Connected Vertical Timeline agar nama lokasi panjang tidak terpotong */}
                  <View style={styles.timelineRow}>
                    <View style={styles.timelineTrackCol}>
                      <View style={styles.pinOriginDot}>
                        <View style={styles.pinInnerWhite} />
                      </View>
                      <View style={styles.timelineConnectorLine} />
                      <View style={styles.pinDestDot}>
                        <View style={styles.pinInnerWhite} />
                      </View>
                    </View>
                    <View style={styles.timelineContentCol}>
                      <View style={styles.locationBlock}>
                        <Text style={styles.locationLabel}>ASAL KEBERANGKATAN</Text>
                        <Text style={styles.locationValue} numberOfLines={2}>
                          {selectedRouteForOrder.originName}
                        </Text>
                      </View>
                      <View style={[styles.timelineHorizontalDivider, { backgroundColor: '#CBEAD8' }]} />
                      <View style={styles.locationBlock}>
                        <Text style={styles.locationLabelDest}>TUJUAN PENGANTARAN</Text>
                        <Text style={styles.locationValue} numberOfLines={2}>
                          {selectedRouteForOrder.destinationName}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}
              {/* C. Item Description Section */}
              <View>
                <Text style={styles.inputLabel}>Deskripsi Barang Titipan</Text>
                <TextInput
                  value={itemDescription}
                  onChangeText={setItemDescription}
                  placeholder="Contoh: Paket dokumen atau 2 botol madu."
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  style={styles.textInputMultiline}
                />
                <Text style={styles.helperText}>
                  Pastikan barang aman dan dikemas rapi sebelum diserahkan ke kurir.
                </Text>
              </View>
              {/* D. Fuel Contribution Section */}
              <View>
                <View style={[styles.rowBetween, { marginBottom: 8 }]}>
                  <Text style={[styles.inputLabel, { marginBottom: 0 }]}>Patungan Bensin</Text>
                  <Text style={styles.inputHelperAccent}>Uang Kasih Sepadan</Text>
                </View>
                <View style={styles.currencyInputWrapper}>
                  <View style={styles.currencyPrefixBox}>
                    <Text style={styles.currencyPrefixText}>Rp</Text>
                  </View>
                  <TextInput
                    value={fuelShareCost}
                    onChangeText={setFuelShareCost}
                    placeholder="Contoh: 7.500"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    style={styles.currencyTextInput}
                  />
                </View>
                {/* Quick Chips Nominal */}
                <View style={styles.quickNominalRow}>
                  {['8000', '10000', '15000'].map((amount) => {
                    const isSelected = fuelShareCost === amount;
                    return (
                      <TouchableOpacity
                        key={amount}
                        onPress={() => setFuelShareCost(amount)}
                        style={[
                          styles.nominalChip,
                          isSelected && styles.nominalChipSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.nominalChipText,
                            isSelected && styles.nominalChipTextSelected,
                          ]}
                        >
                          Rp {Number(amount).toLocaleString('id-ID')}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Text style={styles.helperText}>
                  Kontribusi untuk membantu biaya perjalanan kurir.
                </Text>
              </View>
              {/* E. Automatic GPS Pickup Information */}
              <View style={styles.gpsModalCard}>
                <View style={styles.gpsModalIconBox}>
                  <MapPin size={17} color="#16A36A" />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.gpsModalTitle}>Lokasi Penjemputan</Text>
                  <Text style={styles.gpsModalStatus}>
                    {currentCoords ? 'Lokasi GPS terdeteksi' : 'Mendeteksi lokasi...'}
                  </Text>
                  <Text style={styles.gpsModalCoord}>
                    {currentCoords
                      ? `Lat: ${currentCoords.lat.toFixed(4)}, Lng: ${currentCoords.lng.toFixed(4)} • Akurasi ±${gpsAccuracy || 4}m`
                      : 'Menghubungkan ke satelit GPS perangkat...'}
                  </Text>
                </View>
              </View>
            </ScrollView>
            {/* F. Primary Action Button */}
            <TouchableOpacity
              disabled={submittingOrder}
              onPress={handleSendOrder}
              style={[styles.modalPrimaryCta, submittingOrder && styles.modalPrimaryCtaDisabled]}
              accessibilityRole="button"
              accessibilityLabel="Kirim Permintaan Titipan"
            >
              {submittingOrder ? (
                <View style={styles.rowCenterGap8}>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text style={styles.modalPrimaryCtaText}>Mengirim Permintaan...</Text>
                </View>
              ) : (
                <Text style={styles.modalPrimaryCtaText}>Kirim Permintaan Titipan</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
// ============================================================================
// DETERMINISTIC DYNAMIC STYLESHEET (100% KONSISTEN DI SEMUA LAYAR MOBILE)
// ============================================================================
const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#F4F7F5',
  },
  topHeader: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8E4',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  headerBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  brandIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DDF3E8',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#171717',
  },
  headerStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#16A36A',
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#087A50',
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  gpsChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EFF9F3',
    borderWidth: 1,
    borderColor: '#CBEAD8',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  gpsChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#087A50',
  },
  avatarSmall: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#16A36A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSmallText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Segmented Switcher
  segmentedBar: {
    flexDirection: 'row',
    backgroundColor: '#EEF2EF',
    padding: 4,
    borderRadius: 999,
    marginTop: 12,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 999,
    gap: 6,
  },
  segmentBtnActive: {
    backgroundColor: '#16A36A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64746B',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  segmentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  segmentBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 999,
  },
  segmentBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#087A50',
  },
  // Scroll Content & Containers
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 130,
  },
  tabSection: {
    gap: 16,
  },
  // Universal Dynamic Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8E4',
    gap: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardEmpty: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8E4',
    alignItems: 'center',
    gap: 12,
  },
  emptyStateBox: {
    paddingVertical: 48,
    alignItems: 'center',
    gap: 10,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EFF9F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#171717',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64746B',
    textAlign: 'center',
    lineHeight: 18,
  },
  // Common Flex Helpers
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  rowBetweenAlignStart: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowCenterGap6: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowCenterGap8: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowCenterGap12: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  // Narrative Card Elements
  badgeSoftGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF9F3',
    borderWidth: 1,
    borderColor: '#CBEAD8',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeSoftGreenText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#087A50',
  },
  badgeNeutral: {
    backgroundColor: '#F1F5F3',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeNeutralText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  narrativeTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#171717',
  },
  narrativeBody: {
    fontSize: 12,
    color: '#64746B',
    lineHeight: 18,
  },
  cardFooterDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEF2EF',
  },
  locationFooterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#171717',
    flex: 1,
  },
  // Filter Header & Radius Pills
  filterHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#171717',
  },
  countPill: {
    backgroundColor: '#DDF3E8',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  countPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#087A50',
  },
  radiusPillGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  radiusPill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8E4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  radiusPillActive: {
    backgroundColor: '#16A36A',
    borderColor: '#16A36A',
  },
  radiusPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64746B',
  },
  radiusPillTextActive: {
    color: '#FFFFFF',
  },
  // Driver Card Zona 1: Header
  driverHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2EF',
    gap: 10,
  },
  driverProfileGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatarDriver: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EFF9F3',
    borderWidth: 1.5,
    borderColor: '#16A36A',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    flexShrink: 0,
  },
  avatarDriverText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#087A50',
  },
  avatarOnlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#16A36A',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  driverTitleBox: {
    flex: 1,
    gap: 2,
  },
  driverNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  driverNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#171717',
    flexShrink: 1,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    flexShrink: 0,
  },
  ratingText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309',
  },
  driverMetaSub: {
    fontSize: 11,
    color: '#64746B',
  },
  statusActiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DDF3E8',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    flexShrink: 0,
  },
  statusActiveText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#087A50',
  },
  // Zona 2: Dynamic Connected Vertical Route Timeline
  routeTimelineBox: {
    backgroundColor: '#F8FAF9',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8E4',
    gap: 12,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
  },
  timelineTrackCol: {
    width: 18,
    alignItems: 'center',
    paddingVertical: 4,
  },
  pinOriginDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#16A36A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinDestDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#E11D48',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinInnerWhite: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  timelineConnectorLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#CBEAD8',
    marginVertical: 4,
    minHeight: 22,
  },
  timelineContentCol: {
    flex: 1,
    justifyContent: 'space-between',
    gap: 10,
  },
  locationBlock: {
    gap: 2,
  },
  locationLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64746B',
    letterSpacing: 0.4,
  },
  locationLabelDest: {
    fontSize: 10,
    fontWeight: '700',
    color: '#E11D48',
    letterSpacing: 0.4,
  },
  locationValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#171717',
    lineHeight: 18,
  },
  timelineHorizontalDivider: {
    height: 1,
    backgroundColor: '#E2E8E4',
  },
  routeMetaFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8E4',
    flexWrap: 'wrap',
    gap: 6,
  },
  routeMetaHighlight: {
    fontSize: 11,
    fontWeight: '700',
    color: '#087A50',
  },
  routeMetaSub: {
    fontSize: 11,
    color: '#64746B',
  },
  // Zona 3: Dynamic 3-Column Metrics Grid
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metricCell: {
    flex: 1,
    backgroundColor: '#F8FAF9',
    borderWidth: 1,
    borderColor: '#E2E8E4',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  metricLabel: {
    fontSize: 11,
    color: '#64746B',
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#171717',
  },
  // Zona 4: Card Action Footer
  cardActionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEF2EF',
    gap: 10,
  },
  savingHintTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#087A50',
  },
  savingHintSub: {
    fontSize: 11,
    color: '#64746B',
    marginTop: 1,
  },
  ctaOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#16A36A',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 999,
    flexShrink: 0,
  },
  ctaOrderBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Primary Pill Button
  primaryPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#16A36A',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
    marginTop: 4,
  },
  primaryPillBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Assurance Banner
  assuranceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#EFF9F3',
    borderWidth: 1,
    borderColor: '#CBEAD8',
    borderRadius: 18,
    padding: 16,
  },
  assuranceIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  assuranceTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#171717',
  },
  assuranceSub: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 16,
  },
  // Tab 2: Kurir Specifics
  bountyBox: {
    backgroundColor: '#EFF9F3',
    borderWidth: 1,
    borderColor: '#CBEAD8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  bountyBoxLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#087A50',
  },
  bountyBoxValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#16A36A',
    marginTop: 2,
  },
  bulletItem: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  dangerOutlineBtn: {
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  dangerOutlineBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E11D48',
  },
  coordMonoText: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#475569',
  },
  gpsBroadcastTitleGroup: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flex: 1,
  },
  radarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#16A36A',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  broadcastStatusStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBEAD8',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  broadcastStatusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#087A50',
  },
  secondaryWhiteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBEAD8',
    paddingVertical: 12,
    borderRadius: 999,
  },
  secondaryWhiteBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#087A50',
  },
  cardRowShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8E4',
    borderRadius: 18,
    padding: 16,
  },
  // Tab 3: Pesanan Masuk Specifics
  metricsTwoColGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statMetricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8E4',
    borderRadius: 18,
    padding: 16,
    gap: 6,
  },
  statValueBaseline: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  statBigNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#171717',
  },
  statFootNote: {
    fontSize: 11,
    fontWeight: '600',
    color: '#087A50',
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterTabPill: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8E4',
    paddingVertical: 9,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterTabPillActive: {
    backgroundColor: '#16A36A',
    borderColor: '#16A36A',
  },
  filterTabPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64746B',
  },
  filterTabPillTextActive: {
    color: '#FFFFFF',
  },
  orderStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    flexShrink: 0,
  },
  badgeAccepted: {
    backgroundColor: '#DDF3E8',
  },
  badgePending: {
    backgroundColor: '#FEF3C7',
  },
  orderStatusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  badgeAcceptedText: {
    color: '#087A50',
  },
  badgePendingText: {
    color: '#B45309',
  },
  packageDetailBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#F8FAF9',
    borderWidth: 1,
    borderColor: '#E2E8E4',
    borderRadius: 14,
    padding: 14,
  },
  packageIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF9F3',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  packageDescriptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#171717',
    lineHeight: 19,
  },
  bountyHighlightStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EFF9F3',
    borderWidth: 1,
    borderColor: '#CBEAD8',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  bountyStripLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#087A50',
  },
  bountyStripAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#16A36A',
  },
  orderActionsCol: {
    gap: 10,
    paddingTop: 4,
  },
  acceptOrderPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#16A36A',
    paddingVertical: 13,
    borderRadius: 14,
  },
  acceptOrderPrimaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  whatsappBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F8FAF9',
    borderWidth: 1,
    borderColor: '#E2E8E4',
    paddingVertical: 12,
    borderRadius: 14,
  },
  whatsappBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#087A50',
  },
  // ==========================================================================
  // MODAL STYLES (BOTTOM SHEET)
  // ==========================================================================
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    maxHeight: '88%',
  },
  sheetDragHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8E4',
    alignSelf: 'center',
    marginBottom: 14,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7E5',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#171717',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#777777',
    marginTop: 3,
    lineHeight: 17,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E5E7E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedRouteModalCard: {
    backgroundColor: '#EFF9F3',
    borderWidth: 1,
    borderColor: '#DDF3E8',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  selectedRouteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#CBEAD8',
  },
  selectedRouteTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#087A50',
    letterSpacing: 0.6,
  },
  selectedRouteDriver: {
    fontSize: 12,
    fontWeight: '700',
    color: '#087A50',
    maxWidth: '60%',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#171717',
    marginBottom: 8,
  },
  inputHelperAccent: {
    fontSize: 11,
    fontWeight: '700',
    color: '#087A50',
  },
  textInputSingle: {
    height: 50,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7E5',
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 13,
    fontWeight: '600',
    color: '#171717',
  },
  textInputMultiline: {
    minHeight: 88,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7E5',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13,
    fontWeight: '500',
    color: '#171717',
    lineHeight: 19,
  },
  helperText: {
    fontSize: 11,
    color: '#777777',
    marginTop: 6,
    lineHeight: 16,
  },
  currencyInputWrapper: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7E5',
    borderRadius: 14,
    overflow: 'hidden',
  },
  currencyPrefixBox: {
    height: '100%',
    paddingHorizontal: 16,
    backgroundColor: '#EFF9F3',
    borderRightWidth: 1,
    borderRightColor: '#E5E7E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyPrefixText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#16A36A',
  },
  currencyTextInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 14,
    fontSize: 16,
    fontWeight: '800',
    color: '#171717',
  },
  quickNominalRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  nominalChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7E5',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nominalChipSelected: {
    backgroundColor: '#EFF9F3',
    borderColor: '#16A36A',
  },
  nominalChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#777777',
  },
  nominalChipTextSelected: {
    color: '#16A36A',
  },
  gpsModalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#EFF9F3',
    borderWidth: 1,
    borderColor: '#DDF3E8',
    borderRadius: 14,
    padding: 14,
  },
  gpsModalIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDF3E8',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  gpsModalTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#171717',
  },
  gpsModalStatus: {
    fontSize: 11,
    fontWeight: '600',
    color: '#16A36A',
  },
  gpsModalCoord: {
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#777777',
  },
  modalPrimaryCta: {
    height: 52,
    backgroundColor: '#16A36A',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  modalPrimaryCtaDisabled: {
    backgroundColor: '#98D8BA',
  },
  modalPrimaryCtaText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  presetChipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  presetChip: {
    backgroundColor: '#F8FAF9',
    borderWidth: 1,
    borderColor: '#E2E8E4',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  presetChipActive: {
    backgroundColor: '#16A36A',
    borderColor: '#16A36A',
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  presetChipTextActive: {
    color: '#FFFFFF',
  },
  vehicleSelectorRow: {
    flexDirection: 'row',
    gap: 10,
  },
  vehicleOptionCard: {
    flex: 1,
    backgroundColor: '#F8FAF9',
    borderWidth: 1,
    borderColor: '#E2E8E4',
    borderRadius: 16,
    padding: 14,
    gap: 6,
  },
  vehicleOptionCardActive: {
    backgroundColor: '#EFF9F3',
    borderColor: '#16A36A',
    borderWidth: 1.5,
  },
  vehicleOptionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#171717',
    marginTop: 2,
  },
  vehicleOptionSub: {
    fontSize: 10,
    color: '#64746B',
  },
});
