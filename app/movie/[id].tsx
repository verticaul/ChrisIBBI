import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ImageBackground,
  ActivityIndicator, TouchableOpacity, SafeAreaView, Linking, Alert, Image
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCineCrypto } from '../../hooks/useCineCrypto';
import { Ionicons } from '@expo/vector-icons';
import { Movie, ShowtimeGroup, Actor } from '../../constants/types';

// --- Komponen-komponen UI ---

const GenreTag = ({ genre }: { genre: { name: string } }) => (
  <View style={styles.genreTag}>
    <Text style={styles.genreText}>{genre.name}</Text>
  </View>
);

const ActorCard = ({ actor }: { actor: Actor }) => (
  <View style={styles.actorCard}>
    <Image
      source={{ uri: actor.profile_path ? `https://image.tmdb.org/t/p/w185${actor.profile_path}` : 'https://placehold.co/100x150/1E1E1E/E0E0E0?text=N/A' }}
      style={styles.actorImage}
    />
    <Text style={styles.actorName} numberOfLines={2}>{actor.name}</Text>
  </View>
);

const ShowtimeSection = ({ showtimes, onSelect }: { showtimes: ShowtimeGroup[]; onSelect: (id: number) => void }) => {
  const [selectedDate, setSelectedDate] = useState(showtimes[0]?.date);

  const selectedShowtimeGroup = showtimes.find(group => group.date === selectedDate);

  return (
    <View style={styles.showtimeContainer}>
      <Text style={styles.sectionTitle}>Jadwal Tayang</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateScroller}>
        {showtimes.map(group => (
          <TouchableOpacity
            key={group.date}
            style={[styles.dateChip, selectedDate === group.date && styles.activeDateChip]}
            onPress={() => setSelectedDate(group.date)}
          >
            <Text style={[styles.dateChipText, selectedDate === group.date && styles.activeDateChipText]}>{group.formattedDate.split(', ')[1]}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <View style={styles.timeGrid}>
        {selectedShowtimeGroup?.times.map(time => (
          <TouchableOpacity
            key={time.id}
            style={styles.timeChip}
            onPress={() => onSelect(time.id)}
          >
            <Text style={styles.timeChipText}>{time.timeString}</Text>
            <Text style={styles.priceChipText}>{time.price} ETH</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

export default function MovieDetailScreen() {
  const router = useRouter();
  const { id, isTmdb } = useLocalSearchParams<{ id: string; isTmdb?: string }>();
  const { getMovieDetails } = useCineCrypto();

  const [movie, setMovie] = useState<Movie | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadMovieDetails = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    const details = await getMovieDetails(Number(id), isTmdb === 'true');
    setMovie(details);
    setIsLoading(false);
  }, [id, isTmdb, getMovieDetails]);

  useEffect(() => {
    loadMovieDetails();
  }, [loadMovieDetails]);

  const handlePlayTrailer = () => {
    const trailer = movie?.videos?.results.find(v => v.type === 'Trailer' && v.site === 'YouTube');
    if (trailer) {
      Linking.openURL(`https://www.youtube.com/watch?v=${trailer.key}`);
    } else {
      Alert.alert("Trailer Tidak Tersedia", "Maaf, trailer untuk film ini tidak dapat ditemukan.");
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFC107" />
      </View>
    );
  }

  if (!movie) {
    return (
      <SafeAreaView style={styles.container}>
         <TouchableOpacity onPress={() => router.back()} style={styles.backButtonAbsolute}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color="#555" />
            <Text style={styles.errorText}>Film tidak dapat ditemukan.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <ImageBackground source={{ uri: movie.backdropUrl || undefined }} style={styles.backdrop}>
          <View style={styles.backdropOverlay} />
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handlePlayTrailer} style={styles.playButton}>
            <Ionicons name="play-circle" size={72} color="rgba(255, 255, 255, 0.9)" />
          </TouchableOpacity>
        </ImageBackground>

        <View style={styles.mainContent}>
            <View style={styles.posterContainer}>
                <Image source={{ uri: movie.posterUrl || undefined }} style={styles.posterImage} />
            </View>
            <View style={styles.titleContainer}>
                <Text style={styles.title}>{movie.title}</Text>
                <View style={styles.metaInfo}>
                    <Ionicons name="star" size={16} color="#F5C518" />
                    <Text style={styles.metaText}>{movie.vote_average?.toFixed(1)}</Text>
                    {movie.runtime && (
                        <>
                            <Text style={styles.metaSeparator}>|</Text>
                            <Ionicons name="time-outline" size={16} color="#ccc" />
                            <Text style={styles.metaText}>{movie.runtime} menit</Text>
                        </>
                    )}
                </View>
            </View>
        </View>
        
        <View style={styles.detailsSection}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.genreContainer}>
                {movie.genres?.map(genre => <GenreTag key={genre.id} genre={genre} />)}
            </ScrollView>

            <Text style={styles.sectionTitle}>Sinopsis</Text>
            <Text style={styles.overview}>{movie.overview}</Text>

            {movie.credits?.cast && movie.credits.cast.length > 0 && (
                <>
                    <Text style={styles.sectionTitle}>Pemeran Utama</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.actorList}>
                        {movie.credits.cast.slice(0, 10).map(actor => <ActorCard key={actor.id} actor={actor} />)}
                    </ScrollView>
                </>
            )}

            {movie.isBookable && movie.groupedShowtimes && movie.groupedShowtimes.length > 0 && (
                <ShowtimeSection 
                    showtimes={movie.groupedShowtimes}
                    onSelect={(showtimeId) => router.push(`/booking/${showtimeId}`)}
                />
            )}
        </View>
      </ScrollView>

      {movie.isBookable && (
        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.bookButton}
            onPress={() => Alert.alert("Pilih Jadwal", "Silakan pilih tanggal dan jam tayang di atas untuk melanjutkan.")}
          >
            <Text style={styles.bookButtonText}>Pilih Jadwal & Beli Tiket</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#121212' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' },
    errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    errorText: { color: '#888', marginTop: 10, fontSize: 16 },
    backdrop: { height: 280, justifyContent: 'center', alignItems: 'center' },
    backdropOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(18, 18, 18, 0.6)' },
    backButton: { position: 'absolute', top: 50, left: 20, backgroundColor: 'rgba(0,0,0,0.5)', padding: 8, borderRadius: 20 },
    backButtonAbsolute: { position: 'absolute', top: 50, left: 20, zIndex: 1 },
    playButton: {},
    mainContent: { flexDirection: 'row', marginTop: -80, paddingHorizontal: 20 },
    posterContainer: { width: 120, height: 180, borderRadius: 12, elevation: 10, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 10 },
    posterImage: { width: '100%', height: '100%', borderRadius: 12 },
    titleContainer: { flex: 1, marginLeft: 16, justifyContent: 'flex-end', paddingBottom: 10 },
    title: { fontSize: 24, fontWeight: 'bold', color: '#fff', textShadowColor: 'rgba(0, 0, 0, 0.75)', textShadowOffset: {width: -1, height: 1}, textShadowRadius: 10 },
    metaInfo: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
    metaText: { color: '#ccc', marginLeft: 4, fontSize: 14, fontWeight: '600' },
    metaSeparator: { color: '#555', marginHorizontal: 8, fontSize: 18 },
    detailsSection: { padding: 20 },
    genreContainer: { paddingBottom: 16 },
    genreTag: { backgroundColor: '#2a2a2a', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, marginRight: 8 },
    genreText: { color: '#ccc', fontSize: 12 },
    sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginTop: 16, marginBottom: 12 },
    overview: { fontSize: 15, color: '#BDBDBD', lineHeight: 22 },
    actorList: { paddingBottom: 10 },
    actorCard: { width: 100, marginRight: 12, alignItems: 'center' },
    actorImage: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#333' },
    actorName: { color: '#ccc', fontSize: 12, marginTop: 6, textAlign: 'center' },
    showtimeContainer: { marginTop: 16 },
    dateScroller: { paddingBottom: 16 },
    dateChip: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, marginRight: 10, backgroundColor: '#2a2a2a' },
    activeDateChip: { backgroundColor: '#FFC107' },
    dateChipText: { color: '#fff', fontWeight: '600' },
    activeDateChipText: { color: '#121212' },
    timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    timeChip: { backgroundColor: '#2a2a2a', padding: 12, borderRadius: 8, alignItems: 'center', minWidth: 90 },
    timeChipText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    priceChipText: { color: '#FFC107', fontSize: 12, marginTop: 4 },
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, borderTopWidth: 1, borderColor: '#2a2a2a', backgroundColor: 'rgba(18, 18, 18, 0.9)' },
    bookButton: { backgroundColor: '#FFC107', padding: 16, borderRadius: 12, alignItems: 'center' },
    bookButtonText: { color: '#121212', fontSize: 18, fontWeight: 'bold' },
});
