import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import ProfileAvatar from "./ProfileAvatar";
import Icon from "react-native-vector-icons/FontAwesome5";
import { useTheme } from "../contexts/ThemeContext";

interface ProfileHeaderProps {
  title: string;
  userName: string;
  userEmail: string;
  onPress: () => void;
  onBackPress: () => void;
  editable?: boolean;
  hideBack?: boolean;
  hideUserInfo?: boolean;
  photoURL?: string | null; // nova prop opcional
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  title,
  userName,
  userEmail,
  onBackPress,
  onPress,
  editable,
  hideBack,
  hideUserInfo,
  photoURL,
}) => {
  const { isDark } = useTheme();
  const iconColor = isDark ? "#FFFFFF" : "#000000";

  return (
    <View className="pt-12 px-4 pb-6 bg-background dark:bg-background-dark">
      {/* Header centrado com seta circular */}
      <View className="relative items-center justify-center mb-6">
        {!hideBack && (
          <TouchableOpacity
            onPress={onBackPress}
            accessibilityLabel="Voltar"
            className="absolute left-0 w-9 h-9 rounded-full bg-gray-500/30 dark:bg-white/10 items-center justify-center"
            activeOpacity={0.85}
          >
            <Icon name="chevron-left" size={16} color={iconColor} />
          </TouchableOpacity>
        )}
        <Text
          className="text-text dark:text-text-dark text-2xl font-semibold"
          numberOfLines={1}
        >
          {title}
        </Text>
      </View>
      {/* User Info */}
      {!hideUserInfo && (
        <View className="items-center">
          <ProfileAvatar
            size={120}
            onPress={onPress}
            editable={editable}
            imageUri={photoURL || undefined}
          />
          <Text
            className="text-text dark:text-text-dark text-lg font-bold mb-1 mt-4"
            numberOfLines={1}
          >
            {userName}
          </Text>
          <Text
            className="text-text dark:text-text-dark text-sm"
            numberOfLines={1}
          >
            {userEmail}
          </Text>
        </View>
      )}
    </View>
  );
};

export default ProfileHeader;
