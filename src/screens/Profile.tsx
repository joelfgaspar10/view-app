// src/screens/Profile.tsx
import React, { useMemo, useEffect, useState } from "react";
import { View, Alert, Text, TouchableOpacity, ScrollView } from "react-native";
import FloatingChatButton from "../components/FloatingChatButton";
import { FIREBASE_AUTH, FIREBASE_DB } from "../../FirebaseConfig";
import { signOut } from "firebase/auth";
import ProfileHeader from "../components/ProfileHeader";
import ProfileMenuItem from "../components/ProfileMenuItem";
import { useWatched } from "../contexts/WatchedContext";
import { useFavorites } from "../contexts/FavoritesContext";
import { useWatchlist } from "../contexts/WatchlistContext";
import { StackScreenProps } from "../types/navigation";
import { useProfileImage } from "../hooks/useProfileImage";
import { doc, getDoc } from "firebase/firestore";

export default function Profile({ navigation }: StackScreenProps<"Profile">) {
  const user = FIREBASE_AUTH.currentUser;
  const { items: watched, clear: clearWatched } = useWatched();
  const { clear: clearFavorites } = useFavorites();
  const { clear: clearWatchlist } = useWatchlist();
  const { profileImage } = useProfileImage();
  const [displayName, setDisplayName] = useState<string>(
    user?.displayName || "Utilizador"
  );

  // Buscar nome atualizado do Firestore
  useEffect(() => {
    let active = true;
    const loadName = async () => {
      if (!user) return;
      try {
        const snap = await getDoc(doc(FIREBASE_DB, "users", user.uid));
        if (snap.exists()) {
          const data = snap.data() as any;
          if (active && data.displayName) {
            setDisplayName(data.displayName);
          }
        } else {
          // fallback para o nome do Auth
          setDisplayName(user.displayName || "Utilizador");
        }
      } catch (e) {
        console.warn("Erro ao carregar nome do Firestore:", e);
      }
    };
    loadName();
    return () => {
      active = false;
    };
  }, [user?.uid, user?.displayName]);

  // conta filmes vs séries
  const counts = useMemo(() => {
    const tvGenreSet = new Set(["10759", "10765", "18", "35", "16", "9648"]);
    const movieGenreSet = new Set([
      "28",
      "12",
      "53",
      "878",
      "14",
      "27",
      "80",
      "10752",
    ]);
    let filmes = 0,
      series = 0;
    watched.forEach((t) => {
      const gids = t.genre_ids || [];
      const hasTv = gids.some((g) => tvGenreSet.has(g));
      const hasMovie = gids.some((g) => movieGenreSet.has(g));
      if (hasTv && !hasMovie) series++;
      else if (hasMovie && !hasTv) filmes++;
      else filmes++;
    });
    return { filmes, series };
  }, [watched]);

  const handleLogout = async () => {
    Alert.alert("Logout", "Tem certeza que deseja sair?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        style: "destructive",
        onPress: async () => {
          try {
            // Limpa estado local imediatamente para evitar flicker enquanto desmonta providers
            clearFavorites();
            clearWatchlist();
            clearWatched();
            await signOut(FIREBASE_AUTH);
          } catch (error) {
            console.error("Error signing out:", error);
            Alert.alert("Erro", "Não foi possível fazer logout");
          }
        },
      },
    ]);
  };

  const menuItems = [
    {
      title: "Editar perfil",
      icon: "person-outline" as const,
      onPress: () => navigation.navigate("EditProfile"),
    },
    {
      title: "Favoritos",
      icon: "heart-outline" as const,
      onPress: () =>
        navigation.navigate("TabNavigator", { screen: "FavoritesPage" } as any),
    },
    {
      title: "Notificações",
      icon: "notifications-outline" as const,
      onPress: () => navigation.navigate("NotificationsPage"),
    },
    {
      title: "Assistidos",
      icon: "eye-outline" as const,
      onPress: () => navigation.navigate("WatchedPage"),
    },
    {
      title: "Ver mais tarde",
      icon: "time-outline" as const,
      onPress: () => navigation.navigate("WatchlistPage"),
    },
    {
      title: "Definições",
      icon: "settings-outline" as const,
      onPress: () => navigation.navigate("Settings"),
    },
  ];

  return (
    <View className="flex-1 bg-background dark:bg-background-dark">
      <ProfileHeader
        title="Perfil"
        userName={displayName}
        userEmail={user?.email || "error: email not found"}
        onBackPress={() => navigation.goBack()}
        onPress={() => navigation.navigate("EditProfile")}
        photoURL={profileImage || user?.photoURL || null}
      />

      <View className="flex-1 px-6 pt-6">
        {/* cards de filmes e séries assistidos */}
        <View className="flex-row mb-6 gap-4">
          <View className="flex-1 border-2 border-gray-400 dark:border-gray-500 rounded-2xl px-4 py-5 bg-transparent">
            <Text
              className="text-text dark:text-white text-sm font-medium"
              numberOfLines={1}
            >
              {counts.filmes} {counts.filmes === 1 ? "filme" : "filmes"}
            </Text>
            <Text
              className="text-text dark:text-gray-300 text-xs mt-1"
              numberOfLines={1}
            >
              assistido{counts.filmes === 1 ? "" : "s"}
            </Text>
          </View>

          <View className="flex-1 border-2 border-gray-400 dark:border-gray-500 rounded-2xl px-4 py-5 bg-transparent">
            <Text
              className="text-text dark:text-white text-sm font-medium"
              numberOfLines={1}
            >
              {counts.series} {counts.series === 1 ? "série" : "séries"}
            </Text>
            <Text
              className="text-text dark:text-gray-300 text-xs mt-1"
              numberOfLines={1}
            >
              assistida{counts.series === 1 ? "" : "s"}
            </Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 70 }}
          keyboardShouldPersistTaps="handled"
        >
          {menuItems.map((item, index) => (
            <ProfileMenuItem
              key={index}
              title={item.title}
              icon={item.icon}
              onPress={item.onPress}
            />
          ))}

          <View className="flex-1 mt-0">
            <ProfileMenuItem
              title="Sair"
              icon="log-out-outline"
              onPress={handleLogout}
              iconColor="#EF4444"
              textColor="#EF4444"
            />
          </View>
        </ScrollView>
      </View>
      <FloatingChatButton />
    </View>
  );
}
