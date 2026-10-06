import React, { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { StackScreenProps } from "../types/navigation";
import { FIREBASE_AUTH, FIREBASE_DB } from "../../FirebaseConfig";
import { doc, getDoc } from "firebase/firestore";

export default function EntryDecider({ navigation }: StackScreenProps<"EntryDecider">) {
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const user = FIREBASE_AUTH.currentUser;
        if (!user) {
          navigation.replace("Login");
          return;
        }
        const ref = doc(FIREBASE_DB, "users", user.uid);
        const snap = await getDoc(ref);
        const completed = snap.exists() ? !!snap.data()?.preferences?.completed : false;
        if (!mounted) return;
        if (completed) {
          navigation.replace("TabNavigator");
        } else {
          navigation.replace("GenrePreferences");
        }
      } catch (e) {
        // Em caso de erro, levar o utilizador para as preferências
        navigation.replace("GenrePreferences");
      }
    })();
    return () => {
      mounted = false;
    };
  }, [navigation]);

  return (
    <View className="flex-1 items-center justify-center bg-background-dark">
      <ActivityIndicator />
    </View>
  );
}

