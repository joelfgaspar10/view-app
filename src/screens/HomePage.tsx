import React, { useState, useEffect, useRef } from "react";
import { ScrollView, View } from "react-native";
import { FIREBASE_AUTH, FIREBASE_DB } from "../../FirebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { reload } from "firebase/auth";
import {
  RootStackNav,
  StackParamList,
  TabScreenProps,
} from "../types/navigation";
import { CompositeScreenProps } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { TMDBItem } from "../types/tmdb";
import { useFavorites } from "../contexts/FavoritesContext";
import type { Title } from "../components/TitleCard";

// Components
import Header from "../components/Header";
import Banner from "../components/Banner";
import FloatingChatButton from "../components/FloatingChatButton";
import CalendarSection from "../components/CalendarSection";
import DailyShows from "../components/DailyShows";
import RecommendedShows from "../components/RecommendedShows";
import CategorySection from "../components/CategorySection";

// Hooks & API
import useFetch from "../services/useFetch";
import {
  fetchTrendingAllWeek,
  fetchDramaContent,
  fetchComedyContent,
  fetchActionContent,
  fetchRomanceContent,
  fetchCrimeContent,
  fetchWeeklyContent,
  fetchContentByDate,
} from "../services/api";
import useRecommendations from "../hooks/useRecommendations";

type HomePageProps = CompositeScreenProps<
  TabScreenProps<"HomePage">,
  NativeStackScreenProps<StackParamList>
>;

export default function HomePage({ navigation }: HomePageProps) {
  const user = FIREBASE_AUTH.currentUser;

  const [greetingName, setGreetingName] = useState("");
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().getDate().toString()
  );
  const [dailyShows, setDailyShows] = useState<TMDBItem[]>([]);
  const [dailyShowsLoading, setDailyShowsLoading] = useState(false);
  const { toggleFavorite: toggleGlobalFavorite } = useFavorites();

  // autoplay control
  const [isUserInteracting, setIsUserInteracting] = useState(false);
  const autoplayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const AUTOPLAY_MS = 8000;

  const { data: trendingShows, loading: trendingLoading } = useFetch(() =>
    fetchTrendingAllWeek({ query: "" })
  );

  const { data: weeklyContent } = useFetch(fetchWeeklyContent);

  const { data: dramaContent, loading: dramaLoading } =
    useFetch(fetchDramaContent);
  const { data: comedyContent, loading: comedyLoading } =
    useFetch(fetchComedyContent);
  const { data: actionContent, loading: actionLoading } =
    useFetch(fetchActionContent);
  const { data: romanceContent, loading: romanceLoading } =
    useFetch(fetchRomanceContent);
  const { data: crimeContent, loading: crimeLoading } =
    useFetch(fetchCrimeContent);

  const { recommendations: recommendedShows, loading: recLoading } =
    useRecommendations();

  // carregar nome
  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!user) return;
      try {
        await reload(user);
      } catch {}
      let name = user.displayName || "";
      if (!name) {
        try {
          const snap = await getDoc(doc(FIREBASE_DB, "users", user.uid));
          if (snap.exists()) {
            const full = (snap.data() as any).fullName;
            if (full) name = full;
          }
        } catch {}
      }
      if (!name && user.email) name = user.email.split("@")[0];
      if (!name) name = "Utilizador";
      if (active) setGreetingName(name.split(" ")[0]);
    };
    load();
    return () => {
      active = false;
    };
  }, [user?.uid]);

  // shows por dia
  useEffect(() => {
    const fetchDailyShows = async () => {
      setDailyShowsLoading(true);
      const today = new Date();
      const selectedDateObj = new Date(today);
      selectedDateObj.setDate(parseInt(selectedDate));
      if (selectedDateObj < today) {
        selectedDateObj.setMonth(today.getMonth() + 1);
      }
      const dateString = selectedDateObj.toISOString().split("T")[0];
      try {
        const content = await fetchContentByDate(dateString);
        setDailyShows(content);
      } catch {
        setDailyShows([]);
      } finally {
        setDailyShowsLoading(false);
      }
    };
    fetchDailyShows();
  }, [selectedDate]);

  // categorias
  const categories = [
    { title: "Drama", shows: dramaContent || [], loading: dramaLoading },
    { title: "Comédia", shows: comedyContent || [], loading: comedyLoading },
    { title: "Ação", shows: actionContent || [], loading: actionLoading },
    { title: "Romance", shows: romanceContent || [], loading: romanceLoading },
    { title: "Crime", shows: crimeContent || [], loading: crimeLoading },
  ];

  const toggleFavorite = (tmdbItem: TMDBItem) => {
    const title: Title = {
      id: String(tmdbItem.id),
      title: tmdbItem.title || tmdbItem.name || "",
      overview: tmdbItem.overview,
      poster_path: tmdbItem.poster_path,
      genre_ids: tmdbItem.genre_ids.map(String),
      genres: [],
      vote_average: tmdbItem.vote_average,
      favorite: true,
    };
    toggleGlobalFavorite(title);
  };

  const getDays = () => {
    const today = new Date();
    const days = [];
    for (let i = -2; i < 12; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.getDate().toString();
      const notificationCount =
        weeklyContent && weeklyContent[dateStr]
          ? weeklyContent[dateStr].length
          : 0;
      days.push({
        day: date.toLocaleDateString("pt-BR", { weekday: "short" }).slice(0, 3),
        date: dateStr,
        notifications: notificationCount,
        isToday: i === 0,
      });
    }
    return days;
  };

  const dynamicBanners = (trendingShows || [])
    .filter((t: TMDBItem) => t.backdrop_path || t.poster_path)
    .slice(0, 5)
    .map((t: TMDBItem, idx: number) => ({
      id: t.id || idx,
      image: t.backdrop_path
        ? { uri: `https://image.tmdb.org/t/p/w780${t.backdrop_path}` }
        : t.poster_path
          ? { uri: `https://image.tmdb.org/t/p/w500${t.poster_path}` }
          : require("../assets/tmp/lucifer.png"),
      title: t.title || t.name || "Sem título",
      subtitle: `#${idx + 1} Trending`,
      description: "",
      rating: typeof t.vote_average === "number" ? t.vote_average : 0,
      show: t,
    }));

  const fallbackBanners = [
    {
      id: 1,
      image: require("../assets/tmp/lucifer.png"),
      title: "A carregar",
      subtitle: "Trending",
      description: "",
      rating: 0,
    },
  ];

  const banners = dynamicBanners.length ? dynamicBanners : fallbackBanners;

  // reset index quando muda o conjunto de banners
  useEffect(() => {
    setCurrentBannerIndex(0);
  }, [banners.length]);

  // ——— AUTOPLAY SEM CONFLITO ———
  const clearAutoplay = () => {
    if (autoplayRef.current) {
      clearTimeout(autoplayRef.current);
      autoplayRef.current = null;
    }
  };

  const scheduleAutoplay = () => {
    clearAutoplay();
    if (!banners.length || isUserInteracting) return;
    autoplayRef.current = setTimeout(() => {
      setCurrentBannerIndex((prev) =>
        prev === banners.length - 1 ? 0 : prev + 1
      );
    }, AUTOPLAY_MS);
  };

  // re-agenda sempre que índice, lista ou interação mudam
  useEffect(() => {
    scheduleAutoplay();
    return clearAutoplay;
  }, [currentBannerIndex, banners.length, isUserInteracting]);

  // handlers passados ao Banner
  const handleScrollBeginDrag = () => {
    setIsUserInteracting(true);
    clearAutoplay();
  };
  const handleScrollEndDrag = () => {
    // pequena janela para a inércia terminar
    setTimeout(() => setIsUserInteracting(false), 1000);
  };

  return (
    <View className="flex-1">
      <ScrollView className="flex-1 bg-background dark:bg-background-dark">
        {/* Header */}
        <Header
          userName={greetingName || "Utilizador"}
          onNotificationsPress={() => navigation.navigate("NotificationsPage")}
          onProfilePress={() => navigation.navigate("Profile")}
        />

        {/* Main Banner */}
        <Banner
          banners={banners}
          currentIndex={currentBannerIndex}
          scrollEnabled
          onIndexChange={setCurrentBannerIndex}
          onBannerPress={(b) => {
            if (!b.show) return;
            const mtype =
              (b.show as any).media_type ?? (b.show.name ? "tv" : "movie");
            navigation.navigate("MoviePage", {
              tmdbId: b.show.id,
              mediaType: mtype,
            });
          }}
        />

        {/* Calendar Section */}
        <CalendarSection
          dates={getDays()}
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          onViewCalendar={() => navigation.navigate("CalendarPage")}
        />

        {/* Daily Shows */}
        <DailyShows
          selectedDate={selectedDate}
          shows={dailyShows}
          loading={dailyShowsLoading}
          onToggleFavorite={toggleFavorite}
          onShowPress={(show) => {
            const mtype =
              (show as any).media_type ?? (show.name ? "tv" : "movie");
            navigation.navigate("MoviePage", {
              tmdbId: show.id,
              mediaType: mtype,
            });
          }}
        />

        {/* Personalized Recommendations */}
        <RecommendedShows
          shows={recommendedShows}
          loading={recLoading}
          onToggleFavorite={toggleFavorite}
          onShowPress={(show) => {
            const mtype =
              (show as any).media_type ?? (show.name ? "tv" : "movie");
            navigation.navigate("MoviePage", {
              tmdbId: show.id,
              mediaType: mtype,
            });
          }}
          onSeeMorePress={() => navigation.navigate("RecommendedScreen")}
        />

        {/* Extra Categories */}
        {categories.map((category, index) => (
          <CategorySection
            key={index}
            title={category.title}
            shows={category.shows}
            loading={category.loading}
            onShowPress={(show) => {
              const mtype =
                (show as any).media_type ?? (show.name ? "tv" : "movie");
              navigation.navigate("MoviePage", {
                tmdbId: show.id,
                mediaType: mtype,
              });
            }}
            onSeeMorePress={() =>
              navigation.navigate("GenreScreen", { genre: category.title })
            }
          />
        ))}
      </ScrollView>
      <FloatingChatButton />
    </View>
  );
}
