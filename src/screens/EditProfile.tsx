import React from "react";
import {
  View,
  ScrollView,
  Alert,
  TouchableOpacity,
  Text,
  Image,
  ActivityIndicator,
  Modal,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import FloatingChatButton from "../components/FloatingChatButton";
import { FIREBASE_AUTH, FIREBASE_DB } from "../../FirebaseConfig";
import ProfileHeader from "../components/ProfileHeader";
import { CustomTextInput } from "../components/CustomTextInput";
import { StackScreenProps } from "../types/navigation";
import { doc, setDoc, getDoc } from "firebase/firestore";
import * as ImagePicker from "expo-image-picker";
import { uploadProfileImageAsync } from "../services/uploadProfileImage";
import { useProfileImage } from "../hooks/useProfileImage";
import { updateProfile } from "firebase/auth";
import { CustomButton } from "../components/CustomButton";
import ProfileMenuItem from "../components/ProfileMenuItem";
import { UsernameModal } from "../components/UsernameModal";

// Compat: usa MediaType novo se existir, senão cai para MediaTypeOptions antigo
const MEDIA_TYPE_IMAGES: any =
  (ImagePicker as any).MediaType?.Images ?? ImagePicker.MediaTypeOptions.Images;

export default function EditProfile({
  navigation,
}: StackScreenProps<"EditProfile">) {
  const user = FIREBASE_AUTH.currentUser;

  const [name, setName] = React.useState(user?.displayName || "");
  const [loading, setLoading] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [registeredName, setRegisteredName] = React.useState<string>("");
  const [showUsernameModal, setShowUsernameModal] = React.useState(false);

  const { profileImage, updateProfileImage } = useProfileImage();

  React.useEffect(() => {
    let active = true;
    (async () => {
      if (!user) return;
      try {
        let resolved = user.displayName || "";
        if (!resolved) {
          try {
            const snap = await getDoc(doc(FIREBASE_DB, "users", user.uid));
            if (snap.exists()) {
              const data = snap.data() as any;
              if (data.fullName) resolved = data.fullName as string;
              else if (data.displayName) resolved = data.displayName as string;
            }
          } catch {}
        }
        if (!resolved) resolved = "Utilizador";
        if (active) {
          setRegisteredName(resolved);
          if (!name) setName(resolved);
        }
      } catch (e) {
        console.log("Falha ao carregar dados do perfil", e);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const handleSave = async () => {
    if (!user) {
      Alert.alert("Sessão", "Inicia sessão para editar o perfil.");
      return;
    }
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert("Nome inválido", "Escreve um nome válido.");
      return;
    }

    setLoading(true);
    try {
      await updateProfile(user, { displayName: trimmed });
      await setDoc(
        doc(FIREBASE_DB, "users", user.uid),
        {
          uid: user.uid,
          displayName: trimmed,
          fullName: trimmed,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      setRegisteredName(trimmed);
      Alert.alert("Sucesso", "Nome atualizado com sucesso!");
      setShowUsernameModal(false);
    } catch (e: any) {
      console.log("Erro ao atualizar nome:", e?.message || e);
      Alert.alert("Erro", "Não foi possível atualizar o nome.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  const handleAvatarPress = async () => {
    if (!user) {
      Alert.alert("Sessão", "Inicia sessão para alterar a foto.");
      return;
    }

    try {
      // Permissões
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          "Permissão negada",
          "Ativa o acesso à galeria nas definições."
        );
        return;
      }

      // Selecionar imagem
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: MEDIA_TYPE_IMAGES,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (res.canceled) return;

      const asset = res.assets[0];
      if (!asset?.uri) {
        Alert.alert("Erro", "Não foi possível obter a imagem selecionada.");
        return;
      }

      setUploading(true);

      // Upload (Firestore Base64) — retorna data URL
      const dataUrl = await uploadProfileImageAsync(asset.uri, user.uid);

      // Sincroniza também no Firebase Auth (para manter user.photoURL coerente)
      //await updateProfile(user, { photoURL: dataUrl });

      // Atualiza UI (hook local)
      updateProfileImage(dataUrl);

      Alert.alert("Sucesso", "Foto de perfil atualizada!");
    } catch (e: any) {
      console.log("Erro no upload:", e?.message || e);
      Alert.alert("Erro", e?.message ?? "Falha no upload da imagem.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <View className="flex-1 bg-background dark:bg-background-dark">
      <ProfileHeader
        title="Editar perfil"
        userName={user?.displayName || registeredName || "User"}
        userEmail={user?.email || ""}
        onBackPress={() => navigation.goBack()}
        onPress={handleAvatarPress}
        editable={false}
        hideUserInfo={true}
      />

      <ScrollView className="flex-1 px-6 bg-background-color">
        <View className="items-center mt-6 mb-10">
          <View>
            <TouchableOpacity onPress={handleAvatarPress} activeOpacity={0.85}>
              {profileImage ? (
                <Image
                  source={{ uri: profileImage }}
                  className="w-40 h-40 rounded-full"
                />
              ) : (
                <View className="w-40 h-40 rounded-full bg-gray-500/30 items-center justify-center">
                  <Text className="text-4xl text-gray-300">
                    {(registeredName || user?.displayName || "U")
                      .slice(0, 1)
                      .toUpperCase()}
                  </Text>
                </View>
              )}

              <View className="absolute bottom-2 right-2 w-12 h-12 rounded-full bg-blueButton dark:bg-blueButton-dark items-center justify-center">
                <Text className="text-white text-lg font-semibold">+</Text>
              </View>

              {uploading && (
                <View className="absolute inset-0 bg-black/40 rounded-full items-center justify-center">
                  <ActivityIndicator color="white" />
                </View>
              )}
            </TouchableOpacity>
          </View>
          <Text
            className="mt-4 text-text dark:text-text-dark text-lg font-semibold"
            numberOfLines={2}
          >
            {registeredName || user?.displayName || "Utilizador"}
          </Text>
        </View>
        <ProfileMenuItem
          title={"Mudar Nome de Utilizador"}
          icon={"person-outline"}
          onPress={() => {
            setName(registeredName || user?.displayName || "");
            setShowUsernameModal(true);
          }}
        />

        <UsernameModal
          visible={showUsernameModal}
          value={name}
          onChange={setName}
          onSave={handleSave}
          onCancel={() => setShowUsernameModal(false)}
          loading={loading}
        />

        <ProfileMenuItem
          title={"Editar Preferências de Géneros"}
          icon={"options-outline"}
          onPress={() =>
            navigation.navigate("GenrePreferences", { mode: "edit" })
          }
        />
      </ScrollView>
      <FloatingChatButton />
    </View>
  );
}
