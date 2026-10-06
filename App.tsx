import React, { useEffect, useState } from "react";
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { preventAutoHideAsync } from "expo-splash-screen";
import { onAuthStateChanged, User } from "firebase/auth";
import { FIREBASE_AUTH } from "./FirebaseConfig";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import AsyncStorage from "@react-native-async-storage/async-storage";
import "./global.css";

// Screens & Navigation
import OnboardingScreen from "./src/screens/Onboarding";
import Splash from "./src/screens/Splash";
import RootNavigator from "./src/navigation/RootNavigator";

// Contexts
import { ThemeProvider, useTheme } from "./src/contexts/ThemeContext";
import { FavoritesProvider } from "./src/contexts/FavoritesContext";
import { NotificationsProvider } from "./src/contexts/NotificationsContext";
import { WatchedProvider } from "./src/contexts/WatchedContext";
import { RatingsProvider } from "./src/contexts/RatingsContext";
import { WatchlistProvider } from "./src/contexts/WatchlistContext";

import * as Notifications from "expo-notifications";
import { registerForPushNotifications } from "./src/services/pushNotifications";
import { FIREBASE_APP } from "./FirebaseConfig";
import { useRef } from "react";

preventAutoHideAsync();

function AppInner() {
  const { isDark } = useTheme();
  const navRef = useRef<any>(null);
  const [splashComplete, setSplashComplete] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(
    null
  );
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const isVerifiedUser = !!(user && !user.isAnonymous && user.emailVerified);

  // Verificar se o onboarding já foi concluído
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      const completed = await AsyncStorage.getItem("onboardingComplete");
      // Para produção podes usar: setOnboardingComplete(completed === "true");
      setOnboardingComplete(false); // força a mostrar onboarding durante dev
    };
    checkOnboardingStatus();
  }, []);

  // Bootstrap da autenticação (sem fallback anónimo)
  useEffect(() => {
    const unsub = onAuthStateChanged(FIREBASE_AUTH, (u) => {
      if (u) {
        setUser(u);
      } else {
        setUser(null);
      }
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  const handleOnboardingComplete = async () => {
    await AsyncStorage.setItem("onboardingComplete", "true");
    setOnboardingComplete(true);
  };

  // Register for push + set listeners (navigate when user taps a notification)
  useEffect(() => {
    registerForPushNotifications(FIREBASE_APP).catch(() => {});
    const subResp = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as any;
        // Expecting these because we'll include them in FCM payload
        const tmdbId = Number(data?.tmdbId);
        const mediaType = data?.mediaType === "tv" ? "tv" : "movie";
        if (tmdbId && navRef.current) {
          try {
            navRef.current.navigate(
              "MoviePage" as never,
              { tmdbId, mediaType } as never
            );
          } catch {}
        }
      }
    );
    return () => {
      subResp.remove();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style={isDark ? "light" : "dark"} />

      {!splashComplete ? (
        <Splash onComplete={setSplashComplete} />
      ) : !onboardingComplete ? (
        <OnboardingScreen onComplete={handleOnboardingComplete} />
      ) : !authReady ? (
        <GestureHandlerRootView style={{ flex: 1 }} />
      ) : isVerifiedUser ? (
        <WatchedProvider userId={user?.uid}>
          <FavoritesProvider userId={user?.uid}>
            <WatchlistProvider userId={user?.uid}>
              <RatingsProvider userId={user?.uid}>
                <NotificationsProvider>
                  <NavigationContainer
                    ref={navRef}
                    theme={isDark ? DarkTheme : DefaultTheme}
                  >
                    <GestureHandlerRootView style={{ flex: 1 }}>
                      <RootNavigator user={user} />
                    </GestureHandlerRootView>
                  </NavigationContainer>
                </NotificationsProvider>
              </RatingsProvider>
            </WatchlistProvider>
          </FavoritesProvider>
        </WatchedProvider>
      ) : (
        <NavigationContainer theme={isDark ? DarkTheme : DefaultTheme}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <RootNavigator user={user} />
          </GestureHandlerRootView>
        </NavigationContainer>
      )}
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}
