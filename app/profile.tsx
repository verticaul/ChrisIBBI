import React, { useState, useCallback } from 'react';
import { 
    View, Text, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator, 
    Image, TouchableOpacity, RefreshControl, Modal, Linking, Alert
} from 'react-native';
import { useCineCrypto } from '../hooks/useCineCrypto';
import { useAppKitAccount, useAppKit } from '@reown/appkit-ethers-react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link, useFocusEffect, useRouter } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { MyTicket } from '../constants/types';

// Komponen untuk avatar blockie sederhana
const BlockieAvatar = ({ address, size }: { address: string; size: number }) => {
    const seed = address ? address.toLowerCase().slice(2, 10) : 'default';
    const createColor = () => {
        const h = parseInt(seed.substring(0, 2), 16) % 360;
        return `hsl(${h}, 55%, 75%)`;
    };
    return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: createColor() }} />;
};

// Komponen Kartu Tiket dengan tombol Refund
const TicketCard = ({ ticket, onShowQR, onRefund, isProcessing }: { 
    ticket: MyTicket;
    onShowQR: () => void;
    onRefund: () => void;
    isProcessing: boolean;
}) => {
    const statusInfo: { [key: string]: { color: string; icon: keyof typeof Ionicons.glyphMap } } = {
        'Aktif': { color: '#4CAF50', icon: 'checkmark-circle' },
        'Menunggu Scan': { color: '#2196F3', icon: 'hourglass-outline' },
        'Telah Digunakan': { color: '#FF9800', icon: 'scan' },
        'Telah Dikembalikan': { color: '#9E9E9E', icon: 'cash' },
        'Kedaluwarsa': { color: '#616161', icon: 'time' }
    };
    const currentStatus = statusInfo[ticket.status] || statusInfo['Kedaluwarsa'];
    const canRefund = ticket.status === 'Aktif' && ticket.isUpcoming;
    const canShowQR = ticket.status === 'Aktif' && ticket.isUpcoming;
    
    return (
        <View style={styles.ticketContainer}>
            <TouchableOpacity style={styles.ticketCard} activeOpacity={0.9} onPress={onShowQR} disabled={!canShowQR}>
                <View style={styles.ticketLeft}>
                    <Image 
                        source={{ uri: ticket.posterUrl || 'https://placehold.co/100x150/1E1E1E/E0E0E0?text=No+Poster' }} 
                        style={styles.ticketPoster} 
                    />
                     {!canShowQR && <View style={styles.posterOverlay} />}
                </View>
                <View style={styles.ticketMiddle}>
                    <View style={styles.ticketSemicircleTop} />
                    <View style={styles.ticketSemicircleBottom} />
                </View>
                <View style={styles.ticketRight}>
                    <Text style={styles.ticketMovieTitle} numberOfLines={1}>{ticket.movieTitle}</Text>
                    <Text style={styles.ticketDetailText}>{ticket.date}</Text>
                    <Text style={styles.ticketTimeSeat}>{ticket.time}  ·  {ticket.seat}</Text>
                    
                    <View style={[styles.statusBadge, { backgroundColor: currentStatus.color }]}>
                        <Ionicons name={currentStatus.icon} size={14} color="#fff" />
                        <Text style={styles.statusText}>{ticket.status}</Text>
                    </View>
                </View>
            </TouchableOpacity>

            {canRefund && (
                <View style={styles.ticketActions}>
                    {isProcessing ? <ActivityIndicator color="#FFC107"/> : (
                        <TouchableOpacity style={styles.actionButton} onPress={onRefund}>
                            <Ionicons name="return-up-back-outline" size={16} color="#FFC107" />
                            <Text style={styles.actionButtonText}>Jual Kembali</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}
        </View>
    );
};

export default function ProfileScreen() {
    const { getMyTickets, requestTicketRefund } = useCineCrypto();
    const { address, isConnected } = useAppKitAccount();
    const { open } = useAppKit();
    const router = useRouter();

    const [myTickets, setMyTickets] = useState<MyTicket[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
    
    const [qrModalVisible, setQrModalVisible] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState<MyTicket | null>(null);
    const [processingTicketId, setProcessingTicketId] = useState<number | null>(null);

    // PERBAIKAN: Menggunakan useFocusEffect untuk selalu mengambil data tiket terbaru
    useFocusEffect(
        useCallback(() => {
            const fetchTickets = async () => {
                if (isConnected && address) {
                    setIsLoading(true);
                    try {
                        const ticketsData = await getMyTickets(address);
                        setMyTickets(ticketsData);
                    } catch (error) {
                        console.error("[Profile] Gagal mengambil tiket:", error);
                        setMyTickets([]);
                    } finally {
                        setIsLoading(false);
                    }
                } else {
                    setMyTickets([]);
                }
            };
            fetchTickets();
        }, [isConnected, address, getMyTickets])
    );

    const onRefresh = useCallback(async () => {
        setIsRefreshing(true);
        if (isConnected && address) {
            const ticketsData = await getMyTickets(address);
            setMyTickets(ticketsData);
        }
        setIsRefreshing(false);
    }, [isConnected, address, getMyTickets]);

    const handleShowQR = (ticket: MyTicket) => {
        if (ticket.status !== 'Aktif') return;
        Alert.alert(
            "Tampilkan QR Code?",
            "Peringatan: Tunjukkan kode ini hanya kepada petugas bioskop untuk di-scan. Status tiket akan berubah setelah di-scan oleh petugas.",
            [
                { text: "Batal", style: "cancel" },
                { text: "Tampilkan Kode", onPress: () => {
                    setSelectedTicket(ticket);
                    setQrModalVisible(true);
                    setMyTickets(currentTickets => 
                        currentTickets.map(t => 
                            t.ticketId === ticket.ticketId 
                            ? { ...t, status: 'Menunggu Scan' } 
                            : t
                        )
                    );
                    setActiveTab('history');
                }}
            ]
        );
    };

    const handleRefund = (ticket: MyTicket) => {
        Alert.alert(
            "Jual Kembali Tiket?",
            "Anda akan menjual kembali tiket ini ke bioskop dan menerima pengembalian dana penuh. Aksi ini tidak dapat dibatalkan.",
            [
                { text: "Batal", style: "cancel" },
                { text: "Ya, Jual Kembali", onPress: async () => {
                    setProcessingTicketId(ticket.ticketId);
                    try {
                        await requestTicketRefund(ticket.ticketId);
                        Alert.alert("Berhasil", "Tiket Anda telah berhasil dijual kembali.");
                        await onRefresh();
                    } catch (error: any) {
                        Alert.alert("Gagal", error.reason || "Terjadi kesalahan saat memproses permintaan Anda.");
                    } finally {
                        setProcessingTicketId(null);
                    }
                }}
            ]
        );
    };

    // PERBAIKAN: Logika pemisahan tiket disesuaikan dengan semua kemungkinan status
    const upcomingTickets = myTickets.filter(t => t.status === 'Aktif');
    const pastTickets = myTickets.filter(t => t.status !== 'Aktif');
    const ticketsToShow = activeTab === 'active' ? upcomingTickets : pastTickets;

    const renderContent = () => {
        if (isLoading) { return <ActivityIndicator style={{ marginTop: 50 }} size="large" color="#FFC107" />; }

        if (!isConnected) {
            return (
                <View style={styles.emptyContainer}>
                    <Ionicons name="wallet-outline" size={60} color="#555" />
                    <Text style={styles.emptyText}>Hubungkan dompet Anda untuk melihat riwayat tiket.</Text>
                    <TouchableOpacity style={styles.primaryButton} onPress={() => open()}>
                        <Text style={styles.primaryButtonText}>Connect Wallet</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        if (myTickets.length === 0) {
            return (
                <View style={styles.emptyTabContainer}>
                    <Ionicons name="ticket-outline" size={40} color="#555" />
                    <Text style={styles.emptyText}>Anda belum memiliki tiket.</Text>
                    <Link href="/" asChild>
                      <TouchableOpacity style={styles.primaryButton}>
                        <Text style={styles.primaryButtonText}>Cari Film</Text>
                      </TouchableOpacity>
                    </Link>
                </View>
            );
        }

        return (
            <>
                {ticketsToShow.length > 0 ? (
                    ticketsToShow.map(ticket => (
                        <TicketCard 
                            key={ticket.ticketId} 
                            ticket={ticket} 
                            onShowQR={() => handleShowQR(ticket)}
                            onRefund={() => handleRefund(ticket)}
                            isProcessing={processingTicketId === ticket.ticketId}
                        />
                    ))
                ) : (
                    <View style={styles.emptyTabContainer}>
                        <Ionicons name={activeTab === 'active' ? 'film-outline' : 'archive-outline'} size={40} color="#555" />
                        <Text style={styles.emptyText}>Tidak ada tiket di bagian ini.</Text>
                    </View>
                )}
            </>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.pageHeader}>
                <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.pageTitle}>Profil & Tiket Saya</Text>
                <View style={styles.headerButton} />
            </View>

            <ScrollView 
                contentContainerStyle={{ paddingBottom: 80 }}
                refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#FFC107" />}
            >
                {isConnected && address && (
                    <View style={styles.profileHeader}>
                        <BlockieAvatar address={address} size={60} />
                        <Text style={styles.addressText} numberOfLines={1}>{address}</Text>
                        <TouchableOpacity style={styles.disconnectButton} onPress={() => open({ view: 'Account' })}>
                            <Text style={styles.disconnectText}>Kelola Dompet</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <View style={styles.tabSwitcher}>
                    <TouchableOpacity onPress={() => setActiveTab('active')} style={[styles.tabButton, activeTab === 'active' && styles.activeTabButton]}>
                        <Text style={[styles.tabText, activeTab === 'active' && styles.activeTabText]}>Tiket Aktif ({upcomingTickets.length})</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setActiveTab('history')} style={[styles.tabButton, activeTab === 'history' && styles.activeTabButton]}>
                        <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>Riwayat ({pastTickets.length})</Text>
                    </TouchableOpacity>
                </View>

                <View style={{paddingHorizontal: 20}}>{renderContent()}</View>
            </ScrollView>
            
            <Modal animationType="fade" transparent={true} visible={qrModalVisible} onRequestClose={() => setQrModalVisible(false)}>
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalContent}>
                        <TouchableOpacity style={styles.closeButton} onPress={() => setQrModalVisible(false)}><Ionicons name="close-circle" size={32} color="#444" /></TouchableOpacity>
                        {selectedTicket && (
                            <>
                                <Text style={styles.modalTitle}>{selectedTicket.movieTitle}</Text>
                                <View style={styles.qrCodeContainer}><QRCode value={JSON.stringify({ ticketId: selectedTicket.ticketId, seat: selectedTicket.seat, owner: address })} size={220} /></View>
                                <Text style={styles.modalDetail}>{selectedTicket.date}</Text>
                                <Text style={styles.modalDetail}>{selectedTicket.time} - {selectedTicket.seat}</Text>
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#121212' },
    pageHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 10,
        paddingVertical: 12,
        backgroundColor: '#1E1E1E',
    },
    pageTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    headerButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileHeader: { paddingVertical: 24, alignItems: 'center', backgroundColor: '#1E1E1E', borderBottomWidth: 1, borderBottomColor: '#333' },
    addressText: { marginTop: 12, fontSize: 16, color: '#888', fontFamily: 'monospace', paddingHorizontal: 20 },
    disconnectButton: { marginTop: 16, borderColor: '#FFC107', borderWidth: 1, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
    disconnectText: { color: '#FFC107', fontWeight: 'bold' },
    tabSwitcher: { flexDirection: 'row', backgroundColor: '#1E1E1E', padding: 5, margin: 20, borderRadius: 10 },
    tabButton: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
    activeTabButton: { backgroundColor: '#FFC107' },
    tabText: { fontWeight: '600', color: '#E0E0E0' },
    activeTabText: { color: '#121212' },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, paddingTop: 50 },
    emptyTabContainer: { alignItems: 'center', padding: 40, marginTop: 20 },
    emptyText: { marginTop: 16, fontSize: 16, color: '#888', textAlign: 'center' },
    primaryButton: { backgroundColor: '#FFC107', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, marginTop: 20, alignItems: 'center' },
    ticketContainer: { marginBottom: 16, backgroundColor: '#2a2a2a', borderRadius: 12, elevation: 4, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
    ticketCard: { flexDirection: 'row', height: 120, overflow: 'hidden' },
    ticketActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, padding: 12, borderTopWidth: 1, borderTopColor: '#333' },
    actionButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#444' },
    actionButtonText: { color: '#FFC107', marginLeft: 6, fontWeight: 'bold' },
    ticketLeft: { width: 80, borderTopLeftRadius: 12, borderBottomLeftRadius: 12, overflow: 'hidden' },
    ticketPoster: { width: '100%', height: '100%' },
    posterOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
    ticketMiddle: { width: 20, backgroundColor: '#1E1E1E', justifyContent: 'space-between', alignItems: 'center', borderLeftWidth: 1, borderRightWidth: 1, borderStyle: 'dashed', borderColor: '#333' },
    ticketSemicircleTop: { width: 20, height: 10, backgroundColor: '#121212', borderBottomLeftRadius: 10, borderBottomRightRadius: 10, marginTop: -1 },
    ticketSemicircleBottom: { width: 20, height: 10, backgroundColor: '#121212', borderTopLeftRadius: 10, borderTopRightRadius: 10, marginBottom: -1 },
    ticketRight: { flex: 1, padding: 12, justifyContent: 'space-between', backgroundColor: '#1E1E1E' },
    ticketMovieTitle: { fontSize: 16, fontWeight: 'bold', color: '#E0E0E0' },
    ticketDetailText: { fontSize: 12, color: '#888' },
    ticketTimeSeat: { fontSize: 14, fontWeight: '600', color: '#BDBDBD' },
    statusBadge: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, alignSelf: 'flex-start', marginTop: 'auto' },
    statusText: { color: '#fff', fontSize: 10, fontWeight: 'bold', marginLeft: 4 },
    modalBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.8)' },
    modalContent: { width: '85%', backgroundColor: '#2a2a2a', borderRadius: 20, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#444' },
    closeButton: { position: 'absolute', top: 10, right: 10, zIndex: 1 },
    modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#E0E0E0', marginBottom: 12, textAlign: 'center' },
    qrCodeContainer: { padding: 10, backgroundColor: 'white', borderRadius: 8, marginBottom: 20 },
    modalDetail: { fontSize: 16, color: '#BDBDBD', marginTop: 4 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' },
});
