import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { doc, setDoc, deleteDoc, onSnapshot, serverTimestamp, collection } from 'firebase/firestore';
import { FIREBASE_DB } from '../../FirebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { rateTitle, deleteRating as tmdbDeleteRating, createGuestSession } from '../services/api';

interface RatingsContextValue {
  getRating: (mediaType: 'movie' | 'tv', id: number) => number | undefined;
  setRating: (mediaType: 'movie' | 'tv', id: number, value: number) => void;
  clearRating: (mediaType: 'movie' | 'tv', id: number) => void;
  isRated: (mediaType: 'movie' | 'tv', id: number) => boolean;
}

const RatingsContext = createContext<RatingsContextValue | undefined>(undefined);

interface RatingsProviderProps { userId?: string; }

const normKey = (mediaType: string, id: any) => `${mediaType}_${String(id ?? '')}`;

// Offline cache key
const LOCAL_KEY = '@ratings_cache_v1';
const GUEST_KEY = '@tmdb_guest_session_v1';

export const RatingsProvider: React.FC<React.PropsWithChildren<RatingsProviderProps>> = ({ children, userId }) => {
  const [map, setMap] = useState<Record<string, number>>({});
  const [guestSession, setGuestSession] = useState<string | null>(null);

  // Load local + guest session + Firestore listener
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(LOCAL_KEY);
        if (stored) setMap(JSON.parse(stored));
        let gStored = await AsyncStorage.getItem(GUEST_KEY);
        if (!gStored) {
          try { gStored = await createGuestSession(); if (gStored) await AsyncStorage.setItem(GUEST_KEY, gStored); } catch {}
        }
        if (gStored) setGuestSession(gStored);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (!userId) return; // sem auth, fica só local
    const col = collection(FIREBASE_DB, 'users', userId, 'ratings');
    const unsub = onSnapshot(col, snap => {
      const next: Record<string, number> = {};
      snap.forEach(d => {
        const data = d.data() as any;
        if (typeof data.value === 'number') next[d.id] = data.value;
      });
      setMap(prev => ({ ...prev, ...next }));
      AsyncStorage.setItem(LOCAL_KEY, JSON.stringify({ ...map, ...next })).catch(()=>{});
    });
    return () => unsub();
  }, [userId]);

  const persistLocal = (next: Record<string, number>) => {
    setMap(next);
    AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(next)).catch(()=>{});
  };

  const getRating = (mediaType: 'movie' | 'tv', id: number) => map[normKey(mediaType, id)];
  const isRated = (mediaType: 'movie' | 'tv', id: number) => getRating(mediaType, id) !== undefined;

  const setRating = (mediaType: 'movie' | 'tv', id: number, value: number) => {
    const key = normKey(mediaType, id);
    // optimist update
    const next = { ...map, [key]: value };
    persistLocal(next);
    if (userId) {
      const ref = doc(FIREBASE_DB, 'users', userId, 'ratings', key);
      setDoc(ref, { mediaType, tmdbId: id, value, updatedAt: serverTimestamp() }, { merge: true }).catch(err => {
        console.warn('[Ratings] setDoc error', err);
      });
    }
    if (guestSession) {
  rateTitle(mediaType, id, value, guestSession).catch((err: any) => console.warn('[Ratings] TMDB rate error', err));
    }
  };

  const clearRating = (mediaType: 'movie' | 'tv', id: number) => {
    const key = normKey(mediaType, id);
    const next = { ...map }; delete next[key];
    persistLocal(next);
    if (userId) {
      const ref = doc(FIREBASE_DB, 'users', userId, 'ratings', key);
      deleteDoc(ref).catch(err => console.warn('[Ratings] deleteDoc error', err));
    }
    if (guestSession) {
  tmdbDeleteRating(mediaType, id, guestSession).catch((err: any) => console.warn('[Ratings] TMDB delete error', err));
    }
  };

  const value = useMemo<RatingsContextValue>(() => ({ getRating, setRating, clearRating, isRated }), [map, guestSession, userId]);

  return <RatingsContext.Provider value={value}>{children}</RatingsContext.Provider>;
};

export const useRatings = () => {
  const ctx = useContext(RatingsContext);
  if (!ctx) throw new Error('useRatings must be used within RatingsProvider');
  return ctx;
};
