import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  TouchableOpacity,
} from "react-native";
import { TMDBItem } from "../types/tmdb";

interface BannerItem {
  id: number;
  image: any;
  title: string;
  subtitle?: string;
  description?: string;
  rating?: number;
  show?: TMDBItem;
}

interface BannerProps {
  banners: BannerItem[];
  currentIndex: number;
  scrollEnabled?: boolean;
  onIndexChange?: (index: number) => void;
  onBannerPress?: (banner: BannerItem) => void;
  onScrollBeginDrag?: () => void;
  onScrollEndDrag?: () => void;
  // opcional: onMomentumScrollEnd se quiseres expor
}

export default function Banner({
  banners,
  currentIndex,
  scrollEnabled = true,
  onIndexChange,
  onBannerPress,
  onScrollBeginDrag,
  onScrollEndDrag,
}: BannerProps) {
  const windowWidth = Dimensions.get("window").width;
  const scrollRef = useRef<ScrollView | null>(null);

  // Flag para distinguir scroll programático (auto) de gesto do utilizador
  const isProgrammaticRef = useRef(false);
  const programmaticTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setProgrammatic = (v: boolean) => {
    isProgrammaticRef.current = v;
    if (programmaticTimerRef.current) clearTimeout(programmaticTimerRef.current);
    if (v) {
      // janela curta onde ignoramos o momentum end provocado pelo scrollTo
      programmaticTimerRef.current = setTimeout(() => {
        isProgrammaticRef.current = false;
        programmaticTimerRef.current = null;
      }, 400); // ligeiro buffer acima da duração da animação
    }
  };

  // Scroll para o índice atual quando muda (autoplay / setas / dots)
  useEffect(() => {
    if (!scrollRef.current) return;
    const x = windowWidth * currentIndex;
    try {
      setProgrammatic(true);
      scrollRef.current.scrollTo({ x, animated: true });
    } catch {
      // fallback sem animação (raro)
      scrollRef.current?.scrollTo({ x, animated: false });
      setProgrammatic(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, windowWidth, banners.length]);

  const handleMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    // Se foi scroll programático, ignorar este evento para evitar loop
    if (isProgrammaticRef.current) return;

    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / windowWidth);
    if (index !== currentIndex) {
      onIndexChange?.(index);
    }
  };

  return (
    <View className="relative w-full h-[200px]">
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={scrollEnabled}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        onScrollBeginDrag={() => {
          // gesto do utilizador → cancelar janela programática
          isProgrammaticRef.current = false;
          onScrollBeginDrag?.();
        }}
        onScrollEndDrag={onScrollEndDrag}
        // Opcional: ajuda em alguns devices a marcar fim de inércia
        // onScrollAnimationEnd={() => { isProgrammaticRef.current = false; }}
      >
        {banners.map((banner) => (
          <TouchableOpacity
            key={banner.id}
            activeOpacity={0.85}
            style={{ width: windowWidth }}
            onPress={() => banner.show && onBannerPress?.(banner)}
          >
            <View className="w-full h-[200px]">
              <Image
                source={banner.image}
                className="w-full h-[200px]"
                style={{ width: windowWidth }}
                resizeMode="cover"
              />
              {/* Gradient Overlay (se teu tailwind rn suportar) */}
              <View className="absolute bottom-0 left-0 right-0 h-[200px] bg-gradient-to-t from-[#282534] to-transparent">
                <View className="absolute bottom-10 left-6">
                  <Text className="text-white text-3xl font-bold mb-3" numberOfLines={1}>
                    {banner.title}
                  </Text>
                  {typeof banner.rating === "number" && banner.rating > 0 && (
                    <View className="flex-row items-center">
                      <View className="bg-[#01d277] px-2 py-0.5 rounded mr-2">
                        <Text className="text-white text-[10px] font-bold tracking-tight">TMDB</Text>
                      </View>
                      <Text className="text-white font-semibold text-base">
                        {banner.rating.toFixed(1)}/10
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Indicadores */}
      <View className="absolute bottom-4 left-0 right-0 flex-row justify-center gap-1">
        {banners.map((_, index) => (
          <View
            key={index}
            className={`w-1.5 h-1.5 rounded-full ${
              index === currentIndex ? "bg-white" : "bg-white/40"
            }`}
          />
        ))}
      </View>
    </View>
  );
}
