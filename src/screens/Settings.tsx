import React, { useState } from "react";
import { View, Alert } from "react-native";
import FloatingChatButton from "../components/FloatingChatButton";
import { StackScreenProps } from "../types/navigation";
import ProfileHeader from "../components/ProfileHeader";
import { FIREBASE_AUTH, FIREBASE_DB } from "../../FirebaseConfig";
import ProfileMenuItem from "../components/ProfileMenuItem";
import { useTheme } from "../contexts/ThemeContext";
import { sendPasswordResetEmail, deleteUser } from "firebase/auth";
import { deleteDoc, doc } from "firebase/firestore";

export default function Settings({ navigation }: StackScreenProps<"Settings">) {
  const user = FIREBASE_AUTH.currentUser;
  const { toggleTheme, isDark } = useTheme();
  const [sendingReset, setSendingReset] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const requestPasswordReset = () => {
    const email = FIREBASE_AUTH.currentUser?.email;
    if (!email) {
      Alert.alert("Sessão necessária", "Inicie sessão para mudar a password.");
      return;
    }
    Alert.alert(
      "Mudar password",
      `Enviar email de redefinição para ${email}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Enviar",
          onPress: async () => {
            if (sendingReset) return;
            setSendingReset(true);
            try {
              await sendPasswordResetEmail(FIREBASE_AUTH, email);
              Alert.alert(
                "Email enviado",
                "Verifique a sua caixa de correio para redefinir a password."
              );
            } catch (e: any) {
              const code = e?.code as string | undefined;
              let message = "Ocorreu um erro. Tente novamente.";
              if (code === "auth/invalid-email") message = "Email inválido.";
              else if (code === "auth/user-not-found")
                message = "Conta não encontrada para este email.";
              else if (code === "auth/network-request-failed")
                message = "Sem ligação à internet. Tente novamente.";
              Alert.alert("Mudar password", message);
            } finally {
              setSendingReset(false);
            }
          },
        },
      ]
    );
  };

  const confirmDeleteAccount = () => {
    if (deleting) return;
    Alert.alert(
      "Eliminar conta",
      "Tem a certeza que pretende eliminar a sua conta? Esta ação é definitiva.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            if (deleting) return;
            setDeleting(true);
            try {
              const current = FIREBASE_AUTH.currentUser;
              if (!current) {
                Alert.alert("Sessão", "Nenhum utilizador autenticado.");
                return;
              }
              const uid = current.uid;
              try {
                await deleteUser(current);
              } catch (e: any) {
                const code = e?.code as string | undefined;
                if (code === "auth/requires-recent-login") {
                  Alert.alert(
                    "Sessão expirada",
                    "Por segurança, precisa de iniciar sessão novamente antes de eliminar a conta."
                  );
                } else {
                  Alert.alert("Erro", "Não foi possível eliminar a conta.");
                }
                return;
              }
              // Tentar remover o documento do utilizador (best-effort)
              try {
                await deleteDoc(doc(FIREBASE_DB, "users", uid));
              } catch (err) {
                console.warn("Falha ao apagar documento de utilizador:", err);
              }
              Alert.alert(
                "Conta eliminada",
                "A tua conta foi eliminada definitivamente."
              );
              // Não forçar navegação para 'Login' aqui, pois esta rota
              // não existe no stack autenticado. O onAuthStateChanged em App.tsx
              // vai detectar a mudança e renderizar o stack de Login/Register.
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View className="flex-1 bg-background dark:bg-background-dark">
      <ProfileHeader
        title="Definições"
        userName={user?.displayName || "User 1"}
        userEmail={user?.email || "user1@email.com"}
        onBackPress={() => navigation.goBack()}
        onPress={() => void 0}
        editable={false}
      />

      <View className="flex-1 px-6 pt-6">
        {/* Send reset email directly for the current user */}
        <ProfileMenuItem
          title={sendingReset ? "A enviar..." : "Mudar Password"}
          icon="key-outline"
          onPress={() => {
            if (!sendingReset) requestPasswordReset();
          }}
          showArrow={false}
        />

        <ProfileMenuItem
          title="Modo Escuro"
          icon="moon-outline"
          onPress={toggleTheme}
          showArrow={false}
          showSwitch={true}
          switchValue={isDark}
          onSwitchToggle={toggleTheme}
        />

        <ProfileMenuItem
          title="Eliminar Conta"
          icon="trash-outline"
          showArrow={false}
          onPress={confirmDeleteAccount}
          iconColor="#EF4444"
          textColor="#EF4444"
        />
      </View>
      <FloatingChatButton />
    </View>
  );
}
