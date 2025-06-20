# CineCrypto 🎬

Selamat datang di CineCrypto, sebuah aplikasi pemesanan tiket bioskop _mobile-first_ yang revolusioner, dibangun di atas teknologi Web3. Aplikasi ini memungkinkan pengguna untuk tidak hanya membeli tiket film, tetapi juga benar-benar memilikinya sebagai aset digital di dalam dompet kripto pribadi mereka.


## ✨ Fitur Utama

- **Koneksi Dompet yang Mulus**: Integrasi dengan **Reown AppKit** untuk koneksi yang aman dan mudah ke dompet MetaMask.
- **Antarmuka Dark Mode**: Desain yang elegan dan sinematik untuk pengalaman pengguna yang imersif.
- **Halaman Utama Dinamis**:
    - **Carousel Film Populer**: Menampilkan film-film yang sedang tren dari TMDB.
    - **Sedang Tayang**: Menampilkan film-film yang tiketnya dapat dibeli langsung dari _smart contract_.
    - **Akan Segera Tayang**: Daftar film yang akan datang untuk membangun antisipasi.
    - **Filter Genre**: Memungkinkan pengguna menjelajahi film berdasarkan genre favorit.
    - **Pencarian Fungsional**: _Search bar_ untuk menemukan film dengan cepat.
- **Halaman Detail Film yang Komprehensif**:
    - Semua informasi penting: sinopsis, rating, durasi, dan genre.
    - **Trailer YouTube**: Pemutar video trailer langsung di dalam aplikasi.
    - **Daftar Pemeran**: Menampilkan foto dan nama aktor utama.
    - **Jadwal Tayang Interaktif**: Pengguna dapat memilih tanggal dan melihat jam tayang yang tersedia, yang datanya diambil langsung dari _smart contract_.
- **Halaman Pemilihan Kursi Realistis**:
    - Denah kursi visual dengan label baris (A, B, C...) dan lorong.
    - Umpan balik visual instan saat memilih dan membatalkan pilihan kursi.
    - Ringkasan pesanan yang jelas sebelum melakukan pembayaran.
- **Transaksi On-Chain**: Proses pembelian tiket yang memanggil fungsi _smart contract_ secara langsung, dicatat secara permanen di blockchain Sepolia.
- **Halaman Tiket Saya**:
    - Menampilkan semua riwayat tiket (aktif dan lampau) yang dimiliki oleh pengguna.
    - **QR Code Unik**: Setiap tiket memiliki QR code yang bisa ditampilkan dalam modal untuk proses _check-in_ di bioskop.
    - **Tautan Etherscan**: Tautan langsung dari tiket ke transaksi pembeliannya di Sepolia Etherscan untuk transparansi penuh.

## 🛠️ Teknologi yang Digunakan

- **Frontend**: React Native (Expo)
- **Navigasi**: Expo Router
- **Koneksi Web3**: Reown AppKit (menggunakan Ethers.js)
- **Smart Contract**: Solidity (di-deploy di jaringan tes Sepolia)
- **Data Film Eksternal**: The Movie Database (TMDB) API
- **Bahasa**: TypeScript
- **Styling**: StyleSheet bawaan React Native

## 🚀 Instalasi & Setup

Untuk menjalankan proyek ini di lingkungan lokal Anda, ikuti langkah-langkah berikut:

1.  **Prasyarat**: Pastikan Anda sudah menginstal [Node.js](https://nodejs.org/) (versi LTS direkomendasikan) dan `npm`.

2.  **Clone Repositori**:
    ```bash
    git clone https://github.com/verticaul/ChrisIBBI.git
    cd CineCryptoApp
    ```

3.  **Instal Dependensi**:
    ```bash
    npm install
    ```

4.  **Konfigurasi Smart Contract**:
    - Buka file `constants/contract.ts`.
    - Ganti nilai `CONTRACT_ADDRESS` dengan alamat _smart contract_ Anda yang sudah di-deploy di jaringan Sepolia.
    - Pastikan `CONTRACT_ABI` sudah sesuai dengan fungsi-fungsi di _smart contract_ Anda.

5.  **Konfigurasi Skema Aplikasi**:
    - Buka file `app.json`.
    - Pastikan nilai `scheme` sesuai dengan yang Anda daftarkan di metadata AppKit (contoh: `"sof4"`).

6.  **Jalankan Aplikasi**:
    ```bash
    npx expo start
    ```
    Pindai QR code yang muncul dengan aplikasi Expo Go di perangkat Anda (iOS atau Android).

## 📁 Struktur Folder

Struktur proyek ini dirancang agar bersih dan mudah dikelola:

-   **/app**: Direktori inti untuk _file-based routing_ Expo Router. Setiap file di sini menjadi sebuah halaman.
-   **/assets**: Menyimpan aset statis seperti gambar dan ikon.
-   **/components**: Berisi komponen UI yang dapat digunakan kembali di berbagai halaman (contoh: `BottomNavBar.tsx`).
-   **/constants**: Menyimpan nilai-nilai konstan, terutama detail _smart contract_ (`contract.ts`).
-   **/hooks**: Tempat untuk _custom hooks_ yang berisi logika bisnis dan pengambilan data, seperti `useCineCrypto.ts`.
-   **/services**: Berisi fungsi-fungsi untuk berinteraksi dengan API eksternal seperti TMDB.

---

Terima kasih telah menjadi pendamping coding saya dalam membangun proyek ini!
