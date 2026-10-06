import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Switch } from "react-native-gesture-handler";
import { useTheme } from "../contexts/ThemeContext";

interface ProfileMenuItemProps {
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  iconColor?: string; // Color of the icon
  iconBackgroundColor?: string;
  textColor?: string; // Color of the text
  showArrow?: boolean;
  arrowIcon?: keyof typeof Ionicons.glyphMap;
  showSwitch?: boolean;
  switchValue?: boolean;
  onSwitchToggle?: () => void;
}

const ProfileMenuItem: React.FC<ProfileMenuItemProps> = ({
  title,
  icon,
  onPress,
  iconColor,
  iconBackgroundColor = "",
  textColor,
  showArrow = true,
  showSwitch = false,
  arrowIcon = "chevron-forward",
  switchValue = true,
  onSwitchToggle,
}) => {
  const { isDark } = useTheme();

  // Set default colors based on theme, but allow override via props
  const resolvedTextColor = textColor ?? (isDark ? "#fff" : "#000");
  const resolvedIconColor = iconColor ?? (isDark ? "#fff" : "#000");

  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center rounded-xl p-4 mb-4 bg-background dark:bg-card-dark border border-gray-400 dark:border-transparent"
    >
      {icon ? (
        <View
          className="w-10 h-8 rounded-full items-center justify-center mr-4"
          style={{ backgroundColor: iconBackgroundColor }}
        >
          <Ionicons name={icon} size={20} color={resolvedIconColor} />
        </View>
      ) : null}

      <Text
        className="text-base font-medium flex-1"
        style={{ color: resolvedTextColor }}
        selectable={true}
      >
        {title}
      </Text>

      {showArrow && (
        <Ionicons name={arrowIcon} size={20} color={resolvedIconColor} />
      )}
      {showSwitch && (
        <View className="justify-center items-center h-0">
          <Switch value={switchValue} onValueChange={onSwitchToggle} />
        </View>
      )}
    </TouchableOpacity>
  );
};

export default ProfileMenuItem;
