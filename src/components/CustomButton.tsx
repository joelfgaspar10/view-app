import React from "react";
import { TouchableOpacity, Text, ActivityIndicator } from "react-native";

type Props = {
  onPress: () => void;
  title: string;
  loading?: boolean;
  className?: string;
};

export const CustomButton: React.FC<Props> = ({
  onPress,
  title,
  loading,
  className = "",
}) => (
  <TouchableOpacity
    onPress={onPress}
    className={`w-full h-12 mt-6 bg-blueButton dark:bg-blueButton-dark rounded-2xl justify-center items-center ${className}`}
    disabled={loading}
  >
    {loading ? (
      <ActivityIndicator size="small" color="#fff" />
    ) : (
      <Text className="text-white font-bold">{title}</Text>
    )}
  </TouchableOpacity>
);
