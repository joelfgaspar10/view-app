import React, { useMemo, useState, useRef } from "react";
import { View, Text, ScrollView, Alert } from "react-native";
import { Swipeable } from 'react-native-gesture-handler';
import FloatingChatButton from "../components/FloatingChatButton";
import TabBar from "../components/TabBar";
import TitleCard, { Title } from "../components/TitleCard";
import { useTheme } from "../contexts/ThemeContext";
import { TabScreenProps } from "../types/navigation";
import { useFavorites } from "../contexts/FavoritesContext";

// Removed mock data; we now use FavoritesContext

export default function FavoritesPage({
  navigation,
  route,
}: TabScreenProps<"FavoritesPage">) {
  const [activeTab, setActiveTab] = useState("Todos");
  const { items, isFavorite, toggleFavorite } = useFavorites();
  const { isDark } = useTheme();
  const swipeRefs = useRef<Record<string, Swipeable | null>>({});

  const confirmDelete = (id: string, item: Title) => {
    Alert.alert('Confirmar', 'Remover dos Favoritos?', [
      { text: 'Cancelar', style: 'cancel', onPress: () => swipeRefs.current[id]?.close() },
      { text: 'Apagar', style: 'destructive', onPress: () => toggleFavorite(item) },
    ]);
  };
  const totalFavorites = items.filter(it => isFavorite(it.id)).length;

  // Infer media type (movie or series) for basic filtering when media_type not stored.
  const inferType = (t: Title): 'movie' | 'tv' => {
    // If title has spaces + year pattern maybe still ambiguous; use simple heuristic.
    // We didn't store media_type originally, so rely on presence of certain genre ids (TV genres commonly 10759, 10765, 18, 35, 16) vs movie-specific (28, 12, 878, 53 etc.).
    const gids = t.genre_ids || [];
    const tvGenreSet = new Set(['10759', '10765', '18', '35', '16', '9648']);
    const movieGenreSet = new Set(['28','12','53','878','14','27','80','10752']);
    const hasTv = gids.some(g => tvGenreSet.has(g));
    const hasMovie = gids.some(g => movieGenreSet.has(g));
    if (hasTv && !hasMovie) return 'tv';
    if (hasMovie && !hasTv) return 'movie';
    // Fallback: if overview shorter maybe tv episode? Just default movie.
    return 'movie';
  };

  const filteredFavorites = useMemo(() => {
    const list = items.filter(it => isFavorite(it.id));
  if (activeTab === 'Todos') return list;
  if (activeTab === 'Filmes') return list.filter(it => inferType(it) === 'movie');
  if (activeTab === 'Séries') return list.filter(it => inferType(it) === 'tv');
    return list;
  }, [items, activeTab, isFavorite]);

  // Mostrar mensagem global se não há nenhum favorito em nenhuma categoria
  if (totalFavorites === 0) {
    return (
      <View className="flex-1 bg-background dark:bg-background-dark pt-12">
        <View className="px-4 pb-3 items-center justify-center">
          <Text className="text-text dark:text-text-dark text-2xl font-semibold" numberOfLines={1}>Favoritos</Text>
        </View>
        <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
        <View className="flex-1 justify-center items-center px-6">
          <Text className="text-black dark:text-gray-300 text-base font-medium text-center">
            Sem filmes/séries adicionadas aos favoritos.
          </Text>
        </View>
        <FloatingChatButton />
      </View>
    );
  }

  return (
  <View className="flex-1 bg-background dark:bg-background-dark pt-12">
      {/* Header centrado unificado */}
      <View className="px-4 pb-3 items-center justify-center">
        <Text className="text-text dark:text-text-dark text-2xl font-semibold" numberOfLines={1}>Favoritos</Text>
      </View>

      {/* Tabs */}
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Scrollable List */}
  <ScrollView className="flex-1 px-3">
        {filteredFavorites.length > 0 ? (
          filteredFavorites.map((item) => (
            <Swipeable
              key={item.id}
              ref={r => { if (r) swipeRefs.current[item.id] = r; }}
              renderRightActions={() => (
                <View className="h-32 bg-red-600 rounded-2xl flex-row items-center justify-end" style={{ flex: 1 }}>
                  <Text className="text-white font-bold mr-6">Apagar</Text>
                </View>
              )}
              rightThreshold={120}
              onSwipeableOpen={() => confirmDelete(item.id, item)}
            >
              <View>
                <TitleCard
                  item={item}
                  isFavorite={isFavorite(item.id)}
                  onToggleFavorite={() => toggleFavorite(item)}
                  rightIconName="heart"
                  rightIconColor="#FF3B30"
                  rightIconAccessibilityLabel="Remover dos favoritos"
                  onRightIconPress={() => confirmDelete(item.id, item)}
                  onPress={() => navigation.getParent()?.navigate("MoviePage", { show: item })}
                />
              </View>
            </Swipeable>
          ))
        ) : (
          <View className="flex-1 justify-center items-center py-20">
            <Text className="text-black dark:text-gray-300 text-base text-center font-medium">
              Sem filmes/séries adicionadas aos favoritos.
            </Text>
          </View>
        )}
  </ScrollView>
  <FloatingChatButton />
    </View>
  );
}
