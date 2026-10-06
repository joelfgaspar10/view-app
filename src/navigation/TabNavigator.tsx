import React from "react";
import { View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Icon from "react-native-vector-icons/FontAwesome5";
import { TabParamList } from "../types/navigation";
import HomePage from "../screens/HomePage";
import CalendarPage from "../screens/CalendarPage";
import FavoritesPage from "../screens/FavoritesPage";
import SearchPage from "../screens/SearchPage";
import { useTheme } from "../contexts/ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const Tab = createBottomTabNavigator<TabParamList>();

export default function TabNavigator() {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const focusedColor = isDark ? "#2563EB" : "#2563EB";
  const defaultColor = isDark ? "#D9D9D9" : "#F3F4F6";

  return (
    <Tab.Navigator
      initialRouteName="HomePage"
      screenOptions={({ route }: { route: { name: keyof TabParamList } }) => ({
        tabBarIcon: ({ focused }: { focused: boolean }) => {
          const map: Record<string, string> = {
            HomePage: "home",
            CalendarPage: "calendar-alt",
            FavoritesPage: "heart",
            SearchPage: "search",
          };
          const iconName = map[route.name] ?? "circle";

          return (
            <Icon
              name={iconName}
              size={24}
              color={focused ? focusedColor : defaultColor}
              solid={focused}
            />
          );
        },
        tabBarIconStyle: {},
        tabBarItemStyle: { paddingVertical: 6 },
        tabBarStyle: {
          backgroundColor: isDark ? "#282534" : "#9CA3AF",
          height: 60 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 6),
          borderTopWidth: 0,
          elevation: isDark ? 6 : 8,
          shadowColor: isDark ? "#fff" : "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.15,
          shadowRadius: 4,
        },
        tabBarShowLabel: false,
        headerShown: false,
      })}
    >
      <Tab.Screen name="HomePage" component={HomePage} />
      <Tab.Screen name="CalendarPage" component={CalendarPage} />
      <Tab.Screen name="FavoritesPage" component={FavoritesPage} />
      <Tab.Screen name="SearchPage" component={SearchPage} />
    </Tab.Navigator>
  );
}
