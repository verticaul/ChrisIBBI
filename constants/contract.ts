export const CONTRACT_ADDRESS = '0x39709544a252Ef467282e57Ea74d06d724d8Dc09'; // <-- GANTI DENGAN ALAMAT KONTRAK ANDA

export const CONTRACT_ABI = [
  "function addMovie(string _title)",
  "function addMultipleShowtimes(uint256 _movieId, uint256 _theaterId, uint256[] _startTimes, uint256 _ticketPrice, uint256 _totalSeats)",
  "function addShowtime(uint256 _movieId, uint256 _theaterId, uint256 _startTime, uint256 _ticketPrice, uint256 _totalSeats)",
  "function buyMultipleTickets(uint256 _showtimeId, uint256[] _seatIds) payable",
  "function buyTicket(uint256 _showtimeId, uint256 _seatId) payable",
  "function getNextMovieId() view returns (uint256)",
  "function getNextShowtimeId() view returns (uint256)",
  "function getSeatOwner(uint256 _showtimeId, uint256 _seatId) view returns (address)",
  "function getSeatsBitmap(uint256 _showtimeId) view returns (uint256[])",
  "function getShowtimeDetails(uint256 _showtimeId) view returns (uint256 id, uint256 movieId, uint256 theaterId, uint256 startTime, uint256 ticketPrice, uint256 totalSeats, uint256 seatsSold)",
  "function getTicketsByOwner(address _owner) view returns (uint256[])",
  "function TOTAL_THEATERS() view returns (uint256)",
  "function owner() view returns (address)",
  "function transferOwnership(address newOwner)",
  "function renounceOwnership()",
  "function toggleMovieStatus(uint256 _movieId)",
  // Tambahkan fungsi view `movies` agar bisa dipanggil dari ethers
  "function movies(uint256) view returns (uint256 id, string title, bool isActive)",
  "function tickets(uint256) view returns (uint256 id, uint256 showtimeId, uint256 seatId, address owner)"
];