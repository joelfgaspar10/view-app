import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from "react-native";
import FloatingChatButton from "../components/FloatingChatButton";
import { Ionicons } from "@expo/vector-icons";
import { StackScreenProps } from "../types/navigation";
import { TMDBActor } from "../types/tmdb";
import { TMDBItem } from "../types/tmdb";
import { useFavorites } from "../contexts/FavoritesContext";
import { useWatched } from "../contexts/WatchedContext";
import { useWatchlist } from "../contexts/WatchlistContext";
import type { Title } from "../components/TitleCard";
import { useTheme } from "../contexts/ThemeContext";
import {
  fetchMovieDetails,
  fetchTvDetails,
  fetchMovieCredits,
  fetchTvCredits,
  fetchReviewsWithFallback,
  fetchReviews,
  TMDBReview,
} from "../services/api";
import { useRatings } from "../contexts/RatingsContext";

export default function MoviePage({
  navigation,
  route,
}: StackScreenProps<"MoviePage">) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const { isWatched, toggleWatched } = useWatched();
  const { isInWatchlist, toggleWatchlist } = useWatchlist();
  const { isDark } = useTheme();
  const heartColor = isDark ? "#FF5A5F" : "#2563EB";
  const { getRating, setRating, clearRating } = useRatings();
  const [ratingEditorOpen, setRatingEditorOpen] = useState(false);
  const [tempRating, setTempRating] = useState<number>(0);

  // Details / credits state
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [details, setDetails] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cast, setCast] = useState<TMDBActor[]>([]);

  // Reviews state
  const [reviews, setReviews] = useState<TMDBReview[]>([]);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsTotalPages, setReviewsTotalPages] = useState(1);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [reviewMode, setReviewMode] = useState<"one" | "six" | "all">("one");
  const [loadingAllPages, setLoadingAllPages] = useState(false);
  const [allLanguagesLoaded, setAllLanguagesLoaded] = useState(false);
  const [expandedReviews, setExpandedReviews] = useState<string[]>([]);

  // aceitar ambos os formatos de params
  const params = route.params as
    | { tmdbId: number; mediaType: "movie" | "tv" }
    | { show: { id: number; media_type: "movie" | "tv" } & Partial<TMDBItem> };

  const tmdbId =
    "show" in params ? Number(params.show.id) : Number(params.tmdbId);
  const mediaType: "movie" | "tv" =
    "show" in params
      ? params.show.media_type === "tv"
        ? "tv"
        : "movie"
      : params.mediaType === "tv"
        ? "tv"
        : "movie";

  // Criar objeto "show" derivado dos detalhes carregados
  const show: TMDBItem | null = React.useMemo(() => {
    if (!details) return null;
    return {
      id: details.id,
      title: details.title ?? details.name ?? "",
      name: details.name ?? details.title ?? "",
      overview: details.overview ?? "",
      poster_path: details.poster_path ?? null,
      vote_average:
        typeof details.vote_average === "number" ? details.vote_average : 0,
      vote_count:
        typeof details.vote_count === "number" ? details.vote_count : 0,
      genre_ids: Array.isArray((details as any).genres)
        ? (details as any).genres.map((g: any) => g.id)
        : [],
      media_type: mediaType,
      release_date: (details as any).release_date,
      first_air_date: (details as any).first_air_date,
    } as TMDBItem;
  }, [details, mediaType]);

  // Deduplicate reviews
  const uniqueReviews = React.useMemo(() => {
    if (reviews.length === 0) return reviews;
    const seen = new Set<string>();
    const out: TMDBReview[] = [];
    for (const r of reviews) {
      if (!r?.id) continue;
      if (!seen.has(r.id)) {
        seen.add(r.id);
        out.push(r);
      }
    }
    return out;
  }, [reviews]);

  // Load details & credits
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoadingDetails(true);
        const [detailsData, creditsData] = await Promise.all([
          mediaType === "movie"
            ? fetchMovieDetails(tmdbId)
            : fetchTvDetails(tmdbId),
          mediaType === "movie"
            ? fetchMovieCredits(tmdbId)
            : fetchTvCredits(tmdbId),
        ]);
        if (!active) return;
        setDetails(detailsData);
        const mapped: TMDBActor[] = (creditsData?.cast || [])
          .slice(0, 12)
          .map((c: any) => ({
            id: String(c.id),
            name: c.character || c.original_name || c.name || "--",
            actor: c.name || c.original_name || "--",
            image: c.profile_path
              ? { uri: `https://image.tmdb.org/t/p/w185${c.profile_path}` }
              : require("../assets/tmp/arthur.jpg"),
          }));
        setCast(mapped);
      } catch (e: any) {
        if (active) setError(e.message || "Erro a carregar detalhes");
      } finally {
        if (active) setLoadingDetails(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [tmdbId, mediaType]);

  // Sync temp rating on show change
  useEffect(() => {
    setTempRating(getRating(mediaType, tmdbId) || 0);
    setRatingEditorOpen(false);
  }, [tmdbId, mediaType]);

  // Load reviews
  useEffect(() => {
    let active = true;
    async function loadReviews(page = 1) {
      try {
        setLoadingReviews(true);
        const resp =
          page === 1
            ? await fetchReviewsWithFallback(
                mediaType,
                tmdbId,
                1,
                "pt-PT",
                "en-US",
                3
              )
            : await fetchReviews(mediaType, tmdbId, page, "pt-PT");
        if (!active) return;
        setReviews((prev) =>
          page === 1 ? resp.results : [...prev, ...resp.results]
        );
        setReviewsPage(resp.page);
        setReviewsTotalPages(resp.total_pages || 1);
      } catch (e) {
        // silencioso
      } finally {
        if (active) setLoadingReviews(false);
      }
    }
    loadReviews(1);
    setReviewMode("one");
    setExpandedReviews([]);
    return () => {
      active = false;
    };
  }, [tmdbId, mediaType]);

  // Carrega todas as páginas restantes quando pedido "Ver todas"
  const loadAllRemainingReviewPages = async () => {
    if (loadingAllPages) return;
    try {
      setLoadingAllPages(true);
      if (!allLanguagesLoaded) {
        // Buscar todas as reviews (todas as línguas) desde a página 1
        const firstAll = await fetchReviews(mediaType, tmdbId, 1, "");
        const totalPagesAll = firstAll.total_pages || 1;
        // merge mantendo as que já existem
        setReviews((prev) => {
          const existing = new Set(prev.map((r) => r.id));
          const merged = [...prev];
          for (const r of firstAll.results)
            if (!existing.has(r.id)) merged.push(r);
          return merged;
        });
        setReviewsPage(1);
        setReviewsTotalPages(totalPagesAll);
        setAllLanguagesLoaded(true);
        // Carregar restantes páginas (>=2)
        for (let p = 2; p <= totalPagesAll; p++) {
          const resp = await fetchReviews(mediaType, tmdbId, p, "");
          setReviews((prev) => {
            const existing = new Set(prev.map((r) => r.id));
            const merged = [...prev];
            for (const r of resp.results)
              if (!existing.has(r.id)) merged.push(r);
            return merged;
          });
          setReviewsPage(p);
        }
      } else if (reviewsPage < reviewsTotalPages) {
        for (let p = reviewsPage + 1; p <= reviewsTotalPages; p++) {
          const resp = await fetchReviews(mediaType, tmdbId, p, "");
          setReviews((prev) => {
            const existing = new Set(prev.map((r) => r.id));
            const merged = [...prev];
            for (const r of resp.results)
              if (!existing.has(r.id)) merged.push(r);
            return merged;
          });
          setReviewsPage(p);
        }
      }
    } finally {
      setLoadingAllPages(false);
    }
  };

  if (!show) {
    return (
      <View className="flex-1 bg-[#282534] justify-center items-center">
        <Text className="text-white text-xl">A carregar...</Text>
      </View>
    );
  }

  const year =
    (mediaType === "movie" ? show.release_date : show.first_air_date)?.slice(
      0,
      4
    ) ?? "--";

  const runtimeMinutes: number | undefined =
    mediaType === "movie" ? details?.runtime : undefined;
  const numberOfEpisodes: number | undefined =
    mediaType === "tv" ? details?.number_of_episodes : undefined;
  const genres: string =
    (details?.genres || [])
      .map((g: any) => g.name)
      .filter(Boolean)
      .join(" . ") || "--";

  const formatRuntime = (mins?: number) => {
    if (!mins && mins !== 0) return "--";
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const toTitle = (s: TMDBItem): Title => ({
    id: String(s.id),
    title: s.title || s.name || "",
    overview: s.overview || "",
    poster_path:
      typeof s.poster_path === "string"
        ? `https://image.tmdb.org/t/p/w500${s.poster_path}`
        : s.poster_path,
    genre_ids: (s.genre_ids || []).map(String),
    genres: [],
    vote_average: s.vote_average || 0,
    favorite: true,
    runtime: mediaType === "movie" ? details?.runtime : undefined,
    episodes: mediaType === "tv" ? details?.number_of_episodes : undefined,
  });

  return (
    <View className="flex-1">
      <ScrollView className="flex-1 bg-background dark:bg-background-dark">
        {/* Banner com imagem e ícones */}
        <View className="relative w-full h-[300px]">
          <Image
            source={
              typeof show.poster_path === "string"
                ? { uri: `https://image.tmdb.org/t/p/w500${show.poster_path}` }
                : show.poster_path
            }
            className="w-full h-[300px]"
            resizeMode="cover"
          />
          <View className="absolute top-0 left-0 w-full h-[300px] bg-black/30" />
          <View className="absolute top-12 left-4 flex-row items-center">
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              accessibilityLabel="Voltar"
              className="w-9 h-9 rounded-full bg-black/40 items-center justify-center"
              activeOpacity={0.85}
            >
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Card de informações essenciais */}
        <View className="px-6 mb-6 mt-6">
          <View className="bg-gray-600/40 dark:bg-gray-700/40 rounded-xl p-6">
            <Text className="text-white text-2xl font-bold mb-1 text-center">
              {show.title || show.name}
            </Text>
            <Text className="text-gray-300 text-sm mb-4 text-center">
              {year}
            </Text>
            {typeof show.vote_average === "number" && show.vote_average > 0 && (
              <View className="flex-row items-center justify-center mb-4">
                <View className="bg-[#01d277] px-2 py-0.5 rounded mr-2">
                  <Text className="text-white text-[10px] font-bold tracking-tight">
                    TMDB
                  </Text>
                </View>
                <Text className="text-white text-base font-semibold mr-4">
                  {show.vote_average.toFixed(1)}/10
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    if (!ratingEditorOpen) {
                      setTempRating(getRating(mediaType, show.id) || 0);
                    }
                    setRatingEditorOpen((prev) => !prev);
                  }}
                  className="flex-row items-center px-3 py-1 rounded-full bg-white/10"
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={
                      (getRating(mediaType, show.id) || tempRating) > 0
                        ? "star"
                        : "star-outline"
                    }
                    size={16}
                    color={"#2563EB"}
                  />
                  <Text className="text-white text-xs font-semibold ml-2">
                    Classificar
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            {ratingEditorOpen && (
              <View className="mb-4 items-center">
                <Text className="text-white text-sm font-semibold mb-3">
                  A tua classificação
                </Text>
                <View className="flex-row flex-wrap items-center justify-center mb-4">
                  {Array.from({ length: 10 }).map((_, i) => {
                    const idx = i + 1;
                    const active = tempRating >= idx;
                    return (
                      <TouchableOpacity
                        key={idx}
                        onPress={() =>
                          setTempRating(idx === tempRating ? 0 : idx)
                        }
                        className="mx-0.5 my-0.5"
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={active ? "star" : "star-outline"}
                          size={26}
                          color={active ? "#2563EB" : "#888"}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <TouchableOpacity
                  onPress={() => {
                    if (tempRating > 0)
                      setRating(mediaType, show.id, tempRating);
                    else clearRating(mediaType, show.id);
                    setRatingEditorOpen(false);
                  }}
                  className="px-6 py-2 rounded-full bg-blue-600"
                  activeOpacity={0.85}
                >
                  <Text className="text-white text-sm font-semibold">
                    Guardar
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            <View className="gap-2">
              {mediaType === "movie" && (
                <Text className="text-gray-200 text-sm">
                  Duração:{" "}
                  {loadingDetails ? "..." : formatRuntime(runtimeMinutes)}
                </Text>
              )}
              {mediaType === "tv" && (
                <Text className="text-gray-200 text-sm">
                  Episódios:{" "}
                  {loadingDetails ? "..." : (numberOfEpisodes ?? "--")}
                </Text>
              )}
              <Text className="text-gray-200 text-sm">
                {loadingDetails ? "..." : genres}
              </Text>
              {error && <Text className="text-red-400 text-xs">{error}</Text>}
            </View>
          </View>
        </View>

        {/* Botões Assistido / Favorito - abaixo do card e antes da descrição */}
        <View className="px-6 mb-4">
          <View className="flex-row gap-4 justify-start">
            {/* Favorito */}
            <TouchableOpacity
              onPress={() => toggleFavorite(toTitle(show))}
              className="p-4 rounded-full bg-gray-600/40 dark:bg-gray-700/40"
              accessibilityLabel={
                isFavorite(String(show.id))
                  ? "Remover dos favoritos"
                  : "Adicionar aos favoritos"
              }
              activeOpacity={0.8}
            >
              <Ionicons
                name={isFavorite(String(show.id)) ? "heart" : "heart-outline"}
                size={26}
                color={isFavorite(String(show.id)) ? heartColor : "#ffffff"}
              />
            </TouchableOpacity>
            {/* Assistido */}
            <TouchableOpacity
              onPress={() => toggleWatched(toTitle(show))}
              className="p-4 rounded-full bg-gray-600/40 dark:bg-gray-700/40"
              accessibilityLabel={
                isWatched(String(show.id))
                  ? "Remover dos assistidos"
                  : "Marcar como assistido"
              }
              activeOpacity={0.8}
            >
              <Ionicons
                name={isWatched(String(show.id)) ? "eye" : "eye-outline"}
                size={26}
                color={isWatched(String(show.id)) ? "#4ade80" : "#ffffff"}
              />
            </TouchableOpacity>
            {/* Watchlist */}
            <TouchableOpacity
              onPress={() => toggleWatchlist(toTitle(show))}
              className="p-4 rounded-full bg-gray-600/40 dark:bg-gray-700/40"
              accessibilityLabel={
                isInWatchlist(String(show.id))
                  ? "Remover da lista Ver mais tarde"
                  : "Adicionar à lista Ver mais tarde"
              }
              activeOpacity={0.8}
            >
              <Ionicons
                name={isInWatchlist(String(show.id)) ? "time" : "time-outline"}
                size={26}
                color={isInWatchlist(String(show.id)) ? "#2563EB" : "#ffffff"}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Info Wrapper */}
        <View className="px-6 mt-0 mb-16 dark:px-0">
          <View className="bg-gray-500 dark:bg-background-dark rounded-xl overflow-hidden">
            {/* Descrição */}
            <View className="px-6 py-4">
              <Text className="text-white dark:text-text-dark text-xl font-bold mb-4">
                Descrição
              </Text>
              <Text className="text-gray-300 dark:text-gray-300 text-base leading-6">
                {show.overview ||
                  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean magna velit, aliquet quis faucibus a, tincidunt ut felis. Sed pharetra quis mauris eget mattis. Donec in mi elit. Aliquam porta velit sit amet purus finibus..."}
              </Text>
            </View>

            {/* Atores reais do TMDB */}
            <View className="px-6 pb-8">
              <Text className="text-white dark:text-text-dark text-xl font-bold mb-4">
                Atores
              </Text>
              {cast.length === 0 && (
                <Text className="text-gray-400 text-sm">
                  {loadingDetails
                    ? "A carregar elenco..."
                    : "Sem elenco disponível."}
                </Text>
              )}
              {cast.length > 0 && (
                <FlatList
                  data={cast}
                  horizontal
                  keyExtractor={(item) => item.id}
                  showsHorizontalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <View className="items-center mr-6">
                      <TouchableOpacity
                        onPress={() =>
                          navigation.navigate("AtoresPage", { actor: item })
                        }
                      >
                        <Image
                          source={item.image}
                          className="w-20 h-20 rounded-full mb-3"
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                      <Text
                        className="text-gray-200 dark:text-text-dark text-xs font-bold text-center w-20"
                        numberOfLines={2}
                      >
                        {item.actor}
                      </Text>
                      <Text
                        className="text-gray-300 dark:text-gray-400 text-[10px] text-center w-20"
                        numberOfLines={2}
                      >
                        {item.name}
                      </Text>
                    </View>
                  )}
                />
              )}
            </View>
            {/* Reviews */}
            <View className="px-6 pb-10">
              <View className="flex-row items-center mb-4">
                <Text className="text-white dark:text-text-dark text-xl font-bold">
                  Reviews{" "}
                  {uniqueReviews.length > 0 && (
                    <Text className="text-gray-400 dark:text-gray-400">
                      {uniqueReviews.length}
                    </Text>
                  )}
                </Text>
              </View>
              {loadingReviews && uniqueReviews.length === 0 && (
                <Text className="text-gray-400 text-sm">
                  A carregar reviews...
                </Text>
              )}
              {!loadingReviews && uniqueReviews.length === 0 && (
                <Text className="text-gray-400 text-sm">
                  Sem reviews disponíveis.
                </Text>
              )}
              {uniqueReviews.length > 0 && (
                <View className="gap-6">
                  {(() => {
                    const slice =
                      reviewMode === "one"
                        ? 1
                        : reviewMode === "six"
                          ? 6
                          : uniqueReviews.length;
                    return uniqueReviews.slice(0, slice);
                  })().map((r) => {
                    const rating = r.author_details?.rating;
                    const avatar = r.author_details?.avatar_path;
                    const avatarSource = avatar
                      ? avatar.startsWith("/https")
                        ? { uri: avatar.slice(1) }
                        : avatar.startsWith("/")
                          ? { uri: `https://image.tmdb.org/t/p/w185${avatar}` }
                          : { uri: avatar }
                      : null;
                    const isExpanded = expandedReviews.includes(r.id);
                    return (
                      <View
                        key={r.id}
                        className="bg-gray-600/40 dark:bg-gray-700/40 rounded-xl p-4"
                      >
                        <View className="flex-row items-center mb-2">
                          {avatarSource && (
                            <Image
                              source={avatarSource}
                              className="w-10 h-10 rounded-full mr-3"
                            />
                          )}
                          <View className="flex-1">
                            <Text
                              className="text-white font-semibold"
                              numberOfLines={1}
                            >
                              {r.author ||
                                r.author_details?.username ||
                                "Autor"}
                            </Text>
                            <Text
                              className="text-gray-400 text-[10px]"
                              numberOfLines={1}
                            >
                              {new Date(r.created_at).toLocaleDateString()}
                            </Text>
                          </View>
                          {typeof rating === "number" && (
                            <View className="flex-row items-center">
                              <Ionicons name="star" size={14} color="#ffffff" />
                              <Text className="text-white text-xs ml-1">
                                {rating.toFixed(1)}
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text
                          className="text-gray-200 text-sm leading-5"
                          numberOfLines={isExpanded ? undefined : 8}
                        >
                          {r.content.trim()}
                        </Text>
                        {r.content.trim().length > 400 &&
                          (!isExpanded ? (
                            <TouchableOpacity
                              onPress={() =>
                                setExpandedReviews((prev) =>
                                  prev.includes(r.id) ? prev : [...prev, r.id]
                                )
                              }
                              className="mt-2 self-start px-3 py-1 rounded-full bg-white/10"
                              activeOpacity={0.8}
                            >
                              <Text className="text-white text-xs font-semibold">
                                Ver tudo
                              </Text>
                            </TouchableOpacity>
                          ) : (
                            <TouchableOpacity
                              onPress={() =>
                                setExpandedReviews((prev) =>
                                  prev.filter((id) => id !== r.id)
                                )
                              }
                              className="mt-2 self-start px-3 py-1 rounded-full bg-white/10"
                              activeOpacity={0.8}
                            >
                              <Text className="text-white text-xs font-semibold">
                                Ver menos
                              </Text>
                            </TouchableOpacity>
                          ))}
                      </View>
                    );
                  })}
                  {/* Botões de controlo */}
                  {reviewMode === "one" && uniqueReviews.length > 1 && (
                    <TouchableOpacity
                      onPress={() => setReviewMode("six")}
                      className="self-start px-4 py-2 bg-blue-600 rounded-full"
                      activeOpacity={0.8}
                    >
                      <Text className="text-white text-sm font-semibold">
                        Ver mais
                      </Text>
                    </TouchableOpacity>
                  )}
                  {reviewMode === "six" && uniqueReviews.length > 6 && (
                    <TouchableOpacity
                      onPress={async () => {
                        setReviewMode("all");
                        await loadAllRemainingReviewPages();
                      }}
                      className="self-start px-4 py-2 bg-blue-600 rounded-full"
                      activeOpacity={0.8}
                    >
                      <Text className="text-white text-sm font-semibold">
                        Ver todas
                      </Text>
                    </TouchableOpacity>
                  )}
                  {reviewMode === "six" && uniqueReviews.length <= 6 && (
                    <TouchableOpacity
                      onPress={() => setReviewMode("one")}
                      className="self-start px-4 py-2 bg-gray-600 rounded-full"
                      activeOpacity={0.8}
                    >
                      <Text className="text-white text-sm font-semibold">
                        Ver menos
                      </Text>
                    </TouchableOpacity>
                  )}
                  {reviewMode === "all" && (
                    <View className="flex-row items-center gap-4">
                      {loadingAllPages && (
                        <Text className="text-gray-400 text-xs">
                          A carregar restantes...
                        </Text>
                      )}
                      <TouchableOpacity
                        onPress={() => {
                          setReviewMode("one");
                        }}
                        className="px-4 py-2 bg-gray-600 rounded-full"
                        activeOpacity={0.8}
                      >
                        <Text className="text-white text-sm font-semibold">
                          Ver menos
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
      <FloatingChatButton />
    </View>
  );
}
