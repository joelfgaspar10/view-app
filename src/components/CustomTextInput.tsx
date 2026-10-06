import React from "react";
import { TextInput, View, TouchableOpacity } from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  placeholderTextColor?: string;
  secureTextEntry?: boolean;
  showToggle?: boolean;
  onToggle?: () => void;
  iconName?: string;
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  className?: string;
  textColor?: string; // override input text color
  textClassName?: string; // extra className for the TextInput
};

export const CustomTextInput: React.FC<Props> = ({
  value,
  onChangeText,
  placeholder,
  placeholderTextColor = "#bbb",
  secureTextEntry,
  showToggle,
  onToggle,
  iconName = "question-circle",
  keyboardType = "default",
  autoCapitalize = "none",
  className = "",
  textColor,
  textClassName,
}) => (
  <View
    className={`w-full h-12 bg-textBox dark:bg-textBox-dark border border-gray-400 dark:border-transparent rounded-xl flex-row items-center mb-5 px-4 ${className}`}
  >
    <TextInput
      className={`flex-1 text-text dark:text-text-dark ${textClassName ?? ""}`}
      style={textColor ? { color: textColor } : undefined}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={placeholderTextColor}
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
    />
    {showToggle && onToggle && (
      <TouchableOpacity onPress={onToggle} className="ml-3">
        <Icon
          name={iconName}
          size={15}
          color={textColor ?? placeholderTextColor}
        />
      </TouchableOpacity>
    )}
  </View>
);
