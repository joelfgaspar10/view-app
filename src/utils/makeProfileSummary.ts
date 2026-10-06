export function makeProfileSummary({
  favoriteTitles,
  likedGenres,
  recentlyWatched,
}: {
  favoriteTitles: string[];
  likedGenres: string[];
  recentlyWatched: string[];
}) {
  const fav = favoriteTitles.slice(0, 3).join(", ") || "—";
  const gen = likedGenres.slice(0, 3).join(", ") || "—";
  const rec = recentlyWatched.slice(0, 3).join(", ") || "—";
  return `Preferências: ${gen}. Favoritos: ${fav}. Vistos recentemente: ${rec}.`;
}
