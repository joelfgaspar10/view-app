import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  useRoute,
  useFocusEffect,
  useIsFocused,
} from "@react-navigation/native";
import { StackScreenProps } from "../types/navigation";
import { useTheme } from "../contexts/ThemeContext";
import axios from "axios";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";

// === CONTEXTS ===
import { useFavorites } from "../contexts/FavoritesContext"; // items = favoritos
import { useWatched } from "../contexts/WatchedContext"; // items = vistos
import { makeProfileSummary } from "../utils/makeProfileSummary";

const TMDB_IMG = "https://image.tmdb.org/t/p/w500";

type MediaItem = {
  id: number;
  title: string;
  overview?: string;
  poster_path?: string;
  media_type: "movie" | "tv";
};

type BotMessage = {
  id: string;
  role: "bot";
  text: string;
  items?: MediaItem[];
};
type UserMessage = { id: string; role: "user"; text: string };
type ChatMessage = BotMessage | UserMessage;

type ChatAPIResponse =
  | { response: { text: string; items: MediaItem[] } }
  | { response: string };

export default function ChatPage({
  navigation,
  route = useRoute<any>(),
}: StackScreenProps<"ChatPage">) {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const fromRoute: string | undefined = route.params?.from;

  // === FAVORITOS & VISTOS ===
  const { items: favoriteItems } = useFavorites();
  const { items: watchedItems } = useWatched();

  // === extrair nomes apresentáveis ===
  function toTitle(t: any) {
    return t?.title ?? t?.name ?? t?.original_title ?? t?.original_name ?? "";
  }

  const favoriteTitles = useMemo(
    () => (favoriteItems ?? []).map(toTitle).filter(Boolean),
    [favoriteItems]
  );

  const recentlyWatched = useMemo(
    () => (watchedItems ?? []).slice(-5).reverse().map(toTitle).filter(Boolean),
    [watchedItems]
  );

  // === inferir géneros preferidos a partir dos favoritos (opcional) ===
  const GENRE_PT: Record<number, string> = {
    28: "ação",
    12: "aventura",
    16: "animação",
    35: "comédia",
    80: "crime",
    99: "documentário",
    18: "drama",
    10751: "família",
    14: "fantasia",
    36: "história",
    27: "terror",
    10402: "música",
    9648: "mistério",
    10749: "romance",
    878: "ficção científica",
    10770: "filme de TV",
    53: "thriller",
    10752: "guerra",
    37: "western",
  };

  const likedGenres = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const t of favoriteItems ?? []) {
      const ids: number[] = Array.isArray((t as any).genre_ids)
        ? (t as any).genre_ids
        : [];
      for (const id of ids) counts[id] = (counts[id] ?? 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id]) => GENRE_PT[Number(id)])
      .filter(Boolean);
  }, [favoriteItems]);

  // === RESUMO DO PERFIL (agora via util) ===
  const profileSummary = useMemo(
    () => makeProfileSummary({ favoriteTitles, likedGenres, recentlyWatched }),
    [favoriteTitles, likedGenres, recentlyWatched]
  );

  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "init", role: "bot", text: "Olá! O que te apetece ver hoje?" },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);

  const listRef = useRef<FlatList<ChatMessage>>(null);
  const scrollToEnd = () =>
    requestAnimationFrame(() =>
      listRef.current?.scrollToEnd({ animated: true })
    );
  const [kbOpen, setKbOpen] = useState(false);
  const isFocused = useIsFocused();

  useEffect(() => {
    const s = Keyboard.addListener("keyboardDidShow", () => setKbOpen(true));
    const h = Keyboard.addListener("keyboardDidHide", () => setKbOpen(false));
    return () => {
      s.remove();
      h.remove();
    };
  }, []);

  useEffect(() => {
    scrollToEnd();
  }, [messages.length, typing]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        Keyboard.dismiss();
        setKbOpen(false);
      };
    }, [])
  );

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    const userMsg: UserMessage = {
      id: Date.now() + "_u",
      role: "user",
      text: trimmed,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);
    setTyping(true);

    try {
      // URL do backend definido em EXPO_PUBLIC_CHAT_API_URL (.env)
      const res = await axios.post<ChatAPIResponse>(
        `${process.env.EXPO_PUBLIC_CHAT_API_URL}/chat`,
        {
          message: trimmed,
          profile_summary: profileSummary, // ← agora vem do util
        }
      );

      const payload: any = res.data?.response;
      let botText = "Não consegui obter resposta.";
      let items: MediaItem[] | undefined;

      if (typeof payload === "string") {
        botText = payload;
      } else if (payload && typeof payload === "object") {
        botText = payload.text ?? botText;
        items = Array.isArray(payload.items) ? payload.items : undefined;
      }

      const botReply: BotMessage = {
        id: Date.now() + "_b",
        role: "bot",
        text: botText,
        items,
      };
      setMessages((prev) => [...prev, botReply]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + "_b",
          role: "bot",
          text: "Erro de ligação ao servidor.",
        },
      ]);
    } finally {
      setSending(false);
      setTyping(false);
    }
  };

  function renderAssistantItems(items?: MediaItem[]) {
    if (!items || items.length === 0) return null;
    return (
      <View className="mt-2">
        <FlatList
          horizontal
          data={items}
          keyExtractor={(it) => `${it.media_type}-${it.id}`}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 8 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              className="mr-3"
              onPress={() =>
                navigation.navigate("MoviePage", {
                  tmdbId: item.id,
                  mediaType: item.media_type, // "tv" | "movie"
                })
              }
            >
              <Image
                source={{
                  uri: `https://image.tmdb.org/t/p/w500${item.poster_path}`,
                }}
                className="w-28 h-40 rounded-xl"
                resizeMode="cover"
              />
              <Text
                className="text-xs text-center mt-1 text-gray-200"
                numberOfLines={1}
              >
                {item.title}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>
    );
  }

  const renderItem = ({ item }: { item: ChatMessage }) => {
    const isBot = item.role === "bot";
    return (
      <View className={`flex-row mb-5 px-4 ${isBot ? "" : "justify-end"}`}>
        {isBot && (
          <View className="mr-3">
            <View className="w-14 h-14 rounded-full bg-white border-2 border-blueButton dark:border-blueButton-dark items-center justify-center">
              <Ionicons
                name="chatbubbles"
                size={26}
                color={isDark ? "#4361EE" : "#223A6A"}
              />
            </View>
          </View>
        )}
        <View
          className={`max-w-[75%] rounded-2xl px-5 py-3 ${
            isBot
              ? "bg-blueButton dark:bg-blueButton-dark"
              : "bg-card dark:bg-card-dark"
          }`}
        >
          <Text className="text-white font-medium">{item.text}</Text>
          {isBot && renderAssistantItems((item as BotMessage).items)}
        </View>
      </View>
    );
  };

  const TypingBubble = () => (
    <View className="flex-row mb-5 px-4">
      <View className="mr-3">
        <View className="w-14 h-14 rounded-full bg-white border-2 border-blueButton dark:border-blueButton-dark items-center justify-center">
          <Ionicons
            name="chatbubbles"
            size={26}
            color={isDark ? "#4361EE" : "#223A6A"}
          />
        </View>
      </View>
      <View className="max-w-[75%] bg-blueButton dark:bg-blueButton-dark rounded-2xl px-5 py-3">
        <ActivityIndicator size="small" color="#fff" />
      </View>
    </View>
  );

  const handleClose = () => {
    if (fromRoute) {
      try {
        navigation.goBack();
      } catch {
        navigation.navigate(fromRoute as any);
      }
    } else {
      navigation.goBack();
    }
  };

  const headerHeight = useHeaderHeight();

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === "ios" ? "padding" : "padding"}
      keyboardVerticalOffset={headerHeight}
      enabled={isFocused}
    >
      <SafeAreaView
        className="flex-1 bg-background dark:bg-background-dark"
        edges={["top", "left", "right"]}
      >
        {/* Header */}
        <View className="px-6 pt-4 pb-4 flex-row items-center justify-between">
          <Text className="text-text dark:text-text-dark text-2xl font-semibold">
            Chat
          </Text>
          <TouchableOpacity
            onPress={handleClose}
            activeOpacity={0.8}
            className="w-8 h-8 rounded-full border border-blueButton dark:border-blueButton-dark items-center justify-center"
          >
            <Ionicons
              name="close"
              size={18}
              color={isDark ? "#fff" : "#223A6A"}
            />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderItem}
          className="flex-1 pt-10"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingVertical: 12 }}
          ListFooterComponent={typing ? <TypingBubble /> : null}
          onContentSizeChange={scrollToEnd}
        />

        {/* Composer */}
        <View
          className="px-4 pt-4 bg-transparent"
          style={{ paddingBottom: kbOpen ? 10 : Math.max(insets.bottom, 20) }}
        >
          <View className="flex-row items-center">
            <View className="flex-1 rounded-3xl bg-card dark:bg-card-dark px-5 py-3 mr-3">
              <TextInput
                value={input}
                onChangeText={setInput}
                multiline
                onFocus={scrollToEnd}
                placeholder="O que te apetece ver?"
                placeholderTextColor={isDark ? "#9CA3AF" : "#4B5563"}
                className="text-text dark:text-text-dark"
                style={{ maxHeight: 120 }}
              />
            </View>

            <TouchableOpacity
              onPress={handleSend}
              disabled={!input.trim() || sending}
              activeOpacity={0.8}
              className={`w-10 h-10 rounded-full items-center justify-center ${
                input.trim() && !sending
                  ? "bg-blueButton dark:bg-blueButton-dark"
                  : "bg-card dark:bg-card-dark opacity-80"
              }`}
            >
              <Ionicons
                name="send"
                size={18}
                color={
                  input.trim() && !sending
                    ? "#fff"
                    : isDark
                      ? "#fff"
                      : "#223A6A"
                }
              />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
