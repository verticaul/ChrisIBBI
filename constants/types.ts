// FILE: constants/types.ts

// --- Tipe Data untuk Entitas Utama ---

export interface Genre {
    id: number;
    name: string;
}

export interface Actor {
    id: number;
    name: string;
    profile_path: string | null;
}

export interface Video {
    id: string;
    key: string;
    site: 'YouTube';
    type: 'Trailer' | 'Teaser';
}

// Tipe untuk data film yang digabungkan dari Contract dan TMDB
export interface Movie {
    id: number;
    tmdbId: number;
    title: string;
    overview: string;
    isBookable: boolean;
    vote_average: number;
    
    // Properti dari TMDB (bisa ada atau tidak, tergantung konteks)
    genre_ids?: number[];
    runtime?: number;
    genres?: Genre[];
    credits?: { cast: Actor[] };
    videos?: { results: Video[] };
    
    // Properti Turunan (Hasil Olahan)
    posterUrl: string | null;
    backdropUrl: string | null;
    releaseDateFormatted?: string; // PERBAIKAN: Menambahkan properti ini
    
    // Properti dari Logika Aplikasi
    groupedShowtimes?: ShowtimeGroup[];
}

// --- Tipe Data untuk Jadwal & Pemesanan ---

export interface Showtime {
    id: number;
    timeString: string;
    price: string;
}

export interface ShowtimeGroup {
    date: string;
    formattedDate: string;
    times: Showtime[];
}

export interface Seatmap {
    totalSeats: number;
    ticketPrice: string;
    takenSeats: Set<number>;
    movieTitle: string;
    showtimeDate: string;
    showtimeTime: string;
}

// --- Tipe Data untuk Pengguna & Tiket ---

// Tipe untuk data tiket yang akan ditampilkan di halaman profil
export interface MyTicket {
    ticketId: number;
    movieTitle: string;
    posterUrl: string | null;
    date: string;
    time: string;
    seat: string;
    isUpcoming: boolean;
    
    // Status tiket yang mungkin, termasuk status lokal untuk UI
    status: 'Aktif' | 'Menunggu Scan' | 'Telah Digunakan' | 'Telah Dikembalikan' | 'Kedaluwarsa';
    
    transactionHash: string | null;
}
