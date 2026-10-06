import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackScreenProps } from '../types/navigation';
import { TMDBItem } from '../types/tmdb';
import { GENRE_IDS, TMDB_CONFIG } from '../services/api';
import { useFavorites } from '../contexts/FavoritesContext';
import { useWatched } from '../contexts/WatchedContext';
import { useWatchlist } from '../contexts/WatchlistContext';
import { useTheme } from '../contexts/ThemeContext';
import type { Title } from '../components/TitleCard';

// Map displayed (Portuguese) genre names to internal IDs
const GENRE_NAME_MAP: Record<string, number> = {
  'Drama': GENRE_IDS.DRAMA,
  'Comédia': GENRE_IDS.COMEDY,
  'Ação': GENRE_IDS.ACTION,
  'Romance': GENRE_IDS.ROMANCE,
  'Crime': GENRE_IDS.CRIME,
};

export default function GenreScreen({ route, navigation }: StackScreenProps<'GenreScreen'>) {
  const { genre } = route.params;
  const genreId = GENRE_NAME_MAP[genre];
  const [shows, setShows] = useState<TMDBItem[]>([]);
  const [page, setPage] = useState(1); // page index we will request next
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const { toggleFavorite: toggleGlobalFavorite, isFavorite } = useFavorites();
  const { isWatched, toggleWatched } = useWatched();
  const { isInWatchlist, toggleWatchlist } = useWatchlist();
  const { isDark } = useTheme();
  const heartColor = isDark ? '#e91e63' : '#ff1744';
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const toTitle = (show: TMDBItem): Title => ({
    id: String(show.id),
    title: show.title || show.name || '',
    overview: show.overview || '',
    poster_path: show.poster_path || '',
    genre_ids: (show.genre_ids || []).map(String),
    genres: [],
    vote_average: show.vote_average || 0,
    favorite: true,
  });

  const fetchPage = useCallback(async (p: number) => {
    if (!genreId) return;
    setLoading(true);
    setError(null);
    try {
      // Fetch movies and tv for this genre & page concurrently
      const movieEndpoint = `${TMDB_CONFIG.BASE_URL}/discover/movie?with_genres=${genreId}&sort_by=popularity.desc&language=pt-PT&page=${p}`;
      const tvEndpoint = `${TMDB_CONFIG.BASE_URL}/discover/tv?with_genres=${genreId}&sort_by=popularity.desc&language=pt-PT&page=${p}`;
      const [mRes, tRes] = await Promise.all([
        fetch(movieEndpoint, { headers: TMDB_CONFIG.headers }),
        fetch(tvEndpoint, { headers: TMDB_CONFIG.headers })
      ]);
      if (!mRes.ok || !tRes.ok) throw new Error('HTTP');
      const mJson = await mRes.json();
      const tJson = await tRes.json();
      const newItems: TMDBItem[] = [...(mJson.results||[]), ...(tJson.results||[])];
      // Score sort inside this page batch only
      newItems.sort((a,b)=>((b.vote_average||0)*(b.vote_count||0)) - ((a.vote_average||0)*(a.vote_count||0)));
      // deduplicate global
      setShows(prev => {
        const ids = new Set(prev.map(i=>i.id));
        const filtered = newItems.filter(i=>!ids.has(i.id));
        return [...prev, ...filtered];
      });
      const totalPagesMovies = mJson.total_pages || p;
      const totalPagesTv = tJson.total_pages || p;
      const reachedEnd = p >= totalPagesMovies && p >= totalPagesTv || newItems.length === 0;
      if (reachedEnd) setHasMore(false); else setPage(p+1);
    } catch(e:any) {
      setError(e.message || 'Erro ao carregar');
      setHasMore(false);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [genreId]);

  useEffect(()=>{
    setShows([]); setPage(1); setHasMore(true); setInitialLoading(true);
    if (genreId) fetchPage(1);
  }, [genreId, fetchPage]);

  const loadMore = () => {
    if (loading || !hasMore || initialLoading) return;
    fetchPage(page);
  };

  return (
    <View className="flex-1 bg-background dark:bg-background-dark pt-12">
      <View className="px-4 mb-4 flex-row items-center justify-center relative">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="absolute left-2 p-2 rounded-full bg-white/10"
          accessibilityLabel="Voltar"
        >
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text className="text-text dark:text-text-dark text-2xl font-bold">{genre}</Text>
      </View>
      {initialLoading && <ActivityIndicator style={{ marginTop: 20 }} />}
      {error && !shows.length && <Text className="text-red-400 px-4">{error}</Text>}
      {!initialLoading && !error && !shows.length && (
        <Text className="text-text dark:text-text-dark px-4 mt-4">Sem resultados.</Text>
      )}
      <FlatList
        data={shows}
        keyExtractor={(item) => String(item.id)}
        numColumns={3}
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 40, paddingTop: 4 }}
        columnWrapperStyle={{ gap: 12 }}
        onEndReachedThreshold={0.5}
        onEndReached={loadMore}
        ListFooterComponent={()=> (
          initialLoading ? null : loading ? <ActivityIndicator style={{ marginVertical: 16 }} /> : !hasMore ? <Text className="text-center text-xs text-text dark:text-text-dark my-4 w-full">Fim dos resultados</Text> : null
        )}
        renderItem={({ item }) => {
          const imgUri = item.poster_path
            ? `https://image.tmdb.org/t/p/w342${item.poster_path}`
            : undefined;
          const id = String(item.id);
          const open = openMenuId === id;
          return (
            <View style={{ flex: 1, aspectRatio: 2/3 }} className="mb-4 relative">
              <TouchableOpacity
                className="flex-1 rounded-lg overflow-hidden bg-white/5"
                onPress={() => navigation.navigate('MoviePage', { show: { ...item, media_type: item.media_type ?? (item.title ? "movie" : "tv") } })}
                activeOpacity={0.85}
              >
                {imgUri ? (
                  <Image
                    source={{ uri: imgUri }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                ) : (
                  <View className="flex-1 items-center justify-center">
                    <Text className="text-xs text-center text-text dark:text-text-dark px-1">Sem imagem</Text>
                  </View>
                )}
                {(isFavorite(id) || isWatched(id) || isInWatchlist(id)) && (
                  <View className="absolute left-1.5 bottom-1.5 flex-row items-center">
                    {isFavorite(id) && (
                      <View className="bg-red-600/85 px-2 py-0.5 rounded-md flex-row items-center">
                        <Ionicons name="heart" size={12} color="#fff" />
                      </View>
                    )}
                    {isWatched(id) && (
                      <View className={`bg-green-600/85 px-2 py-0.5 rounded-md flex-row items-center ${isFavorite(id)?'ml-1.5':''}`}> 
                        <Ionicons name="eye" size={12} color="#fff" />
                      </View>
                    )}
                    {isInWatchlist(id) && (
                      <View className={`bg-blue-600/85 px-2 py-0.5 rounded-md flex-row items-center ${(isFavorite(id)||isWatched(id))?'ml-1.5':''}`}> 
                        <Ionicons name="time" size={12} color="#fff" />
                      </View>
                    )}
                  </View>
                )}
              </TouchableOpacity>
              {/* Botão '+' */}
              <TouchableOpacity
                onPress={() => setOpenMenuId(open ? null : id)}
                className="absolute right-2 top-2 w-8 h-8 rounded-full bg-black/60 items-center justify-center"
                activeOpacity={0.8}
              >
                <Text className="text-white text-lg font-bold">+</Text>
              </TouchableOpacity>
              {open && (
                <View className="absolute right-2 top-12 bg-black/80 rounded-lg py-2 w-36 z-10">
                  {/* Favorito */}
                  <TouchableOpacity
                    className="px-3 py-2 flex-row items-center"
                    onPress={() => { setOpenMenuId(null); toggleGlobalFavorite(toTitle(item)); }}
                  >
                    <Ionicons
                      name={isFavorite(id) ? 'heart' : 'heart-outline'}
                      size={16}
                      color={isFavorite(id) ? heartColor : '#fff'}
                    />
                    <Text className="text-white text-xs ml-2">Favorito</Text>
                  </TouchableOpacity>
                  <View className="h-px bg-white/20 mx-2 my-1" />
                  {/* Assistido */}
                  <TouchableOpacity
                    className="px-3 py-2 flex-row items-center"
                    onPress={() => { setOpenMenuId(null); toggleWatched(toTitle(item)); }}
                  >
                    <Ionicons
                      name={isWatched(id) ? 'eye' : 'eye-outline'}
                      size={16}
                      color={isWatched(id) ? '#4ade80' : '#fff'}
                    />
                    <Text className="text-white text-xs ml-2">Assistido</Text>
                  </TouchableOpacity>
                  <View className="h-px bg-white/20 mx-2 my-1" />
                  {/* Ver mais tarde */}
                  <TouchableOpacity
                    className="px-3 py-2 flex-row items-center"
                    onPress={() => { setOpenMenuId(null); toggleWatchlist(toTitle(item)); }}
                  >
                    <Ionicons
                      name={isInWatchlist(id) ? 'time' : 'time-outline'}
                      size={16}
                      color={isInWatchlist(id) ? '#2563EB' : '#fff'}
                    />
                    <Text className="text-white text-xs ml-2">Mais tarde</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}
