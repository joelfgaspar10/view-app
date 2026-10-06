import React from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import { useTheme } from "../contexts/ThemeContext";
import { TMDBItem } from "../types/tmdb";

export interface Episode {
  id: string;
  title: string;
  description: string;
  genres: string[];
  rating: number;
  image: any;
  favorite: boolean;
  tmdbItem?: TMDBItem; // Original TMDB data for navigation and filtering
}

interface EpisodeCardProps {
  item: Episode;
  active?: boolean; // favorite or subscribed
  mode?: "favorite" | "notify";
  onToggle?: (id: string) => void;
  onPress?: (item: Episode) => void; // Add onPress prop for navigation
}

const EpisodeCard: React.FC<EpisodeCardProps> = ({
  item,
  active = false,
  mode = "favorite",
  onToggle,
  onPress,
}) => {
  const { isDark } = useTheme();
  const activeColor = isDark ? "#e91e63" : "#ff1744";

  return (
    <TouchableOpacity
      className="flex-row bg-gray-500 dark:bg-card-dark rounded-2xl mb-5 h-40"
      onPress={() => onPress && onPress(item)}
      activeOpacity={0.8}
    >
      {/* Cover */}
      <Image
        source={item.image}
        className="w-28 h-full rounded-xl mr-3"
        resizeMode="cover"
      />
      <View className="flex-1 p-3">
        {/* Title */}
        <Text className="text-white font-bold text-lg mb-1">{item.title}</Text>
        {/* Description */}
        <View className="mb-2">
          <Text
            className="text-white text-xs"
            numberOfLines={3}
            ellipsizeMode="tail"
          >
            {item.description}
          </Text>
        </View>
        <View className="flex-1 justify-end items-start mb-1">
          {/* Genres */}
          <Text className="text-white text-xs mr-2">
            {item.genres.join(" | ")}
          </Text>
          {/* Rating */}
          <View className="flex-row justify-start items-center">
            <Image
              source={require("../assets/tmp/imdb.png")}
              className="w-7 h-7 rounded-xl"
            />
            <Text className="text-white text-s ml-1">{item.rating}/10</Text>
          </View>
        </View>
      </View>
      {/* Action Button (Heart or Bell) */}
      <TouchableOpacity
        onPress={() => onToggle && onToggle(item.id)}
        className="justify-end items-end p-3"
      >
        {mode === "favorite" ? (
          <Icon
            name="heart"
            size={20}
            color={active ? activeColor : "#fff"}
            solid={active}
          />
        ) : (
          <Icon
            name="bell"
            size={20}
            color={active ? activeColor : "#fff"}
            solid={active}
          />
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

export default EpisodeCard;
