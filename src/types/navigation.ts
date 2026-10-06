import {
  NativeStackScreenProps,
  NativeStackNavigationProp,
} from "@react-navigation/native-stack";
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { CompositeScreenProps } from "@react-navigation/native";
import { TMDBItem } from "./tmdb";
import { TMDBActor } from "./tmdb";

// MoviePage param definition
export type MoviePageParams =
  | { tmdbId: number; mediaType: "movie" | "tv" }
  | {
      show: {
        id: number;
        media_type?: "movie" | "tv";
        title?: string;
        name?: string;
        overview?: string;
        poster_path?: string | any;
      };
    };

// Stack param list
export type StackParamList = {
  EditProfile: undefined;
  Login: undefined;
  NotificationsPage: undefined;
  Onboarding: undefined;
  Profile: undefined;
  Register: undefined;
  Settings: undefined;
  WatchedPage: { filter?: "movie" | "tv" } | undefined;
  WatchlistPage: undefined;
  MoviePage: MoviePageParams;
  AtoresPage: { actor: TMDBActor };
  ChatPage: { from?: string } | undefined;
  TabNavigator: undefined;
  EntryDecider: undefined;
  RecoverPassword: undefined;
  GenrePreferences: { mode?: 'onboarding' | 'edit' } | undefined;
  GenreScreen: { genre: string }; // nova rota para ver mais de um género
  RecommendedScreen: undefined; // ver mais recomendados
};

export type StackScreenProps<T extends keyof StackParamList> =
  NativeStackScreenProps<StackParamList, T>;

// Tabs param list
export type TabParamList = {
  CalendarPage: undefined;
  FavoritesPage: undefined;
  HomePage: undefined;
  SearchPage: undefined;
};

// export type TabScreenProps<T extends keyof TabParamList> = BottomTabScreenProps<
//   TabParamList,
//   T
// >;

export type TabScreenProps<T extends keyof TabParamList> = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, T>,
  NativeStackScreenProps<StackParamList>
>;

export type RootStackNav = NativeStackNavigationProp<StackParamList>;

