// FILE: app/movie/[id].tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ImageBackground, ScrollView, ActivityIndicator, Image, TouchableOpacity, FlatList, Alert } from 'react-native';
import { useCineCrypto } from '../../hooks/useCineCrypto';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';

// Komponen untuk kartu aktor
const ActorCard = ({ actor }: { actor: any }) => (
    <View style={styles.actorCard}>
        <Image 
            source={{ uri: actor.profile_path ? `https://image.tmdb.org/t/p/w185${actor.profile_path}` : 'https://placehold.co/185x278/1E1E1E/E0E0E0?text=No+Image' }} 
            style={styles.actorImage} 
        />
        <Text style={styles.actorName} numberOfLines={2}>{actor.name}</Text>
    </View>
);

export default function MovieDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const { getMovieDetails } = useCineCrypto();
    
    const [movie, setMovie] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [youtubeKey, setYoutubeKey] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [selectedShowtimeId, setSelectedShowtimeId] = useState<number | null>(null);

    useEffect(() => {
        const loadDetails = async () => {
            if (id && typeof id === 'string') {
                setIsLoading(true);
                const details = await getMovieDetails(parseInt(id, 10));
                setMovie(details);

                if (details?.groupedShowtimes && details.groupedShowtimes.length > 0) {
                    setSelectedDate(details.groupedShowtimes[0].date);
                }

                if (details?.videos?.results) {
                    const trailer = details.videos.results.find(
                        (video: any) => video.site === 'YouTube' && video.type === 'Trailer'
                    );
                    setYoutubeKey(trailer?.key || null);
                }
                setIsLoading(false);
            }
        };
        loadDetails();
    }, [id, getMovieDetails]);

    const handleBooking = () => {
        if (selectedShowtimeId) {
            router.push(`/booking/${selectedShowtimeId}`);
        } else {
            Alert.alert("Perhatian", "Silakan pilih jam tayang terlebih dahulu.");
        }
    };
    
    const renderDateTab = ({ item }: { item: any }) => {
        const dateObj = new Date(item.date);
        const day = dateObj.toLocaleDateString('id-ID', { day: '2-digit' });
        const month = dateObj.toLocaleDateString('id-ID', { month: 'short' });
        const dayName = dateObj.toLocaleDateString('id-ID', { weekday: 'short' });
        const isActive = selectedDate === item.date;

        return (
            <TouchableOpacity 
                style={[styles.dateTab, isActive && styles.activeDateTab]}
                onPress={() => {
                    setSelectedDate(item.date)
                    setSelectedShowtimeId(null);
                }}
            >
                <Text style={[styles.dateTabDayName, isActive && styles.activeDateTabText]}>{dayName.toUpperCase()}</Text>
                <Text style={[styles.dateTabDay, isActive && styles.activeDateTabText]}>{day} {month}</Text>
            </TouchableOpacity>
        );
    };

    if (isLoading) {
        return <SafeAreaView style={styles.loadingContainer}><ActivityIndicator size="large" color="#FFC107" /></SafeAreaView>;
    }

    if (!movie) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <Text style={styles.errorText}>Film tidak ditemukan.</Text>
                <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}><Text style={{ color: '#FFC107' }}>Kembali</Text></TouchableOpacity>
            </SafeAreaView>
        );
    }
    
    const timesForSelectedDate = movie.groupedShowtimes?.find((g: any) => g.date === selectedDate)?.times || [];

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
                <ImageBackground source={{ uri: movie.backdropUrl }} style={styles.backdrop}>
                    <SafeAreaView>
                        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                            <Ionicons name="chevron-back" size={28} color="white" />
                        </TouchableOpacity>
                    </SafeAreaView>
                </ImageBackground>

                <View style={styles.headerSection}>
                    <Image source={{ uri: movie.posterUrl }} style={styles.poster} />
                    <View style={styles.titleContainer}>
                        <Text style={styles.title}>{movie.title}</Text>
                        <View style={styles.ratingContainer}>
                            <Ionicons name="star" size={20} color="#F5C518" />
                            <Text style={styles.ratingText}>{movie.vote_average?.toFixed(1)} / 10</Text>
                        </View>
                        {movie.runtime && <Text style={styles.runtimeText}>{movie.runtime} menit</Text>}
                    </View>
                </View>

                <View style={styles.genreContainer}>
                    {movie.genres?.slice(0, 3).map((genre: any) => (
                        <View key={genre.id} style={styles.genreChip}><Text style={styles.genreText}>{genre.name}</Text></View>
                    ))}
                </View>

                <View style={styles.detailsSection}><Text style={styles.sectionTitle}>Sinopsis</Text><Text style={styles.overview}>{movie.overview}</Text></View>

                {movie.credits?.cast?.length > 0 && (<View style={styles.detailsSection}><Text style={styles.sectionTitle}>Pemeran Utama</Text><FlatList data={movie.credits.cast.slice(0, 10)} renderItem={({ item }) => <ActorCard actor={item} />} keyExtractor={(item) => item.id.toString()} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 20 }} style={{ marginHorizontal: -20 }} /></View>)}

                {youtubeKey && (<View style={styles.detailsSection}><Text style={styles.sectionTitle}>Trailer</Text><View style={styles.trailerContainer}><WebView style={{ flex: 1, backgroundColor: '#000' }} source={{ uri: `https://www.youtube.com/embed/${youtubeKey}` }} /></View></View>)}
                
                {movie.isBookable && movie.groupedShowtimes?.length > 0 && (
                    <View style={styles.scheduleSection}>
                        <Text style={styles.sectionTitle}>Pilih Jadwal</Text>
                        <FlatList data={movie.groupedShowtimes} renderItem={renderDateTab} keyExtractor={(item) => item.date} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, marginBottom: 16 }} />
                        <View style={styles.showtimeContainer}>
                            {timesForSelectedDate.length > 0 ? (
                                timesForSelectedDate.map((showtime: any) => (
                                    <TouchableOpacity 
                                        key={showtime.id} 
                                        style={[styles.showtimeChip, selectedShowtimeId === showtime.id && styles.activeShowtimeChip]}
                                        onPress={() => setSelectedShowtimeId(showtime.id)}
                                    ><Text style={[styles.showtimeText, selectedShowtimeId === showtime.id && styles.activeShowtimeText]}>{showtime.timeString}</Text></TouchableOpacity>
                                ))
                            ) : ( <Text style={styles.noShowtimeText}>Tidak ada jadwal di tanggal ini.</Text> )}
                        </View>
                    </View>
                )}
            </ScrollView>
            
            {movie.isBookable && movie.groupedShowtimes?.length > 0 && (
                 <View style={styles.ctaContainer}>
                    <TouchableOpacity 
                        style={[styles.ctaButton, !selectedShowtimeId && styles.ctaButtonDisabled]}
                        disabled={!selectedShowtimeId}
                        onPress={handleBooking}
                    ><Text style={styles.ctaButtonText}>Pilih Kursi</Text></TouchableOpacity>
                </View>
            )}
        </View>
    );
}


const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#121212' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' },
    errorText: { color: '#E0E0E0', fontSize: 16 },
    backdrop: { width: '100%', height: 280 },
    backButton: { position: 'absolute', top: 50, left: 20, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    headerSection: { flexDirection: 'row', paddingHorizontal: 20, marginTop: -80 },
    poster: { width: 130, height: 195, borderRadius: 12, borderWidth: 3, borderColor: '#121212' },
    titleContainer: { flex: 1, marginLeft: 16, justifyContent: 'flex-end', paddingBottom: 10 },
    title: { fontSize: 26, fontWeight: 'bold', color: '#E0E0E0' },
    ratingContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
    ratingText: { marginLeft: 6, fontSize: 16, fontWeight: '600', color: '#E0E0E0' },
    runtimeText: { marginLeft: 12, fontSize: 16, fontWeight: '600', color: '#888' },
    genreContainer: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, marginTop: 16 },
    genreChip: { backgroundColor: '#1E1E1E', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, marginRight: 8, marginBottom: 8, },
    genreText: { fontSize: 12, fontWeight: '600', color: '#E0E0E0' },
    detailsSection: { marginTop: 30 },
    scheduleSection: { marginTop: 30, paddingBottom: 20 },
    sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#E0E0E0', marginBottom: 16, paddingHorizontal: 20 },
    overview: { fontSize: 15, lineHeight: 22, color: '#BDBDBD', paddingHorizontal: 20 },
    dateTab: { backgroundColor: '#1E1E1E', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, marginRight: 12, alignItems: 'center' },
    activeDateTab: { backgroundColor: '#FFC107' },
    dateTabDayName: { fontSize: 12, color: '#888', fontWeight: 'bold' },
    dateTabDay: { fontSize: 14, fontWeight: 'bold', color: '#E0E0E0', marginTop: 2 },
    activeDateTabText: { color: '#121212' },
    showtimeContainer: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20 },
    showtimeChip: { borderWidth: 1, borderColor: '#333', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, marginRight: 12, marginBottom: 12 },
    activeShowtimeChip: { backgroundColor: '#FFC107', borderColor: '#FFC107' },
    showtimeText: { fontSize: 16, fontWeight: '600', color: '#E0E0E0' },
    activeShowtimeText: { color: '#121212' },
    noShowtimeText: { color: '#888', fontStyle: 'italic', paddingHorizontal: 20 },
    ctaContainer: { position: 'absolute', bottom: 0, width: '100%', padding: 20, paddingTop: 10, backgroundColor: '#121212', borderTopWidth: 1, borderTopColor: '#1E1E1E' },
    ctaButton: { backgroundColor: '#FFC107', padding: 16, borderRadius: 12, alignItems: 'center' },
    ctaButtonDisabled: { backgroundColor: '#333' },
    ctaButtonText: { color: '#121212', fontSize: 18, fontWeight: 'bold' },
    actorCard: { width: 100, marginRight: 12, alignItems: 'center' },
    actorImage: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#1E1E1E' },
    actorName: { marginTop: 8, textAlign: 'center', fontSize: 12, color: '#BDBDBD' },
    trailerContainer: { width: '90%', height: 200, borderRadius: 12, overflow: 'hidden', backgroundColor: '#000', alignSelf: 'center' }
});
