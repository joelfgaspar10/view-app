import { TMDBItem } from "../types/tmdb";
import { Episode } from "../components/EpisodeCard"; // Import Episode type

export const TMDB_CONFIG = {
  BASE_URL: "https://api.themoviedb.org/3",
  API_KEY: process.env.EXPO_PUBLIC_TMDB_API_KEY,
  headers: {
    accept: "application/json",
    Authorization: `Bearer ${process.env.EXPO_PUBLIC_TMDB_API_KEY}`,
  },
};

export const fetchTrendingAllWeek = async ({ query }: { query: string }) => {
  const endpoint = `${TMDB_CONFIG.BASE_URL}/trending/all/week?language=pt-PT`;

  const response = await fetch(endpoint, {
    method: "GET",
    headers: TMDB_CONFIG.headers,
  });

  if (!response.ok) {
    // @ts-ignore
    throw new Error("Failed to fetch data", response.statusText);
  }

  const data = await response.json();

  return data.results;
};

export const fetchTrendingMoviesWeek = async (): Promise<TMDBItem[]> => {
  const endpoint = `${TMDB_CONFIG.BASE_URL}/trending/movie/week?language=pt-PT`;
  const response = await fetch(endpoint, { method: 'GET', headers: TMDB_CONFIG.headers });
  if (!response.ok) throw new Error('Failed to fetch trending movies');
  const data = await response.json();
  return data.results || [];
};

export const fetchTrendingTvWeek = async (): Promise<TMDBItem[]> => {
  const endpoint = `${TMDB_CONFIG.BASE_URL}/trending/tv/week?language=pt-PT`;
  const response = await fetch(endpoint, { method: 'GET', headers: TMDB_CONFIG.headers });
  if (!response.ok) throw new Error('Failed to fetch trending tv');
  const data = await response.json();
  return data.results || [];
};

// Generic helper to build a search URL
const buildSearchUrl = (path: string, query: string, page: number) => {
  const encoded = encodeURIComponent(query.trim());
  return `${TMDB_CONFIG.BASE_URL}${path}?query=${encoded}&page=${page}&include_adult=false&language=pt-PT`;
};

// Search movies only (no genre parameter here; filtering by genre with discover endpoint instead)
export const searchMovies = async (query: string, page: number = 1): Promise<TMDBItem[]> => {
  if (!query.trim()) return [];
  const endpoint = buildSearchUrl('/search/movie', query, page);
  const response = await fetch(endpoint, { method: 'GET', headers: TMDB_CONFIG.headers });
  if (!response.ok) throw new Error('Failed to search movies');
  const data = await response.json();
  return (data.results || []).map((r: any) => ({ ...r, media_type: 'movie' }));
};

// Search TV only
export const searchTV = async (query: string, page: number = 1): Promise<TMDBItem[]> => {
  if (!query.trim()) return [];
  const endpoint = buildSearchUrl('/search/tv', query, page);
  const response = await fetch(endpoint, { method: 'GET', headers: TMDB_CONFIG.headers });
  if (!response.ok) throw new Error('Failed to search tv');
  const data = await response.json();
  return (data.results || []).map((r: any) => ({ ...r, media_type: 'tv' }));
};

// Discover movies by genres (no query)
export const discoverMovies = async (genres: number[], page: number = 1, minVote?: number): Promise<TMDBItem[]> => {
  const endpoint = `${TMDB_CONFIG.BASE_URL}/discover/movie?language=pt-PT&sort_by=popularity.desc&page=${page}${genres.length ? `&with_genres=${genres.join(',')}` : ''}${minVote !== undefined ? `&vote_average.gte=${minVote}` : ''}`;
  const response = await fetch(endpoint, { method: 'GET', headers: TMDB_CONFIG.headers });
  if (!response.ok) throw new Error('Failed to discover movies');
  const data = await response.json();
  return (data.results || []).map((r: any) => ({ ...r, media_type: 'movie' }));
};

// Discover TV by genres (no query)
export const discoverTV = async (genres: number[], page: number = 1, minVote?: number): Promise<TMDBItem[]> => {
  const endpoint = `${TMDB_CONFIG.BASE_URL}/discover/tv?language=pt-PT&sort_by=popularity.desc&page=${page}${genres.length ? `&with_genres=${genres.join(',')}` : ''}${minVote !== undefined ? `&vote_average.gte=${minVote}` : ''}`;
  const response = await fetch(endpoint, { method: 'GET', headers: TMDB_CONFIG.headers });
  if (!response.ok) throw new Error('Failed to discover tv');
  const data = await response.json();
  return (data.results || []).map((r: any) => ({ ...r, media_type: 'tv' }));
};

// Multi search (movie + tv + person) 
export const searchMulti = async (query: string, page: number = 1): Promise<TMDBItem[]> => {
  if (!query.trim()) return [];
  const endpoint = buildSearchUrl('/search/multi', query, page);
  const response = await fetch(endpoint, { method: 'GET', headers: TMDB_CONFIG.headers });
  if (!response.ok) throw new Error('Failed to search multi');
  const data = await response.json();
  return (data.results || []).filter((r: any) => r.media_type === 'movie' || r.media_type === 'tv');
};

// Unified search dispatcher based on category (supports genres for movies/tv)
// Search person (actor/actress) and return their combined credits as TMDBItem[] (movies + tv)
// Simple pagination: we fetch all credits then slice by 20 per page.
export const searchActorCredits = async (query: string, page: number = 1): Promise<TMDBItem[]> => {
  if (!query.trim()) return [];
  try {
    const endpoint = `${TMDB_CONFIG.BASE_URL}/search/person?query=${encodeURIComponent(query.trim())}&page=1&language=pt-PT&include_adult=false`;
    const response = await fetch(endpoint, { method: 'GET', headers: TMDB_CONFIG.headers });
    if (!response.ok) throw new Error('Failed to search person');
    const data = await response.json();
    const person = (data.results || [])[0]; // pega o primeiro resultado mais relevante
    if (!person) return [];
    const creditsResp = await fetchPersonCombinedCredits(person.id);
    const cast: any[] = creditsResp.cast || [];
    // remover duplicados por media_type + id (mesmo título pode aparecer em diferentes jobs)
    const seen = new Set<string>();
    const items: TMDBItem[] = [];
    for (const c of cast) {
      if (c.media_type !== 'movie' && c.media_type !== 'tv') continue;
      const key = `${c.media_type}-${c.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({
        id: c.id,
        title: c.title,
        name: c.name,
        overview: c.overview || '',
        poster_path: c.poster_path || c.profile_path || '',
        backdrop_path: c.backdrop_path,
        vote_average: c.vote_average || 0,
        vote_count: c.vote_count || 0,
        genre_ids: c.genre_ids || [],
        release_date: c.release_date,
        first_air_date: c.first_air_date,
        media_type: c.media_type,
      });
    }
    // ordenar por relevância semelhante a trending (vote_average * vote_count)
    items.sort((a,b)=>((b.vote_average||0)*(b.vote_count||0))-((a.vote_average||0)*(a.vote_count||0)));
    const PAGE_SIZE = 20;
    const start = (page - 1) * PAGE_SIZE;
    return items.slice(start, start + PAGE_SIZE);
  } catch (e) {
    console.warn('[searchActorCredits] erro:', (e as any)?.message);
    return [];
  }
};

export const searchContent = async (
  query: string,
  category: 'all' | 'movies' | 'series',
  page: number = 1,
  genres: number[] = [],
  minVote?: number
): Promise<TMDBItem[]> => {
  const hasQuery = !!query.trim();
  // If no query but genres selected -> use discover endpoints
  if (!hasQuery && (genres.length || minVote !== undefined)) {
    if (category === 'movies') return discoverMovies(genres, page, minVote);
    if (category === 'series') return discoverTV(genres, page, minVote);
    // all -> both
    const [m, t] = await Promise.all([
      discoverMovies(genres, page, minVote),
      discoverTV(genres, page, minVote),
    ]);
    const combined = [...m, ...t];
    return combined.sort((a, b) => ((b.vote_average||0)*(b.vote_count||0)) - ((a.vote_average||0)*(a.vote_count||0)));
  }

  // With query
  switch (category) {
    case 'movies':
      return searchMovies(query, page);
    case 'series':
      return searchTV(query, page);
    default:
      return searchMulti(query, page);
  }
};

export const GENRE_IDS = {
  DRAMA: 18,
  COMEDY: 35,
  ACTION: 28,
  ROMANCE: 10749,
  CRIME: 80,
};

// Fetch movies by genre
export const fetchMoviesByGenre = async (
  genreId: number
): Promise<TMDBItem[]> => {
  try {
    const endpoint = `${TMDB_CONFIG.BASE_URL}/discover/movie?with_genres=${genreId}&sort_by=popularity.desc&page=1&language=pt-PT`;

    const response = await fetch(endpoint, {
      method: "GET",
      headers: TMDB_CONFIG.headers,
    });

    if (!response.ok) {
      // @ts-ignore
      throw new Error("Failed to fetch data", response.statusText);
    }

    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error(`Error fetching movies for genre ${genreId}:`, error);
    return [];
  }
};

// Fetch TV shows by genre
export const fetchTVByGenre = async (genreId: number): Promise<TMDBItem[]> => {
  try {
    const endpoint = `${TMDB_CONFIG.BASE_URL}/discover/tv?with_genres=${genreId}&sort_by=popularity.desc&page=1&language=pt-PT`;

    const response = await fetch(endpoint, {
      method: "GET",
      headers: TMDB_CONFIG.headers,
    });

    if (!response.ok) {
      // @ts-ignore
      throw new Error("Failed to fetch TV shows", response.statusText);
    }

    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error(`Error fetching TV shows for genre ${genreId}:`, error);
    return [];
  }
};

// Combined function to fetch both movies and TV shows, then merge and sort by popularity
export const fetchMoviesAndTVByGenre = async (
  genreId: number
): Promise<TMDBItem[]> => {
  try {
    // Fetch both movies and TV shows concurrently
    const [movies, tvShows] = await Promise.all([
      fetchMoviesByGenre(genreId),
      fetchTVByGenre(genreId),
    ]);

    // Combine both arrays
    const combined = [...movies, ...tvShows];

    // Sort by popularity (vote_average * vote_count for better ranking)
    const sorted = combined.sort((a, b) => {
      const scoreA = (a.vote_average || 0) * (a.vote_count || 0);
      const scoreB = (b.vote_average || 0) * (b.vote_count || 0);
      return scoreB - scoreA; // Descending order
    });

    // Return top 20 items
    return sorted.slice(0, 20);
  } catch (error) {
    console.error(`Error fetching movies and TV for genre ${genreId}:`, error);
    return [];
  }
};

// Updated convenience functions for each genre (now returns both movies and TV)
export const fetchDramaContent = () => fetchMoviesAndTVByGenre(GENRE_IDS.DRAMA);
export const fetchComedyContent = () =>
  fetchMoviesAndTVByGenre(GENRE_IDS.COMEDY);
export const fetchActionContent = () =>
  fetchMoviesAndTVByGenre(GENRE_IDS.ACTION);
export const fetchRomanceContent = () =>
  fetchMoviesAndTVByGenre(GENRE_IDS.ROMANCE);
export const fetchCrimeContent = () => fetchMoviesAndTVByGenre(GENRE_IDS.CRIME);

// Fetch detailed data for a movie (runtime, genres, etc.)
export const fetchMovieDetails = async (id: number) => {
  const endpoint = `${TMDB_CONFIG.BASE_URL}/movie/${id}?language=pt-PT`;
  const response = await fetch(endpoint, {
    method: "GET",
    headers: TMDB_CONFIG.headers,
  });
  if (!response.ok) throw new Error("Failed to fetch movie details");
  return response.json();
};

// Fetch detailed data for a TV show (number_of_episodes, genres, etc.)
export const fetchTvDetails = async (id: number) => {
  const endpoint = `${TMDB_CONFIG.BASE_URL}/tv/${id}?language=pt-PT`;
  const response = await fetch(endpoint, {
    method: "GET",
    headers: TMDB_CONFIG.headers,
  });
  if (!response.ok) throw new Error("Failed to fetch tv details");
  return response.json();
};

// Credits (cast) for movie
export const fetchMovieCredits = async (id: number) => {
  const endpoint = `${TMDB_CONFIG.BASE_URL}/movie/${id}/credits?language=pt-PT`;
  const response = await fetch(endpoint, {
    method: "GET",
    headers: TMDB_CONFIG.headers,
  });
  if (!response.ok) throw new Error("Failed to fetch movie credits");
  return response.json();
};

// Credits (cast) for tv show
export const fetchTvCredits = async (id: number) => {
  const endpoint = `${TMDB_CONFIG.BASE_URL}/tv/${id}/credits?language=pt-PT`;
  const response = await fetch(endpoint, {
    method: "GET",
    headers: TMDB_CONFIG.headers,
  });
  if (!response.ok) throw new Error("Failed to fetch tv credits");
  return response.json();
};

// Person details (actor)
export const fetchPersonDetails = async (
  id: number,
  language: string = "pt-PT"
) => {
  const endpoint = `${TMDB_CONFIG.BASE_URL}/person/${id}?language=${language}`;
  const response = await fetch(endpoint, {
    method: "GET",
    headers: TMDB_CONFIG.headers,
  });
  if (!response.ok) throw new Error("Failed to fetch person details");
  return response.json();
};

// Person combined credits (movies + tv)
export const fetchPersonCombinedCredits = async (id: number) => {
  const endpoint = `${TMDB_CONFIG.BASE_URL}/person/${id}/combined_credits?language=pt-PT`;
  const response = await fetch(endpoint, {
    method: "GET",
    headers: TMDB_CONFIG.headers,
  });
  if (!response.ok) throw new Error("Failed to fetch person credits");
  return response.json();
};

// Fetch movies releasing on a specific date
export const fetchMoviesByReleaseDate = async (
  date: string
): Promise<TMDBItem[]> => {
  try {
    let allResults: TMDBItem[] = [];
    let page = 1;
    let totalPages = 1;
    do {
      const endpoint = `${TMDB_CONFIG.BASE_URL}/discover/movie?primary_release_date.gte=${date}&primary_release_date.lte=${date}&sort_by=popularity.desc&page=${page}`;
      const response = await fetch(endpoint, {
        method: "GET",
        headers: TMDB_CONFIG.headers,
      });
      if (!response.ok) {
        throw new Error("Failed to fetch movies by release date");
      }
      const data = await response.json();
      allResults = allResults.concat(data.results || []);
      totalPages = data.total_pages || 1;
      page++;
    } while (page <= totalPages);
    return allResults;
  } catch (error) {
    console.error(`Error fetching movies for date ${date}:`, error);
    return [];
  }
};

// Fetch TV shows with episodes airing on a specific date
export const fetchTVByAirDate = async (date: string): Promise<TMDBItem[]> => {
  try {
    let allResults: TMDBItem[] = [];
    let page = 1;
    let totalPages = 1;
    do {
      const endpoint = `${TMDB_CONFIG.BASE_URL}/discover/tv?air_date.gte=${date}&air_date.lte=${date}&sort_by=popularity.desc&page=${page}`;
      const response = await fetch(endpoint, {
        method: "GET",
        headers: TMDB_CONFIG.headers,
      });
      if (!response.ok) {
        throw new Error("Failed to fetch TV shows by air date");
      }
      const data = await response.json();
      allResults = allResults.concat(data.results || []);
      totalPages = data.total_pages || 1;
      page++;
    } while (page <= totalPages);
    return allResults;
  } catch (error) {
    console.error(`Error fetching TV shows for date ${date}:`, error);
    return [];
  }
};

// Combined function to fetch both movies and TV shows for a specific date
export const fetchContentByDate = async (date: string): Promise<TMDBItem[]> => {
  try {
    const [movies, tvShows] = await Promise.all([
      fetchMoviesByReleaseDate(date),
      fetchTVByAirDate(date),
    ]);

    // Combine and sort by popularity
    const combined = [...movies, ...tvShows];
    const sorted = combined.sort((a, b) => {
      const scoreA = (a.vote_average || 0) * (a.vote_count || 0);
      const scoreB = (b.vote_average || 0) * (b.vote_count || 0);
      return scoreB - scoreA;
    });

    return sorted.slice(0, 10); // Limit to 10 items per day
  } catch (error) {
    console.error(`Error fetching content for date ${date}:`, error);
    return [];
  }
};

// Get content for the current week (for calendar)
export const fetchWeeklyContent = async (): Promise<
  Record<string, TMDBItem[]>
> => {
  const today = new Date();
  const weekData: Record<string, TMDBItem[]> = {};

  // Fetch content for today and next 7 days
  for (let i = 0; i < 8; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dateString = date.toISOString().split("T")[0]; // YYYY-MM-DD format
    const dayKey = date.getDate().toString();

    try {
      // Fetch full (un-truncated) list so counts in calendar reflect real total
      const [movies, tvShows] = await Promise.all([
        fetchMoviesByReleaseDate(dateString),
        fetchTVByAirDate(dateString),
      ]);
      const combined = [...movies, ...tvShows];
      const sorted = combined.sort((a, b) => {
        const scoreA = (a.vote_average || 0) * (a.vote_count || 0);
        const scoreB = (b.vote_average || 0) * (b.vote_count || 0);
        return scoreB - scoreA;
      });
      weekData[dayKey] = sorted; // no slice here
    } catch (error) {
      console.error(`Error fetching content for day ${dayKey}:`, error);
      weekData[dayKey] = [];
    }
  }

  return weekData;
};

// Get content for the current month and next month (for full calendar dots)
export const fetchMonthlyContent = async (): Promise<
  Record<string, TMDBItem[]>
> => {
  const today = new Date();
  const monthData: Record<string, TMDBItem[]> = {};

  // Get current month and next month
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  // Fetch for current month (from today onwards)
  const daysInCurrentMonth = new Date(
    currentYear,
    currentMonth + 1,
    0
  ).getDate();
  const promises: Promise<void>[] = [];

  for (let day = today.getDate(); day <= daysInCurrentMonth; day++) {
    const date = new Date(currentYear, currentMonth, day);
    const dateString = date.toISOString().split("T")[0];
    const dayKey = `${currentYear}-${(currentMonth + 1).toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;

    promises.push(
      fetchContentByDate(dateString)
        .then((content) => {
          monthData[dayKey] = content;
        })
        .catch((error) => {
          console.error(`Error fetching content for day ${dayKey}:`, error);
          monthData[dayKey] = [];
        })
    );
  }

  // Fetch for next month
  const nextMonth = currentMonth + 1;
  const nextYear = nextMonth > 11 ? currentYear + 1 : currentYear;
  const adjustedNextMonth = nextMonth > 11 ? 0 : nextMonth;
  const daysInNextMonth = new Date(
    nextYear,
    adjustedNextMonth + 1,
    0
  ).getDate();

  for (let day = 1; day <= daysInNextMonth; day++) {
    const date = new Date(nextYear, adjustedNextMonth, day);
    const dateString = date.toISOString().split("T")[0];
    const dayKey = `${nextYear}-${(adjustedNextMonth + 1).toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;

    promises.push(
      fetchContentByDate(dateString)
        .then((content) => {
          monthData[dayKey] = content;
        })
        .catch((error) => {
          console.error(`Error fetching content for day ${dayKey}:`, error);
          monthData[dayKey] = [];
        })
    );
  }

  // Wait for all API calls to complete
  await Promise.all(promises);
  return monthData;
};

// Convert TMDBItem to Episode format for calendar
export const tmdbToEpisode = (
  item: TMDBItem,
  releaseDate?: string
): Episode => ({
  id: String(item.id),
  title: item.title || item.name || "Unknown Title",
  description: item.overview || "No description available",
  genres: [], // You can map genre_ids to genre names if needed
  rating: item.vote_average || 0,
  image: item.poster_path
    ? { uri: `https://image.tmdb.org/t/p/w500${item.poster_path}` }
    : {}, // fallback image
  favorite: false,
  tmdbItem: item, // Preserve original TMDB data
});

// Use the monthly content for full calendar coverage
export const fetchCalendarData = async (): Promise<
  {
    date: string;
    calendarDate: string;
    items: Episode[];
  }[]
> => {
  try {
    const monthlyContent = await fetchMonthlyContent();
    const calendarSections: {
      date: string;
      calendarDate: string;
      items: Episode[];
    }[] = [];

    // Convert each day's content to calendar format
    for (const [dateKey, items] of Object.entries(monthlyContent)) {
      if (items.length > 0) {
        // dateKey is already in YYYY-MM-DD format
        const targetDate = new Date(dateKey + "T00:00:00.000Z");
        const formattedDate = targetDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });

        calendarSections.push({
          date: formattedDate,
          calendarDate: dateKey,
          items: items.map((item) => tmdbToEpisode(item, dateKey)),
        });
      }
    }

    return calendarSections;
  } catch (error) {
    console.error("Error fetching calendar data:", error);
    return [];
  }
};

// ===================== Reviews ===================== //
export interface TMDBReview {
  id: string;
  author: string;
  author_details: {
    name: string;
    username: string;
    avatar_path: string | null;
    rating: number | null;
  };
  content: string;
  created_at: string;
  updated_at?: string;
  url: string;
}

export interface TMDBReviewPage {
  id: number;
  page: number;
  results: TMDBReview[];
  total_pages: number;
  total_results: number;
}

export const fetchMovieReviews = async (movieId: number, page: number = 1, language: string = 'pt-PT'): Promise<TMDBReviewPage> => {
  const langParam = language ? `language=${language}&` : '';
  const endpoint = `${TMDB_CONFIG.BASE_URL}/movie/${movieId}/reviews?${langParam}page=${page}`;
  const response = await fetch(endpoint, { method: 'GET', headers: TMDB_CONFIG.headers });
  if (!response.ok) throw new Error('Failed to fetch movie reviews');
  return response.json();
};

export const fetchTVReviews = async (tvId: number, page: number = 1, language: string = 'pt-PT'): Promise<TMDBReviewPage> => {
  const langParam = language ? `language=${language}&` : '';
  const endpoint = `${TMDB_CONFIG.BASE_URL}/tv/${tvId}/reviews?${langParam}page=${page}`;
  const response = await fetch(endpoint, { method: 'GET', headers: TMDB_CONFIG.headers });
  if (!response.ok) throw new Error('Failed to fetch tv reviews');
  return response.json();
};

export const fetchReviews = (mediaType: 'movie' | 'tv', id: number, page: number = 1, language: string = 'pt-PT') =>
  mediaType === 'movie' ? fetchMovieReviews(id, page, language) : fetchTVReviews(id, page, language);

/** Fallback: se poucas reviews na língua primária, tenta inglês e junta (removendo duplicados). Apenas pensado para page=1. */
export const fetchReviewsWithFallback = async (
  mediaType: 'movie' | 'tv',
  id: number,
  page: number = 1,
  primaryLang: string = 'pt-PT',
  fallbackLang: string = 'en-US',
  minPrimary: number = 2
) => {
  const first = await fetchReviews(mediaType, id, page, primaryLang);
  if (page !== 1 || first.results.length >= minPrimary || primaryLang === fallbackLang) {
    return first;
  }
  try {
    // Primeiro tenta fallback language
    const second = await fetchReviews(mediaType, id, 1, fallbackLang);
    let merged = [...first.results];
    const existing = new Set(merged.map(r => r.id));
    for (const r of second.results) if (!existing.has(r.id)) merged.push(r);

    // Se ainda tem menos que minPrimary, busca versão "sem idioma" (todas as línguas)
    if (merged.length < minPrimary) {
      const allLang = await fetchReviews(mediaType, id, 1, ''); // sem filtro language
      for (const r of allLang.results) if (!existing.has(r.id)) { existing.add(r.id); merged.push(r); }
      // Usa o maior total_pages entre as respostas
      const totalPages = Math.max(first.total_pages || 1, second.total_pages || 1, allLang.total_pages || 1);
      return { ...first, results: merged, total_results: merged.length, total_pages: totalPages } as TMDBReviewPage;
    }

    const totalPages = Math.max(first.total_pages || 1, second.total_pages || 1);
    return { ...first, results: merged, total_results: merged.length, total_pages: totalPages } as TMDBReviewPage;
  } catch {
    return first;
  }
};

// =============================
// Rating (Guest Session / User)
// =============================

export interface TMDBRateResponse { status_code: number; status_message: string; }

export const createGuestSession = async (): Promise<string> => {
  // Nota: guest_session creation exige API key query param (não Bearer). Usamos apiKey se existir env.
  const apiKey = process.env.EXPO_PUBLIC_TMDB_API_KEY || process.env.TMDB_API_KEY;
  if (!apiKey) throw new Error('TMDB api key ausente para guest session');
  const url = `${TMDB_CONFIG.BASE_URL}/authentication/guest_session/new?api_key=${apiKey}`;
  const r = await fetch(url, { method: 'GET' });
  if (!r.ok) throw new Error('Falha ao criar guest session');
  const data = await r.json();
  if (!data?.guest_session_id) throw new Error('guest_session_id não recebido');
  return data.guest_session_id as string;
};

export const rateTitle = async (
  mediaType: 'movie' | 'tv',
  id: number,
  value: number,
  guestSessionId: string
): Promise<TMDBRateResponse> => {
  const apiKey = process.env.EXPO_PUBLIC_TMDB_API_KEY || process.env.TMDB_API_KEY;
  if (!apiKey) throw new Error('TMDB api key ausente');
  const url = `${TMDB_CONFIG.BASE_URL}/${mediaType}/${id}/rating?guest_session_id=${guestSessionId}&api_key=${apiKey}`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json;charset=utf-8', ...TMDB_CONFIG.headers },
    body: JSON.stringify({ value }),
  });
  if (!r.ok) throw new Error('Falha ao enviar rating');
  return r.json();
};

export const deleteRating = async (
  mediaType: 'movie' | 'tv',
  id: number,
  guestSessionId: string
): Promise<TMDBRateResponse> => {
  const apiKey = process.env.EXPO_PUBLIC_TMDB_API_KEY || process.env.TMDB_API_KEY;
  if (!apiKey) throw new Error('TMDB api key ausente');
  const url = `${TMDB_CONFIG.BASE_URL}/${mediaType}/${id}/rating?guest_session_id=${guestSessionId}&api_key=${apiKey}`;
  const r = await fetch(url, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json;charset=utf-8', ...TMDB_CONFIG.headers },
  });
  if (!r.ok) throw new Error('Falha ao remover rating');
  return r.json();
};

