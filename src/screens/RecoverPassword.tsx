import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { StackScreenProps } from "../types/navigation";
import ProfileAvatar from "../components/ProfileAvatar";
import Icon from "react-native-vector-icons/FontAwesome5";
import { useTheme } from "../contexts/ThemeContext";
import { CustomTextInput } from "../components/CustomTextInput";
import { CustomButton } from "../components/CustomButton";
import { useEffect, useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { FIREBASE_AUTH } from "../../FirebaseConfig";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

export default function RecoverPassword({
  navigation,
  route,
}: StackScreenProps<"RecoverPassword">) {
  const mode = (route?.params as any)?.mode ?? "forgot";
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const { isDark } = useTheme();
  const iconColor = isDark ? "#FFFFFF" : "#000000";
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (mode === "change" && FIREBASE_AUTH.currentUser?.email) {
      setEmail(FIREBASE_AUTH.currentUser.email);
    }
  }, [mode]);

  const headerText =
    mode === "change" ? "Mudar password" : "Esqueceu-se da sua password?";
  const buttonText = sending
    ? "A enviar..."
    : mode === "change"
      ? "Mudar Password"
      : "Recuperar Password";

  const handleRecover = async () => {
    if (sending) return;
    const trimmed = email.trim();
    if (!trimmed) {
      Alert.alert("Email em falta", "Introduza o seu email.");
      return;
    }
    setSending(true);
    try {
      await sendPasswordResetEmail(FIREBASE_AUTH, trimmed);
      Alert.alert(
        "Email enviado",
        "Se o email existir, receberá instruções para redefinir a password."
      );
    } catch (e: any) {
      const code = e?.code as string | undefined;
      let message = "Ocorreu um erro. Tente novamente.";
      if (code === "auth/invalid-email") message = "Email inválido.";
      else if (code === "auth/user-not-found")
        message = "Se o email existir, receberá instruções para redefinir.";
      else if (code === "auth/network-request-failed")
        message = "Sem ligação à internet. Tente novamente.";
      Alert.alert("Recuperar password", message);
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAwareScrollView
      className="flex-1 bg-background dark:bg-background-dark"
      contentContainerStyle={{
        flexGrow: 1,
        paddingTop: 48,
        paddingHorizontal: 16,
        paddingBottom: insets.bottom + 24, // safe bottom spacing
      }}
      keyboardShouldPersistTaps="handled"
      enableOnAndroid
      extraScrollHeight={insets.bottom + 120} // push a bit more so the button clears the keyboard
    >
      <View className="relative items-center justify-center mb-6 pt-8 px-2">
        <TouchableOpacity
          onPress={navigation.goBack}
          accessibilityLabel="Voltar"
          className="absolute left-0 w-9 h-9 rounded-full bg-gray-500/30 dark:bg-white/10 items-center justify-center"
          activeOpacity={0.85}
        >
          <Icon name="chevron-left" size={16} color={iconColor} />
        </TouchableOpacity>
      </View>

      <View className="items-center px-2">
        <ProfileAvatar
          size={250}
          source={require("../assets/forgotPass.png")}
        />

        <Text className="text-text dark:text-text-dark text-xl font-bold mb-10 mt-10">
          {headerText}
        </Text>

        <CustomTextInput
          placeholder="Introduza o seu email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <CustomButton
          title={buttonText}
          onPress={handleRecover}
          loading={sending}
        />
      </View>
    </KeyboardAwareScrollView>
  );
}
