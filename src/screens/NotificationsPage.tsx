import React from "react";
import { View, Text, Image, ScrollView, TouchableOpacity } from "react-native";
import FloatingChatButton from "../components/FloatingChatButton";
import { Swipeable } from "react-native-gesture-handler";
import Icon from "react-native-vector-icons/FontAwesome5";
import { StackScreenProps } from "../types/navigation";
import { useTheme } from "../contexts/ThemeContext";
import { useNotifications } from "../contexts/NotificationsContext";
import { useFavorites } from "../contexts/FavoritesContext";

export default function NotificationsPage({
  navigation,
}: StackScreenProps<"NotificationsPage">) {
  const { isDark } = useTheme();
  const { delivered, scheduled, removeDelivered, toggleSubscription } = useNotifications();
  const { isFavorite, removeFavorite } = useFavorites();

  // Map scheduled (futuras) e delivered (já disponíveis)
  const upcoming = scheduled.map(s => ({
    id: s.id,
    title: s.episode.title,
    image: s.episode.image,
    rating: typeof s.episode.rating === 'number' ? s.episode.rating : 0,
    releaseISO: s.dateISO,
    kind: 'scheduled' as const,
  }));

  const past = delivered.map(d => ({
    id: d.id,
    title: d.title,
    image: d.image,
    rating: typeof d.rating === 'number' ? d.rating : 0,
    releaseISO: d.deliveredAt,
    kind: 'delivered' as const,
  }));

  // Unificar lista: ordenar por data (mais próximo primeiro)
  const notifications = [...upcoming, ...past].sort((a,b)=> new Date(a.releaseISO).getTime() - new Date(b.releaseISO).getTime());

  const daysUntil = (iso: string) => {
    const now = new Date();
    const todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const d = new Date(iso);
    const targetMid = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffMs = targetMid.getTime() - todayMid.getTime();
    const diffDays = diffMs <= 0 ? 0 : Math.round(diffMs / 86400000);
    return diffDays;
  };

  const handleDelete = async (id: string | number) => {
    // Se estiver em scheduled cancelar subscrição, senão remover delivered
    const sched = scheduled.find(s => s.id === String(id));
    if (sched) {
      await toggleSubscription(sched.episode, sched.dateISO); // toggle remove
    } else {
      removeDelivered(String(id));
    }
  };

  // Estado vazio centralizado
  if (notifications.length === 0) {
    return (
      <View className="flex-1 bg-background dark:bg-background-dark">
        {/* Header centrado igual ao ProfileHeader */}
        <View className="pt-12 px-4 pb-6">
          <View className="relative items-center justify-center mb-2">
            <TouchableOpacity
              accessibilityLabel="Voltar"
              onPress={() => navigation.goBack()}
              className="absolute left-0 w-9 h-9 rounded-full bg-gray-500/30 dark:bg-white/10 items-center justify-center"
              activeOpacity={0.85}
            >
              <Icon name="chevron-left" size={16} color={isDark ? 'white' : 'black'} />
            </TouchableOpacity>
            <Text className="text-text dark:text-text-dark text-2xl font-semibold" numberOfLines={1}>
              Notificações
            </Text>
          </View>
        </View>
        <View className="flex-1 items-center justify-center px-10">
          <Text className="text-gray-300 dark:text-gray-300 text-base font-medium text-center">Sem notificações.</Text>
          <Text className="text-gray-400 dark:text-gray-400 text-xs mt-2 text-center">Ativa o sino num filme ou série para aparecer aqui quando estiver disponível.</Text>
        </View>
        <FloatingChatButton />
      </View>
    );
  }

  return (
  <View className="flex-1 bg-background dark:bg-background-dark">
      {/* Header centrado igual ao ProfileHeader */}
      <View className="pt-12 px-4 pb-6">
        <View className="relative items-center justify-center mb-2">
          <TouchableOpacity
            accessibilityLabel="Voltar"
            onPress={() => navigation.goBack()}
            className="absolute left-0 w-9 h-9 rounded-full bg-gray-500/30 dark:bg-white/10 items-center justify-center"
            activeOpacity={0.85}
          >
            <Icon name="chevron-left" size={16} color={isDark ? 'white' : 'black'} />
          </TouchableOpacity>
          <Text className="text-text dark:text-text-dark text-2xl font-semibold" numberOfLines={1}>
            Notificações
          </Text>
        </View>
      </View>

  <ScrollView className="flex-1">
  {notifications.map((notification) => (
          <Swipeable
            key={notification.id}
            renderRightActions={() => (
              <View
                className="h-28 bg-red-600 rounded-2xl flex-row items-center justify-end"
                style={{ position: "relative", flex: 1 }}
              >
                <Text className="text-white font-bold mr-6">Apagar</Text>
              </View>
            )}
            onSwipeableOpen={() => handleDelete(notification.id)}
            rightThreshold={120}
          >
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                // Construir objeto TMDBItem mínimo para MoviePage
                const tmdbLike: any = {
                  id: Number(notification.id) || 0,
                  title: notification.title,
                  overview: notification.title, // sem descrição original armazenada; pode-se ajustar para usar delivered.description
                  poster_path: typeof notification.image?.uri === 'string'
                    ? notification.image.uri.replace('https://image.tmdb.org/t/p/w500','')
                    : notification.image,
                  vote_average: notification.rating || 0,
                  vote_count: 0,
                  genre_ids: [],
                  media_type: 'tv',
                };
                navigation.navigate('MoviePage', { show: tmdbLike });
              }}
              className="flex-row bg-gray-500 dark:bg-card-dark rounded-2xl mb-5 h-28 mx-4 items-center p-3"
            >
              <Image
                source={notification.image}
                className="w-20 h-full rounded-xl mr-3"
                resizeMode="cover"
              />
              <View className="flex-1 pr-2">
                <Text className="text-white dark:text-text-dark font-bold text-base" numberOfLines={1}>
                  {notification.title}
                </Text>
                <View className="flex-row items-center mt-1 mb-1">
                  <View className="bg-[#01d277] px-2 py-0.5 rounded mr-2">
                    <Text className="text-white text-[10px] font-bold tracking-tight">TMDB</Text>
                  </View>
                  <Text className="text-white text-xs font-semibold">
                    {typeof notification.rating === 'number'
                      ? (notification.rating > 0
                          ? notification.rating.toFixed(1) + '/10'
                          : '0/10')
                      : '0/10'}
                  </Text>
                </View>
                <Text className="text-gray-200 dark:text-gray-300 text-xs mt-1">
                  {(() => {
                    const diff = daysUntil(notification.releaseISO);
                    return diff === 0 ? 'Disponível hoje' : `Disponível em ${diff} ${diff===1?'dia':'dias'}`;
                  })()}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  // Apagar do favoritos se existir
                  if (isFavorite(String(notification.id))) {
                    removeFavorite(String(notification.id));
                  }
                  // Também remover da lista de notificações (toggle ou delivered)
                  handleDelete(notification.id);
                }}
                accessibilityLabel="Remover favorito e notificação"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Icon name="bell" size={18} color={isDark ? '#FF3B30' : '#FF3B30'} style={{ marginRight: 4 }} />
              </TouchableOpacity>
            </TouchableOpacity>
          </Swipeable>
        ))}
  </ScrollView>
  <FloatingChatButton />
    </View>
  );
}
