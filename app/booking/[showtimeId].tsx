// FILE: app/booking/[showtimeId].tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useCineCrypto } from '../../hooks/useCineCrypto';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppKitAccount, useAppKitProvider, ConnectButton } from '@reown/appkit-ethers-react-native';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../../constants/contract';

const SEATS_PER_ROW = 10;

// Helper function untuk mengubah ID kursi menjadi label (misal: 11 -> B1)
const getSeatLabel = (seatId: number) => {
    if (seatId <= 0) return '';
    const rowNumber = Math.floor((seatId - 1) / SEATS_PER_ROW);
    const rowLabel = String.fromCharCode(65 + rowNumber);
    const seatNumberInRow = (seatId - 1) % SEATS_PER_ROW + 1;
    return `${rowLabel}${seatNumberInRow}`;
};

export default function SeatSelectionScreen() {
    const router = useRouter();
    const { showtimeId } = useLocalSearchParams();
    const { getShowtimeSeatmap } = useCineCrypto();
    const { walletProvider } = useAppKitProvider();
    const { isConnected } = useAppKitAccount();
    
    const [seatmap, setSeatmap] = useState<any>(null);
    const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isPurchasing, setIsPurchasing] = useState(false);

    useEffect(() => {
        const loadSeatmap = async () => {
            if (showtimeId && typeof showtimeId === 'string') {
                const map = await getShowtimeSeatmap(parseInt(showtimeId, 10));
                setSeatmap(map);
                setIsLoading(false);
            }
        };
        loadSeatmap();
    }, [showtimeId, getShowtimeSeatmap]);

    const handleSeatPress = (seatId: number) => {
        if (seatmap?.takenSeats.has(seatId)) return;
        setSelectedSeats(currentSeats => {
            const isAlreadySelected = currentSeats.includes(seatId);
            if (isAlreadySelected) {
                return currentSeats.filter(id => id !== seatId);
            } else {
                return [...currentSeats, seatId].sort((a,b) => a-b);
            }
        });
    };

    const handlePurchase = async () => {
        if (!walletProvider || selectedSeats.length === 0) return;
        setIsPurchasing(true);
        try {
            const provider = new ethers.BrowserProvider(walletProvider);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
            const totalPayment = ethers.parseEther((selectedSeats.length * parseFloat(seatmap.ticketPrice)).toString());
            
            const tx = selectedSeats.length === 1
                ? await contract.buyTicket(showtimeId, selectedSeats[0], { value: totalPayment })
                : await contract.buyMultipleTickets(showtimeId, selectedSeats, { value: totalPayment });

            await tx.wait();
            Alert.alert("Pembelian Berhasil!", "Tiket Anda sudah dikonfirmasi.");
            router.replace('/profile'); 
        } catch (error: any) {
            console.error("Purchase failed:", error);
            Alert.alert("Pembelian Gagal", error.reason || "Terjadi kesalahan saat transaksi.");
        } finally {
            setIsPurchasing(false);
        }
    };

    const renderSeats = () => {
        const AISLE_AFTER_SEATS = [2, 7];
        let seatCounter = 1;
        const allRows = [];
        
        while (seatCounter <= seatmap.totalSeats) {
            const rowNumber = Math.floor((seatCounter - 1) / SEATS_PER_ROW);
            const rowLabel = String.fromCharCode(65 + rowNumber);
            const currentRowSeats = [];
            
            for (let seatInRow = 1; seatInRow <= SEATS_PER_ROW; seatInRow++) {
                if (seatCounter > seatmap.totalSeats) {
                     currentRowSeats.push(<View key={`empty-${seatCounter}`} style={styles.seatPlaceholder} />);
                } else {
                    const currentSeatId = seatCounter;
                    const isTaken = seatmap.takenSeats.has(currentSeatId);
                    const isSelected = selectedSeats.includes(currentSeatId);
                    
                    let seatStyle = styles.seatAvailable;
                    if (isTaken) seatStyle = styles.seatTaken;
                    if (isSelected) seatStyle = styles.seatSelected;
                    
                    currentRowSeats.push(
                        <TouchableOpacity 
                            key={currentSeatId} 
                            style={[styles.seat, seatStyle]} 
                            disabled={isTaken}
                            onPress={() => handleSeatPress(currentSeatId)}
                        >
                            <Text style={styles.seatLabel}>{seatInRow}</Text>
                        </TouchableOpacity>
                    );
                }
                if (AISLE_AFTER_SEATS.includes(seatInRow)) {
                    currentRowSeats.push(<View key={`aisle-${seatCounter}`} style={styles.aisle} />);
                }
                seatCounter++;
            }
            allRows.push(<View key={`row-${rowNumber}`} style={styles.row}><Text style={styles.rowLabel}>{rowLabel}</Text>{currentRowSeats}<Text style={styles.rowLabel}>{rowLabel}</Text></View>);
        }
        return allRows;
    };
    
    const totalPrice = selectedSeats.length * parseFloat(seatmap?.ticketPrice || '0');

    if (isLoading) return <SafeAreaView style={styles.loadingContainer}><ActivityIndicator size="large" color="#FFC107" /></SafeAreaView>;
    if (!seatmap || seatmap.totalSeats === 0) return <SafeAreaView style={styles.container}><View style={styles.header}><Text style={styles.headerTitle}>Pilih Kursi</Text></View><View style={styles.emptyContainer}><Ionicons name="sad-outline" size={60} color="#555" /><Text style={styles.emptyText}>Maaf, denah kursi belum tersedia.</Text></View></SafeAreaView>;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}><Ionicons name="chevron-back" size={24} color="#E0E0E0" /></TouchableOpacity>
                <Text style={styles.headerTitle}>{seatmap.movieTitle}</Text>
            </View>

            <ScrollView contentContainerStyle={{ alignItems: 'center' }}>
                <View style={styles.screen}><Text style={styles.screenText}>L A Y A R</Text></View>
                {renderSeats()}
                <View style={styles.legendContainer}>
                    <View style={styles.legendItem}><View style={[styles.legendBox, styles.seatAvailable]} /><Text style={styles.legendText}>Tersedia</Text></View>
                    <View style={styles.legendItem}><View style={[styles.legendBox, styles.seatSelected]} /><Text style={styles.legendText}>Pilihanmu</Text></View>
                    <View style={styles.legendItem}><View style={[styles.legendBox, styles.seatTaken]} /><Text style={styles.legendText}>Terisi</Text></View>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <View style={styles.showtimeDetails}>
                    <Text style={styles.showtimeInfo}>{seatmap.showtimeDate}, {seatmap.showtimeTime}</Text>
                    <Text style={styles.seatsInfo} numberOfLines={1}>{selectedSeats.length > 0 ? selectedSeats.map(getSeatLabel).join(', ') : 'Belum ada kursi dipilih'}</Text>
                </View>
                <View style={styles.separator}></View>
                {isConnected ? (
                    <View style={styles.purchaseSection}>
                        <View><Text style={styles.totalLabel}>Total Harga</Text><Text style={styles.totalPrice}>{totalPrice > 0 ? `${totalPrice.toFixed(4)} ETH` : '-'}</Text></View>
                        <TouchableOpacity style={[styles.payButton, (selectedSeats.length === 0 || isPurchasing) && styles.payButtonDisabled]} disabled={selectedSeats.length === 0 || isPurchasing} onPress={handlePurchase}>
                            {isPurchasing ? <ActivityIndicator color="#121212" /> : <Text style={styles.payButtonText}>Bayar</Text>}
                        </TouchableOpacity>
                    </View>
                ) : ( 
                    <View style={styles.connectButtonContainer}>
                        <ConnectButton label="Connect Wallet to Purchase" loadingLabel="Connecting..." />
                    </View> 
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#121212' },
    loadingContainer: { flex: 1, backgroundColor: '#121212', justifyContent: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#1E1E1E' },
    backButton: { position: 'absolute', left: 16, top: 16, zIndex: 1, padding: 5 },
    headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: 'bold', color: '#E0E0E0' },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    emptyText: { marginTop: 16, fontSize: 16, color: '#888', textAlign: 'center' },
    screen: { width: '90%', paddingVertical: 8, borderBottomWidth: 3, borderBottomColor: '#FFC107', alignItems: 'center', marginBottom: 20, marginTop: 20 },
    screenText: { color: '#FFC107', fontWeight: 'bold', letterSpacing: 5 },
    seatContainer: { paddingHorizontal: 10 },
    row: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
    rowLabel: { width: 20, fontSize: 14, fontWeight: 'bold', color: '#555', textAlign: 'center' },
    seat: { width: 28, height: 28, margin: 3, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
    seatLabel: { color: '#121212', fontSize: 10, fontWeight: 'bold' },
    aisle: { width: 14 },
    seatAvailable: { backgroundColor: '#4A4A4A' },
    seatTaken: { backgroundColor: '#333', opacity: 0.8 },
    seatSelected: { backgroundColor: '#FFC107' },
    // === BAGIAN YANG DIPERBAIKI: Menambahkan style yang hilang ===
    seatPlaceholder: {
        width: 28,
        height: 28,
        margin: 3,
    },
    legendContainer: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginTop: 24, paddingHorizontal: 20, paddingBottom: 150 },
    legendItem: { flexDirection: 'row', alignItems: 'center' },
    legendBox: { width: 16, height: 16, borderRadius: 4, marginRight: 8 },
    legendText: { color: '#888' },
    footer: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: '#1E1E1E', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: -5 }, shadowOpacity: 0.1, shadowRadius: 10 },
    showtimeDetails: { marginBottom: 12, alignItems: 'center' },
    showtimeInfo: { fontSize: 16, color: '#E0E0E0', fontWeight: 'bold' },
    seatsInfo: { fontSize: 14, color: '#888', marginTop: 4 },
    separator: { height: 1, backgroundColor: '#333', marginVertical: 12 },
    purchaseSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    totalLabel: { color: '#888' },
    totalPrice: { fontSize: 22, fontWeight: 'bold', color: '#E0E0E0' },
    payButton: { backgroundColor: '#FFC107', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
    payButtonDisabled: { backgroundColor: '#555' },
    payButtonText: { color: '#121212', fontWeight: 'bold', fontSize: 16 },
    connectButtonContainer: { flex: 1, alignItems: 'center' }
});
