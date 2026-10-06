import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StackParamList } from "../types/navigation";
import TabNavigator from "./TabNavigator";
import EditProfile from "../screens/EditProfile";
import Login from "../screens/Login";
import NotificationsPage from "../screens/NotificationsPage";
import MoviePage from "../screens/MoviePage";
import Profile from "../screens/Profile";
import Register from "../screens/Register";
import Settings from "../screens/Settings";
import AtoresPage from "../screens/AtoresPage";
import ChatPage from "../screens/ChatPage";
import WatchedPage from "../screens/WatchedPage";
import WatchlistPage from "../screens/WatchlistPage";
import GenrePreferences from "../screens/GenrePreferences";
import RecoverPassword from "../screens/RecoverPassword";
import GenreScreen from "../screens/GenreScreen";
import RecommendedScreen from "../screens/RecommendedScreen";
import { Platform } from "react-native";
import EntryDecider from "../screens/EntryDecider";

type Props = { user: any };
const Stack = createNativeStackNavigator<StackParamList>();

export default function RootNavigator({ user }: Props) {
  const isVerifiedUser = user && !user.isAnonymous && user.emailVerified;
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isVerifiedUser ? (
        <>
          <Stack.Screen name="EntryDecider" component={EntryDecider} />
          <Stack.Screen name="TabNavigator" component={TabNavigator} />
          <Stack.Screen name="Profile" component={Profile} />
          <Stack.Screen name="EditProfile" component={EditProfile} />
          <Stack.Screen
            name="NotificationsPage"
            component={NotificationsPage}
          />
          <Stack.Screen name="Settings" component={Settings} />
          <Stack.Screen name="MoviePage" component={MoviePage} />
          <Stack.Screen name="AtoresPage" component={AtoresPage} />
          <Stack.Screen name="WatchedPage" component={WatchedPage} />
          <Stack.Screen name="WatchlistPage" component={WatchlistPage} />
          <Stack.Screen
            name="ChatPage"
            component={ChatPage}
            options={{
              animation: Platform.select({
                ios: "slide_from_bottom",
                android: "fade_from_bottom", // smoother on Android than slide
              }),
              headerShown: false,
              freezeOnBlur: true,
            }}
          />
          <Stack.Screen name="RecoverPassword" component={RecoverPassword} />
          <Stack.Screen name="GenrePreferences" component={GenrePreferences} />
          <Stack.Screen name="GenreScreen" component={GenreScreen} />
          <Stack.Screen
            name="RecommendedScreen"
            component={RecommendedScreen}
          />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={Login} />
          <Stack.Screen name="Register" component={Register} />
          <Stack.Screen name="RecoverPassword" component={RecoverPassword} />
        </>
      )}
    </Stack.Navigator>
  );
}
