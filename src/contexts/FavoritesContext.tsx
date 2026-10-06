import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Title } from "../components/TitleCard";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { FIREBASE_DB } from "../../FirebaseConfig";

type FavoritesMap = Record<string, Title>;

type FavoritesContextValue = {
  items: Title[];
  isFavorite: (id: string | number) => boolean;
  toggleFavorite: (item: Title) => void;
  removeFavorite: (id: string | number) => void;
  clear: () => void;
};

const FavoritesContext = createContext<FavoritesContextValue | undefined>(
  undefined
);

interface FavoritesProviderProps {
  userId?: string; // UID do utilizador autenticado
}

/** Normaliza id para string (TMDB pode vir number) */
const normId = (id: any) => String(id ?? "");

/** Remove undefined / NaN / Infinity (recursivo) */
const sanitize = (value: any): any => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === "number" && !Number.isFinite(value)) return null;
  if (Array.isArray(value)) {
    return value.map(sanitize).filter((v) => v !== undefined);
  }
  if (typeof value === "object" && value !== null) {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      const sv = sanitize(v);
      if (sv !== undefined) out[k] = sv;
    }
    return out;
  }
  return value;
};

/** Whitelist de campos seguros para gravar no Firestore */
const toFavoriteDoc = (t: Title) => {
  const anyT: any = t || {};
  const data = {
    id: normId(anyT.id),
    title: anyT.title ?? anyT.name ?? null,
    name: anyT.name ?? null,
    original_title: anyT.original_title ?? null,
    original_name: anyT.original_name ?? null,
    poster_path: anyT.poster_path ?? null,
    backdrop_path: anyT.backdrop_path ?? null,
    overview: anyT.overview ?? null,
    media_type: anyT.media_type ?? null, 
    release_date: anyT.release_date ?? null,
    first_air_date: anyT.first_air_date ?? null,
    vote_average: Number.isFinite(anyT.vote_average) ? anyT.vote_average : null,
    genre_ids: Array.isArray(anyT.genre_ids) ? anyT.genre_ids : [],
    favorite: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  return sanitize(data);
};

export const FavoritesProvider: React.FC<
  React.PropsWithChildren<FavoritesProviderProps>
> = ({ children, userId }) => {
  const [map, setMap] = useState<FavoritesMap>({});

  // Listener aos favoritos do utilizador
  useEffect(() => {
    if (!userId) {
      setMap({});
      return;
    }

    const colRef = collection(FIREBASE_DB, "users", userId, "favorites");

    const unsubscribe = onSnapshot(
      colRef,
      (snap) => {
        const next: FavoritesMap = {};
        snap.forEach((d) => {
          const data = d.data() as any;
          const key = d.id;
          next[key] = { ...(data as Title), id: key, favorite: true } as Title;
        });
        setMap(next);
      },
      (err) => {
        const code = (err as any)?.code;
        if (code === 'permission-denied' || code === 'unauthenticated') {
          // Usuário saiu ou perdeu permissões: limpa local e não ruidar logs
          setMap({});
          return;
        }
        console.warn("[Favorites] onSnapshot error:", code ?? (err as any)?.message ?? err);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  const isFavorite = (id: string | number) => !!map[normId(id)];

  const toggleFavorite = (item: Title) => {
    const key = normId((item as any)?.id);
    if (!key) {
      console.warn("[Favorites] toggleFavorite sem id válido:", item);
      return;
    }
    if (!userId) {
      console.warn("[Favorites] toggleFavorite: userId ausente (não autenticado).");
      return;
    }

    const dref = doc(FIREBASE_DB, "users", userId, "favorites", key);

    if (map[key]) {
      // remover
      setMap((prev) => {
        const copy: FavoritesMap = { ...prev };
        delete copy[key];
        return copy;
      });
      deleteDoc(dref).catch((err) => {
        console.warn("[Favorites] deleteDoc falhou:", err?.code ?? err?.message ?? err);
      });
    } else {
      // adicionar
      const payload = toFavoriteDoc(item);
      // Optimistic UI
      setMap((prev) => ({ ...prev, [key]: { ...(payload as any), id: key } as Title }));
      setDoc(dref, payload).catch((err) => {
        console.warn("[Favorites] setDoc falhou:", err?.code ?? err?.message ?? err);
        // reverte local
        setMap((prev) => {
          const copy: FavoritesMap = { ...prev };
          delete copy[key];
          return copy;
        });
      });
    }
  };

  const removeFavorite = (id: string | number) => {
    const key = normId(id);
    if (!key || !userId) return;

    const dref = doc(FIREBASE_DB, "users", userId, "favorites", key);
    setMap((prev) => {
      const copy: FavoritesMap = { ...prev };
      delete copy[key];
      return copy;
    });
    deleteDoc(dref).catch((err) => {
      console.warn("[Favorites] deleteDoc falhou:", err?.code ?? err?.message ?? err);
    });
  };

  const clear = () => setMap({});

  const value = useMemo<FavoritesContextValue>(
    () => ({
      items: Object.values(map),
      isFavorite,
      toggleFavorite,
      removeFavorite,
      clear,
    }),
    [map]
  );

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used within FavoritesProvider");
  return ctx;
};
