const API_KEY = 'b8ecde2e2676bbe647d066f8cff2a405';
const API_BASE_URL = 'https://api.themoviedb.org/3';
export const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

export interface TmdbMovie {
  id: number;
  title: string;
  poster_path: string;
  // ... tambahkan properti lain jika perlu
}

export const fetchMovieDetailsFromTMDB = async (title: string): Promise<TmdbMovie | null> => {
  try {
    const searchUrl = `${API_BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(title)}`;
    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();

    if (!searchData.results || searchData.results.length === 0) {
      console.warn(`No TMDB results found for title: "${title}"`);
      return null;
    }
    const tmdbId = searchData.results[0].id;

    const detailsUrl = `${API_BASE_URL}/movie/${tmdbId}?api_key=${API_KEY}`;
    const detailsResponse = await fetch(detailsUrl);
    
    return await detailsResponse.json();
  } catch (error) {
    console.error(`Error fetching from TMDB for title "${title}":`, error);
    return null;
  }
};