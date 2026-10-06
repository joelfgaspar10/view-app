import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TMDBItem } from "../types/tmdb";
import { useTheme } from "../contexts/ThemeContext";
import { useFavorites } from "../contexts/FavoritesContext";
import { useWatched } from "../contexts/WatchedContext";
import { useWatchlist } from "../contexts/WatchlistContext";
import type { Title } from "./TitleCard";

interface CategorySectionProps {
  title: string;
  shows: TMDBItem[];
  onShowPress: (show: TMDBItem) => void;
  onSeeMorePress?: () => void;
  loading?: boolean;
}

export default function CategorySection({
  title,
  shows,
  onShowPress,
  onSeeMorePress,
  loading = false,
}: CategorySectionProps) {
  const { isDark } = useTheme();
  const { toggleFavorite: toggleGlobalFavorite, isFavorite: isGlobalFavorite } = useFavorites();
  const { isWatched, toggleWatched } = useWatched();
  const { isInWatchlist, toggleWatchlist } = useWatchlist();

  const heartColor = isDark ? "#e91e63" : "#ff1744";

  const toTitle = (show: TMDBItem): Title => ({
    id: String(show.id),
    title: show.title || show.name || "",
    overview: show.overview || "",
    poster_path: show.poster_path
      ? `https://image.tmdb.org/t/p/w500${show.poster_path}`
      : "",
    genre_ids: (show.genre_ids || []).map(String),
    genres: [],
    vote_average: show.vote_average || 0,
    favorite: true,
  });

  const toggleFavorite = (show: TMDBItem) => toggleGlobalFavorite(toTitle(show));

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  return (
    <View className="mt-6 px-4">
      <Text className="text-text dark:text-text-dark text-xl font-bold mb-4">
        {title}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mb-6"
      >
        {shows.map((show, idx) => {
          const id = String(show.id);
            const open = openMenuId === id;
            return (
              <TouchableOpacity
                key={id}
                className="mr-3 relative"
                onPress={() => onShowPress(show)}
                activeOpacity={0.85}
              >
                <Image
                  source={{
                    uri: show.poster_path
                      ? `https://image.tmdb.org/t/p/w500${show.poster_path}`
                      : undefined,
                  }}
                  className="w-32 h-48 rounded-xl"
                  resizeMode="cover"
                />
                {(isGlobalFavorite(id) || isWatched(id) || isInWatchlist(id)) && (
                  <View className="absolute left-1.5 bottom-1.5 flex-row items-center">
                    {isGlobalFavorite(id) && (
                      <View className="bg-red-600/85 px-2 py-0.5 rounded-md flex-row items-center">
                        <Ionicons name="heart" size={12} color="#fff" />
                      </View>
                    )}
                    {isWatched(id) && (
                      <View className={`bg-green-600/85 px-2 py-0.5 rounded-md flex-row items-center ${isGlobalFavorite(id)?'ml-1.5':''}`}> 
                        <Ionicons name="eye" size={12} color="#fff" />
                      </View>
                    )}
                    {isInWatchlist(id) && (
                      <View className={`bg-blue-600/85 px-2 py-0.5 rounded-md flex-row items-center ${(isGlobalFavorite(id)||isWatched(id))?'ml-1.5':''}`}> 
                        <Ionicons name="time" size={12} color="#fff" />
                      </View>
                    )}
                  </View>
                )}
                {/* Botão '+' */}
                <TouchableOpacity
                  onPress={() => setOpenMenuId(open ? null : id)}
                  className="absolute right-2 top-2 w-8 h-8 rounded-full bg-black/60 items-center justify-center"
                  activeOpacity={0.8}
                >
                  <Text className="text-white text-lg font-bold">+</Text>
                </TouchableOpacity>
                {open && (
                  <View className={`absolute ${idx === 0 ? 'left-2' : 'right-2'} top-12 bg-black/80 rounded-lg py-2 w-36 z-10`}> 
                    {/* Favorito */}
                    <TouchableOpacity
                      className="px-3 py-2 flex-row items-center"
                      onPress={() => { setOpenMenuId(null); toggleFavorite(show); }}
                    >
                      <Ionicons
                        name={isGlobalFavorite(id) ? 'heart' : 'heart-outline'}
                        size={16}
                        color={isGlobalFavorite(id) ? heartColor : '#fff'}
                      />
                      <Text className="text-white text-xs ml-2">Favorito</Text>
                    </TouchableOpacity>
                    <View className="h-px bg-white/20 mx-2 my-1" />
                    {/* Assistido */}
                    <TouchableOpacity
                      className="px-3 py-2 flex-row items-center"
                      onPress={() => { setOpenMenuId(null); toggleWatched({ id, title: show.title||show.name||'', overview: show.overview||'', poster_path: show.poster_path || '', genre_ids: (show.genre_ids||[]).map(String), genres: [], vote_average: show.vote_average||0, favorite: false }); }}
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
                      onPress={() => { setOpenMenuId(null); toggleWatchlist({ id, title: show.title||show.name||'', overview: show.overview||'', poster_path: show.poster_path || '', genre_ids: (show.genre_ids||[]).map(String), genres: [], vote_average: show.vote_average||0, favorite: false }); }}
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
              </TouchableOpacity>
            );
        })}
        {onSeeMorePress && (
          <TouchableOpacity
            className="w-32 h-48 bg-blue-600 rounded-xl justify-center items-center"
            onPress={onSeeMorePress}
          >
            <Ionicons name="arrow-forward-outline" size={24} color="white" />
            <Text className="text-white text-sm font-semibold mt-2">
              Ver mais
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}
