import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";

interface TabBarProps {
  tabs?: string[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  showCalendarIcon?: boolean;
  onCalendarPress?: () => void;
  calendarActive?: boolean; // novo: estado do botão calendário
}

const DEFAULT_TABS = ["Todos", "Filmes", "Séries"];

const TabBar: React.FC<TabBarProps> = ({
  tabs = DEFAULT_TABS,
  activeTab,
  onTabChange,
  showCalendarIcon = false,
  onCalendarPress,
  calendarActive = false,
}) => {
  return (
    <View className="flex-row justify-between items-center py-2 px-5 mb-3">
      <View className="flex-row flex-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab;
          const buttonClass = isActive
            ? "flex-1 items-center py-2 rounded-full bg-button dark:bg-blueButton-dark"
            : "flex-1 items-center py-2 rounded-full bg-background border border-gray-300 dark:bg-card-dark dark:border-transparent";

          const textClass = isActive
            ? "text-white font-bold"
            : "text-black dark:text-white font-bold";

          return (
            <TouchableOpacity
              key={tab}
              className={buttonClass}
              onPress={() => onTabChange(tab)}
              style={{ marginHorizontal: 5 }}
            >
              <Text className={textClass}>{tab}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {showCalendarIcon && (
        <TouchableOpacity
          onPress={onCalendarPress}
          className={`flex-row py-2 px-6 rounded-full ${calendarActive ? 'bg-button dark:bg-blueButton-dark' : 'bg-gray-400 dark:bg-card-dark'}`}
          activeOpacity={0.8}
          style={{ marginHorizontal: 5 }}
        >
          <Icon name="calendar" size={20} color="#ffffff" />
        </TouchableOpacity>
      )}
    </View>
  );
};

export default TabBar;
