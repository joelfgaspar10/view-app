import React from "react";
import { View, TouchableOpacity } from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";

export const SocialLoginButtons = () => (
  <View className="flex-row justify-evenly w-full px-10">
    <TouchableOpacity className="w-10 h-10 rounded-full bg-textBox-dark/40 dark:bg-textBox-dark justify-center items-center">
      <Icon name="facebook-f" size={20} color="#fff" />
    </TouchableOpacity>
    <TouchableOpacity className="w-10 h-10 rounded-full bg-textBox-dark/40 dark:bg-textBox-dark justify-center items-center">
      <Icon name="google" size={20} color="#fff" />
    </TouchableOpacity>
    <TouchableOpacity className="w-10 h-10 rounded-full bg-textBox-dark/40 dark:bg-textBox-dark justify-center items-center">
      <Icon name="apple" size={20} color="#fff" />
    </TouchableOpacity>
  </View>
);
