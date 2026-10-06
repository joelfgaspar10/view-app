import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
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

type WatchedMap = Record<string, Title>;

type WatchedContextValue = {
  items: Title[];
  isWatched: (id: string | number) => boolean;
  toggleWatched: (item: Title) => void;
  markWatched: (item: Title) => void;
  unmarkWatched: (id: string | number) => void;
  clear: () => void;
};

const WatchedContext = createContext<WatchedContextValue | undefined>(undefined);

interface WatchedProviderProps {
  userId?: string; // UID autenticado
}

/** Normaliza id para string */
const normId = (id: any) => String(id ?? "");

/** Remove undefined / NaN / Infinity (recursivo) */
const sanitize = (value: any): any => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === "number" && !Number.isFinite(value)) return null;
  if (Array.isArray(value)) return value.map(sanitize).filter(v => v !== undefined);
  if (typeof value === "object" && value) {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      const sv = sanitize(v);
      if (sv !== undefined) out[k] = sv;
    }
    return out;
  }
  return value;
};

/** Campos whitelisted para Firestore */
const toWatchedDoc = (t: Title) => {
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
    media_type: anyT.media_type ?? null, // "movie" | "tv" se existir
    release_date: anyT.release_date ?? null,
    first_air_date: anyT.first_air_date ?? null,
    vote_average: Number.isFinite(anyT.vote_average) ? anyT.vote_average : null,
    genre_ids: Array.isArray(anyT.genre_ids) ? anyT.genre_ids : [],
    watched: true,
    watchedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  return sanitize(data);
};

export const WatchedProvider: React.FC<React.PropsWithChildren<WatchedProviderProps>> = ({
  children,
  userId,
}) => {
  const [map, setMap] = useState<WatchedMap>({});

  // Sync em tempo real
  useEffect(() => {
    if (!userId) {
      setMap({});
      return;
    }
    const colRef = collection(FIREBASE_DB, "users", userId, "watched");
    const unsub = onSnapshot(
      colRef,
      snap => {
        const next: WatchedMap = {};
        snap.forEach(d => {
          const data = d.data() as any;
          const key = d.id;
          next[key] = { ...(data as Title), id: key, watched: true } as Title;
        });
        setMap(next);
      },
      err => {
        const code = (err as any)?.code;
        if (code === 'permission-denied' || code === 'unauthenticated') {
          setMap({});
          return;
        }
        console.warn("[Watched] onSnapshot error:", code ?? (err as any)?.message ?? err);
      }
    );
    return () => unsub();
  }, [userId]);

  const isWatched = (id: string | number) => !!map[normId(id)];

  const markWatched = (item: Title) => {
    const key = normId((item as any)?.id);
    if (!key || !userId) return;
    const dref = doc(FIREBASE_DB, "users", userId, "watched", key);
    const payload = toWatchedDoc(item);

    // Optimistic UI
    setMap(prev => ({ ...prev, [key]: { ...(payload as any), id: key } as Title }));
    setDoc(dref, payload, { merge: true }).catch(err => {
      console.warn("[Watched] setDoc falhou:", err?.code ?? err?.message ?? err);
      setMap(prev => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    });
  };

  const unmarkWatched = (id: string | number) => {
    const key = normId(id);
    if (!key || !userId) return;
    const dref = doc(FIREBASE_DB, "users", userId, "watched", key);

    setMap(prev => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
    deleteDoc(dref).catch(err =>
      console.warn("[Watched] deleteDoc falhou:", err?.code ?? err?.message ?? err)
    );
  };

  const toggleWatched = (item: Title) => {
    const key = normId((item as any)?.id);
    if (!key || !userId) return;
    if (map[key]) unmarkWatched(key);
    else markWatched(item);
  };

  const clear = () => setMap({});

  const value = useMemo<WatchedContextValue>(
    () => ({
      items: Object.values(map),
      isWatched,
      toggleWatched,
      markWatched,
      unmarkWatched,
      clear,
    }),
    [map]
  );

  return <WatchedContext.Provider value={value}>{children}</WatchedContext.Provider>;
};

export const useWatched = () => {
  const ctx = useContext(WatchedContext);
  if (!ctx) throw new Error("useWatched must be used within WatchedProvider");
  return ctx;
};
