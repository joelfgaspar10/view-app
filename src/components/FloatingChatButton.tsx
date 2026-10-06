import React from "react";
import { TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { StackParamList } from "../types/navigation";

export default function FloatingChatButton() {
  const navigation = useNavigation<NativeStackNavigationProp<StackParamList>>();

  const handlePress = () => {
    navigation.navigate("ChatPage", { from: "TabNavigator" });
  };

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={handlePress}
      className="absolute bottom-8 right-6 w-14 h-14 rounded-full items-center justify-center bg-blueButton"
    >
      <Ionicons name="chatbubble-ellipses" size={24} color="#fff" />
    </TouchableOpacity>
  );
}
