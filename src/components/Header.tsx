import React from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { useProfileImage } from "../hooks/useProfileImage";

interface HeaderProps {
  userName?: string;
  onNotificationsPress: () => void;
  onProfilePress: () => void;
}

export default function Header({
  userName = "Usuário",
  onNotificationsPress,
  onProfilePress,
}: HeaderProps) {
  const { isDark } = useTheme();
  const { profileImage } = useProfileImage(); // hook já carrega a foto

  return (
    <View className="pt-12 px-4 pb-4 flex-row justify-between items-center">
      
      <View>
        <Text className="text-text dark:text-text-dark text-lg">Olá</Text>
        <Text className="text-text dark:text-text-dark text-xl font-bold">
          {userName}
        </Text>
      </View>

      
      <View className="flex-row gap-3">
        
        <TouchableOpacity onPress={onNotificationsPress}>
          <View className="w-10 h-10 bg-icon dark:bg-gray-700 rounded-full items-center justify-center">
            <Ionicons name="notifications-outline" size={24} color="white" />
          </View>
        </TouchableOpacity>

      
        <TouchableOpacity onPress={onProfilePress}>
          <View className="w-10 h-10 rounded-full overflow-hidden bg-icon dark:bg-gray-700 items-center justify-center">
            {profileImage ? (
              <Image
                source={{ uri: profileImage }}
                className="w-10 h-10 rounded-full"
                resizeMode="cover"
              />
            ) : (
              <Ionicons name="person-outline" size={24} color="white" />
            )}
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}
