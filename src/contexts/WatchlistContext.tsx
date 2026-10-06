import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Title } from "../components/TitleCard";
import { collection, doc, onSnapshot, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { FIREBASE_DB } from "../../FirebaseConfig";

// Internal map type
type WatchlistMap = Record<string, Title>;

export interface WatchlistContextValue {
  items: Title[];
  isInWatchlist: (id: string | number) => boolean;
  toggleWatchlist: (item: Title) => void;
  addToWatchlist: (item: Title) => void;
  removeFromWatchlist: (id: string | number) => void;
  clear: () => void;
}

const WatchlistContext = createContext<WatchlistContextValue | undefined>(undefined);

interface WatchlistProviderProps { userId?: string; }

const normId = (id: any) => String(id ?? "");

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

const toWatchlistDoc = (t: Title) => {
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
    watchlist: true,
    addedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  return sanitize(data);
};

export const WatchlistProvider: React.FC<React.PropsWithChildren<WatchlistProviderProps>> = ({ children, userId }) => {
  const [map, setMap] = useState<WatchlistMap>({});

  useEffect(() => {
    if (!userId) { setMap({}); return; }
    const colRef = collection(FIREBASE_DB, "users", userId, "watchlist");
    const unsub = onSnapshot(colRef, snap => {
      const next: WatchlistMap = {};
      snap.forEach(d => {
        const data = d.data() as any;
        const key = d.id;
        next[key] = { ...(data as Title), id: key, watchlist: true } as Title;
      });
      setMap(next);
    }, err => {
      const code = (err as any)?.code;
      if (code === 'permission-denied' || code === 'unauthenticated') {
        setMap({});
        return;
      }
      console.warn("[Watchlist] onSnapshot error:", code ?? (err as any)?.message ?? err);
    });
    return () => unsub();
  }, [userId]);

  const isInWatchlist = (id: string | number) => !!map[normId(id)];

  const addToWatchlist = (item: Title) => {
    const key = normId((item as any)?.id);
    if (!key || !userId) return;
    const dref = doc(FIREBASE_DB, "users", userId, "watchlist", key);
    const payload = toWatchlistDoc(item);
    setMap(prev => ({ ...prev, [key]: { ...(payload as any), id: key } as Title }));
    setDoc(dref, payload, { merge: true }).catch(err => {
      console.warn("[Watchlist] setDoc falhou:", err?.code ?? err?.message ?? err);
      setMap(prev => { const copy = { ...prev }; delete copy[key]; return copy; });
    });
  };

  const removeFromWatchlist = (id: string | number) => {
    const key = normId(id);
    if (!key || !userId) return;
    const dref = doc(FIREBASE_DB, "users", userId, "watchlist", key);
    setMap(prev => { const copy = { ...prev }; delete copy[key]; return copy; });
    deleteDoc(dref).catch(err => console.warn("[Watchlist] deleteDoc falhou:", err?.code ?? err?.message ?? err));
  };

  const toggleWatchlist = (item: Title) => {
    const key = normId((item as any)?.id);
    if (!key || !userId) return;
    if (map[key]) removeFromWatchlist(key); else addToWatchlist(item);
  };

  const clear = () => setMap({});

  const value = useMemo<WatchlistContextValue>(() => ({
    items: Object.values(map),
    isInWatchlist,
    toggleWatchlist,
    addToWatchlist,
    removeFromWatchlist,
    clear,
  }), [map]);

  return <WatchlistContext.Provider value={value}>{children}</WatchlistContext.Provider>;
};

export const useWatchlist = () => {
  const ctx = useContext(WatchlistContext);
  if (!ctx) throw new Error("useWatchlist must be used within WatchlistProvider");
  return ctx;
};
