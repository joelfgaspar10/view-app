// src/services/uploadProfileImage.ts
import { FIREBASE_DB } from "../../FirebaseConfig";
import { doc, setDoc, getDoc } from "firebase/firestore";
import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";

/**
 * Converte/compacta a imagem para JPEG, guarda o Base64 no Firestore
 * e atualiza users/{uid}.photoURL com um data URL. Retorna o data URL.
 *
 * Observação: Mantém as imagens pequenas (512px / compress 0.8) para não
 * estourar o limite de ~1MiB/Documento do Firestore.
 */
export async function uploadProfileImageAsync(
  localUri: string,
  uid: string
): Promise<string> {
  if (!uid) throw new Error("UID inválido");
  if (!localUri) throw new Error("URI local inválida");

  // 1) Redimensiona/força JPEG (evita HEIC e ficheiros enormes)
  const manip = await ImageManipulator.manipulateAsync(
    localUri,
    [{ resize: { width: 512 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
  );

  // 2) Lê como Base64 (payload puro)
  const base64 = await FileSystem.readAsStringAsync(manip.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // 3) Monta data URL para usar direto na <Image />
  const dataUrl = `data:image/jpeg;base64,${base64}`;

  // 4) Salva payload em profileImages/{uid}
  await setDoc(
    doc(FIREBASE_DB, "profileImages", uid),
    {
      base64, // apenas o payload (sem prefixo data:)
      contentType: "image/jpeg",
      uploadedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  // 5) Atualiza users/{uid}.photoURL com a data URL
  await setDoc(
    doc(FIREBASE_DB, "users", uid),
    { photoURL: dataUrl, updatedAt: new Date().toISOString() },
    { merge: true }
  );

  return dataUrl;
}

/**
 * Busca a foto de perfil. Primeiro tenta profileImages/{uid},
 * depois faz fallback para users/{uid}.photoURL (data URL).
 */
export async function getProfileImageAsync(uid: string): Promise<string | null> {
  if (!uid) return null;

  try {
    const imgSnap = await getDoc(doc(FIREBASE_DB, "profileImages", uid));
    if (imgSnap.exists()) {
      const data = imgSnap.data() as any;
      if (data?.base64) return `data:image/jpeg;base64,${data.base64}`;
    }
  } catch {}

  try {
    const userSnap = await getDoc(doc(FIREBASE_DB, "users", uid));
    if (userSnap.exists()) {
      const data = userSnap.data() as any;
      if (typeof data?.photoURL === "string" && data.photoURL.startsWith("data:")) {
        return data.photoURL;
      }
    }
  } catch {}

  return null;
}
