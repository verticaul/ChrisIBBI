import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppKitProvider } from '@reown/appkit-ethers-react-native';
import { ethers, BigNumberish } from 'ethers';
import { useCallback, useEffect, useState } from 'react';
import { CONTRACT_ABI, CONTRACT_ADDRESS } from '../constants/contract';
import { Movie, MyTicket, Seatmap } from '../constants/types';

// --- Konfigurasi & Cache ---
const SEPOLIA_RPC_URL = 'https://ethereum-sepolia-rpc.publicnode.com';
const TMDB_API_KEY = 'b8ecde2e2676bbe647d066f8cff2a405';
const TMDB_API_BASE_URL = 'https://api.themoviedb.org/3';
export const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const CACHE_KEY = 'cineCryptoCache_v7_final'; // Versi cache baru
const CACHE_EXPIRATION_TIME = 3600 * 1000; // 1 jam

const tmdbDetailsCache = new Map<number, any>();

// --- Fungsi Helper ---
const fetchTmdbDetailsById = async (tmdbId: number) => {
    if (tmdbDetailsCache.has(tmdbId)) return tmdbDetailsCache.get(tmdbId);
    try {
        const url = `${TMDB_API_BASE_URL}/movie/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=videos,credits`;
        const response = await fetch(url);
        if (!response.ok) return null;
        const data = await response.json();
        if (data.id) tmdbDetailsCache.set(tmdbId, data);
        return data;
    } catch (error) {
        console.error(`Error fetching TMDB details for id "${tmdbId}":`, error);
        return null;
    }
};

const searchTmdbByTitle = async (title: string) => {
    try {
        const url = `${TMDB_API_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}`;
        const response = await fetch(url);
        if (!response.ok) return null;
        const data = await response.json();
        return data.results?.[0] ?? null;
    } catch (error) {
        console.error(`Error searching TMDB for title "${title}":`, error);
        return null;
    }
};

// --- Custom Hook Utama ---
export const useCineCrypto = () => {
    const { walletProvider } = useAppKitProvider();
    
    // State lengkap yang dibutuhkan oleh seluruh aplikasi, diinisialisasi dengan nilai aman
    const [isLoading, setIsLoading] = useState(true);
    const [bookableMovies, setBookableMovies] = useState<Movie[]>([]);
    const [popularMovies, setPopularMovies] = useState<Movie[]>([]);
    const [upcomingMovies, setUpcomingMovies] = useState<any[]>([]);
    const [genres, setGenres] = useState<any[]>([]);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Fungsi untuk memuat semua data awal yang dibutuhkan halaman utama
    const fetchData = useCallback(async (forceRefresh = false) => {
        if (!forceRefresh) setIsLoading(true);

        const cachedDataString = await AsyncStorage.getItem(CACHE_KEY);
        if (cachedDataString && !forceRefresh) {
            const cachedData = JSON.parse(cachedDataString);
            if (Date.now() - cachedData.timestamp < CACHE_EXPIRATION_TIME) {
                setBookableMovies(cachedData.bookableMovies || []);
                setPopularMovies(cachedData.popularMovies || []);
                setUpcomingMovies(cachedData.upcomingMovies || []);
                setGenres(cachedData.genres || []);
                setIsLoading(false);
                return;
            }
        }
        
        try {
            const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
            const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

            const contractMoviesPromise = async (): Promise<Movie[]> => {
                const nextMovieIdBigInt = await contract.getNextMovieId();
                const nextMovieId = Number(nextMovieIdBigInt);
                
                const moviePromises = [];
                for (let i = 1; i < nextMovieId; i++) {
                    moviePromises.push(contract.movies(i));
                }
                const rawMovies = await Promise.all(moviePromises);
                const activeMovies = rawMovies.filter(movie => movie.isActive);

                const tmdbPromises = activeMovies.map(movie => searchTmdbByTitle(movie.title));
                const tmdbResults = await Promise.all(tmdbPromises);

                return activeMovies.map((movie, index) => {
                    const tmdb = tmdbResults[index];
                    if (!tmdb) return null;
                    return { 
                        id: Number(movie.id), 
                        tmdbId: tmdb.id,
                        title: movie.title,
                        posterUrl: tmdb.poster_path ? `${IMAGE_BASE_URL}${tmdb.poster_path}` : null, 
                        isBookable: true,
                    } as Movie;
                }).filter((m): m is Movie => m !== null);
            };

            const tmdbApi = (endpoint: string) => fetch(`${TMDB_API_BASE_URL}${endpoint}?api_key=${TMDB_API_KEY}`).then(res => res.json());

            const [bookableResults, popularData, upcomingData, genreData] = await Promise.all([ 
                contractMoviesPromise(), 
                tmdbApi('/movie/popular'),
                tmdbApi('/movie/upcoming'),
                tmdbApi('/genre/movie/list')
            ]);
            
            setBookableMovies(bookableResults);
            
            const processTmdbList = (list: any[]) => (list || []).map((m:any) => ({
                ...m, 
                id: m.id, 
                tmdbId: m.id, 
                posterUrl: m.poster_path ? `${IMAGE_BASE_URL}${m.poster_path}`: null, 
                backdropUrl: m.backdrop_path ? `https://image.tmdb.org/t/p/w780${m.backdrop_path}` : null, 
                isBookable: false,
                releaseDateFormatted: m.release_date ? new Date(m.release_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : 'TBA'
            }));

            const processedPopular = processTmdbList(popularData.results);
            const processedUpcoming = processTmdbList(upcomingData.results);
            
            setPopularMovies(processedPopular);
            setUpcomingMovies(processedUpcoming);
            setGenres([{ id: 0, name: 'All' }, ...(genreData.genres || [])]);

            await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
                bookableMovies: bookableResults, 
                popularMovies: processedPopular, 
                upcomingMovies: processedUpcoming, 
                genres: [{ id: 0, name: 'All' }, ...(genreData.genres || [])], 
                timestamp: Date.now()
            }));

        } catch (error) {
            console.error("[Hook] Gagal total saat fetchData:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const getMyTickets = useCallback(async (ownerAddress: string): Promise<MyTicket[]> => {
        if (!ownerAddress) return [];
        try {
            const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
            const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    
            const ticketIds = await contract.getTicketsByOwner(ownerAddress);
            if (!ticketIds || ticketIds.length === 0) return [];
    
            const finalTickets = await ticketIds.reduce(async (accPromise: Promise<MyTicket[]>, ticketId: any) => {
                const acc = await accPromise;
                try {
                    const ticket = await contract.tickets(ticketId);
                    const showtime = await contract.getShowtimeDetails(ticket.showtimeId);
                    const movie = await contract.movies(showtime.movieId);
                    
                    const tmdbResult = await searchTmdbByTitle(movie.title);
                    
                    const startTime = new Date(Number(showtime.startTime) * 1000);
                    const thirtyMinutesInMs = 30 * 60 * 1000;
                    const gracePeriodEndTime = startTime.getTime() + thirtyMinutesInMs;
                    const isUpcoming = gracePeriodEndTime > Date.now();

                    const seatLabel = `Kursi ${Number(ticket.seatId)}`;
                    
                    let status: MyTicket['status'] = 'Aktif';
                    if (Number(ticket.status) === 1) { status = 'Telah Digunakan'; } 
                    else if (Number(ticket.status) === 2) { status = 'Telah Dikembalikan'; } 
                    else if (!isUpcoming) { status = 'Kedaluwarsa'; }
    
                    acc.push({
                        ticketId: Number(ticketId),
                        movieTitle: movie.title,
                        posterUrl: tmdbResult?.poster_path ? `${IMAGE_BASE_URL}${tmdbResult.poster_path}` : null,
                        date: startTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }),
                        time: startTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
                        seat: seatLabel,
                        isUpcoming,
                        status,
                        transactionHash: null,
                    });
                } catch(e) {
                    console.error(`[Hook] Gagal memproses tiket ID ${ticketId}:`, e);
                }
                return acc;
            }, Promise.resolve([]));
    
            return finalTickets.sort((a, b) => b.ticketId - a.ticketId);
    
        } catch (error) {
            console.error("[Hook] Gagal mengambil tiket pengguna:", error);
            return [];
        }
    }, []);

    // PERBAIKAN: Fungsi pembantu transaksi yang lebih tangguh
    const performTransaction = useCallback(async (callback: (contract: ethers.Contract) => Promise<any>) => {
        if (!walletProvider) {
            throw new Error("Dompet tidak terhubung. Silakan hubungkan dompet Anda terlebih dahulu.");
        }
        
        console.log("[TX] Membuat provider dari walletProvider...");
        const provider = new ethers.BrowserProvider(walletProvider);
        
        console.log("[TX] Meminta signer...");
        const signer = await provider.getSigner();
        console.log("[TX] Signer siap. Alamat:", await signer.getAddress());
        
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
        
        console.log("[TX] Menjalankan callback transaksi...");
        return callback(contract);
    }, [walletProvider]);
    
    const requestTicketRefund = useCallback((ticketId: number) => {
        return performTransaction(async contract => {
            const tx = await contract.requestRefund(ticketId);
            await tx.wait(); // Untuk refund, kita bisa tunggu karena ini aksi tunggal
            return tx;
        });
    }, [performTransaction]);

    // PERBAIKAN: Fungsi pembelian tiket dengan alur "kirim dan lupakan"
    const buyTicket = useCallback((showtimeId: number, seatId: number, value: BigNumberish) => {
        return performTransaction(contract => contract.buyTicket(showtimeId, seatId, { value }));
    }, [performTransaction]);

    const buyMultipleTickets = useCallback((showtimeId: number, seatIds: number[], value: BigNumberish) => {
        return performTransaction(contract => contract.buyMultipleTickets(showtimeId, seatIds, { value }));
    }, [performTransaction]);

    const searchMovies = useCallback(async (query: string) => {
        if (!query) {
            setSearchResults([]);
            return;
        }
        try {
            setIsSearching(true);
            const url = `${TMDB_API_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`;
            const response = await fetch(url);
            const data = await response.json();
            const results = (data.results || []).map((movie: any) => ({
                ...movie,
                id: movie.id,
                tmdbId: movie.id,
                posterUrl: movie.poster_path ? `${IMAGE_BASE_URL}${movie.poster_path}` : null,
            }));
            setSearchResults(results);
        } catch (error) {
            console.error("Gagal mencari film:", error);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    }, []);

    const getMovieDetails = useCallback(async (id: number, isTmdb: boolean): Promise<Movie | null> => {
        const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
        
        let movieOnChain: any = null;
        let tmdbDetails: any = null;
        let contractId = isTmdb ? null : id;
        let tmdbId = isTmdb ? id : null;

        try {
            if (isTmdb) {
                tmdbDetails = await fetchTmdbDetailsById(id);
                if (!tmdbDetails) return null;
                tmdbId = tmdbDetails.id;
                
                const nextMovieId = await contract.getNextMovieId();
                for (let i = 1; i < nextMovieId; i++) {
                    const tempMovie = await contract.movies(i);
                    if (tempMovie.isActive && tempMovie.title.toLowerCase() === tmdbDetails.title.toLowerCase()) {
                        movieOnChain = tempMovie;
                        contractId = Number(tempMovie.id);
                        break;
                    }
                }
            } else {
                movieOnChain = await contract.movies(id);
                if (!movieOnChain.isActive) return null;
                const tmdbResult = await searchTmdbByTitle(movieOnChain.title);
                if (tmdbResult) {
                    tmdbId = tmdbResult.id;
                    tmdbDetails = await fetchTmdbDetailsById(tmdbId!);
                }
            }

            if (!tmdbDetails) return null;

            const isBookable = !!(movieOnChain && movieOnChain.isActive);
            let groupedShowtimes: any[] = [];

            if (isBookable && contractId) {
                const nextShowtimeId = await contract.getNextShowtimeId();
                const nowInSeconds = Math.floor(Date.now() / 1000);
                const showtimesData = [];
                for (let i = 1; i < nextShowtimeId; i++) {
                    const showtime = await contract.getShowtimeDetails(i);
                    if (Number(showtime.movieId) === contractId && Number(showtime.startTime) > nowInSeconds) {
                        showtimesData.push({
                            id: Number(showtime.id),
                            startTime: new Date(Number(showtime.startTime) * 1000),
                            price: ethers.formatEther(showtime.ticketPrice),
                        });
                    }
                }
                const groups = showtimesData.reduce((acc, st) => {
                    const dateKey = st.startTime.toISOString().split('T')[0];
                    if (!acc[dateKey]) acc[dateKey] = { date: dateKey, formattedDate: st.startTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }), times: [] };
                    acc[dateKey].times.push({ id: st.id, timeString: st.startTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }), price: st.price });
                    return acc;
                }, {});
                groupedShowtimes = Object.values(groups).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
            }

            return {
                ...tmdbDetails,
                id: contractId || tmdbId,
                tmdbId: tmdbId,
                isBookable,
                groupedShowtimes,
                posterUrl: tmdbDetails.poster_path ? `${IMAGE_BASE_URL}${tmdbDetails.poster_path}` : null,
                backdropUrl: tmdbDetails.backdrop_path ? `https://image.tmdb.org/t/p/w780${tmdbDetails.backdrop_path}` : null,
            };
        } catch (error) {
            console.error("Gagal mengambil detail film:", error);
            return null;
        }
    }, []);

    const getShowtimeSeatmap = useCallback(async (showtimeId: number): Promise<Seatmap | null> => {
        try {
            const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
            const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
            const details = await contract.getShowtimeDetails(showtimeId);
            if (!details.movieId || Number(details.movieId) === 0) return null;
    
            const movieDetails = await contract.movies(details.movieId);
            const seatsBitmap = await contract.getSeatsBitmap(showtimeId);
            
            const takenSeats = new Set<number>();
            seatsBitmap.forEach((bitmap: any, bitmapIndex: number) => {
                const bitmapBigInt = BigInt(bitmap);
                for (let bitIndex = 0; bitIndex < 256; bitIndex++) {
                    if ((bitmapBigInt >> BigInt(bitIndex)) & BigInt(1)) {
                        takenSeats.add(bitmapIndex * 256 + bitIndex + 1);
                    }
                }
            });
            
            const startTime = new Date(Number(details.startTime) * 1000);
            
            return {
                totalSeats: Number(details.totalSeats),
                ticketPrice: ethers.formatEther(details.ticketPrice),
                takenSeats: takenSeats,
                movieTitle: movieDetails.title,
                showtimeDate: startTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }),
                showtimeTime: startTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
            };
        } catch (error) {
            console.error("Gagal mengambil denah kursi:", error);
            return null;
        }
      }, []);

    // PERBAIKAN: Memastikan semua fungsi diekspor
    return { 
        isLoading, bookableMovies, popularMovies, upcomingMovies, genres, searchResults, isSearching,
        refetchMovies: () => fetchData(true),
        searchMovies, 
        getMovieDetails,
        getShowtimeSeatmap,
        getMyTickets,
        requestTicketRefund,
        buyTicket,
        buyMultipleTickets,
    };
};
