import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StackScreenProps } from "../types/navigation";
import { TMDBItem } from "../types/tmdb";
import { TMDB_CONFIG } from "../services/api";
import { useFavorites } from "../contexts/FavoritesContext";
import { useWatched } from "../contexts/WatchedContext";
import { useTheme } from "../contexts/ThemeContext";
import type { Title } from "../components/TitleCard";

// Simple "ver mais recomendados" screen showing more trending items (paged)
export default function RecommendedScreen({
  navigation,
}: StackScreenProps<"RecommendedScreen">) {
  const { isDark } = useTheme();
  const heartColor = isDark ? "#e91e63" : "#ff1744";
  const { isFavorite, toggleFavorite: toggleGlobalFavorite } = useFavorites();
  const { isWatched, toggleWatched } = useWatched();
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<TMDBItem[]>([]);
  const [fetchingMore, setFetchingMore] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null); // controla menu '+' aberto

  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchPage = useCallback(async (p: number) => {
    setError(null);
    try {
      const endpoint = `${TMDB_CONFIG.BASE_URL}/trending/all/week?language=pt-PT&page=${p}`;
      const resp = await fetch(endpoint, {
        method: "GET",
        headers: TMDB_CONFIG.headers,
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      const results: TMDBItem[] = (json.results || []).filter(
        (r: any) => r.media_type === "movie" || r.media_type === "tv"
      );
      setItems((prev) => {
        const existingIds = new Set(prev.map((i) => i.id));
        const merged = [
          ...prev,
          ...results.filter((r) => !existingIds.has(r.id)),
        ];
        return merged;
      });
      const totalPages = json.total_pages || p; // fallback
      if (p >= totalPages || results.length === 0) setHasMore(false);
      setPage(p + 1);
    } catch (e: any) {
      setError(e.message || "Erro ao carregar");
      setHasMore(false);
    } finally {
      setInitialLoading(false);
      setFetchingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchPage(1);
  }, [fetchPage]);

  const loadMore = () => {
    if (fetchingMore || !hasMore || initialLoading) return;
    setFetchingMore(true);
    fetchPage(page);
  };

  const toTitle = (show: TMDBItem): Title => ({
    id: String(show.id),
    title: show.title || show.name || "",
    overview: show.overview || "",
    poster_path: show.poster_path || "",
    genre_ids: (show.genre_ids || []).map(String),
    genres: [],
    vote_average: show.vote_average || 0,
    favorite: true,
  });

  return (
    <View className="flex-1 bg-background dark:bg-background-dark pt-12">
      {/* Header */}
      <View className="px-4 mb-4 flex-row items-center justify-center relative">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="absolute left-2 p-2 rounded-full bg-white/10"
          accessibilityLabel="Voltar"
        >
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text className="text-text dark:text-text-dark text-2xl font-bold">
          Recomendados
        </Text>
      </View>
      {initialLoading && !items.length && (
        <ActivityIndicator style={{ marginTop: 20 }} />
      )}
      {error && !items.length && (
        <Text className="text-red-400 px-4">{error}</Text>
      )}
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        numColumns={3}
        contentContainerStyle={{
          paddingHorizontal: 12,
          paddingBottom: 60,
          paddingTop: 4,
        }}
        columnWrapperStyle={{ gap: 12 }}
        onEndReachedThreshold={0.5}
        onEndReached={loadMore}
        ListFooterComponent={() =>
          initialLoading ? null : fetchingMore ? (
            <ActivityIndicator style={{ marginVertical: 16 }} />
          ) : !hasMore ? (
            <Text className="text-center text-xs text-text dark:text-text-dark my-4 w-full">
              Fim dos resultados
            </Text>
          ) : null
        }
        renderItem={({ item }) => {
          const imgUri = item.poster_path
            ? `https://image.tmdb.org/t/p/w342${item.poster_path}`
            : undefined;
          const id = String(item.id);
          const open = openMenuId === id;
          return (
            <View
              style={{ flex: 1, aspectRatio: 2 / 3 }}
              className="mb-4 relative"
            >
              <TouchableOpacity
                className="flex-1 rounded-lg overflow-hidden bg-white/5"
                activeOpacity={0.85}
                onPress={() => navigation.navigate('MoviePage', { show: { ...item, media_type: item.media_type ?? (item.title ? "movie" : "tv") } })}
              >
                {imgUri ? (
                  <Image
                    source={{ uri: imgUri }}
                    style={{ width: "100%", height: "100%" }}
                  />
                ) : (
                  <View className="flex-1 items-center justify-center">
                    <Text className="text-xs text-center text-text dark:text-text-dark px-1">
                      Sem imagem
                    </Text>
                  </View>
                )}
                {(isWatched(id) || isFavorite(id)) && (
                  <View className="absolute left-1.5 bottom-1.5 flex-row items-center">
                    {isWatched(id) && (
                      <View className="bg-green-600/85 px-2 py-0.5 rounded-md items-center justify-center flex-row">
                        <Ionicons name="eye" size={12} color="#fff" />
                      </View>
                    )}
                    {isFavorite(id) && (
                      <View
                        className={`bg-red-600/85 px-2 py-0.5 rounded-md items-center justify-center flex-row ${isWatched(id) ? "ml-2" : ""}`}
                      >
                        <Ionicons name="heart" size={12} color="#fff" />
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
                <View className="absolute right-2 top-12 bg-black/80 rounded-lg py-2 w-32 z-10">
                  <TouchableOpacity
                    className="px-3 py-2 flex-row items-center"
                    onPress={() => {
                      setOpenMenuId(null);
                      toggleGlobalFavorite(toTitle(item));
                    }}
                  >
                    <Ionicons
                      name={isFavorite(id) ? "heart" : "heart-outline"}
                      size={16}
                      color={isFavorite(id) ? heartColor : "#fff"}
                    />
                    <Text className="text-white text-xs ml-2">Favorito</Text>
                  </TouchableOpacity>
                  <View className="h-px bg-white/20 mx-2 my-1" />
                  <TouchableOpacity
                    className="px-3 py-2 flex-row items-center"
                    onPress={() => {
                      setOpenMenuId(null);
                      toggleWatched(toTitle(item));
                    }}
                  >
                    <Ionicons
                      name={isWatched(id) ? "eye" : "eye-outline"}
                      size={16}
                      color={isWatched(id) ? "#4ade80" : "#fff"}
                    />
                    <Text className="text-white text-xs ml-2">Assistido</Text>
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
