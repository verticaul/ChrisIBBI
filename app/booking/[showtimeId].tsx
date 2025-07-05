import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert, UIManager, Platform, LayoutAnimation, Dimensions
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCineCrypto } from '../../hooks/useCineCrypto';
import { Ionicons } from '@expo/vector-icons';
import { Seatmap } from '../../constants/types';
import { ethers } from 'ethers';
import { useAppKitProvider, useAppKit, useAppKitAccount } from '@reown/appkit-ethers-react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Aktifkan LayoutAnimation untuk Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- Konfigurasi Denah Kursi ---
const SEATS_PER_ROW = 20;
const AISLE_SEAT_INDEX = 10;
const SEAT_SIZE = 32;
const SEAT_MARGIN = 5;
const AISLE_WIDTH = 24;
const ROW_LABEL_WIDTH = 30;

const getSeatLabel = (seatNumber: number) => {
    const rowNumber = Math.floor((seatNumber - 1) / SEATS_PER_ROW);
    const seatInRow = (seatNumber - 1) % SEATS_PER_ROW + 1;
    return `${String.fromCharCode(65 + rowNumber)}${seatInRow}`;
};

type SeatStatus = 'available' | 'taken' | 'selected';

const Seat = React.memo(({ status, onSelect }: { status: SeatStatus; onSelect: () => void }) => {
    const gradientColors = status === 'selected' 
        ? ['#FFC107', '#F57C00'] 
        : status === 'available' 
        ? ['#43A047', '#66BB6A'] 
        : ['#424242', '#303030'];

    return (
        <TouchableOpacity onPress={onSelect} disabled={status === 'taken'}>
            <LinearGradient
                colors={gradientColors}
                style={[ styles.seat, status === 'taken' && styles.seatTaken ]}
            >
                <Ionicons name="person" size={18} color={status === 'taken' ? '#555' : '#fff'} />
            </LinearGradient>
        </TouchableOpacity>
    );
});

export default function BookingScreen() {
  const router = useRouter();
  const { showtimeId } = useLocalSearchParams<{ showtimeId: string }>();
  // PERBAIKAN: Memastikan semua fungsi yang dibutuhkan diambil dari hook
  const { getShowtimeSeatmap, buyTicket, buyMultipleTickets } = useCineCrypto();
  const { isConnected } = useAppKitAccount();
  const { open } = useAppKit();

  const [seatmap, setSeatmap] = useState<Seatmap | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBooking, setIsBooking] = useState(false);

  useEffect(() => {
    const loadSeatmap = async () => {
      if (!showtimeId) return;
      setIsLoading(true);
      const data = await getShowtimeSeatmap(Number(showtimeId));
      setSeatmap(data);
      setIsLoading(false);
    };
    loadSeatmap();
  }, [showtimeId, getShowtimeSeatmap]);

  const handleSelectSeat = (seatNumber: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedSeats(prev =>
      prev.includes(seatNumber)
        ? prev.filter(s => s !== seatNumber)
        : [...prev, seatNumber]
    );
  };

  const totalPrice = useMemo(() => {
    if (!seatmap || selectedSeats.length === 0) return '0';
    const pricePerTicket = parseFloat(seatmap.ticketPrice);
    return (pricePerTicket * selectedSeats.length).toFixed(5);
  }, [selectedSeats, seatmap]);

  // PERBAIKAN: Alur transaksi yang lebih baik
  const handleBuyTickets = async () => {
    if (selectedSeats.length === 0) {
      Alert.alert("Pilih Kursi", "Anda harus memilih setidaknya satu kursi.");
      return;
    }
    if (!isConnected) {
      Alert.alert("Dompet Tidak Terhubung", "Silakan hubungkan dompet Anda untuk melanjutkan.", [
        { text: "Hubungkan Dompet", onPress: () => open() },
        { text: "Batal", style: "cancel" }
      ]);
      return;
    }

    setIsBooking(true);
    try {
      const totalValue = ethers.parseEther(totalPrice);
      let txPromise;

      if (selectedSeats.length === 1) {
        txPromise = buyTicket(Number(showtimeId), selectedSeats[0], totalValue);
      } else {
        txPromise = buyMultipleTickets(Number(showtimeId), selectedSeats.sort((a, b) => a - b), totalValue);
      }
      
      // Kirim transaksi, tapi jangan tunggu konfirmasi di sini
      await txPromise;

      // Beri umpan balik instan kepada pengguna
      Alert.alert(
        "Transaksi Dikirim",
        "Pembelian Anda sedang diproses di blockchain. Anda akan diarahkan ke halaman profil, tiket akan muncul setelah transaksi berhasil.",
        [{ text: "OK", onPress: () => router.replace('/profile') }]
      );

    } catch (error: any) {
      console.error("Gagal membeli tiket:", error);
      Alert.alert("Transaksi Gagal", error.reason || "Terjadi kesalahan saat mengirim transaksi Anda.");
      setIsBooking(false); // Hanya hentikan loading jika ada error
    }
  };

  const renderSeats = () => {
    if (!seatmap) return null;
    const totalRows = Math.ceil(seatmap.totalSeats / SEATS_PER_ROW);
    const rows = [];

    const columnLabels = [];
    for (let j = 0; j < SEATS_PER_ROW; j++) {
        columnLabels.push(<Text key={`col-label-${j}`} style={styles.columnLabel}>{j + 1}</Text>);
        if (j === AISLE_SEAT_INDEX - 1) {
            columnLabels.push(<View key={`col-aisle-${j}`} style={{width: AISLE_WIDTH}} />);
        }
    }
    rows.push(
        <View key="col-labels" style={styles.seatRow}>
            <View style={{width: ROW_LABEL_WIDTH}} />
            {columnLabels}
        </View>
    );

    for (let i = 0; i < totalRows; i++) {
        const rowSeats = [];
        for (let j = 0; j < SEATS_PER_ROW; j++) {
            const seatNumber = i * SEATS_PER_ROW + j + 1;
            if (seatNumber > seatmap.totalSeats) break;
            
            let status: SeatStatus = 'available';
            if (seatmap.takenSeats.has(seatNumber)) status = 'taken';
            else if (selectedSeats.includes(seatNumber)) status = 'selected';
            
            rowSeats.push(<Seat key={seatNumber} status={status} onSelect={() => handleSelectSeat(seatNumber)} />);
            
            if (j === AISLE_SEAT_INDEX - 1) {
                rowSeats.push(<View key={`aisle-${i}`} style={{width: AISLE_WIDTH}} />);
            }
        }
        rows.push(
            <View key={`row-${i}`} style={styles.seatRow}>
                <Text style={styles.rowLabel}>{String.fromCharCode(65 + i)}</Text>
                {rowSeats}
            </View>
        );
    }
    return rows;
  };

  if (isLoading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#FFC107" /></View>;
  }

  if (!seatmap) {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}><TouchableOpacity onPress={() => router.back()} style={styles.backButton}><Ionicons name="arrow-back" size={24} color="#fff" /></TouchableOpacity></View>
            <View style={styles.loadingContainer}><Text style={styles.errorText}>Jadwal tayang tidak ditemukan.</Text></View>
        </SafeAreaView>
    );
  }

  // PERBAIKAN: Tampilkan tombol connect jika dompet belum terhubung
  if (!isConnected) {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}><TouchableOpacity onPress={() => router.back()} style={styles.backButton}><Ionicons name="arrow-back" size={24} color="#fff" /></TouchableOpacity></View>
            <View style={styles.loadingContainer}>
                <Ionicons name="wallet-outline" size={60} color="#555" />
                <Text style={styles.errorText}>Anda perlu menghubungkan dompet untuk memilih kursi.</Text>
                <TouchableOpacity style={styles.connectButton} onPress={() => open()}>
                    <Text style={styles.connectButtonText}>Hubungkan Dompet</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pilih Kursi</Text>
      </View>

      <ScrollView contentContainerStyle={{paddingBottom: 220}}>
          {/* PERBAIKAN: Layar sekarang berada di dalam area scroll horizontal */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
                <View style={styles.screenContainer}>
                    <View style={styles.screenArc} />
                    <Text style={styles.screenText}>L A Y A R</Text>
                </View>
                <View style={styles.seatLayout}>
                    {renderSeats()}
                </View>
            </View>
          </ScrollView>
      </ScrollView>
      
      <LinearGradient colors={['transparent', '#141414', '#141414']} style={styles.bottomInfoContainer}>
        <View style={styles.movieInfo}>
            <Text style={styles.movieTitleText} numberOfLines={1}>{seatmap.movieTitle}</Text>
            <Text style={styles.movieSubtitleText}>{seatmap.showtimeDate} - {seatmap.showtimeTime}</Text>
        </View>
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}><LinearGradient colors={['#43A047', '#66BB6A']} style={styles.legendBox} /><Text style={styles.legendText}>Tersedia</Text></View>
          <View style={styles.legendItem}><LinearGradient colors={['#FFC107', '#F57C00']} style={styles.legendBox} /><Text style={styles.legendText}>Pilihan</Text></View>
          <View style={styles.legendItem}><View style={[styles.legendBox, {backgroundColor: '#424242'}]} /><Text style={styles.legendText}>Terisi</Text></View>
        </View>
      </LinearGradient>

      <View style={styles.footer}>
        <View style={styles.selectionDetails}>
            <Text style={styles.selectionLabel}>Kursi Dipilih</Text>
            <Text style={styles.selectionValue} numberOfLines={1}>
                {selectedSeats.length > 0 ? selectedSeats.map(getSeatLabel).join(', ') : 'Belum ada'}
            </Text>
        </View>
        <View style={styles.priceContainer}>
            <Text style={styles.selectionLabel}>Total Harga</Text>
            <Text style={styles.totalPriceValue}>{totalPrice} ETH</Text>
        </View>
        <TouchableOpacity 
          style={[styles.buyButton, (isBooking || selectedSeats.length === 0) && styles.buyButtonDisabled]} 
          onPress={handleBuyTickets}
          disabled={isBooking || selectedSeats.length === 0}
        >
          {isBooking ? (
            <ActivityIndicator color="#121212" />
          ) : (
            <Ionicons name="cart" size={28} color="#121212" />
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#141414' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#141414', paddingHorizontal: 20 },
  errorText: { color: '#888', fontSize: 16, textAlign: 'center' },
  connectButton: { backgroundColor: '#FFC107', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, marginTop: 20 },
  connectButtonText: { color: '#121212', fontWeight: 'bold', fontSize: 16 },
  header: { padding: 20, paddingTop: 10, paddingBottom: 10, backgroundColor: '#1F1F1F', width: '100%', alignItems: 'center' },
  backButton: { position: 'absolute', top: 15, left: 20, zIndex: 1 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  headerSubtitle: { fontSize: 13, color: '#888', marginTop: 4 },
  screenContainer: { paddingVertical: 20, alignItems: 'center' },
  screenArc: { width: 300, height: 50, borderBottomWidth: 5, borderColor: '#FFC107', borderBottomLeftRadius: 150, borderBottomRightRadius: 150, opacity: 0.9, shadowColor: '#FFC107', shadowOpacity: 0.5, shadowRadius: 15 },
  screenText: { color: '#888', letterSpacing: 5, fontSize: 12, marginTop: 8 },
  seatLayout: { padding: 20, alignItems: 'center' },
  seatRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 2 },
  rowLabel: { width: ROW_LABEL_WIDTH, color: '#666', fontSize: 12, textAlign: 'center' },
  columnLabel: { width: SEAT_SIZE, marginHorizontal: SEAT_MARGIN, color: '#666', fontSize: 10, textAlign: 'center' },
  seat: { width: SEAT_SIZE, height: SEAT_SIZE, margin: SEAT_MARGIN, justifyContent: 'center', alignItems: 'center', borderRadius: 8, borderWidth: 1, borderColor: 'transparent' },
  seatTaken: { opacity: 0.4 },
  legendContainer: { flexDirection: 'row', justifyContent: 'space-evenly', width: '100%', marginTop: 12, paddingHorizontal: 20 },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendBox: { width: 16, height: 16, marginRight: 8, borderRadius: 4 },
  legendText: { color: '#aaa', fontSize: 12 },
  bottomInfoContainer: { position: 'absolute', bottom: 100, left: 0, right: 0, paddingBottom: 20, paddingTop: 40 },
  movieInfo: { alignItems: 'center', marginBottom: 16 },
  movieTitleText: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  movieSubtitleText: { fontSize: 14, color: '#888', marginTop: 4 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderColor: '#2a2a2a', backgroundColor: '#1F1F1F', flexDirection: 'row', alignItems: 'center', paddingBottom: 30 },
  selectionDetails: { flex: 1, marginRight: 10 },
  priceContainer: { alignItems: 'flex-end', marginRight: 16 },
  selectionLabel: { color: '#888', fontSize: 12, marginBottom: 2 },
  selectionValue: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  totalPriceValue: { color: '#FFC107', fontSize: 18, fontWeight: 'bold' },
  buyButton: { backgroundColor: '#FFC107', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#FFC107', shadowOpacity: 0.4, shadowRadius: 8 },
  buyButtonDisabled: { backgroundColor: '#555', elevation: 0 },
});
