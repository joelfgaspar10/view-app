import * as Notifications from "expo-notifications";
import { SchedulableTriggerInputTypes } from "expo-notifications";
import { Platform } from "react-native";

export async function ensureNotificationPermissions(): Promise<boolean> {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      // keep alert for back-compat; SDK requires banner/list booleans
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
  const perms = await Notifications.getPermissionsAsync();
  if (perms.status !== "granted") {
    const req = await Notifications.requestPermissionsAsync();
    if (req.status !== "granted") return false;
  }
  await ensureAndroidChannel();
  return true;
}

export async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return;
  try {
    await Notifications.setNotificationChannelAsync("releases", {
      name: "Releases",
      importance: Notifications.AndroidImportance.HIGH,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#2563EB",
      sound: "default",
    });
  } catch {}
}

/**
 * Schedule a local notification for a future Date (UTC safe).
 * Returns scheduled notification id.
 */
export async function scheduleLocalRelease({
  id,
  title,
  body,
  date,
  data,
}: {
  id: string;
  title: string;
  body: string;
  date: Date | string;
  data?: Record<string, any>;
}) {
  await ensureAndroidChannel();
  const when = typeof date === "string" ? new Date(date) : date;
  const diff = when.getTime() - Date.now();
  // If the time is too close/past (race conditions), force a small delay so Android always shows it
  const trigger: Notifications.NotificationTriggerInput =
    diff <= 1500
      ? {
          type: SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 2,
          channelId: "releases",
        }
      : {
          type: SchedulableTriggerInputTypes.DATE,
          date: when,
          channelId: "releases",
        };
  return Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data ?? {},
    },
    trigger,
    identifier: id,
  });
}

export async function cancelLocalNotification(id: string) {
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {}
}

export async function listScheduled() {
  return Notifications.getAllScheduledNotificationsAsync();
}

export function isDateInPast(d: Date) {
  return d.getTime() < Date.now();
}
