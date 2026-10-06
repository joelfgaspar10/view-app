import React from "react";
import { View, Text } from "react-native";

export const DividerWithText = ({ text = "ou" }) => (
  <View className="flex-row items-center my-6 w-full justify-center">
    <View className="h-px bg-white w-[30%]" />
    <Text className="text-white mx-6">{text}</Text>
    <View className="h-px bg-white w-[30%]" />
  </View>
);
