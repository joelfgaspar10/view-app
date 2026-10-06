import { StatusBar } from "expo-status-bar";
import React, { useRef, useState } from "react";
import {
  Dimensions,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ImageBackground,
  Platform,
  PixelRatio,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

interface SlideData {
  id: string;
  title: string;
  description: string;
  backgroundImage: any;
}

const slidesData: SlideData[] = [
  {
    id: "1",
    title: "Bem vindo à View",
    description:
      "Encontre os seus filmes favoritos e explore novos lançamentos com facilidade.",
    backgroundImage: require("../assets/Onboarding1.png"),
  },
  {
    id: "2",
    title: "Personalização e Recomendação",
    description: "Receba sugestões personalizadas com base no seu gosto.",
    backgroundImage: require("../assets/Onboarding2.png"),
  },
  {
    id: "3",
    title: "Listas e Favoritos",
    description: "Guarde seus filmes favoritos e crie listas personalizadas.",
    backgroundImage: require("../assets/Onboarding3.png"),
  },
];

type OnboardingScreenProps = {
  onComplete: () => void;
};

export default function OnboardingScreen({
  onComplete,
}: OnboardingScreenProps) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();

  const updateCurrentSlideIndex = (
    e: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    const contentOffsetX = e.nativeEvent.contentOffset.x;
    const currentIndex = Math.round(contentOffsetX / width);
    setCurrentSlideIndex(currentIndex);
  };

  const goToNextSlide = () => {
    const nextSlideIndex = currentSlideIndex + 1;
    if (nextSlideIndex < slidesData.length) {
      const offset = nextSlideIndex * width;
      flatListRef.current?.scrollToOffset({ offset });
      setCurrentSlideIndex(nextSlideIndex);
    }
  };

  // Calculate bottom positioning based on platform, screen size and density
  const getBottomPosition = () => {
    const screenRatio = height / width;
    const pixelDensity = PixelRatio.get();

    if (Platform.OS === "android") {
      // For Android: account for different screen ratios and densities
      if (screenRatio > 2.1) {
        // Very tall screens (like emulators with 18:9+ ratio)
        return Math.max(insets.bottom + 0, height * 0.1);
      } else if (screenRatio > 1.8) {
        // Standard tall screens
        return Math.max(insets.bottom + 40, height * 0.05);
      } else {
        // Shorter/wider screens
        return Math.max(insets.bottom + 30, height * 0.04);
      }
    } else {
      // For iOS: use percentage + safe area with better scaling
      if (screenRatio > 2.0) {
        // iPhone X and newer (taller screens)
        return Math.max(insets.bottom + 80, height * 0.08);
      } else {
        // iPhone 8 and older (shorter screens)
        return Math.max(insets.bottom + 60, height * 0.1);
      }
    }
  };

  const renderSlide = ({ item, index }: { item: SlideData; index: number }) => {
    const isLastSlide = index === slidesData.length - 1;

    return (
      <View style={{ width, height }} className="flex-1">
        <ImageBackground
          source={item.backgroundImage}
          style={{ flex: 1, width: "100%", height: "100%" }}
          resizeMode="cover"
        >
          {/* Content positioned using platform-specific logic */}
          <View
            style={{
              position: "absolute",
              bottom: getBottomPosition(),
              left: width * 0.06, // 6% from left edge
              right: width * 0.06, // 6% from right edge
              alignItems: "center",
            }}
          >
            {/* Text content */}
            <View className="items-center mb-8">
              <Text className="text-white text-2xl font-bold text-center mb-4 leading-8">
                {item.title}
              </Text>
              <Text className="text-white text-base text-center leading-6 px-4">
                {item.description}
              </Text>
            </View>

            {/* Slide indicator */}
            <View className="flex-row justify-center mb-8">
              {slidesData.map((_, dotIndex) => (
                <View
                  key={dotIndex}
                  className={`h-2 mx-1 rounded-full ${
                    dotIndex === currentSlideIndex
                      ? "w-8 bg-white"
                      : "w-2 bg-white/50"
                  }`}
                />
              ))}
            </View>

            {/* Buttons */}
            <View className="w-full">
              {isLastSlide ? (
                <TouchableOpacity
                  className="h-12 mx-2 bg-blue-600 rounded-full justify-center items-center"
                  onPress={onComplete}
                >
                  <Text className="text-white font-bold text-lg">Começar</Text>
                </TouchableOpacity>
              ) : (
                <View className="flex-row space-x-4">
                  <TouchableOpacity
                    className="flex-1 h-12 mx-2 border-2 border-blue-600 rounded-full justify-center items-center"
                    onPress={onComplete}
                  >
                    <Text className="text-white font-bold text-lg">
                      Ignorar
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="flex-1 h-12 mx-2 bg-blue-600 rounded-full justify-center items-center"
                    onPress={goToNextSlide}
                  >
                    <Text className="text-white font-bold text-lg">
                      Próximo
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </ImageBackground>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-900">
      <StatusBar style="light" />
      <FlatList
        ref={flatListRef}
        data={slidesData}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={updateCurrentSlideIndex}
        bounces={false}
        scrollEventThrottle={16}
      />
    </SafeAreaView>
  );
}
