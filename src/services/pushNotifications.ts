// src/services/pushNotifications.ts
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
} from "firebase/firestore";
import type { FirebaseApp } from "firebase/app";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function ensurePushPermissions(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status === "granted") return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.status === "granted";
}

async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("releases", {
    name: "Releases",
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#2563EB",
    sound: "default",
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

/** Register for FCM/APNs, persist token under deviceTokens/{uid}.tokens */
export async function registerForPushNotifications(
  app: FirebaseApp
): Promise<string | undefined> {
  // Remote push is not supported in Expo Go (SDK 53+).
  // Skip gracefully to avoid runtime errors in development with Expo Go.
  if (Constants.appOwnership === "expo") {
    console.warn(
      "expo-notifications: Remote push not supported in Expo Go (SDK 53+). Use a development build."
    );
    return;
  }

  const ok = await ensurePushPermissions();
  if (!ok) return;

  await ensureAndroidChannel();

  // For EAS/dev client builds this returns FCM/APNs token (not Expo Push Token).
  const device = await Notifications.getDevicePushTokenAsync();
  const token = device?.data;
  if (!token) return;

  const auth = getAuth(app);
  const db = getFirestore(app);

  // Save once user is known
  onAuthStateChanged(auth, async (u) => {
    if (!u) return;
    const ref = doc(db, "deviceTokens", u.uid);
    await setDoc(
      ref,
      { tokens: [token], updatedAt: serverTimestamp() },
      { merge: true }
    );
    await updateDoc(ref, {
      tokens: arrayUnion(token),
      updatedAt: serverTimestamp(),
    });
  });

  return token;
}
