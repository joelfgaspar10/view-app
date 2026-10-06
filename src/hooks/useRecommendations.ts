import { useEffect, useState, useRef, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { FIREBASE_AUTH, FIREBASE_DB } from "../../FirebaseConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, getDoc } from "firebase/firestore";
import { useFavorites } from "../contexts/FavoritesContext";
import { useWatched } from "../contexts/WatchedContext";
import { TMDBItem } from "../types/tmdb";
import { discoverMovies, discoverTV, fetchTrendingAllWeek } from "../services/api";

export default function useRecommendations() {
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<TMDBItem[]>([]);

  const { items: favorites } = useFavorites();
  const { items: watched } = useWatched();

  // Evitar refetch redundante se géneros não mudarem realmente
  const lastGenreSignature = useRef<string>("");

  const fetchRecommendations = useCallback(async () => {
      setLoading(true);
      try {
        const user = FIREBASE_AUTH.currentUser;
        if (!user) {
          setRecommendations([]);
          return;
        }

        // 1. Preferências do utilizador (Firestore)
        let preferredGenres: number[] = [];
        try {
          const snap = await getDoc(doc(FIREBASE_DB, "users", user.uid));
            if (snap.exists()) {
            preferredGenres = snap.data()?.preferences?.genres || [];
          }
        } catch (e) {
          console.warn("⚠️ Erro a ler preferences do Firestore:", e);
        }

        // 2. Fallback AsyncStorage
        if (!preferredGenres.length) {
          try {
            const cache = await AsyncStorage.getItem(`selectedGenres_${user.uid}`);
            if (cache) preferredGenres = JSON.parse(cache);
          } catch {}
        }

        // 3. Frequência de géneros a partir de favoritos + assistidos
        const genreFreq: Record<number, number> = {};
        const bump = (arr: any[]) => {
          arr.forEach((g) => {
            const n = Number(g);
            if (!Number.isFinite(n)) return;
            genreFreq[n] = (genreFreq[n] || 0) + 1;
          });
        };
        favorites.forEach(f => bump(f.genre_ids || []));
        watched.forEach(w => bump(w.genre_ids || []));
        preferredGenres.forEach(g => bump([g]));

        // Ordenar géneros por frequência desc
        const rankedGenres = Object.entries(genreFreq)
          .sort((a,b)=> b[1]-a[1])
          .map(([g]) => Number(g));

        // fallback se ainda vazio
        const selectedGenres = (rankedGenres.length ? rankedGenres : preferredGenres).slice(0,5);

        if (!selectedGenres.length) {
          setRecommendations([]);
          return;
        }

        // Gerar assinatura para evitar fetch igual
        const signature = selectedGenres.join('-');
        if (signature === lastGenreSignature.current) {
          setLoading(false);
          return; // nada mudou significativamente
        }
        lastGenreSignature.current = signature;

        // 4. Buscar recomendações
        const [movies, tv] = await Promise.all([
          discoverMovies(selectedGenres, 1).catch(()=>[]),
          discoverTV(selectedGenres, 1).catch(()=>[]),
        ]);

        // 5. Combinar, remover já favoritos / vistos, ordenar, embaralhar levemente
        const favIds = new Set(favorites.map(f => String(f.id)));
        const watchedIds = new Set(watched.map(w => String(w.id)));

        // Mantemos todos (incluindo favoritos/assistidos) mas penalizamos no score para que desçam na lista em vez de desaparecerem
        const combined = [...movies, ...tv];

        const score = (item: any) => {
          const base = (item.vote_average || 0) * (item.vote_count || 0);
            const penalty = (favIds.has(String(item.id)) ? 0.5 : 1) * (watchedIds.has(String(item.id)) ? 0.7 : 1); // reduzir peso se já favorito/assistido
          return base * penalty;
        };
        combined.sort((a,b)=> score(b) - score(a));

        // Se, por algum motivo, todos forem favoritos/assistidos e score ficar igual, garantimos ordem estável por id
        if (combined.length && combined.every(i => favIds.has(String(i.id)))) {
          combined.sort((a,b)=> String(a.id).localeCompare(String(b.id)));
        }

        // Leve aleatorização (Fisher-Yates parcial nas primeiras 15 posições)
        for (let i = Math.min(14, combined.length-1); i > 0; i--) {
          const j = Math.floor(Math.random() * (i+1));
          [combined[i], combined[j]] = [combined[j], combined[i]];
        }

        let finalList = combined.slice(0,20);

        // Fallback: se vazio, usar trending genérico para não deixar secção sem cards
        if (!finalList.length) {
          try {
            const trending = await fetchTrendingAllWeek({ query: '' });
            if (Array.isArray(trending) && trending.length) {
              finalList = trending.slice(0,20);
            }
          } catch {}
        }

        setRecommendations(finalList);
      } catch (e) {
        console.error("❌ Erro a buscar recomendações:", e);
        setRecommendations([]);
      } finally {
        setLoading(false);
      }
  }, [favorites, watched]);

  // Recarrega quando favoritos/assistidos mudam
  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  // Recarrega quando o ecrã ganha foco (ex.: após editar géneros)
  useFocusEffect(
    useCallback(() => {
      lastGenreSignature.current = ""; // força recálculo ao voltar
      fetchRecommendations();
      return () => {};
    }, [fetchRecommendations])
  );

  return { recommendations, loading };
}
