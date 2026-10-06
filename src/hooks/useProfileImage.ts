import { useState, useEffect } from "react";
import { FIREBASE_AUTH, FIREBASE_DB } from "../../FirebaseConfig";
import { doc, getDoc } from "firebase/firestore";

export function useProfileImage() {
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const user = FIREBASE_AUTH.currentUser;

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        // tenta primeiro no Firestore
        const snap = await getDoc(doc(FIREBASE_DB, "users", user.uid));
        if (snap.exists() && snap.data().photoURL) {
          if (active) setProfileImage(snap.data().photoURL as string);
        } else if (user.photoURL && active) {
          // fallback: Auth
          setProfileImage(user.photoURL);
        }
      } catch (err) {
        console.log("Erro ao carregar foto de perfil:", err);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [user?.uid]);

  const updateProfileImage = (newUrl: string) => {
    setProfileImage(newUrl);
  };

  return { profileImage, loading, updateProfileImage };
}
