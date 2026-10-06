// TMDB API response types
export type TMDBItem = {
  id: number;
  title?: string; // for movies
  name?: string; // for TV shows
  overview: string;
  poster_path: string;
  backdrop_path?: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  release_date?: string; // for movies
  first_air_date?: string; // for TV shows
  media_type?: "movie" | "tv";
};

export type TMDBResponse = {
  page: number;
  results: TMDBItem[];
  total_pages: number;
  total_results: number;
};

export type TMDBActor = {
  id: string;
  name: string;
  actor: string;
  image: any;
};
