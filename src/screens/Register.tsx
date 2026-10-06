import React, { useState } from "react";
import {
  Text,
  View,
  ImageBackground,
  TouchableOpacity,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
  Linking,
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  signOut,
} from "firebase/auth";
import { getFirestore, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { FIREBASE_AUTH } from "../../FirebaseConfig";
import { CustomTextInput } from "../components/CustomTextInput";
import { SocialLoginButtons } from "../components/SocialLoginButtons";
import { DividerWithText } from "../components/DividerWithText";
import { CustomButton } from "../components/CustomButton";
import { StackScreenProps } from "../types/navigation";

const auth = FIREBASE_AUTH;
const backgroundImage = require("../assets/Register.png");

export default function Register({ navigation }: StackScreenProps<"Register">) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [birthDate, setBirthDate] = useState<Date | undefined>();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [acceptedGdpr, setAcceptedGdpr] = useState(false);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setBirthDate(selectedDate);
    }
  };

  const formattedDate = birthDate
    ? `${birthDate.getDate().toString().padStart(2, "0")}/${(
        birthDate.getMonth() + 1
      )
        .toString()
        .padStart(2, "0")}/${birthDate.getFullYear()}`
    : "";

  const signUp = async () => {
    if (!fullName.trim()) {
      alert("Insere o nome completo.");
      return;
    }
    if (password !== confirmPassword) {
      alert("As passwords não coincidem.");
      return;
    }
    if (password.length < 6) {
      alert("Password mínimo 6 caracteres.");
      return;
    }
    if (!acceptedGdpr) {
      alert(
        "Para concluir o registo, é necessário aceitar a Política de Privacidade e os Termos."
      );
      return;
    }
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );
      await updateProfile(cred.user, { displayName: fullName.trim() });
      const db = getFirestore();
      await setDoc(doc(db, "users", cred.user.uid), {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        birthDate: birthDate ? birthDate.toISOString().slice(0, 10) : null,
        gdpr: {
          consented: true,
          policyVersion: "v1",
          consentedAt: serverTimestamp(),
        },
        preferences: { completed: false },
        createdAt: serverTimestamp(),
      });
      try {
        await sendEmailVerification(cred.user);
        alert(
          `Registo concluído. Enviámos um email de confirmação para ${email.trim()}. Por favor verifica o teu email antes de iniciar sessão.`
        );
      } catch (e) {
        console.log("Falha ao enviar email de confirmação:", e);
      }
      await signOut(auth);
      navigation.navigate("Login");
    } catch (error: any) {
      alert("Falha no registo: " + (error?.message || ""));
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
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
          >
            <View className="flex-1 w-full px-5 pt-24 pb-24 justify-end items-center">
              <Text className="text-white w-full text-4xl font-bold mb-10 ml-3 justify-left">
                REGISTO
              </Text>

              <View className="w-full items-center">
                <CustomTextInput
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Nome completo"
                  className="bg-textBox-dark/40 border-transparent"
                  textColor="#fff"
                />

                <CustomTextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email"
                  keyboardType="email-address"
                  className="bg-textBox-dark border-transparent"
                  textColor="#fff"
                />

                {/* Birthdate selection */}
                <TouchableOpacity
                  className="w-full h-12 bg-textBox-dark rounded-xl mb-5 px-4 flex-row items-center justify-between"
                  onPress={() => setShowDatePicker(true)}
                  activeOpacity={0.5}
                >
                  <Text
                    className={`text-base ${formattedDate ? "text-white" : "text-[#bbb]"}`}
                  >
                    {formattedDate || "Data de nascimento"}
                  </Text>
                  <Icon name="chevron-down" size={15} color="#bbb" />
                </TouchableOpacity>

                {showDatePicker && (
                  <DateTimePicker
                    value={birthDate || new Date()}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "spinner"}
                    onChange={handleDateChange}
                    className="bg-textBox-dark/40"
                  />
                )}

                <CustomTextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password"
                  secureTextEntry={!showPassword}
                  showToggle
                  onToggle={() => setShowPassword((prev) => !prev)}
                  iconName={showPassword ? "eye" : "eye-slash"}
                  className="bg-textBox-dark/40 border-transparent"
                  textColor="#fff"
                />

                <CustomTextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Repita a Password"
                  secureTextEntry={!showConfirmPassword}
                  showToggle
                  onToggle={() => setShowConfirmPassword((prev) => !prev)}
                  iconName={showConfirmPassword ? "eye" : "eye-slash"}
                  className="bg-textBox-dark/40 border-transparent"
                  textColor="#fff"
                />

                {/* GDPR consent */}
                <View className="w-full flex-row items-start mt-1 mb-1">
                  <TouchableOpacity
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: acceptedGdpr }}
                    onPress={() => setAcceptedGdpr((v) => !v)}
                    className="w-6 h-6 mr-3 mt-1 rounded-md border border-white/60 items-center justify-center"
                    activeOpacity={0.7}
                  >
                    {acceptedGdpr ? (
                      <Icon name="check" size={14} color="#fff" />
                    ) : null}
                  </TouchableOpacity>
                  <Text className="flex-1 text-white text-xs leading-5">
                    Ao registar, confirmo que li e aceito a
                    {" "}
                    <Text
                      className="text-[#4361EE] underline"
                      onPress={() =>
                        Linking.openURL(
                          "https://exemplo.com/politica-de-privacidade"
                        )
                      }
                    >
                      Política de Privacidade
                    </Text>
                    {" "}e os{" "}
                    <Text
                      className="text-[#4361EE] underline"
                      onPress={() => Linking.openURL("https://exemplo.com/termos")}
                    >
                      Termos de Utilização
                    </Text>
                    .
                  </Text>
                </View>

                <CustomButton
                  onPress={signUp}
                  title="Registar"
                  loading={loading}
                />

                <DividerWithText />

                <SocialLoginButtons />

                <Text className="mt-6 text-white text-sm">
                  Já tens conta?{" "}
                  <Text
                    className="text-[#4361EE] font-bold"
                    onPress={() => navigation.navigate("Login")}
                  >
                    Login
                  </Text>
                </Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </ImageBackground>
    </View>
  );
}
