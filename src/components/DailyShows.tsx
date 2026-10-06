import React, { useState } from "react";
import { View, Text, Image, TouchableOpacity, Alert } from "react-native";
import { TMDBItem } from "../types/tmdb";
import { Ionicons } from "@expo/vector-icons"; // still used for empty state icon
import { useTheme } from "../contexts/ThemeContext";
import { useFavorites } from "../contexts/FavoritesContext"; // still imported in case needed elsewhere
import { useNotifications } from "../contexts/NotificationsContext";
import { useNavigation } from "@react-navigation/native";

interface DailyShowsProps {
  selectedDate: string;
  shows: TMDBItem[];
  loading?: boolean;
  onToggleFavorite: (show: TMDBItem) => void;
  onShowPress: (show: TMDBItem) => void;
}

const DailyShows: React.FC<DailyShowsProps> = ({
  selectedDate,
  shows,
  loading = false,
  onToggleFavorite,
  onShowPress,
}) => {
  const { isDark } = useTheme();
  const { isFavorite } = useFavorites();
  const { isSubscribed, toggleSubscription } = useNotifications();
  const bellActiveColor = "#FF3B30";
  const navigation: any = useNavigation();
  const [expanded, setExpanded] = useState(false);

  const visibleShows = expanded
    ? shows.slice(0, Math.min(shows.length, 10))
    : shows.slice(0, Math.min(shows.length, 2));

  // Loading skeleton
  if (loading) {
    return (
      <View className="mt-2 space-y-4 px-4">
        {[1, 2, 3].map((index) => (
          <View
            key={index}
            className="flex-row bg-gray-300 dark:bg-gray-700 rounded-2xl mb-5 h-40 animate-pulse"
          >
            <View className="w-28 h-full bg-gray-400 dark:bg-gray-600 rounded-xl mr-3" />
            <View className="flex-1 p-3 justify-between">
              <View>
                <View className="h-6 bg-gray-400 dark:bg-gray-600 rounded mb-2 w-3/4" />
                <View className="h-4 bg-gray-400 dark:bg-gray-600 rounded mb-1 w-full" />
                <View className="h-4 bg-gray-400 dark:bg-gray-600 rounded w-2/3" />
              </View>
              <View className="flex-row items-center">
                <View className="w-7 h-7 bg-gray-400 dark:bg-gray-600 rounded mr-2" />
                <View className="h-4 bg-gray-400 dark:bg-gray-600 rounded w-16" />
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  }

  // Empty state
  if (!shows || shows.length === 0) {
    return (
      <View className="items-center py-8">
        <Ionicons
          name="calendar-outline"
          size={48}
          color={isDark ? "#6B7280" : "#9CA3AF"}
        />
        <Text className="text-gray-600 dark:text-gray-400 text-base mt-2 text-center">
          Nenhum lançamento previsto para este dia
        </Text>
      </View>
    );
  }

  return (
    <View className="mt-2 space-y-4 px-4">
      {visibleShows.map((show) => (
        <TouchableOpacity
          key={show.id}
          className="flex-row bg-gray-500 dark:bg-[#33415C] rounded-2xl mb-4 h-32"
          onPress={() => onShowPress(show)}
        >
          {/* Notification Bell */}
          <TouchableOpacity
            onPress={async () => {
              const already = isSubscribed(String(show.id));
              const episodeObj = {
                id: String(show.id),
                title: show.title || show.name || "",
                description: show.overview || "Sem descrição",
                genres: [],
                rating: show.vote_average || 0,
                image: { uri: `https://image.tmdb.org/t/p/w500${show.poster_path}` },
                favorite: false,
                tmdbItem: show,
              } as any;
              // For daily shows we assume selectedDate is near; schedule at midday if future else now
              // Calcular data alvo a partir do selectedDate (dia do mês), replicando lógica do HomePage
              const today = new Date();
              const todayClamped = new Date(today.getFullYear(), today.getMonth(), today.getDate());
              const dayNum = parseInt(selectedDate, 10);
              let target = new Date(todayClamped);
              if (!isNaN(dayNum)) target.setDate(dayNum);
              // Se caiu no passado dentro do mês, avançar um mês
              if (target.getTime() < todayClamped.getTime()) {
                target.setMonth(target.getMonth() + 1);
              }
              const baseDateStr = target.toISOString().slice(0,10);
              const releaseISO = `${baseDateStr}T12:00:00.000Z`;
              try {
                await toggleSubscription(episodeObj, releaseISO);
                if (!already) {
                  const now2 = new Date();
                  const todayMidnight2 = new Date(now2.getFullYear(), now2.getMonth(), now2.getDate());
                  const [yy, mm, dd] = baseDateStr.split('-').map(Number);
                  const relMidnight = new Date(yy, (mm||1)-1, dd||1);
                  const diffMs = relMidnight.getTime() - todayMidnight2.getTime();
                  const diffDays = diffMs <= 0 ? 0 : Math.round(diffMs / 86400000);
                  Alert.alert('Notificação ativada', diffDays === 0 ? 'Serás notificado hoje.' : `Serás notificado em ${diffDays} ${diffDays===1?'dia':'dias'}.`);
                } else {
                  Alert.alert('Notificação', 'Notificação removida.');
                }
              } catch (e) {
                Alert.alert('Erro', 'Falha ao alternar notificação.');
              }
            }}
            className="absolute z-10 bottom-2 right-2 p-1"
            activeOpacity={0.7}
            accessibilityLabel="Ativar notificação"
          >
            <Ionicons
              name={isSubscribed(String(show.id)) ? 'notifications' : 'notifications-outline'}
              size={20}
              color={isSubscribed(String(show.id)) ? bellActiveColor : '#fff'}
            />
          </TouchableOpacity>
          <Image
            source={{
              uri: `https://image.tmdb.org/t/p/w500${show.poster_path}`,
            }}
            className="w-24 h-full rounded-xl mr-3"
            resizeMode="cover"
          />
          <View className="flex-1 px-3 justify-center">
            <Text
              className="text-white font-bold text-base mb-2"
              numberOfLines={1}
            >
              {show.title || show.name}
            </Text>
            {(() => {
              const isTV =
                show.media_type === "tv" ||
                (!!show.first_air_date && !show.release_date) ||
                (!!show.name && !show.title);
              return isTV ? (
                <Text className="text-gray-300 text-xs mb-1" numberOfLines={1}>
                  Episódio novo
                </Text>
              ) : null;
            })()}
            <View className="flex-row items-center">
              <View className="bg-[#01d277] px-2 py-0.5 rounded mr-2">
                <Text className="text-white text-[10px] font-bold tracking-tight">
                  TMDB
                </Text>
              </View>
              <Text className="text-white text-sm font-semibold">
                {typeof show.vote_average === "number" && show.vote_average > 0
                  ? show.vote_average.toFixed(1) + "/10"
                  : "N/A"}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      ))}
      {shows.length > 2 && (
        <View className="flex-row justify-center gap-4 mb-6">
          <TouchableOpacity
            onPress={() => setExpanded(!expanded)}
            className={`${expanded ? "bg-gray-600" : "bg-blue-600"} px-4 py-2 rounded-full`}
            activeOpacity={0.85}
          >
            <Text className="text-white font-semibold text-sm">
              {expanded ? "Ver menos" : "Ver mais"}
            </Text>
          </TouchableOpacity>
          {expanded && (
            <TouchableOpacity
              onPress={() => navigation.navigate("CalendarPage")}
              className="bg-blue-600 px-4 py-2 rounded-full"
              activeOpacity={0.85}
            >
              <Text className="text-white font-semibold text-sm">Ver mais</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

export default DailyShows;
