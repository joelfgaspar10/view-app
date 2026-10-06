import React, { useRef } from 'react';
import { View, Text, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/FontAwesome5';
import FloatingChatButton from '../components/FloatingChatButton';
import TitleCard from '../components/TitleCard';
import { useWatchlist } from '../contexts/WatchlistContext';
import { StackScreenProps } from '../types/navigation';
import { useTheme } from '../contexts/ThemeContext';

export default function WatchlistPage({ navigation }: StackScreenProps<'WatchlistPage'>) {
  const { items, removeFromWatchlist } = useWatchlist();
  const swipeRefs = useRef<Record<string, Swipeable | null>>({});
  const { isDark } = useTheme();

  const confirmDelete = (id: string | number) => {
    const key = String(id);
    Alert.alert('Confirmar', 'Remover de Ver mais tarde?', [
      { text: 'Cancelar', style: 'cancel', onPress: () => swipeRefs.current[key]?.close() },
      { text: 'Apagar', style: 'destructive', onPress: () => removeFromWatchlist(key) },
    ]);
  };

  return (
    <View className="flex-1 bg-background dark:bg-background-dark pt-12">
      <View className="px-4 pb-4">
        <View className="relative items-center justify-center mb-1">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            accessibilityLabel="Voltar"
            className="absolute left-0 w-9 h-9 rounded-full bg-gray-500/30 dark:bg-white/10 items-center justify-center"
            activeOpacity={0.85}
          >
            <Icon name="chevron-left" size={16} color={isDark ? '#ffffff' : '#000000'} />
          </TouchableOpacity>
          <Text className="text-text dark:text-text-dark text-2xl font-semibold" numberOfLines={1}>Ver mais tarde</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-3">
        {items.length === 0 && (
          <View className="py-20 items-center">
            <Text className="text-gray-400">Nenhum título em "Ver mais tarde".</Text>
          </View>
        )}
        {items.map(t => {
          const key = String(t.id);
          return (
            <Swipeable
              key={key}
              ref={r => { if (r) swipeRefs.current[key] = r; }}
              renderRightActions={() => (
                <View className="h-32 bg-red-600 rounded-2xl flex-row items-center justify-end" style={{ flex: 1 }}>
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
                  rightIconName="clock"
                  rightIconColor="#2563EB"
                  rightIconAccessibilityLabel="Remover de Ver mais tarde"
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
