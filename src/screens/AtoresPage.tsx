import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
} from "react-native";
import FloatingChatButton from "../components/FloatingChatButton";
import { Ionicons } from "@expo/vector-icons";
import { StackScreenProps } from "../types/navigation";
import { TMDBItem } from "../types/tmdb";
import { useTheme } from "../contexts/ThemeContext";
import {
  fetchPersonDetails,
  fetchPersonCombinedCredits,
} from "../services/api";

const FALLBACK_PROFILE = require("../assets/tmp/arthur.jpg");

type PersonDetails = {
  name: string;
  biography?: string;
  birthday?: string;
  deathday?: string | null;
  place_of_birth?: string;
  known_for_department?: string;
  profile_path?: string;
  also_known_as?: string[];
  gender?: number;
};

export type CombinedCredit = TMDBItem & {
  character?: string;
  department?: string;
  job?: string;
  media_type?: string;
};

export default function AtoresPage({
  navigation,
  route: {
    params: { actor },
  },
}: StackScreenProps<"AtoresPage">) {
  const { isDark } = useTheme();
  const [details, setDetails] = useState<PersonDetails | null>(null);
  const [credits, setCredits] = useState<CombinedCredit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true);
        // Expect actor.id to be TMDB person id (string) -> parseInt
        const personId = parseInt(actor.id, 10);
        if (!personId) throw new Error("ID de ator inválido");
        const [d, c] = await Promise.all([
          fetchPersonDetails(personId, "pt-PT"),
          fetchPersonCombinedCredits(personId),
        ]);
        // If biography missing in pt-PT, fallback to en-US
        let detailsData = d;
        if (!d?.biography || !d.biography.trim()) {
          try {
            const en = await fetchPersonDetails(personId, "en-US");
            if (en?.biography && en.biography.trim()) {
              detailsData = { ...d, biography: en.biography };
            }
          } catch {}
        }
        if (!active) return;
        // Normalize biography line breaks
        if (detailsData?.biography) {
          detailsData.biography = detailsData.biography.replace(
            /\r\n|\r|\n/g,
            "\n"
          );
        }
        setDetails(detailsData);
        // Merge and deduplicate credits (same title can appear in cast & crew)
        const merged: CombinedCredit[] = [...(c.cast || []), ...(c.crew || [])];
        const dedupMap = new Map<string, CombinedCredit>();
        for (const cr of merged) {
          const key = `${cr.media_type}-${cr.id}`;
          if (!dedupMap.has(key)) dedupMap.set(key, cr);
        }
        const deduped = Array.from(dedupMap.values());
        // Sort by popularity desc
        deduped.sort(
          (a: any, b: any) => (b.popularity || 0) - (a.popularity || 0)
        );
        setCredits(deduped);
      } catch (e: any) {
        if (active) setError(e.message || "Erro ao carregar ator");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [actor.id]);

  const age = (() => {
    if (!details?.birthday) return "--";
    const birth = new Date(details.birthday);
    const end = details.deathday ? new Date(details.deathday) : new Date();
    let years = end.getFullYear() - birth.getFullYear();
    const m = end.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && end.getDate() < birth.getDate())) years--;
    return years + (details.deathday ? " (†)" : "");
  })();

  const knownFor = credits
    .filter((c) => c.media_type === "movie" || c.media_type === "tv")
    .slice(0, 10);

  const totalAppearances = credits.filter(
    (c) => c.media_type === "movie" || c.media_type === "tv"
  ).length;

  return (
  <View className="flex-1">
  <ScrollView className="flex-1 bg-background dark:bg-background-dark">
      {/* Header */}
      <View className="pt-12 px-6 pb-4">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          accessibilityLabel="Voltar"
          className="w-9 h-9 rounded-full bg-black/40 items-center justify-center mb-6"
          activeOpacity={0.85}
        >
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Perfil do Ator */}
      <View className="items-center px-6 mb-8">
        {/* Imagem circular */}
        <View className="w-40 h-40 rounded-full bg-gray-600 mb-6 overflow-hidden border-4 border-gray-400">
          <Image
            source={
              details?.profile_path
                ? {
                    uri: `https://image.tmdb.org/t/p/w300${details.profile_path}`,
                  }
                : FALLBACK_PROFILE
            }
            className="w-full h-full"
            resizeMode="cover"
          />
        </View>

        {/* Nome do ator */}
        <Text className="text-text dark:text-text-dark text-3xl font-bold mb-6 text-center">
          {details?.name || actor.actor}
        </Text>

        {/* Cards de informação */}
        <View className="flex-row justify-between w-full dark:mb-6">
          {/* Card 1: Género (gender) */}
          <View className="bg-gray-600/40 dark:bg-gray-700/40 rounded-xl p-4 flex-1 mr-2 items-center">
            <Text className="text-gray-300 text-sm mb-1">Género</Text>
            <Text
              className="text-white text-base font-bold text-center"
              numberOfLines={2}
            >
              {details?.gender === 1
                ? "Feminino"
                : details?.gender === 2
                  ? "Masculino"
                  : "--"}
            </Text>
          </View>
          {/* Card 2: Nacionalidade (place of birth) */}
          <View className="bg-gray-600/40 dark:bg-gray-700/40 rounded-xl p-4 flex-1 mx-1 items-center">
            <Text className="text-gray-300 text-sm mb-1">Nacionalidade</Text>
            <Text
              className="text-white text-base font-bold text-center"
              numberOfLines={2}
            >
              {details?.place_of_birth
                ?.split(",")
                [details.place_of_birth.split(",").length - 1]?.trim() || "--"}
            </Text>
          </View>
          {/* Card 3: Idade */}
          <View className="bg-gray-600/40 dark:bg-gray-700/40 rounded-xl p-4 flex-1 ml-2 items-center">
            <Text className="text-gray-300 text-sm mb-1">Idade</Text>
            <Text className="text-white text-base font-bold">{age}</Text>
          </View>
        </View>
      </View>

      {/* Biografia */}
      <View className="px-6">
        <View className="mb-8">
          <Text className="text-gray-300 dark:text-text-dark text-xl font-bold mb-4">
            Biografia
          </Text>
          {loading && (
            <Text className="text-gray-400 text-sm">A carregar...</Text>
          )}
          {!loading && !!error && (
            <Text className="text-red-400 text-sm">{error}</Text>
          )}
          {!loading && !error && (
            <Text
              className="text-white dark:text-gray-300 text-base leading-6"
              style={{ textAlign: "justify", flexShrink: 1 }}
            >
              {details?.biography?.trim() || "Sem biografia disponível."}
            </Text>
          )}
        </View>
      </View>

      {/* Known for */}
      <View className="px-6 mb-8">
  <View className="bg-gray-600/40 dark:bg-gray-700/40 rounded-xl p-4">
          <Text className="text-white text-lg font-bold mb-3">
            Conhecido por
          </Text>
          {loading && (
            <Text className="text-gray-400 text-sm">A carregar...</Text>
          )}
          {!loading && knownFor.length === 0 && (
            <Text className="text-gray-400 text-sm">Sem créditos.</Text>
          )}
          {!loading && knownFor.length > 0 && (
            <FlatList
              data={knownFor}
              horizontal
              keyExtractor={(item) => `${item.media_type}-${item.id}`}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  className="mr-3"
                  onPress={() =>
                        navigation.navigate("MoviePage", {
                          show: { ...item, media_type: item.media_type ?? (item.title ? "movie" : "tv") }
                        })
                  }
                >
                  <Image
                    source={
                      item.poster_path
                        ? {
                            uri: `https://image.tmdb.org/t/p/w185${item.poster_path}`,
                          }
                        : FALLBACK_PROFILE
                    }
                    className="w-24 h-36 rounded-lg"
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </View>
  </ScrollView>
  <FloatingChatButton />
  </View>
  );
}
