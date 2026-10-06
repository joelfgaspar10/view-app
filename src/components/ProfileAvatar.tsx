import React, { memo, useEffect, useState } from "react";
import {
  View,
  Image,
  TouchableOpacity,
  ImageSourcePropType,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";

interface ProfileAvatarProps {
  size?: number;
  imageUri?: string;
  source?: ImageSourcePropType; // local asset or other sources
  editable?: boolean;
  onPress?: () => void;
  autoLoad?: boolean; // se true tenta carregar automaticamente do utilizador logado
}

function ProfileAvatarBase({
  size = 80,
  imageUri,
  source,
  editable = false,
  onPress,
  autoLoad = true,
}: ProfileAvatarProps) {
  const [loadedUri, setLoadedUri] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  // Carrega a foto se não for fornecida via props
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!autoLoad) return;
      // Se já veio tudo por props, não faz fetch
      if (imageUri || source) {
        setLoadedUri(undefined); // força usar diretamente imageUri/source
        return;
      }
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;
      setLoading(true);
      try {
        // 1. Auth photoURL
        if (user.photoURL) {
          if (!cancelled) setLoadedUri(user.photoURL);
          return;
        }

        const db = getFirestore();

        // 2. Firestore users/<uid>
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (!cancelled && userDoc.exists()) {
          const data: any = userDoc.data();
            if (data?.photoURL) {
              setLoadedUri(data.photoURL);
              return;
            }
        }

        // 3. Firestore profileImages/<uid> (base64)
        const profSnap = await getDoc(doc(db, "profileImages", user.uid));
        if (!cancelled && profSnap.exists()) {
          const data: any = profSnap.data();
          if (data?.base64) {
            const uri = data.base64.startsWith("data:")
              ? data.base64
              : `data:image/jpeg;base64,${data.base64}`;
            setLoadedUri(uri);
            return;
          }
        }
      } catch (e) {
        // silencioso
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [autoLoad, imageUri, source]);

  const avatarSize = { width: size, height: size };
  const iconSize = size * 0.5;

  const finalUri = imageUri ?? loadedUri;
  const imgSource: ImageSourcePropType | undefined =
    source ?? (finalUri ? { uri: finalUri } : undefined);

  const content = (
    <View
      className={`rounded-full items-center justify-center ${imgSource ? "" : "bg-gray-300"}`}
      style={[avatarSize, { overflow: "hidden" }]}
    >
      {imgSource ? (
        <Image
          source={imgSource}
          className="rounded-full"
          style={[avatarSize, { borderRadius: size / 2 }]}
          resizeMode="cover"
        />
      ) : loading ? (
        <ActivityIndicator size="small" color="#666" />
      ) : (
        <Ionicons name="person" size={iconSize} color="#9CA3AF" />
      )}
      {editable && (
        <View className="absolute bottom-4 right-4 w-8 h-8 bg-blue-600 rounded-full items-center justify-center border-2 border-white">
          <Ionicons name="pencil" size={14} color="white" />
        </View>
      )}
    </View>
  );

  if (onPress) {
    return <TouchableOpacity onPress={onPress}>{content}</TouchableOpacity>;
  }
  return content;
}

// Only re-render if relevant props change
const areEqual = (
  prev: ProfileAvatarProps,
  next: ProfileAvatarProps
): boolean => {
  return (
    prev.size === next.size &&
    prev.imageUri === next.imageUri &&
    prev.source === next.source &&
    prev.editable === next.editable &&
  prev.onPress === next.onPress &&
  prev.autoLoad === next.autoLoad
  );
};

const ProfileAvatar = memo(ProfileAvatarBase, areEqual);
export default ProfileAvatar;
