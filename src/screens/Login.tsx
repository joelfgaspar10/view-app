import React, { useState } from "react";
import {
  Text,
  View,
  ImageBackground,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { FIREBASE_AUTH } from "../../FirebaseConfig";
import {
  signInWithEmailAndPassword,
  sendEmailVerification,
  signOut,
} from "firebase/auth";
import { CustomTextInput } from "../components/CustomTextInput";
import { CustomButton } from "../components/CustomButton";
import { DividerWithText } from "../components/DividerWithText";
import { SocialLoginButtons } from "../components/SocialLoginButtons";
import { StackScreenProps } from "../types/navigation";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

const backgroundImage = require("../assets/Login.png");

export default function Login({ navigation }: StackScreenProps<"Login">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const auth = FIREBASE_AUTH;
  const insets = useSafeAreaInsets();

  const signIn = async () => {
    setLoading(true);
    try {
      const response = await signInWithEmailAndPassword(auth, email, password);
      const u = response.user;
      if (!u.emailVerified) {
        try {
          await sendEmailVerification(u);
        } catch (e) {
          console.log("Falha ao reenviar email de verificação:", e);
        }
        await signOut(auth);
        alert(
          "A tua conta ainda não está verificada. Verifica o teu email e tenta novamente."
        );
        return;
      }
    } catch (error: any) {
      alert("Sign In failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1">
      <ImageBackground
        source={backgroundImage}
        resizeMode="cover"
        className="flex-1"
      >
        <KeyboardAwareScrollView
          className="flex-1"
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 16,
            paddingBottom: insets.bottom + 40,
          }}
          keyboardShouldPersistTaps="handled"
          enableAutomaticScroll={Platform.OS === "ios"}
          extraScrollHeight={Platform.OS === "ios" ? 120 : 0}
          enableOnAndroid={true}
          keyboardOpeningTime={0}
          extraHeight={Platform.OS === "android" ? 100 : 0}
        >
          <View className="flex-1 justify-end pb-4">
            <View className="w-full px-5 mt-48">
              <Text className="text-white text-4xl font-bold mb-10 ml-3">
                LOGIN
              </Text>

              <CustomTextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                keyboardType="email-address"
                autoCapitalize="none"
                className="bg-textBox-dark/40 border-transparent"
                textColor="#fff"
              />

              <CustomTextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                secureTextEntry={!showPassword}
                showToggle
                onToggle={() => setShowPassword((prev) => !prev)}
                iconName={showPassword ? "eye" : "eye-slash"}
                autoCapitalize="none"
                className="bg-textBox-dark/40 border-transparent mt-4"
                textColor="#fff"
              />

              <Text
                className="self-end mr-2 mt-1 text-white text-sm"
                onPress={() => navigation.navigate("RecoverPassword")}
              >
                Esqueceu-se da sua password?
              </Text>

              <CustomButton
                onPress={signIn}
                title="Entrar"
                loading={loading}
                className="mt-6 bg-blueButton dark:bg-blueButton-dark"
              />
            </View>
          </View>

          <View className="mt-8">
            <DividerWithText />

            <SocialLoginButtons />

            <Text className="mt-6 text-white text-sm text-center">
              Ainda não tem conta?{" "}
              <Text
                className="text-[#4361EE] font-bold"
                onPress={() => navigation.navigate("Register")}
              >
                Regista-te
              </Text>
            </Text>
          </View>
        </KeyboardAwareScrollView>
      </ImageBackground>
    </View>
  );
}
