import React from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ImageSourcePropType,
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import { useTheme } from "../contexts/ThemeContext";

export interface Title {
  id: string;
  title: string;
  overview: string;
  // poster can be a url string or a local require() numeric id
  poster_path: string | number;
  genre_ids: string[];
  genres: string[];
  vote_average: number;
  favorite: boolean;
  runtime?: number; // minutes for movies
  episodes?: number; // total episodes for series
}

interface TitleCardProps {
  item: Title;
  isFavorite: boolean; // legacy, not used visually
  onToggleFavorite: (id: string) => void; // legacy
  onPress?: (item: Title) => void;
  rightIconName?: string; // optional trailing icon (FontAwesome5)
  rightIconColor?: string;
  onRightIconPress?: () => void;
  rightIconAccessibilityLabel?: string;
}

const TitleCard: React.FC<TitleCardProps> = ({
  item,
  isFavorite: _isFavorite,
  onToggleFavorite: _onToggleFavorite,
  onPress,
  rightIconName,
  rightIconColor,
  onRightIconPress,
  rightIconAccessibilityLabel,
}) => {
  const { isDark } = useTheme();
  const heartColor = isDark ? "#e91e63" : "#ff1744";

  let imageSource: ImageSourcePropType;
  const FALLBACK = require("../assets/tmp/lucifer.png");
  if (typeof item.poster_path === "number") {
    imageSource = item.poster_path;
  } else if (
    typeof item.poster_path === "string" &&
    item.poster_path.length > 0
  ) {
    if (item.poster_path.startsWith("http")) {
      imageSource = { uri: item.poster_path };
    } else if (item.poster_path.startsWith("/")) {
      imageSource = {
        uri: `https://image.tmdb.org/t/p/w500${item.poster_path}`,
      };
    } else {
      imageSource = { uri: item.poster_path };
    }
  } else {
    imageSource = FALLBACK;
  }

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress && onPress(item)}
      className="flex-row bg-gray-500 dark:bg-card-dark rounded-2xl mb-4 h-32 relative items-center"
    >
      {/* Poster */}
      <Image
        source={imageSource}
        className="w-24 h-full rounded-xl mr-3"
        resizeMode="cover"
      />
      <View className="flex-1 py-3 pr-2 justify-between">
        <Text className="text-white font-bold text-lg" numberOfLines={2}>
          {item.title}
        </Text>
        {(typeof item.runtime === "number" ||
          typeof item.episodes === "number") && (
          <Text className="text-gray-200 text-xs mt-1">
            {typeof item.runtime === "number"
              ? formatRuntime(item.runtime)
              : `${item.episodes} ${item.episodes === 1 ? "ep" : "eps"}`}
          </Text>
        )}
        <View className="flex-row items-center mt-2">
          <View className="bg-[#01d277] px-2 py-0.5 rounded mr-2">
            <Text className="text-white text-[10px] font-bold tracking-tight">
              TMDB
            </Text>
          </View>
          <Text className="text-white text-base font-semibold">
            {typeof item.vote_average === "number"
              ? item.vote_average.toFixed(1) + "/10"
              : "N/A"}
          </Text>
        </View>
      </View>
      {rightIconName && (
        <TouchableOpacity
          onPress={onRightIconPress}
          accessibilityLabel={rightIconAccessibilityLabel || "Ação"}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          className="pr-3"
        >
          <Icon name={rightIconName as any} size={18} color={rightIconColor || (isDark ? '#ffffff' : '#000000')} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

function formatRuntime(mins?: number) {
  if (mins === undefined) return "";
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export default TitleCard;
