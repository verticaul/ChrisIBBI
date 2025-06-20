// FILE: app/index.tsx
import React, { useCallback, useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  ScrollView,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  FlatList,
  TextInput,
  ImageBackground,
  Alert
} from 'react-native';
import { useAppKit, useAppKitAccount } from '@reown/appkit-ethers-react-native';
import { useCineCrypto } from '../hooks/useCineCrypto';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// Komponen untuk "chip" genre
const GenreChip = ({ item, isActive, onPress }: { item: any; isActive: boolean; onPress: () => void }) => (
    <TouchableOpacity onPress={onPress} style={[styles.genreChip, isActive && styles.activeGenreChip]}>
        <Text style={[styles.genreChipText, isActive && styles.activeGenreChipText]}>{item.name}</Text>
    </TouchableOpacity>
);

// Komponen untuk Carousel Film Populer (Besar)
const PopularMovieCarouselCard = ({ item, onPress }: { item: any; onPress: () => void }) => (
    <TouchableOpacity onPress={onPress} style={styles.featuredCard}>
        <ImageBackground source={{ uri: `https://image.tmdb.org/t/p/w780${item.backdrop_path}` }} style={styles.featuredImage} imageStyle={{ borderRadius: 15 }}>
            <View style={styles.featuredOverlay}>
                <Text style={styles.featuredTitle} numberOfLines={1}>{item.title}</Text>
                <View style={styles.vRatingContainer}>
                    <Ionicons name="star" size={16} color="#F5C518" />
                    <Text style={styles.featuredRatingText}>{item.vote_average?.toFixed(1)}</Text>
                </View>
            </View>
        </ImageBackground>
    </TouchableOpacity>
);

// Komponen untuk kartu film "Sedang Tayang" & "Akan Segera Tayang" (Kecil)
const HorizontalMovieCard = ({ item, onPress }: { item: any; onPress: () => void }) => (
    <TouchableOpacity onPress={onPress} style={styles.hMovieCard}>
        <Image source={{ uri: item.posterUrl }} style={styles.hPoster} />
        {item.isBookable && (
            <View style={styles.bookableTag}>
                <Text style={styles.bookableTagText}>Beli Tiket</Text>
            </View>
        )}
        <Text style={styles.hMovieTitle} numberOfLines={1}>{item.title}</Text>
        {item.releaseDate && <Text style={styles.hMovieDate}>{new Date(item.releaseDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</Text>}
    </TouchableOpacity>
);

export default function HomeScreen() {
  const router = useRouter();
  const { open } = useAppKit();
  const { isConnected } = useAppKitAccount();
  const { 
      bookableMovies, 
      popularMovies,
      upcomingMovies,
      genres,
      isLoading, 
      refetchMovies,
      searchMovies,      // <-- Ambil fungsi dan state pencarian
      searchResults,
      isSearching 
  } = useCineCrypto();

  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeGenreId, setActiveGenreId] = useState(0);

  // === BAGIAN YANG DIPERBAIKI: Menambahkan useEffect untuk memicu pencarian ===
  useEffect(() => {
    // Debounce: Tunda pencarian 500ms setelah pengguna berhenti mengetik
    const handler = setTimeout(() => {
        searchMovies(searchQuery);
    }, 500);

    // Bersihkan timeout jika pengguna mengetik lagi
    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery, searchMovies]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetchMovies();
    setActiveGenreId(0);
    setIsRefreshing(false);
  }, [refetchMovies]);
  
  const handleMoviePress = (movie: any) => {
    const bookableVersion = bookableMovies.find(bm => bm.title === movie.title);
    const targetId = bookableVersion ? bookableVersion.id : movie.id;
    router.push(`/movie/${targetId}`);
  };
  
  const filteredPopularMovies = useMemo(() => {
    if (activeGenreId === 0) {
      return popularMovies;
    }
    return popularMovies.filter(movie => 
        movie.genre_ids?.includes(activeGenreId)
    );
  }, [activeGenreId, popularMovies]);
  
  const filteredUpcomingMovies = useMemo(() => {
    const cutoffDate = new Date('2025-07-10');
    return upcomingMovies.filter(movie => {
        const releaseDate = new Date(movie.releaseDate);
        return releaseDate >= cutoffDate;
    });
  }, [upcomingMovies]);

  // Fungsi untuk menampilkan konten utama atau hasil pencarian
  const renderMainContent = () => {
    // Jika ada query pencarian, tampilkan hasilnya
    if (searchQuery) {
        if (isSearching) {
            return <ActivityIndicator style={{ marginTop: 50 }} size="large" color="#FFC107" />;
        }
        return (
            <FlatList
                data={searchResults}
                renderItem={({ item }) => <VerticalMovieCard movie={item} onPress={() => handleMoviePress(item)} />}
                keyExtractor={(item) => item.id.toString()}
                ListEmptyComponent={<Text style={styles.emptySearchText}>No results found for "{searchQuery}"</Text>}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
            />
        );
    }

    // Jika tidak ada query, tampilkan layout default
    return (
        <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#FFC107" />}
        >
            {popularMovies.length > 0 && (
                 <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Populer Saat Ini</Text>
                     <FlatList
                        data={popularMovies.slice(0, 5)}
                        renderItem={({ item }) => <PopularMovieCarouselCard item={item} onPress={() => handleMoviePress(item)} />}
                        keyExtractor={item => item.id.toString()}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingHorizontal: 20 }}
                    />
                </View>
            )}

            {bookableMovies.length > 0 && (
                 <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Sedang Tayang</Text>
                    <FlatList
                        data={bookableMovies}
                        renderItem={({ item }) => <HorizontalMovieCard item={item} onPress={() => handleMoviePress(item)} />}
                        keyExtractor={item => item.id.toString()}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingHorizontal: 20 }}
                    />
                </View>
            )}

            {filteredUpcomingMovies.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Akan Segera Tayang</Text>
                    <FlatList
                        data={filteredUpcomingMovies}
                        renderItem={({ item }) => <HorizontalMovieCard item={item} onPress={() => handleMoviePress(item)} />}
                        keyExtractor={item => item.id.toString()}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingHorizontal: 20 }}
                    />
                </View>
            )}

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Jelajahi Film</Text>
                <FlatList
                    data={genres}
                    renderItem={({ item }) => <GenreChip item={item} isActive={activeGenreId === item.id} onPress={() => setActiveGenreId(item.id)} />}
                    keyExtractor={item => item.id.toString()}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 20, marginBottom: 20 }}
                />
                {filteredPopularMovies.map(movie => (
                    <VerticalMovieCard key={movie.id} movie={movie} onPress={() => handleMoviePress(movie)} />
                ))}
            </View>
        </ScrollView>
    );
  }

  if (isLoading) {
      return (
          <SafeAreaView style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FFC107" />
          </SafeAreaView>
      )
  }

  return (
    <SafeAreaView style={styles.container}>
        <View style={styles.header}>
            <View>
                <Text style={styles.headerGreeting}>Selamat Datang!</Text>
                <Text style={styles.headerTitle}>CineCrypto</Text>
            </View>
            <TouchableOpacity style={styles.walletButton} onPress={() => isConnected ? router.push('/profile') : open()}>
                <Ionicons name={isConnected ? "person-circle" : "wallet"} size={32} color={isConnected ? '#FFC107' : '#E0E0E0'} />
            </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
            <TextInput
                placeholder="Cari film..."
                placeholderTextColor="#888"
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
            />
        </View>

        {renderMainContent()}
    </SafeAreaView>
  );
}

const VerticalMovieCard = ({ movie, onPress }: { movie: any; onPress: () => void }) => (
    <TouchableOpacity style={styles.vMovieCard} onPress={onPress}>
        <Image source={{ uri: movie.posterUrl }} style={styles.vPosterImage} />
        <View style={styles.vMovieInfo}>
            <Text style={styles.vMovieTitle} numberOfLines={2}>{movie.title}</Text>
            <View style={styles.vRatingContainer}>
                <Ionicons name="star" size={16} color="#F5C518" />
                <Text style={styles.vRatingText}>{movie.vote_average?.toFixed(1)}</Text>
            </View>
            <Text style={styles.vMovieOverview} numberOfLines={3}>{movie.overview}</Text>
        </View>
    </TouchableOpacity>
);


const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#121212' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },
    headerGreeting: { fontSize: 14, color: '#888' },
    headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#E0E0E0' },
    walletButton: { padding: 4 },
    searchContainer: { paddingHorizontal: 20, paddingBottom: 20 },
    searchInput: { backgroundColor: '#1E1E1E', height: 48, borderRadius: 12, paddingLeft: 45, paddingRight: 20, fontSize: 16, color: '#fff' },
    searchIcon: { position: 'absolute', left: 35, top: 14, zIndex: 1 },
    featuredCard: { width: 300, height: 180, marginRight: 16, justifyContent: 'flex-end' },
    featuredImage: { flex: 1, justifyContent: 'flex-end' },
    featuredOverlay: { backgroundColor: 'rgba(0,0,0,0.5)', padding: 12, borderBottomLeftRadius: 15, borderBottomRightRadius: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    featuredTitle: { color: 'white', fontSize: 16, fontWeight: 'bold', flex: 1, marginRight: 8 },
    featuredRatingText: { marginLeft: 4, fontSize: 14, fontWeight: 'bold', color: '#FFF' },
    section: { marginTop: 30 },
    sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#E0E0E0', marginLeft: 20, marginBottom: 16 },
    genreChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 10, backgroundColor: '#1E1E1E' },
    activeGenreChip: { backgroundColor: '#FFC107' },
    genreChipText: { color: '#E0E0E0', fontWeight: '600' },
    activeGenreChipText: { color: '#121212' },
    hMovieCard: { width: 140, marginRight: 16 },
    hPoster: { width: '100%', height: 210, borderRadius: 12, backgroundColor: '#1E1E1E' },
    bookableTag: { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(255, 193, 7, 0.9)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    bookableTagText: { color: '#121212', fontSize: 10, fontWeight: 'bold' },
    hMovieTitle: { color: '#fff', fontWeight: 'bold', marginTop: 8 },
    hMovieDate: { color: '#888', fontSize: 12 },
    vMovieCard: { flexDirection: 'row', backgroundColor: '#1E1E1E', borderRadius: 12, marginBottom: 16, marginHorizontal: 20 },
    vPosterImage: { width: 100, height: 150, borderTopLeftRadius: 12, borderBottomLeftRadius: 12, backgroundColor: '#333' },
    vMovieInfo: { flex: 1, padding: 12 },
    vMovieTitle: { fontSize: 16, fontWeight: 'bold', color: '#E0E0E0', marginBottom: 6 },
    vRatingContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    vRatingText: { marginLeft: 4, fontSize: 14, fontWeight: 'bold', color: '#E0E0E0' },
    vMovieOverview: { fontSize: 13, color: '#888', lineHeight: 18 },
    emptySearchText: {
        textAlign: 'center',
        marginTop: 50,
        color: '#888',
        fontSize: 16,
    }
});
