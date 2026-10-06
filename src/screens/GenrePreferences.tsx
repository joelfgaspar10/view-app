import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  ImageBackground,
} from "react-native";
import { StackScreenProps } from "../types/navigation";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FIREBASE_AUTH, FIREBASE_DB } from "../../FirebaseConfig";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

const db = getFirestore();

const GENRES = [
  { id: 28, name: "Ação" },
  { id: 12, name: "Aventura" },
  { id: 16, name: "Animação" },
  { id: 35, name: "Comédia" },
  { id: 80, name: "Crime" },
  { id: 99, name: "Documentário" },
  { id: 18, name: "Drama" },
  { id: 10751, name: "Família" },
  { id: 14, name: "Fantasia" },
  { id: 36, name: "História" },
  { id: 27, name: "Terror" },
  { id: 10402, name: "Música" },
  { id: 9648, name: "Mistério" },
  { id: 10749, name: "Romance" },
  { id: 878, name: "Ficção Científica" },
  { id: 10770, name: "TV Movie" },
  { id: 53, name: "Thriller" },
  { id: 10752, name: "Guerra" },
  { id: 37, name: "Oeste" },
];

const fundo = require("../assets/FundoGeneros.png");

export default function GenrePreferences({
  navigation,
  route,
}: StackScreenProps<"GenrePreferences">) {
  const mode = route?.params?.mode ?? "onboarding";
  const [selected, setSelected] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [minTouched, setMinTouched] = useState(false);
  const auth = FIREBASE_AUTH;
  const currentUser = auth.currentUser;

  const toggle = (id: number) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  };

  // save handler
  const save = async () => {
    setMinTouched(true);
    if (selected.length < 3) return;
    setSaving(true);
    try {
      if (!currentUser) throw new Error("No user");

      // local cache
      await AsyncStorage.multiSet([
        [`preferences_${currentUser.uid}`, "completed"],
        [`selectedGenres_${currentUser.uid}`, JSON.stringify(selected)],
      ]);

      // upsert in Firestore
      await setDoc(
        doc(FIREBASE_DB, "users", currentUser.uid),
        {
          preferences: {
            genres: selected,
            genresUpdatedAt: new Date().toISOString(),
            minCount: 3,
            completed: true,
          },
        },
        { merge: true }
      );

      if (mode === "edit") {
        navigation.goBack();
      } else {
        navigation.navigate("TabNavigator");
      }
    } catch (e) {
      console.error("Error saving preferences:", e);
      alert("Ocorreu um erro ao salvar suas preferências. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  // load existing prefs on mount
  useEffect(() => {
    (async () => {
      if (!currentUser) return;

      const cache = await AsyncStorage.getItem(
        `selectedGenres_${currentUser.uid}`
      );
      if (cache) setSelected(JSON.parse(cache));

      try {
        const snap = await getDoc(doc(FIREBASE_DB, "users", currentUser.uid));
        const genres = snap.exists()
          ? (snap.data()?.preferences?.genres ?? [])
          : [];
        if (Array.isArray(genres) && genres.length) {
          setSelected(genres);
          await AsyncStorage.setItem(
            `selectedGenres_${currentUser.uid}`,
            JSON.stringify(genres)
          );
        }
      } catch (e) {
        console.warn("Firestore fetch failed:", e);
      }
    })();
  }, [currentUser?.uid]);

  return (
    <ImageBackground source={fundo} resizeMode="cover" className="flex-1">
      <View className="flex-1">
        <View className="flex-1" />
        <View
          className="flex-2 justify-center bg-background-dark rounded-t-3xl pt-6 pb-8 px-6"
          style={{ height: "65%" }}
        >
          <Text className="text-center text-white text-2xl font-semibold mb-8">
            Que géneros de filmes preferes?
          </Text>

          <ScrollView
            showsVerticalScrollIndicator={false}
            className="flex-1"
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            <View className="flex-row flex-wrap justify-between">
              {GENRES.map((g) => {
                const active = selected.includes(g.id);
                return (
                  <TouchableOpacity
                    key={g.id}
                    onPress={() => toggle(g.id)}
                    activeOpacity={0.8}
                    className={`flex-auto mr-3 mb-3 px-4 py-2 rounded-full items-center ${
                      active
                        ? "bg-button dark:bg-blueButton-dark"
                        : "bg-white/20 border-transparent"
                    }`}
                  >
                    <Text
                      className={`text-sm text-white ${active ? "font-bold" : ""}`}
                    >
                      {g.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <View className="mt-2" />

          <TouchableOpacity
            onPress={save}
            disabled={saving || selected.length < 3}
            className={`h-12 rounded-xl items-center justify-center mt-1 mb-4 ${
              selected.length >= 3
                ? "bg-blueButton dark:bg-blueButton-dark"
                : "bg-white/20"
            }`}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-medium text-sm">
                {selected.length < 3
                  ? `Escolhe pelo menos 3`
                  : mode === "edit"
                  ? "Guardar"
                  : "Entrar"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ImageBackground>
  );
}

