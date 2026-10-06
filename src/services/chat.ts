export type MediaItem = {
  id: number;
  title: string;
  overview?: string;
  poster_path?: string;
  media_type: "movie" | "tv";
};

export type ChatResult = {
  text: string; // resposta do assistente (em PT)
  items: MediaItem[]; // resultados (opcional)
};

const BASE = process.env.EXPO_PUBLIC_CHAT_API_URL; // definido no .env

export async function chat(
  message: string,
  profileSummary?: string
): Promise<ChatResult> {
  const res = await fetch(`${BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, profile_summary: profileSummary ?? null }),
  });
  if (!res.ok) throw new Error(`Falha no chat: ${res.status}`);
  const data = await res.json();
  return data.response as ChatResult;
}
