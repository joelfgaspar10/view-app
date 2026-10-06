import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from "react-native";
import FloatingChatButton from "../components/FloatingChatButton";
import Icon from "react-native-vector-icons/FontAwesome5";
import { Ionicons } from "@expo/vector-icons";
import { Calendar } from "react-native-calendars";
import DailyShows from "../components/DailyShows";
import TabBar from "../components/TabBar";
import { TabScreenProps } from "../types/navigation";
import { useTheme } from "../contexts/ThemeContext";
import { useNotifications } from "../contexts/NotificationsContext";
import useFetch from "../services/useFetch";
import { fetchMonthlyContent, fetchContentByDate } from "../services/api";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { StackParamList } from "../types/navigation";
import { TMDBItem } from "../types/tmdb";
import { useFavorites } from "../contexts/FavoritesContext"; // Still used elsewhere, but calendar cards switch to notification bell

// Type for calendar data
interface CalendarSection {
  date: string;
  calendarDate: string;
  items: TMDBItem[];
}

export default function CalendarPage({}: TabScreenProps<"CalendarPage">) {
  const [activeTab, setActiveTab] = useState("Todos");
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedDateContent, setSelectedDateContent] = useState<TMDBItem[]>(
    []
  );
  const [loadingSelectedDate, setLoadingSelectedDate] = useState(false);
  const [expandedSections, setExpandedSections] = useState<{
    [key: string]: boolean;
  }>({});
  const [expandedCalendar, setExpandedCalendar] = useState(false);

  const { isDark } = useTheme();
  const { isSubscribed, toggleSubscription } = useNotifications();
  const { toggleFavorite, isFavorite } = useFavorites();
  const navigation = useNavigation<NativeStackNavigationProp<StackParamList>>();

  const heartColor = isDark ? "#FF5A5F" : "#2563EB"; // Retained for any remaining heart usage
  const bellActiveColor = "#FF3B30"; // Active bell color (red)

  // Create a function to convert monthly content to calendar sections
  const convertToCalendarSections = async (): Promise<CalendarSection[]> => {
    const monthlyContent = await fetchMonthlyContent();
    const calendarSections: CalendarSection[] = [];

    // Sort the dates chronologically before processing
    const sortedDates = Object.keys(monthlyContent).sort((a, b) => {
      return new Date(a).getTime() - new Date(b).getTime();
    });

    for (const dateKey of sortedDates) {
      const items = monthlyContent[dateKey];
      if (items.length > 0) {
        const targetDate = new Date(dateKey + "T00:00:00.000Z");
        const formattedDate = targetDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });

        calendarSections.push({
          date: formattedDate,
          calendarDate: dateKey,
          items: items,
        });
      }
    }

    return calendarSections;
  };

  // Fetch calendar data using the converted function
  const {
    data: calendarData,
    loading,
    error,
  } = useFetch<CalendarSection[]>(convertToCalendarSections);

  // Use API data or fallback to empty array
  const allData = calendarData || [];

  // Filter data based on active tab using TMDBItem media type
  const filterCalendarSections = (sections: CalendarSection[]) => {
    if (activeTab === "Todos") return sections;

    return sections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => {
          if (activeTab === "Filmes") {
            // Movies have title property or media_type === "movie"
            return item.media_type === "movie" || (item.title && !item.name);
          } else if (activeTab === "Series") {
            // TV shows have name property or media_type === "tv"
            return item.media_type === "tv" || (item.name && !item.title);
          }
          return true;
        }),
      }))
      .filter((section) => section.items.length > 0); // Remove empty sections
  };

  const filteredCalendarData = filterCalendarSections(allData);

  // Fetch content for specific selected date using your existing function
  useEffect(() => {
    if (selectedDate) {
      setLoadingSelectedDate(true);
      fetchContentByDate(selectedDate)
        .then((content) => {
          setSelectedDateContent(content);
        })
        .catch((error) => {
          console.error("Error fetching selected date content:", error);
          setSelectedDateContent([]);
        })
        .finally(() => {
          setLoadingSelectedDate(false);
        });
    } else {
      setSelectedDateContent([]);
    }
  }, [selectedDate]); // Re-fetch when selectedDate changes

  // Filter selected date content based on active tab
  const getFilteredSelectedContent = () => {
    let filteredContent = selectedDateContent;
    if (activeTab !== "Todos") {
      filteredContent = selectedDateContent.filter((item) => {
        if (activeTab === "Filmes") {
          return item.media_type === "movie" || (item.title && !item.name);
        } else if (activeTab === "Series") {
          return item.media_type === "tv" || (item.name && !item.title);
        }
        return true;
      });
    }
    return filteredContent;
  };

  const filteredSelectedContent = getFilteredSelectedContent();

  // Get today's date in YYYY-MM-DD format
  const todayDate = new Date().toISOString().slice(0, 10);

  // Calendar styling
  const primary = "#4361EE";
  const lightBg = "#F3F4F6";
  const lightText = "#000000";
  const darkBg = "#282534";
  const darkText = "#FFFFFF";

  const calendarBg = isDark ? darkBg : lightBg;
  const calendarText = isDark ? darkText : lightText;

  const CALENDAR_THEME = {
    backgroundColor: calendarBg,
    calendarBackground: calendarBg,
    textSectionTitleColor: calendarText,
    selectedDayBackgroundColor: primary,
    selectedDayTextColor: "#ffffff",
    todayTextColor: isDark ? "#ffffff" : primary,
    todayBackgroundColor: calendarBg,
    dayTextColor: calendarText,
    textDisabledColor: isDark ? "#666666" : "#9CA3AF",
    dotColor: primary,
    selectedDotColor: "#ffffff",
    arrowColor: primary,
    disabledArrowColor: isDark ? "#666666" : "#9CA3AF",
    monthTextColor: calendarText,
    indicatorColor: primary,
    textDayFontWeight: "300" as const,
    textMonthFontWeight: "bold" as const,
    textDayHeaderFontWeight: "300" as const,
    textDayFontSize: 16,
    textMonthFontSize: 16,
    textDayHeaderFontSize: 13,
  };

  // Navigation handler
  const handleShowPress = (show: TMDBItem) => {
    navigation.navigate("MoviePage", { show });
  };

  // Favorite handler (kept for other potential uses)
  const handleToggleFavorite = (show: TMDBItem) => {
    // Convert TMDBItem to Title format for favorites context
    const titleItem = {
      id: show.id.toString(),
      title: show.title || show.name || "",
      overview: show.overview || "",
      poster_path: show.poster_path || "",
      genre_ids: show.genre_ids?.map((id) => id.toString()) || [],
      genres: [], // Will be populated from genre mapping if needed
      vote_average: show.vote_average || 0,
      favorite: false, // Will be updated by context
    };
    toggleFavorite(titleItem);
  };

  // Notification bell handler para apenas alternar a inscrição (sem navegar)
  const handleToggleNotification = async (
    show: TMDBItem,
    explicitDate?: string
  ) => {
    const wasSubscribed = isSubscribed(String(show.id));
    // Build minimal Episode-like object expected by toggleSubscription
    const episodeLike = {
      id: show.id.toString(),
      title: show.title || show.name || "",
      description: show.overview || "",
      genres: [],
      rating: typeof show.vote_average === "number" ? show.vote_average : 0,
      image: { uri: `https://image.tmdb.org/t/p/w500${show.poster_path}` },
      favorite: false,
    } as any; // cast to Episode shape

    // Determine release date priority: explicit (calendar day) > selectedDate state > show dates > today
    const releaseDateStr =
      explicitDate && explicitDate.length === 10
        ? explicitDate
        : selectedDate && selectedDate.length === 10
          ? selectedDate
          : show.first_air_date ||
            show.release_date ||
            new Date().toISOString().split("T")[0];
    // ISO com hora fixa para agendamento (meio-dia UTC)
    const releaseISO = `${releaseDateStr}T12:00:00.000Z`;
    try {
      await toggleSubscription(episodeLike, releaseISO);
      if (!wasSubscribed) {
        // Calcular diferença em dias sem impacto de timezone: tratar strings YYYY-MM-DD
        const now = new Date();
        const makeLocalMidnight = (d: Date) =>
          new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const todayMidnight = makeLocalMidnight(now);
        const [y, m, d] = releaseDateStr.split("-").map(Number);
        const targetMidnight = new Date(y, (m || 1) - 1, d || 1);
        const diffMs = targetMidnight.getTime() - todayMidnight.getTime();
        const diffDays = diffMs <= 0 ? 0 : Math.round(diffMs / 86400000);
        const msg =
          diffDays === 0
            ? "Serás notificado hoje."
            : `Serás notificado em ${diffDays} ${diffDays === 1 ? "dia" : "dias"}.`;
        Alert.alert("Notificação ativada", msg);
      } else {
        Alert.alert("Notificação", "Notificação removida.");
      }
    } catch (e) {
      console.warn("Failed to toggle subscription", e);
      Alert.alert("Erro", "Não foi possível alternar a notificação.");
    }
  };

  // Create marked dates from filtered data based on active tab
  const markedDates = filteredCalendarData.reduce((acc, section) => {
    const hasReleases = section.items.length > 0;

    if (!hasReleases) return acc; // Don't mark days without releases

    if (selectedDate === section.calendarDate) {
      // Selected date with releases
      acc[section.calendarDate] = {
        marked: true,
        dotColor: "#ffffff", // White dot on selected (blue) background
        customStyles: {
          container: {
            backgroundColor: primary,
            borderRadius: 16,
          },
          text: {
            color: "#fff",
            fontWeight: "bold",
          },
        },
      };
    } else {
      // Regular date with releases
      acc[section.calendarDate] = {
        marked: true,
        dotColor: primary, // Blue dot on regular background
      };
    }
    return acc;
  }, {} as any);

  // Mark today with special styling
  const todayTextColor = isDark ? "#fff" : primary;

  if (!markedDates[todayDate]) {
    // Today without releases - just border
    markedDates[todayDate] = {
      customStyles: {
        container: {
          borderColor: primary,
          borderWidth: 2,
          borderRadius: 16,
          backgroundColor: calendarBg,
        },
        text: {
          color: todayTextColor,
          fontWeight: "bold",
        },
      },
    };
  } else if (selectedDate !== todayDate) {
    // Today with releases but not selected - border + dot
    markedDates[todayDate] = {
      ...markedDates[todayDate], // Keep the existing marked and dotColor
      customStyles: {
        container: {
          borderColor: primary,
          borderWidth: 2,
          borderRadius: 16,
          backgroundColor: calendarBg,
        },
        text: {
          color: todayTextColor,
          fontWeight: "bold",
        },
      },
    };
  }

  // Handle selected day styling
  if (selectedDate) {
    if (selectedDate === todayDate) {
      markedDates[selectedDate] = {
        ...markedDates[selectedDate],
        customStyles: {
          container: {
            backgroundColor: primary,
            borderColor: primary,
            borderWidth: 2,
            borderRadius: 16,
          },
          text: {
            color: "#fff",
            fontWeight: "bold",
          },
        },
      };
    } else {
      markedDates[selectedDate] = {
        ...markedDates[selectedDate],
        customStyles: {
          container: {
            backgroundColor: primary,
            borderRadius: 16,
          },
          text: {
            color: "#fff",
            fontWeight: "bold",
          },
        },
      };
    }
  }

  const handleVerMais = (selectedCalendarDate?: string) => {
    setShowCalendar(true);
    if (selectedCalendarDate) {
      setSelectedDate(selectedCalendarDate);
    }
  };

  const handleCalendarToggle = () => {
    if (showCalendar) {
      // If calendar is open, close it and go back to list view
      setShowCalendar(false);
      setSelectedDate("");
    } else {
      // If calendar is closed, open it
      setShowCalendar(true);
    }
  };

  const handleBackToList = () => {
    setShowCalendar(false);
    setSelectedDate("");
  };

  const onDayPress = (day: any) => {
    setSelectedDate(day.dateString);
  };

  // Loading state
  if (loading) {
    return (
      <View className="flex-1 bg-background dark:bg-background-dark pt-12 justify-center items-center">
        <Text className="text-text dark:text-text-dark">
          Loading calendar...
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background dark:bg-background-dark pt-12">
      {/* Header unificado */}
      <View className="px-4 pb-3 items-center justify-center">
        <Text
          className="text-text dark:text-text-dark text-2xl font-semibold"
          numberOfLines={1}
        >
          Calendário
        </Text>
      </View>

      {/* Tabs */}
      <TabBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        showCalendarIcon={true}
        onCalendarPress={handleCalendarToggle}
        calendarActive={showCalendar}
      />

      {/* Calendar or List View */}
      {showCalendar ? (
        <ScrollView className="flex-1 px-3">
          {/* Calendar */}
          <View className="mb-4">
            <Calendar
              markingType="custom"
              theme={CALENDAR_THEME}
              markedDates={markedDates}
              onDayPress={onDayPress}
              enableSwipeMonths={true}
            />
          </View>

          {/* Episodes for selected date */}
          {selectedDate && (
            <View className="mb-6">
              <Text className="text-text dark:text-text-dark font-semibold text-lg mb-3 px-1">
                Lançamentos para {selectedDate}
              </Text>

              {loadingSelectedDate ? (
                <Text className="text-gray-400 text-center py-4">
                  Loading...
                </Text>
              ) : (
                <>
                  {(() => {
                    const visibleContent = expandedCalendar
                      ? filteredSelectedContent.slice(
                          0,
                          Math.min(filteredSelectedContent.length, 10)
                        )
                      : filteredSelectedContent.slice(
                          0,
                          Math.min(filteredSelectedContent.length, 2)
                        );

                    return visibleContent.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        className="flex-row bg-gray-500 dark:bg-[#33415C] rounded-2xl mb-4 h-32"
                        onPress={() => handleShowPress(item)}
                      >
                        {/* Notification Bell */}
                        <TouchableOpacity
                          onPress={() =>
                            handleToggleNotification(item, selectedDate)
                          }
                          className="absolute z-10 bottom-2 right-2 p-1"
                          activeOpacity={0.7}
                          accessibilityLabel="Alternar notificação"
                        >
                          <Ionicons
                            name={
                              isSubscribed(String(item.id))
                                ? "notifications"
                                : "notifications-outline"
                            }
                            size={20}
                            color={
                              isSubscribed(String(item.id))
                                ? bellActiveColor
                                : "#fff"
                            }
                          />
                        </TouchableOpacity>
                        <Image
                          source={{
                            uri: `https://image.tmdb.org/t/p/w500${item.poster_path}`,
                          }}
                          className="w-24 h-full rounded-xl mr-3"
                          resizeMode="cover"
                        />
                        <View className="flex-1 px-3 justify-center">
                          <Text
                            className="text-white font-bold text-base mb-2"
                            numberOfLines={1}
                          >
                            {item.title || item.name}
                          </Text>
                          {(() => {
                            const isTV =
                              item.media_type === "tv" ||
                              (!!item.first_air_date && !item.release_date) ||
                              (!!item.name && !item.title);
                            return isTV ? (
                              <Text
                                className="text-gray-300 text-xs mb-1"
                                numberOfLines={1}
                              >
                                Episódio novo
                              </Text>
                            ) : null;
                          })()}
                          <View className="flex-row items-center">
                            <View className="bg-[#01d277] px-2 py-0.5 rounded mr-2">
                              <Text className="text-white text-[10px] font-bold tracking-tight">
                                TMDB
                              </Text>
                            </View>
                            <Text className="text-white text-sm font-semibold">
                              {typeof item.vote_average === "number" &&
                              item.vote_average > 0
                                ? item.vote_average.toFixed(1) + "/10"
                                : "N/A"}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ));
                  })()}

                  {filteredSelectedContent.length > 2 && (
                    <View className="flex-row justify-center mb-6">
                      <TouchableOpacity
                        onPress={() => setExpandedCalendar(!expandedCalendar)}
                        className={`${expandedCalendar ? "bg-gray-600" : "bg-blue-600"} px-4 py-2 rounded-full`}
                        activeOpacity={0.85}
                      >
                        <Text className="text-white font-semibold text-sm">
                          {expandedCalendar ? "Ver menos" : "Ver mais"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {filteredSelectedContent.length === 0 && (
                    <Text className="text-gray-400 text-center py-8">
                      {selectedDateContent.length === 0
                        ? "No releases scheduled for this date"
                        : `No ${activeTab === "Filmes" ? "movies" : activeTab === "Series" ? "series" : "content"} scheduled for this date`}
                    </Text>
                  )}
                </>
              )}
            </View>
          )}
        </ScrollView>
      ) : (
        // Scrollable List
        <ScrollView className="flex-1 px-3">
          {filteredCalendarData.length === 0 && !loading && (
            <Text className="text-gray-400 text-center py-8">
              Sem lançamentos programados para este mês
            </Text>
          )}
          {filteredCalendarData.map((section) => (
            <View key={section.date} className="mb-6">
              {/* Date */}
              <View className="flex-row justify-between items-center mb-2 px-1">
                <Text className="text-text dark:text-text-dark font-semibold">
                  {section.date}
                </Text>
              </View>
              {/* Cards */}
              {(() => {
                const sectionKey = section.calendarDate;
                const isExpanded = expandedSections[sectionKey] || false;
                const visibleItems = isExpanded
                  ? section.items.slice(0, Math.min(section.items.length, 10))
                  : section.items.slice(0, Math.min(section.items.length, 2));

                return (
                  <>
                    {visibleItems.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        className="flex-row bg-gray-500 dark:bg-[#33415C] rounded-2xl mb-4 h-32"
                        onPress={() => handleShowPress(item)}
                      >
                        {/* Notification Bell */}
                        <TouchableOpacity
                          onPress={() =>
                            handleToggleNotification(item, section.calendarDate)
                          }
                          className="absolute z-10 bottom-2 right-2 p-1"
                          activeOpacity={0.7}
                          accessibilityLabel="Alternar notificação"
                        >
                          <Ionicons
                            name={
                              isSubscribed(String(item.id))
                                ? "notifications"
                                : "notifications-outline"
                            }
                            size={20}
                            color={
                              isSubscribed(String(item.id))
                                ? bellActiveColor
                                : "#fff"
                            }
                          />
                        </TouchableOpacity>
                        <Image
                          source={{
                            uri: `https://image.tmdb.org/t/p/w500${item.poster_path}`,
                          }}
                          className="w-24 h-full rounded-xl mr-3"
                          resizeMode="cover"
                        />
                        <View className="flex-1 px-3 justify-center">
                          <Text
                            className="text-white font-bold text-base mb-2"
                            numberOfLines={1}
                          >
                            {item.title || item.name}
                          </Text>
                          {(() => {
                            const isTV =
                              item.media_type === "tv" ||
                              (!!item.first_air_date && !item.release_date) ||
                              (!!item.name && !item.title);
                            return isTV ? (
                              <Text
                                className="text-gray-300 text-xs mb-1"
                                numberOfLines={1}
                              >
                                Episódio novo
                              </Text>
                            ) : null;
                          })()}
                          <View className="flex-row items-center">
                            <View className="bg-[#01d277] px-2 py-0.5 rounded mr-2">
                              <Text className="text-white text-[10px] font-bold tracking-tight">
                                TMDB
                              </Text>
                            </View>
                            <Text className="text-white text-sm font-semibold">
                              {typeof item.vote_average === "number" &&
                              item.vote_average > 0
                                ? item.vote_average.toFixed(1) + "/10"
                                : "N/A"}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))}

                    {section.items.length > 2 && (
                      <View className="flex-row justify-center mb-6">
                        <TouchableOpacity
                          onPress={() =>
                            setExpandedSections((prev) => ({
                              ...prev,
                              [sectionKey]: !isExpanded,
                            }))
                          }
                          className={`${isExpanded ? "bg-gray-600" : "bg-blue-600"} px-4 py-2 rounded-full`}
                          activeOpacity={0.85}
                        >
                          <Text className="text-white font-semibold text-sm">
                            {isExpanded ? "Ver menos" : "Ver mais"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </>
                );
              })()}
            </View>
          ))}
        </ScrollView>
      )}
      <FloatingChatButton />
    </View>
  );
}
