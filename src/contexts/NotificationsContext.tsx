import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Episode } from '../components/EpisodeCard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ensureNotificationPermissions, scheduleLocalRelease, cancelLocalNotification, isDateInPast } from '../services/localNotifications';
import * as Notifications from 'expo-notifications';

export interface ScheduledNotification {
  id: string; // episode id (also used as notification identifier)
  dateISO: string; // full ISO date/time for release
  episode: Episode;
  scheduledNotificationId: string; // platform scheduled id
}

export interface DeliveredNotification {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  image: any;
  deliveredAt: string; // ISO string
  hasNewEpisode?: boolean;
  rating?: number; // TMDB vote_average no momento da subscrição
}

interface NotificationsContextValue {
  scheduled: ScheduledNotification[];
  delivered: DeliveredNotification[];
  isSubscribed: (episodeId: string) => boolean;
  toggleSubscription: (episode: Episode, dateISO: string) => Promise<void>;
  removeDelivered: (id: string) => void;
  clearAll: () => void;
}

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

export const NotificationsProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [scheduled, setScheduled] = useState<ScheduledNotification[]>([]);
  const [delivered, setDelivered] = useState<DeliveredNotification[]>([]);

  // Consider also delivered notifications so past releases still appear "ativo" (red bell)
  const isSubscribed = (episodeId: string) =>
    scheduled.some(s => s.id === episodeId) || delivered.some(d => d.id === episodeId);

  const STORAGE_KEY = 'notifications_state_v1';

  // Load persisted
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.scheduled) setScheduled(parsed.scheduled);
          if (parsed.delivered) {
            // Migração: entradas antigas podem não ter rating
            setDelivered(parsed.delivered.map((d: any) => ({ ...d, rating: typeof d.rating === 'number' ? d.rating : 0 })));
          }
        }
      } catch {}
    })();
  }, []);

  // Persist on change
  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ scheduled, delivered })).catch(()=>{});
  }, [scheduled, delivered]);

  // Ingest remote notifications presented by the OS while app was closed
  useEffect(() => {
    (async () => {
      try {
        const presented = await Notifications.getPresentedNotificationsAsync();
        if (!presented?.length) return;
        const mapped: DeliveredNotification[] = presented.map((n) => {
          const d = (n.request.content.data || {}) as any;
          const id = String(d.tmdbId ?? d.id ?? n.request.identifier);
          const image =
            typeof d.poster_path === 'string' && d.poster_path
              ? { uri: `https://image.tmdb.org/t/p/w500${d.poster_path}` }
              : undefined;
        return {
            id,
            title: n.request.content.title || d.title || 'Novo episódio',
            subtitle: n.request.content.subtitle || 'Disponível',
            description: n.request.content.body || '',
            image: image,
            deliveredAt: new Date().toISOString(),
            hasNewEpisode: true,
            rating: typeof d.rating === 'number' ? d.rating : 0,
          };
        });
        setDelivered(prev => {
          const seen = new Set(prev.map(p => p.id));
          const merged = [...prev];
          for (const m of mapped) if (!seen.has(m.id)) merged.unshift(m);
          return merged;
        });
      } catch {}
    })();
  }, []);

  const toggleSubscription = async (episode: Episode, dateISO: string) => {
    // 1. If scheduled -> cancel & remove (toggle OFF)
    const scheduledEntry = scheduled.find(s => s.id === episode.id);
    if (scheduledEntry) {
      cancelLocalNotification(scheduledEntry.scheduledNotificationId);
      setScheduled(prev => prev.filter(s => s.id !== episode.id));
      return;
    }
    // 2. If only delivered (past) -> remove delivered (toggle OFF)
    if (delivered.some(d => d.id === episode.id)) {
      setDelivered(prev => prev.filter(d => d.id !== episode.id));
      return;
    }
    // 3. Else subscribe (toggle ON)
    if (!(await ensureNotificationPermissions())) return;
    const releaseDate = new Date(dateISO);
    if (isDateInPast(releaseDate)) {
      // Already past -> mark delivered immediately
      setDelivered(prev => [{
        id: episode.id,
        title: episode.title,
        subtitle: 'Disponível',
        description: episode.description,
        image: episode.image,
        deliveredAt: new Date().toISOString(),
        hasNewEpisode: true,
  rating: episode.rating,
      }, ...prev]);
      return;
    }
    try {
      const notifId = await scheduleLocalRelease({
        id: episode.id,
        title: episode.title,
        body: 'Novo episódio disponível!',
        date: releaseDate,
        data: {
          id: episode.id,
          title: episode.title,
          rating: episode.rating,
          poster_path:
            typeof episode.image?.uri === 'string'
              ? episode.image.uri.replace('https://image.tmdb.org/t/p/w500', '')
              : undefined,
        },
      });
      setScheduled(prev => [...prev, { id: episode.id, dateISO, episode, scheduledNotificationId: notifId }]);
    } catch (e) {
      console.warn('Failed scheduling notification', e);
    }
  };

  const removeDelivered = (id: string) => {
    setDelivered(prev => prev.filter(d => d.id !== id));
  };

  const clearAll = () => {
    setScheduled([]);
    setDelivered([]);
  };

  // Cleanup past scheduled that somehow remained (app reopened after time) – move to delivered once
  useEffect(() => {
    const sweep = () => {
      const now = Date.now();
      setScheduled(prev => {
        const future: ScheduledNotification[] = [];
        const newlyDelivered: ScheduledNotification[] = [];
        prev.forEach(s => {
          if (new Date(s.dateISO).getTime() <= now) newlyDelivered.push(s); else future.push(s);
        });
        if (newlyDelivered.length) {
          setDelivered(dPrev => [
            ...newlyDelivered.map(d => ({
              id: d.id,
              title: d.episode.title,
              subtitle: 'Disponível',
              description: d.episode.description,
              image: d.episode.image,
              deliveredAt: new Date().toISOString(),
              hasNewEpisode: true,
              rating: d.episode.rating,
            })),
            ...dPrev,
          ]);
        }
        return future;
      });
    };
    sweep();
    const int = setInterval(sweep, 60 * 1000);
    return () => clearInterval(int);
  }, []);

  const value = useMemo<NotificationsContextValue>(() => ({
    scheduled,
    delivered,
    isSubscribed,
    toggleSubscription,
    removeDelivered,
    clearAll,
  }), [scheduled, delivered]);

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
};
