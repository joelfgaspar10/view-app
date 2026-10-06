import React from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
} from "react-native";

type UsernameModalProps = {
  visible: boolean;
  value: string;
  onChange: (t: string) => void;
  onSave: () => void;
  onCancel: () => void;
  loading?: boolean;
};

export function UsernameModal({
  visible,
  value,
  onChange,
  onSave,
  onCancel,
  loading,
}: UsernameModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }}
        onPress={onCancel}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1 justify-end"
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="bg-white dark:bg-card-dark rounded-t-2xl p-5"
          >
            <ScrollView
              keyboardShouldPersistTaps="always"
              contentContainerStyle={{ padding: 20 }}
            >
              <Text className="text-lg font-semibold text-text dark:text-text-dark mb-3">
                Alterar Nome de utilizador
              </Text>

              <TextInput
                value={value}
                onChangeText={onChange}
                placeholder="novo nome de utilizador"
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={30}
                returnKeyType="done"
                onSubmitEditing={onSave}
                blurOnSubmit
                className="border border-gray-400 dark:border-gray-700 rounded-xl px-3 py-3 text-base bg-white dark:bg-gray-200 text-text dark:text-text"
              />

              <View className="flex-row gap-3 mt-4">
                <TouchableOpacity
                  className="flex-1 rounded-xl border border-gray-400 dark:border-gray-400 p-3 items-center"
                  onPress={() => {
                    Keyboard.dismiss();
                    onCancel();
                  }}
                  disabled={!!loading}
                >
                  <Text className="text-text dark:text-text-dark">
                    Cancelar
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 rounded-xl bg-blueButton dark:bg-blueButton-dark p-3 items-center"
                  onPress={() => {
                    Keyboard.dismiss();
                    onSave();
                  }}
                  disabled={!!loading || !value.trim()}
                  style={{ opacity: loading || !value.trim() ? 0.6 : 1 }}
                >
                  <Text className="text-white dark:text-text-dark">
                    {loading ? "A guardar..." : "Guardar"}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}
