import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useTheme } from "../contexts/ThemeContext";

interface CalendarProps {
  dates: Array<{
    day: string;
    date: string;
    notifications: number;
    isToday: boolean;
  }>;
  selectedDate: string;
  onDateSelect: (date: string) => void;
  onViewCalendar: () => void;
}

const CalendarSection: React.FC<CalendarProps> = ({
  dates,
  selectedDate,
  onDateSelect,
  onViewCalendar,
}) => {
  const { isDark } = useTheme();

  return (
    <View className="mt-2 mb-4">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12 }}
      >
        <View className="flex-row">
          {dates.map((item, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => onDateSelect(item.date)}
              style={{
                elevation: selectedDate === item.date ? 5 : 0,
                width: 64,
              }}
              className="items-center mr-4"
            >
              <View
                className={`px-5 py-3 rounded-2xl relative ${
                  selectedDate === item.date
                    ? isDark
                      ? "bg-blue-600"
                      : "bg-blueButton"
                    : item.isToday
                      ? isDark
                        ? "bg-gray-500"
                        : "bg-gray-500"
                      : isDark
                        ? "bg-gray-700"
                        : "bg-gray-600"
                }`}
                style={{ overflow: "visible" }}
              >
                <Text className="text-gray-400 text-sm text-center mb-1">
                  {item.day}
                </Text>
                <Text className="text-white text-xl font-bold text-center">
                  {item.date}
                </Text>
                {item.notifications > 0 && (
                  <View className="absolute -top-2.5 -right-2.5 w-7 h-7 bg-red-500 rounded-full items-center justify-center z-10">
                    <Text className="text-white text-[10px] font-bold">
                      {item.notifications > 99 ? "99+" : item.notifications}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}

          {/* View Calendar Button */}
          <TouchableOpacity onPress={onViewCalendar} className="mr-4">
            <View className="px-5 py-3 rounded-2xl bg-blue-600 justify-center items-center">
              <Text className="text-gray-400 text-sm text-center mb-1">
                Ver
              </Text>
              <Text className="text-white text-sm font-semibold">
                Calendário
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

export default CalendarSection;
