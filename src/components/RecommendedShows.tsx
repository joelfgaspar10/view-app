import React, { useState } from "react";
import { View, Text, Image, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TMDBItem } from "../types/tmdb";
import { useFavorites } from "../contexts/FavoritesContext";
import { useWatched } from "../contexts/WatchedContext";
import { useWatchlist } from "../contexts/WatchlistContext";
import { useTheme } from "../contexts/ThemeContext";

interface RecommendedShowsProps {
  shows: TMDBItem[];
  onShowPress: (show: TMDBItem) => void;
  onToggleFavorite: (show: TMDBItem) => void;
  loading?: boolean;
  onSeeMorePress?: () => void; // novo botão Ver mais
}

export default function RecommendedShows({
  shows,
  onShowPress,
  onToggleFavorite,
  loading = false,
  onSeeMorePress,
}: RecommendedShowsProps) {
  const { isFavorite } = useFavorites();
  const { isWatched, toggleWatched } = useWatched();
  const { isInWatchlist, toggleWatchlist } = useWatchlist();
  const { isDark } = useTheme();

  const heartColor = isDark ? "#e91e63" : "#ff1744";

  // Controla qual card está com o menu aberto (id) ou null se nenhum
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  return (
    <View className="mt-6 px-4">
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-text dark:text-text-dark text-xl font-bold">
          Recomendados
        </Text>
        {onSeeMorePress && (
          <TouchableOpacity
            onPress={onSeeMorePress}
            className="px-3 py-1 rounded-full bg-white/10"
            activeOpacity={0.7}
          >
            <Text className="text-xs text-white font-medium">Ver mais</Text>
          </TouchableOpacity>
        )}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mb-6"
      >
        {loading ? (
          // Simple loading state
          <View className="flex-row">
            {[1, 2, 3].map((item) => (
              <View
                key={item}
                className="w-[220px] h-[330px] rounded-2xl bg-gray-300 dark:bg-gray-600 mr-4"
              />
            ))}
          </View>
        ) : (
          shows.map((show) => {
            const id = String(show.id);
            const open = openMenuId === id;
            return (
              <TouchableOpacity
                key={id}
                className="mr-4 relative"
                onPress={() => onShowPress(show)}
                activeOpacity={0.85}
              >
                <Image
                  source={{ uri: `https://image.tmdb.org/t/p/w500${show.poster_path}` }}
                  className="w-[220px] h-[330px] rounded-2xl"
                  resizeMode="cover"
                />
                {(isWatched(id) || isFavorite(id) || isInWatchlist(id)) && (
                  <View className="absolute left-3 bottom-3 flex-row items-center">
                    {isFavorite(id) && (
                      <View className="bg-red-600/85 px-2 py-1 rounded-md flex-row items-center">
                        <Ionicons name="heart" size={14} color="#fff" />
                      </View>
                    )}
                    {isWatched(id) && (
                      <View className={`bg-green-600/85 px-2 py-1 rounded-md flex-row items-center ${isFavorite(id) ? 'ml-2' : ''}`}>
                        <Ionicons name="eye" size={14} color="#fff" />
                      </View>
                    )}
                    {isInWatchlist(id) && (
                      <View className={`bg-blue-600/85 px-2 py-1 rounded-md flex-row items-center ${(isFavorite(id) || isWatched(id)) ? 'ml-2' : ''}`}>
                        <Ionicons name="time" size={14} color="#fff" />
                      </View>
                    )}
                  </View>
                )}
                {/* Botão '+' */}
                <TouchableOpacity
                  onPress={() => setOpenMenuId(open ? null : id)}
                  className="absolute right-3 top-3 w-9 h-9 rounded-full bg-black/60 items-center justify-center"
                  activeOpacity={0.8}
                >
                  <Text className="text-white text-xl font-bold">+</Text>
                </TouchableOpacity>
                {open && (
                  <View className="absolute right-3 top-14 bg-black/80 rounded-lg py-2 w-40">
                    {/* Favorito */}
                    <TouchableOpacity
                      className="px-3 py-2 flex-row items-center"
                      onPress={() => { setOpenMenuId(null); onToggleFavorite(show); }}
                    >
                      <Ionicons name={isFavorite(id) ? 'heart' : 'heart-outline'} size={16} color={isFavorite(id) ? heartColor : '#fff'} />
                      <Text className="text-white text-xs ml-2">Favorito</Text>
                    </TouchableOpacity>
                    <View className="h-px bg-white/20 mx-2 my-1" />
                    {/* Assistido */}
                    <TouchableOpacity
                      className="px-3 py-2 flex-row items-center"
                      onPress={() => { setOpenMenuId(null); toggleWatched({ id, title: show.title||show.name||'', overview: show.overview||'', poster_path: show.poster_path, genre_ids: (show.genre_ids||[]).map(String), genres: [], vote_average: show.vote_average||0, favorite: false }); }}
                    >
                      <Ionicons name={isWatched(id) ? 'eye' : 'eye-outline'} size={16} color={isWatched(id) ? '#4ade80' : '#fff'} />
                      <Text className="text-white text-xs ml-2">Assistido</Text>
                    </TouchableOpacity>
                    <View className="h-px bg-white/20 mx-2 my-1" />
                    {/* Ver mais tarde (Watchlist) */}
                    <TouchableOpacity
                      className="px-3 py-2 flex-row items-center"
                      onPress={() => { setOpenMenuId(null); toggleWatchlist({ id, title: show.title||show.name||'', overview: show.overview||'', poster_path: show.poster_path, genre_ids: (show.genre_ids||[]).map(String), genres: [], vote_average: show.vote_average||0, favorite: false }); }}
                    >
                      <Ionicons name={isInWatchlist(id) ? 'time' : 'time-outline'} size={16} color={isInWatchlist(id) ? '#2563EB' : '#fff'} />
                      <Text className="text-white text-xs ml-2">Ver mais tarde</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
