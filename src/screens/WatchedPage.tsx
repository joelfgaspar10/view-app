import React, { useRef } from "react";
import { View, Text, ScrollView, Alert, TouchableOpacity } from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import { Swipeable } from "react-native-gesture-handler";
import { StackScreenProps } from "../types/navigation";
import { useWatched } from "../contexts/WatchedContext";
import TitleCard from "../components/TitleCard";
import FloatingChatButton from "../components/FloatingChatButton";
import { useTheme } from "../contexts/ThemeContext";

export default function WatchedPage({
  navigation,
}: StackScreenProps<"WatchedPage">) {
  const { items, unmarkWatched } = useWatched(); 
  const swipeRefs = useRef<Record<string, Swipeable | null>>({});
  const { isDark } = useTheme();

  const confirmDelete = (id: string | number) => {
    const key = String(id);
    Alert.alert("Confirmar", "Remover este título de Assistidos?", [
      {
        text: "Cancelar",
        style: "cancel",
        onPress: () => swipeRefs.current[key]?.close(),
      },
      {
        text: "Apagar",
        style: "destructive",
        onPress: () => unmarkWatched(key),
      },
    ]);
  };

  return (
    <View className="flex-1 bg-background dark:bg-background-dark pt-12">
      {/* Header centrado unificado */}
      <View className="px-4 pb-4">
        <View className="relative items-center justify-center mb-1">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            accessibilityLabel="Voltar"
            className="absolute left-0 w-9 h-9 rounded-full bg-gray-500/30 dark:bg-white/10 items-center justify-center"
            activeOpacity={0.85}
          >
            <Icon
              name="chevron-left"
              size={16}
              color={isDark ? "#ffffff" : "#000000"}
            />
          </TouchableOpacity>
          <Text
            className="text-text dark:text-text-dark text-2xl font-semibold"
            numberOfLines={1}
          >
            Assistidos
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-3">
        {items.length === 0 && (
          <View className="py-20 items-center">
            <Text className="text-gray-400">
              Nenhum título marcado como assistido.
            </Text>
          </View>
        )}

        {items.map((t) => {
          const key = String(t.id);
          return (
            <Swipeable
              key={key}
              ref={(r) => {
                if (r) swipeRefs.current[key] = r;
              }}
              renderRightActions={() => (
                <View
                  className="h-32 bg-red-600 rounded-2xl flex-row items-center justify-end"
                  style={{ flex: 1 }}
                >
                  <Text className="text-white font-bold mr-6">Apagar</Text>
                </View>
              )}
              rightThreshold={120}
              onSwipeableOpen={() => confirmDelete(key)}
            >
              <View>
                <TitleCard
                  item={t as any}
                  isFavorite={false}
                  onToggleFavorite={() => {}}
                  rightIconName="eye"
                  rightIconColor="#4ade80" /* verde para assistidos */
                  rightIconAccessibilityLabel="Remover de Assistidos"
                  onRightIconPress={() => confirmDelete(key)}
                />
              </View>
            </Swipeable>
          );
        })}
      </ScrollView>

      <FloatingChatButton />
    </View>
  );
}
