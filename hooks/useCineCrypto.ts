// FILE: hooks/useCineCrypto.ts
import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../constants/contract';
import { IMAGE_BASE_URL } from '../services/tmdb';

// Konfigurasi dan URL yang dibutuhkan
const SEPOLIA_RPC_URL = 'https://ethereum-sepolia-rpc.publicnode.com';
const TMDB_API_KEY = 'b8ecde2e2676bbe647d066f8cff2a405';
const TMDB_API_BASE_URL = 'https://api.themoviedb.org/3';
const CACHE_KEY = 'cineCryptoCache_v1'; // Kunci untuk caching
const CACHE_EXPIRATION_TIME = 3600 * 1000; // 1 jam dalam milidetik

// --- FUNGSI HELPER (Untuk berkomunikasi dengan API luar) ---

// Mengambil detail lengkap dari TMDB berdasarkan judul film
const fetchTmdbDetailsByTitle = async (title: string) => {
    try {
        const searchUrl = `${TMDB_API_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}`;
        const searchResponse = await fetch(searchUrl);
        const searchData = await searchResponse.json();

        if (!searchData.results || searchData.results.length === 0) {
            console.warn(`No TMDB results found for title: "${title}"`);
            return null;
        }
        const tmdbId = searchData.results[0].id;
        
        // Meminta data tambahan untuk video (trailer) dan kredit (aktor)
        const detailsUrl = `${TMDB_API_BASE_URL}/movie/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=videos,credits`;
        const detailsResponse = await fetch(detailsUrl);
        
        return await detailsResponse.json();
    } catch (error) {
        console.error(`Error fetching TMDB details for "${title}":`, error);
        return null;
    }
};

// Mengambil daftar film populer dari TMDB
const fetchPopularMoviesFromTmdb = async () => {
    try {
        const url = `${TMDB_API_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();
        return data.results.map((movie: any) => ({
            ...movie,
            posterUrl: movie.poster_path ? `${IMAGE_BASE_URL}${movie.poster_path}` : null,
            isBookable: false,
        }));
    } catch (error) {
        console.error("Error fetching popular movies from TMDB:", error);
        return [];
    }
};

// Mengambil daftar film "Coming Soon" dari TMDB
const fetchUpcomingMoviesFromTmdb = async () => {
    try {
        const url = `${TMDB_API_BASE_URL}/movie/upcoming?api_key=${TMDB_API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();
        return data.results.map((movie: any) => ({
            id: movie.id,
            title: movie.title,
            posterUrl: movie.poster_path ? `${IMAGE_BASE_URL}${movie.poster_path}` : null,
            releaseDate: movie.release_date
        }));
    } catch (error) {
        console.error("Error fetching upcoming movies from TMDB:", error);
        return [];
    }
};

// Mengambil daftar genre dari TMDB
const fetchGenresFromTmdb = async () => {
    try {
        const url = `${TMDB_API_BASE_URL}/genre/movie/list?api_key=${TMDB_API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();
        return data.genres || [];
    } catch (error) {
        console.error("Error fetching genres from TMDB:", error);
        return [];
    }
};


// --- CUSTOM HOOK UTAMA ---
export const useCineCrypto = () => {
  const [bookableMovies, setBookableMovies] = useState<any[]>([]);
  const [popularMovies, setPopularMovies] = useState<any[]>([]);
  const [upcomingMovies, setUpcomingMovies] = useState<any[]>([]);
  const [genres, setGenres] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  // Fungsi utama untuk mengambil semua data, dengan logika caching
  const fetchData = useCallback(async (forceRefresh = false) => {
    try {
      if (!forceRefresh) setIsLoading(true);

      const cachedDataString = await AsyncStorage.getItem(CACHE_KEY);
      if (cachedDataString && !forceRefresh) {
        const cachedData = JSON.parse(cachedDataString);
        if (Date.now() - cachedData.timestamp < CACHE_EXPIRATION_TIME) {
          console.log("Memuat data dari cache...");
          setBookableMovies(cachedData.bookableMovies);
          setPopularMovies(cachedData.popularMovies);
          setUpcomingMovies(cachedData.upcomingMovies);
          setGenres(cachedData.genres);
          setIsLoading(false);
          return;
        }
      }
      
      console.log("Mengambil data baru dari jaringan...");
      const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

      const contractMoviesPromise = async () => {
          const nextMovieId = await contract.getNextMovieId();
          const promises = [];
          for (let i = 1; i < nextMovieId; i++) {
              promises.push(contract.movies(i).then(async (movieOnChain: any) => {
                  if (movieOnChain.isActive) {
                      const tmdb = await fetchTmdbDetailsByTitle(movieOnChain.title);
                      return { ...tmdb, id: Number(movieOnChain.id), posterUrl: tmdb?.poster_path ? `${IMAGE_BASE_URL}${tmdb.poster_path}` : null, backdropUrl: tmdb?.backdrop_path ? `https://image.tmdb.org/t/p/w780${tmdb.backdrop_path}` : null, isBookable: true };
                  }
                  return null;
              }));
          }
          return (await Promise.all(promises)).filter(Boolean);
      };

      const [bookableResults, popularResults, upcomingResults, genreResults] = await Promise.all([ 
          contractMoviesPromise(), 
          fetchPopularMoviesFromTmdb(),
          fetchUpcomingMoviesFromTmdb(),
          fetchGenresFromTmdb()
      ]);
      
      const allGenres = [{ id: 0, name: 'All' }, ...genreResults];
      setBookableMovies(bookableResults);
      setPopularMovies(popularResults);
      setUpcomingMovies(upcomingResults);
      setGenres(allGenres);

      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
          bookableMovies: bookableResults, popularMovies: popularResults, upcomingMovies: upcomingResults, genres: allGenres, timestamp: Date.now()
      }));

    } catch (error) {
      console.error("Gagal mengambil data awal:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

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
        const results = data.results.map((movie: any) => ({
            id: movie.id,
            title: movie.title,
            posterUrl: movie.poster_path ? `${IMAGE_BASE_URL}${movie.poster_path}` : null,
            overview: movie.overview,
            vote_average: movie.vote_average,
        }));
        setSearchResults(results);
    } catch (error) {
        console.error("Gagal mencari film:", error);
        setSearchResults([]);
    } finally {
        setIsSearching(false);
    }
  }, []);
  
  const getMovieDetails = useCallback(async (movieId: number) => {
    try {
        const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
        
        const movieOnChain = await contract.movies(movieId);
        if (!movieOnChain.title) return null;

        const tmdbDetails = await fetchTmdbDetailsByTitle(movieOnChain.title);

        const showtimesData = [];
        const nextShowtimeId = await contract.getNextShowtimeId();
        const nowInSeconds = Math.floor(Date.now() / 1000);

        for (let i = 1; i < nextShowtimeId; i++) {
            const showtime = await contract.getShowtimeDetails(i);
            const timestamp = Number(showtime.startTime);
            if (Number(showtime.movieId) === movieId && !isNaN(timestamp) && timestamp > nowInSeconds) {
                showtimesData.push({
                    id: Number(showtime.id),
                    startTime: new Date(timestamp * 1000),
                    price: ethers.formatEther(showtime.ticketPrice),
                });
            }
        }
        
        const groupedShowtimes = showtimesData.reduce((acc, showtime) => {
            const dateKey = showtime.startTime.toISOString().split('T')[0];
            if (!acc[dateKey]) {
                acc[dateKey] = {
                    date: dateKey,
                    formattedDate: showtime.startTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }),
                    times: []
                };
            }
            acc[dateKey].times.push({
                id: showtime.id,
                timeString: showtime.startTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
                price: showtime.price,
            });
            return acc;
        }, {} as Record<string, { date: string, formattedDate: string, times: any[] }>);
        
        const sortedGroups = Object.values(groupedShowtimes).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        return {
            ...tmdbDetails,
            id: movieId,
            title: movieOnChain.title,
            posterUrl: tmdbDetails?.poster_path ? `${IMAGE_BASE_URL}${tmdbDetails.poster_path}` : null,
            backdropUrl: tmdbDetails?.backdrop_path ? `https://image.tmdb.org/t/p/w780${tmdbDetails.backdrop_path}` : null,
            groupedShowtimes: sortedGroups,
            isBookable: true
        };
    } catch (error) {
        console.error("Gagal mengambil detail film:", error);
        return null;
    }
  }, []);

  const getShowtimeSeatmap = useCallback(async (showtimeId: number) => {
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
                    const seatId = bitmapIndex * 256 + bitIndex + 1;
                    takenSeats.add(seatId);
                }
            }
        });
        
        const startTime = new Date(Number(details.startTime) * 1000);
        const formattedDate = startTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });
        const formattedTime = startTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

        return {
            totalSeats: Number(details.totalSeats),
            ticketPrice: ethers.formatEther(details.ticketPrice),
            takenSeats: takenSeats,
            movieTitle: movieDetails.title,
            showtimeDate: formattedDate,
            showtimeTime: formattedTime
        };
    } catch (error) {
        console.error("Gagal mengambil denah kursi:", error);
        return null;
    }
  }, []);

  const getMyTickets = useCallback(async (ownerAddress: string) => {
    if (!ownerAddress) return [];

    try {
        const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

        const ticketIds = await contract.getTicketsByOwner(ownerAddress);
        const ticketDetailsPromises = ticketIds.map(async (ticketId: any) => {
            const ticket = await contract.tickets(ticketId);
            const showtime = await contract.getShowtimeDetails(ticket.showtimeId);
            const movie = await contract.movies(showtime.movieId);
            const tmdbDetails = await fetchTmdbDetailsByTitle(movie.title);
            const startTime = new Date(Number(showtime.startTime) * 1000);
            
            const rowNumber = Math.floor((Number(ticket.seatId) - 1) / 10);
            const seatNumberInRow = (Number(ticket.seatId) - 1) % 10 + 1;
            const seatLabel = `${String.fromCharCode(65 + rowNumber)}${seatNumberInRow}`;

            return {
                ticketId: Number(ticketId),
                movieTitle: movie.title,
                posterUrl: tmdbDetails?.poster_path ? `${IMAGE_BASE_URL}${tmdbDetails.poster_path}` : null,
                date: startTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }),
                time: startTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
                seat: seatLabel,
                isUpcoming: startTime.getTime() > Date.now(),
            };
        });

        const allTickets = await Promise.all(ticketDetailsPromises);
        return allTickets.sort((a, b) => b.ticketId - a.ticketId);

    } catch (error) {
        console.error("Gagal mengambil tiket pengguna:", error);
        return [];
    }
  }, []);
  
  useEffect(() => { fetchData(); }, [fetchData]);

  // Kembalikan semua state dan fungsi yang dibutuhkan oleh UI
  return { 
      bookableMovies, 
      popularMovies, 
      upcomingMovies,
      genres,
      isLoading, 
      isSearching,
      searchResults,
      refetchMovies: () => fetchData(true), // Memaksa refresh saat ditarik
      searchMovies, 
      getMovieDetails,
      getShowtimeSeatmap,
      getMyTickets
    };
};
