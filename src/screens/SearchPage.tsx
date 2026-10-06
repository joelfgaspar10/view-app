import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Animated,
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import { Ionicons } from "@expo/vector-icons";
import TitleCard, { Title } from "../components/TitleCard";
import { TabScreenProps } from "../types/navigation";
import { useTheme } from "../contexts/ThemeContext";
import { searchContent, fetchTrendingMoviesWeek, fetchTrendingTvWeek, searchActorCredits } from "../services/api";
import FloatingChatButton from "../components/FloatingChatButton";
import { TMDBItem } from "../types/tmdb";
import { useFavorites } from "../contexts/FavoritesContext";
import { useWatched } from "../contexts/WatchedContext";
import { useWatchlist } from "../contexts/WatchlistContext";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { StackParamList } from "../types/navigation";
import SkeletonTitleCard from "../components/SkeletonTitleCard";

// Mapa completo de géneros TMDB (filmes + TV) traduzido para PT
const GENRE_MAP: { [key: number]: string } = {
  28: "Ação",
  12: "Aventura",
  16: "Animação",
  35: "Comédia",
  80: "Crime",
  99: "Documentário",
  18: "Drama",
  10751: "Família",
  14: "Fantasia",
  36: "História",
  27: "Terror",
  10402: "Música",
  9648: "Mistério",
  10749: "Romance",
  878: "Ficção Científica",
  10770: "Filme TV",
  53: "Suspense",
  10752: "Guerra",
  37: "Faroeste",
  10759: "Ação & Aventura",
  10762: "Infantil",
  10763: "Notícias",
  10764: "Reality",
  10765: "Ficção & Fantasia",
  10766: "Novela",
  10767: "Talk Show",
  10768: "Guerra & Política",
};

// Local fallback image id
const FALLBACK_POSTER = require("../assets/tmp/lucifer.png");

export default function SearchPage({}: TabScreenProps<"SearchPage">) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TMDBItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<
    "all" | "movies" | "series"
  >("all");
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const { isDark } = useTheme();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { isWatched, toggleWatched } = useWatched();
  const { isInWatchlist, toggleWatchlist } = useWatchlist();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [minVote, setMinVote] = useState<number | undefined>(undefined); // nota mínima TMDB
  const navigation = useNavigation<NativeStackNavigationProp<StackParamList>>();
  const pageRef = useRef(1);
  const hasMoreRef = useRef(true);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const trendingLoadedRef = useRef(false);

  // Carrega trending conforme categoria
  const loadTrending = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      let data: TMDBItem[] = [];
      if (selectedCategory === 'movies') {
        data = await fetchTrendingMoviesWeek();
      } else if (selectedCategory === 'series') {
        data = await fetchTrendingTvWeek();
      } else {
        const [m, t] = await Promise.all([
          fetchTrendingMoviesWeek(),
          fetchTrendingTvWeek(),
        ]);
        data = [...m, ...t].sort((a,b)=>((b.vote_average||0)*(b.vote_count||0))-((a.vote_average||0)*(a.vote_count||0)));
      }
      setSearchResults(data);
      trendingLoadedRef.current = true;
      pageRef.current = 2;
      hasMoreRef.current = true;
    } catch (e: any) {
      setError(e.message || 'Erro ao carregar trending');
    } finally {
      setLoading(false);
    }
  }, [selectedCategory]);

  // Transform TMDBItem into TitleCard friendly object
  const toTitle = useCallback(
    (item: TMDBItem): Title => ({
      id: String(item.id),
      title: item.title || item.name || "Sem título",
      overview: item.overview || "",
      poster_path: item.poster_path || FALLBACK_POSTER,
      genre_ids: (item.genre_ids || []).map(String),
      genres: getGenreNames(item.genre_ids || []),
      vote_average: item.vote_average || 0,
      favorite: isFavorite(String(item.id)),
    }),
    [isFavorite]
  );

  // Animation for filter overlay
  const filterAnimation = useState(() => new Animated.Value(0))[0];

  // Convert genre IDs to genre names
  const getGenreNames = (genreIds: number[]): string[] => {
  return genreIds.map((id) => GENRE_MAP[id] || "Desconhecido").filter(Boolean);
  };

  // Execute search with debounce
  const performSearch = useCallback(
    async (reset: boolean = true) => {
      const q = searchQuery.trim();
      if (reset) {
        pageRef.current = 1;
        hasMoreRef.current = true;
      }
  const searchingByFiltersOnly = !q && (selectedGenres.length > 0 || minVote !== undefined);
  if (!q && !searchingByFiltersOnly) {
        // Mantém resultados (ex: trending) e não faz nada
        return;
      }
      trendingLoadedRef.current = false; // vai iniciar nova pesquisa baseada em query ou géneros
      if (!hasMoreRef.current && !reset) return; // no more pages
      try {
        setLoading(true);
        setError(null);
  let results = await searchContent(q, selectedCategory, pageRef.current, selectedGenres, minVote);
        // Actor automatic search (only when a query exists and first page or loading more)
        if (q) {
          try {
            const actorResults = await searchActorCredits(q, pageRef.current);
            if (actorResults.length) {
              const existingIds = new Set(results.map(r => `${r.media_type||''}-${r.id}`));
              for (const ar of actorResults) {
                const key = `${ar.media_type||''}-${ar.id}`;
                if (!existingIds.has(key)) {
                  existingIds.add(key);
                  results.push(ar);
                }
              }
              // Re-sort combined list by relevance
              results.sort((a,b)=>((b.vote_average||0)*(b.vote_count||0))-((a.vote_average||0)*(a.vote_count||0)));
            }
          } catch {}
        }
        // If category = all we still need client-side filter for genres (multi não aceita with_genres)
        let finalResults = results;
        if (q) {
          // Aplicar filtros client-side quando há query (search endpoints não suportam diretamente minVote + with_genres simultâneo em multi)
          if (selectedGenres.length && selectedCategory === 'all') {
            finalResults = finalResults.filter(r => r.genre_ids && r.genre_ids.some(g => selectedGenres.includes(g)));
          }
          if (minVote !== undefined) {
            finalResults = finalResults.filter(r => (r.vote_average || 0) > minVote);
          }
        }
        setSearchResults(prev => (reset ? finalResults : [...prev, ...finalResults]));
        if (results.length === 0) {
          hasMoreRef.current = false;
        } else {
          pageRef.current += 1;
        }
      } catch (e: any) {
        setError(e.message || 'Erro na pesquisa');
      } finally {
        setLoading(false);
      }
    },
  [searchQuery, selectedCategory, selectedGenres, minVote]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      performSearch(true);
    }, 450);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [performSearch]);

  // Carrega trending inicial ao montar se não há query nem géneros
  useEffect(() => {
    if (!searchQuery.trim() && selectedGenres.length === 0 && !trendingLoadedRef.current) {
      loadTrending();
    }
  }, [loadTrending, searchQuery, selectedGenres]);

  // Botão Pesquisar: se não há query nem géneros -> trending; caso contrário pesquisa normal
  const applyFilters = () => {
    const q = searchQuery.trim();
    const hasGenres = selectedGenres.length > 0;
    const hasRating = minVote !== undefined;
    if (!q && !hasGenres && !hasRating) {
      loadTrending();
      toggleFilters();
      return;
    }
    performSearch(true);
    toggleFilters();
  };

  const toggleFilters = () => {
    if (showFilters) {
      // Closing filters
      Animated.timing(filterAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setShowFilters(false);
      });
    } else {
      // Opening filters
      setShowFilters(true);
      Animated.timing(filterAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };

  const toggleGenre = (genreId: number) => {
    setSelectedGenres((prev) => {
      const next = prev.includes(genreId)
        ? prev.filter((id) => id !== genreId)
        : [...prev, genreId];
      // dispara uma nova pesquisa (debounce já trata)
      return next;
    });
  };

  const clearFilters = () => {
    setSelectedCategory("all");
    setSelectedGenres([]);
  setMinVote(undefined);
  };

  return (
    <View className="flex-1 bg-background dark:bg-background-dark pt-12">
      {/* Header centrado unificado */}
      <View className="px-4 pb-3 items-center justify-center">
        <Text className="text-text dark:text-text-dark text-2xl font-semibold" numberOfLines={1}>Pesquisar</Text>

        {/* Search Bar */}
        <View className="flex-row items-center bg-card dark:bg-card-dark rounded-xl px-4 py-2 mt-4 mb-3 w-full">
          <Icon name="search" size={20} color="#D9D9D9" />
          <TextInput
            className="flex-1 text-text dark:text-text-dark ml-3 text-base"
            placeholder="Pesquisar filmes, séries ou atores..."
            placeholderTextColor="#D9D9D9"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity onPress={toggleFilters} className="ml-2">
            <Icon name="sliders-h" size={20} color="#d9d9d9" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Results */}
      <ScrollView className="flex-1 px-3">
        {/* {searchQuery === "" && (
          <Text className="text-white text-xl font-semibold mb-4 px-3">
            Recommended
          </Text>
        )} */}

        {loading && searchResults.length === 0 && (
          <>
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonTitleCard key={i} />
            ))}
          </>
        )}
        {error && !loading && (
          <Text className="text-red-400 text-center mb-4">{error}</Text>
        )}
        {/* Cabeçalho Trendings quando sem query nem géneros e carregou trending */}
        {searchResults.length > 0 && !error && !searchQuery.trim() && selectedGenres.length === 0 && (
          <View className="flex-row items-center mb-4 px-1">
            <Ionicons name="trending-up" size={22} color={isDark ? '#fff' : '#000'} style={{ marginRight: 8 }} />
            <Text className="text-text dark:text-text-dark text-lg font-bold tracking-tight">Trending</Text>
          </View>
        )}
        {searchResults.length > 0 && !error && (
          <>
            {searchResults.map(item => {
              const id = String(item.id);
              const open = openMenuId === id;
              const titleObj = toTitle(item);
              return (
                <View key={id} className="relative">
                  <TitleCard
                    item={titleObj}
                    isFavorite={isFavorite(id)}
                    onToggleFavorite={() => toggleFavorite(titleObj)}
                    onPress={() => navigation.navigate('MoviePage', { show: { ...item, media_type: item.media_type ?? (item.title ? "movie" : "tv") } })}
                  />
                  {/* Botão '+' posicionado canto superior direito do card */}
                  <TouchableOpacity
                    onPress={() => setOpenMenuId(open ? null : id)}
                    className="absolute top-2 right-2 w-9 h-9 rounded-full bg-black/60 items-center justify-center"
                    activeOpacity={0.8}
                  >
                    <Text className="text-white text-xl font-bold">+</Text>
                  </TouchableOpacity>
                  {open && (
                    <View className="absolute top-12 right-2 bg-black/80 rounded-lg py-2 w-36 z-10">
                      {/* Favorito */}
                      <TouchableOpacity
                        className="px-3 py-2 flex-row items-center"
                        onPress={() => { setOpenMenuId(null); toggleFavorite(titleObj); }}
                      >
                        <Ionicons name={isFavorite(id) ? 'heart' : 'heart-outline'} size={16} color={isFavorite(id) ? '#e91e63' : '#fff'} />
                        <Text className="text-white text-xs ml-2">Favorito</Text>
                      </TouchableOpacity>
                      <View className="h-px bg-white/20 mx-2 my-1" />
                      {/* Assistido */}
                      <TouchableOpacity
                        className="px-3 py-2 flex-row items-center"
                        onPress={() => { setOpenMenuId(null); toggleWatched({ id, title: titleObj.title, overview: titleObj.overview, poster_path: titleObj.poster_path, genre_ids: titleObj.genre_ids, genres: titleObj.genres, vote_average: titleObj.vote_average, favorite: false }); }}
                      >
                        <Ionicons name={isWatched(id) ? 'eye' : 'eye-outline'} size={16} color={isWatched(id) ? '#4ade80' : '#fff'} />
                        <Text className="text-white text-xs ml-2">Assistido</Text>
                      </TouchableOpacity>
                      <View className="h-px bg-white/20 mx-2 my-1" />
                      {/* Ver mais tarde */}
                      <TouchableOpacity
                        className="px-3 py-2 flex-row items-center"
                        onPress={() => { setOpenMenuId(null); toggleWatchlist({ id, title: titleObj.title, overview: titleObj.overview, poster_path: titleObj.poster_path, genre_ids: titleObj.genre_ids, genres: titleObj.genres, vote_average: titleObj.vote_average, favorite: false }); }}
                      >
                        <Ionicons name={isInWatchlist(id) ? 'time' : 'time-outline'} size={16} color={isInWatchlist(id) ? '#2563EB' : '#fff'} />
                        <Text className="text-white text-xs ml-2">Mais tarde</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  {(isFavorite(id) || isWatched(id) || isInWatchlist(id)) && (
                    <View pointerEvents="none" className="absolute left-2 bottom-6 flex-row items-center">
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
                </View>
              );
            })}
            {hasMoreRef.current && !loading && (
              <TouchableOpacity
                className="bg-blue-600 rounded-full py-3 mb-10 mx-4"
                onPress={() => performSearch(false)}
              >
                <Text className="text-white text-center font-semibold">Carregar mais</Text>
              </TouchableOpacity>
            )}
          </>
        )}
        {!loading && !error && searchResults.length === 0 && searchQuery.trim() !== '' && (
          <View className="flex-1 justify-center items-center py-20">
            <Icon name="search" size={48} color="#9CA3AF" />
            <Text className="text-gray-400 text-lg text-center mt-4">Sem resultados</Text>
            <Text className="text-gray-500 text-sm text-center mt-2">Tente outras palavras-chave</Text>
          </View>
        )}
      </ScrollView>

      {/* Filter Overlay */}
      {showFilters && (
        <View className="absolute inset-0">
          {/* Backdrop - tap to close */}
          <TouchableOpacity
            className="absolute inset-0 bg-black"
            onPress={toggleFilters}
            activeOpacity={1}
          />

          {/* Filter Content */}
          <Animated.View
            className="absolute inset-0 bg-background dark:bg-background-dark"
            style={{
              opacity: filterAnimation,
              transform: [
                {
                  translateY: filterAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0],
                  }),
                },
              ],
            }}
          >
            <View className="pt-12 px-6 flex-1">
              {/* Filter Header */}
              <View className="flex-row justify-between items-center mb-6">
                <Text className="text-text dark:text-text-dark text-2xl font-bold">
                  Filtros
                </Text>
                <TouchableOpacity onPress={toggleFilters}>
                  <Icon
                    name="times"
                    size={24}
                    color={isDark ? "#fff" : "#000"}
                  />
                </TouchableOpacity>
              </View>

              <ScrollView className="flex-1">
                {/* Categories */}
                <Text className="text-text dark:text-text-dark text-lg font-semibold mb-3">
                  Categorias
                </Text>
                <View className="flex-row mb-6">
                  {[
                    { key: "all", label: "Todos" },
                    { key: "movies", label: "Filmes" },
                    { key: "series", label: "Séries" },
                  ].map((category) => (
                    <TouchableOpacity
                      key={category.key}
                      className={`mr-3 px-6 py-3 rounded-full ${
                        selectedCategory === category.key
                          ? "py-2 rounded-full bg-button dark:bg-blueButton-dark"
                          : "py-2 rounded-full bg-background border border-gray-300 dark:bg-card-dark dark:border-transparent"
                      }`}
                      onPress={() => {
                        setSelectedCategory(category.key as any);
                        if (!searchQuery.trim() && selectedGenres.length === 0) {
                          // Em modo trending, recarregar trending para nova categoria
                          loadTrending();
                        } else {
                          // refresh pesquisa normal
                          setTimeout(() => performSearch(true), 0);
                        }
                      }}
                    >
                      <Text
                        className={`${
                          selectedCategory === category.key
                            ? "text-text dark:text-text-dark font-bold"
                            : "text-text dark:text-text-dark"
                        }`}
                      >
                        {category.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Genres */}
                {
                  <>
                    <Text className="text-text dark:text-text-dark text-lg font-semibold mb-3">
                      Géneros
                    </Text>
                    <View className="flex-row flex-wrap mb-8">
                      {Object.entries(GENRE_MAP)
                        .sort(([, a], [, b]) => a.localeCompare(b))
                        .map(([id, name]) => (
                          <TouchableOpacity
                            key={id}
                            className={`mr-3 mb-3 px-4 py-2 rounded-full ${
                              selectedGenres.includes(Number(id))
                                ? "py-2 rounded-full bg-button dark:bg-blueButton-dark"
                                : "py-2 rounded-full bg-background border border-gray-300 dark:bg-card-dark dark:border-transparent"
                            }`}
                            onPress={() => toggleGenre(Number(id))}
                          >
                            <Text
                              className={`text-sm ${
                                selectedGenres.includes(Number(id))
                                  ? "text-text dark:text-text-dark font-bold"
                                  : "text-text dark:text-text-dark"
                              }`}
                            >
                              {name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                    </View>
                    {/* Rating Filter */}
                    <Text className="text-text dark:text-text-dark text-lg font-semibold mb-3 mt-2">
                      Classificação
                    </Text>
                    <View className="flex-row flex-wrap mb-8">
                      {[undefined, 5, 6, 7, 8, 9].map(val => (
                        <TouchableOpacity
                          key={String(val)}
                          className={`mr-3 mb-3 px-4 py-2 rounded-full ${
                            (val===undefined && minVote===undefined) || val===minVote
                              ? "py-2 rounded-full bg-button dark:bg-blueButton-dark"
                              : "py-2 rounded-full bg-background border border-gray-300 dark:bg-card-dark dark:border-transparent"
                          }`}
                          onPress={() => setMinVote(val as any)}
                        >
                          <Text className={`text-sm ${(val===undefined && minVote===undefined) || val===minVote ? 'text-text dark:text-text-dark font-bold' : 'text-text dark:text-text-dark'}`}>
                            {val===undefined ? 'Qualquer' : `${val}+`}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                }
              </ScrollView>

              {/* Filter Actions */}
              <View className="pb-8">
                <TouchableOpacity
                  className="bg-blueButton dark:bg-blueButton-dark rounded-xl py-4 mb-3"
                  onPress={applyFilters}
                >
                  <Text className="text-text dark:text-text-dark text-center font-bold text-lg">
                    Pesquisar
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="bg-card dark:bg-card-dark rounded-xl py-4"
                  onPress={clearFilters}
                >
                  <Text className="text-gray-800 dark:text-gray-300 text-center font-bold">
                    Limpar filtros
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </View>
      )}
  {/* Floating Chat Button (reusable component) */}
  <FloatingChatButton />
    </View>
  );
}
