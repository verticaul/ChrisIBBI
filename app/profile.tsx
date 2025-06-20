// FILE: app/profile.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator, Image, TouchableOpacity, RefreshControl, Modal, Linking } from 'react-native';
import { useCineCrypto } from '../hooks/useCineCrypto';
import { useAppKitAccount, useAppKit } from '@reown/appkit-ethers-react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';

// Komponen untuk avatar blockie sederhana
const BlockieAvatar = ({ address, size }: { address: string, size: number }) => {
    const seed = address ? address.toLowerCase().slice(2, 10) : 'default';
    const createColor = () => {
        const h = parseInt(seed.substring(0, 2), 16) % 360;
        return `hsl(${h}, 55%, 75%)`;
    };

    return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: createColor() }} />;
};

// Komponen kartu tiket dengan desain baru
const TicketCard = ({ ticket, onPress }: { ticket: any, onPress: () => void }) => (
    <TouchableOpacity style={styles.ticketCard} activeOpacity={0.8} onPress={onPress}>
        <View style={styles.ticketLeft}>
            <Image 
                source={{ uri: ticket.posterUrl || 'https://placehold.co/100x150/1E1E1E/E0E0E0?text=No+Poster' }} 
                style={styles.ticketPoster} 
            />
        </View>
        <View style={styles.ticketMiddle}>
            <View style={styles.ticketTopCircle} />
            <View style={styles.ticketDash} />
            <View style={styles.ticketBottomCircle} />
        </View>
        <View style={styles.ticketRight}>
            <Text style={styles.ticketMovieTitle} numberOfLines={1}>{ticket.movieTitle}</Text>
            <Text style={styles.ticketDetailText}>{ticket.date}</Text>
            <Text style={styles.ticketTimeSeat}>{ticket.time}  ·  Kursi {ticket.seat}</Text>
            <View style={styles.qrIconContainer}>
                <Ionicons name="qr-code-outline" size={18} color="#888" />
                <Text style={styles.qrIconText}>Tampilkan Kode</Text>
            </View>
        </View>
    </TouchableOpacity>
);

export default function ProfileScreen() {
    const router = useRouter();
    const { getMyTickets } = useCineCrypto();
    const { address, isConnected } = useAppKitAccount();
    const { open } = useAppKit();

    const [myTickets, setMyTickets] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
    
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState<any>(null);

    const fetchTickets = useCallback(async () => {
        if (isConnected && address) {
            const tickets = await getMyTickets(address);
            setMyTickets(tickets);
        } else {
            setMyTickets([]);
        }
    }, [isConnected, address, getMyTickets]);

    useEffect(() => {
        setIsLoading(true);
        fetchTickets().finally(() => setIsLoading(false));
    }, [fetchTickets]);

    const onRefresh = useCallback(async () => {
        setIsRefreshing(true);
        await fetchTickets();
        setIsRefreshing(false);
    }, [fetchTickets]);

    const openTicketModal = (ticket: any) => {
        setSelectedTicket(ticket);
        setModalVisible(true);
    };

    const handleOpenEtherscan = (txHash: string) => {
        const url = `https://sepolia.etherscan.io/tx/${txHash}`;
        Linking.openURL(url).catch(err => console.error("Couldn't load page", err));
    };

    const upcomingTickets = myTickets.filter(t => t.isUpcoming);
    const pastTickets = myTickets.filter(t => !t.isUpcoming);
    const ticketsToShow = activeTab === 'active' ? upcomingTickets : pastTickets;
    
    const renderContent = () => {
        if (isLoading) { return <ActivityIndicator style={{ marginTop: 50 }} size="large" color="#FFC107" />; }

        if (!isConnected) {
            return (
                <View style={styles.emptyContainer}>
                    <Ionicons name="wallet-outline" size={60} color="#555" />
                    <Text style={styles.emptyText}>Hubungkan dompet Anda untuk melihat riwayat tiket.</Text>
                    <TouchableOpacity style={styles.connectButton} onPress={() => open()}>
                        <Text style={styles.connectButtonText}>Connect Wallet</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        if (myTickets.length === 0) {
            return (
                <View style={styles.emptyTabContainer}>
                    <Ionicons name="ticket-outline" size={40} color="#555" />
                    <Text style={styles.emptyText}>Anda belum memiliki tiket.</Text>
                    <Link href="/" asChild><TouchableOpacity style={styles.connectButton}><Text style={styles.connectButtonText}>Cari Film</Text></TouchableOpacity></Link>
                </View>
            );
        }

        return (
            <View>
                {ticketsToShow.length > 0 ? (
                    ticketsToShow.map(ticket => <TicketCard key={ticket.ticketId} ticket={ticket} onPress={() => openTicketModal(ticket)} />)
                ) : (
                    <View style={styles.emptyTabContainer}>
                        <Ionicons name={activeTab === 'active' ? 'film-outline' : 'archive-outline'} size={40} color="#555" />
                        <Text style={styles.emptyText}>Tidak ada tiket di bagian ini.</Text>
                    </View>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
                    <Ionicons name="arrow-back" size={24} color="#E0E0E0" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Tiket Saya</Text>
                <View style={{ width: 40 }} /> 
            </View>

            <ScrollView
                contentContainerStyle={{ paddingBottom: 20 }}
                refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#FFC107" />}
            >
                {isConnected && (
                    <View style={styles.profileHeader}>
                        <BlockieAvatar address={address || ''} size={60} />
                        <Text style={styles.addressText} numberOfLines={1}>{address}</Text>
                        <TouchableOpacity style={styles.disconnectButton} onPress={() => open({ view: 'Account' })}><Text style={styles.disconnectText}>Disconnect</Text></TouchableOpacity>
                    </View>
                )}

                <View style={styles.tabSwitcher}>
                    <TouchableOpacity onPress={() => setActiveTab('active')} style={[styles.tabButton, activeTab === 'active' && styles.activeTabButton]}><Text style={[styles.tabText, activeTab === 'active' && styles.activeTabText]}>Tiket Aktif ({upcomingTickets.length})</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => setActiveTab('history')} style={[styles.tabButton, activeTab === 'history' && styles.activeTabButton]}><Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>Riwayat ({pastTickets.length})</Text></TouchableOpacity>
                </View>

                {renderContent()}
            </ScrollView>

            {/* Modal untuk QR Code */}
            <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}><Ionicons name="close-circle" size={32} color="#444" /></TouchableOpacity>
                        {selectedTicket && (
                            <>
                                <Text style={styles.modalTitle}>{selectedTicket.movieTitle}</Text>
                                <View style={styles.qrCodeContainer}><QRCode value={JSON.stringify({ ticketId: selectedTicket.ticketId, seat: selectedTicket.seat, owner: address, txHash: selectedTicket.transactionHash })} size={220} /></View>
                                <Text style={styles.modalDetail}>{selectedTicket.date}</Text>
                                <Text style={styles.modalDetail}>{selectedTicket.time} - Kursi {selectedTicket.seat}</Text>
                                
                                {selectedTicket.transactionHash && (
                                    <TouchableOpacity style={styles.etherscanButton} onPress={() => handleOpenEtherscan(selectedTicket.transactionHash)}>
                                        <Text style={styles.etherscanText}>Lihat Transaksi di Etherscan</Text>
                                        <Ionicons name="open-outline" size={16} color="#FFC107" />
                                    </TouchableOpacity>
                                )}
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
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#1E1E1E' },
    headerButton: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#E0E0E0' },
    profileHeader: { paddingVertical: 24, alignItems: 'center', backgroundColor: '#1E1E1E' },
    addressText: { marginTop: 12, fontSize: 16, color: '#888', fontFamily: 'monospace' },
    disconnectButton: { marginTop: 16, borderColor: '#FFC107', borderWidth: 1, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
    disconnectText: { color: '#FFC107', fontWeight: 'bold' },
    tabSwitcher: { flexDirection: 'row', backgroundColor: '#1E1E1E', padding: 5, margin: 20, borderRadius: 10 },
    tabButton: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
    activeTabButton: { backgroundColor: '#FFC107' },
    tabText: { fontWeight: '600', color: '#E0E0E0' },
    activeTabText: { color: '#121212' },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    emptyTabContainer: { alignItems: 'center', padding: 40, marginTop: 20 },
    emptyText: { marginTop: 16, fontSize: 16, color: '#888', textAlign: 'center' },
    connectButton: { backgroundColor: '#FFC107', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, marginTop: 20 },
    connectButtonText: { color: '#121212', fontWeight: 'bold' },
    ticketCard: { flexDirection: 'row', backgroundColor: '#1E1E1E', borderRadius: 12, marginHorizontal: 20, marginBottom: 16, height: 120, elevation: 3, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10 },
    ticketLeft: { width: 80, borderTopLeftRadius: 12, borderBottomLeftRadius: 12, overflow: 'hidden' },
    ticketPoster: { width: '100%', height: '100%' },
    ticketMiddle: { width: 20, alignItems: 'center', overflow: 'hidden' },
    ticketTopCircle: { height: 10, width: 20, backgroundColor: '#121212', borderBottomLeftRadius: 10, borderBottomRightRadius: 10, marginTop: -1 },
    ticketBottomCircle: { height: 10, width: 20, backgroundColor: '#121212', borderTopLeftRadius: 10, borderTopRightRadius: 10, marginBottom: -1 },
    ticketDash: { flex: 1, width: 1, borderStyle: 'dashed', borderWidth: 1, borderColor: '#333', marginVertical: 5 },
    ticketRight: { flex: 1, padding: 12, justifyContent: 'space-between' },
    ticketMovieTitle: { fontSize: 16, fontWeight: 'bold', color: '#E0E0E0' },
    ticketDetailText: { fontSize: 12, color: '#888' },
    ticketTimeSeat: { fontSize: 14, fontWeight: '600', color: '#BDBDBD' },
    qrIconContainer: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', opacity: 0.7 },
    qrIconText: { marginLeft: 4, fontSize: 10, color: '#888' },
    modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.8)' },
    modalContent: { width: '85%', backgroundColor: '#1E1E1E', borderRadius: 20, padding: 24, alignItems: 'center' },
    closeButton: { position: 'absolute', top: 10, right: 10 },
    modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#E0E0E0', marginBottom: 20, textAlign: 'center' },
    qrCodeContainer: { padding: 10, backgroundColor: 'white', borderRadius: 8, marginBottom: 20 },
    modalDetail: { fontSize: 16, color: '#BDBDBD', marginTop: 4 },
    etherscanButton: { flexDirection: 'row', alignItems: 'center', marginTop: 24, padding: 10 },
    etherscanText: { color: '#FFC107', fontWeight: 'bold', marginRight: 6 },
});
