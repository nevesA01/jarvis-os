import type { MemoryItem } from "@/types/jarvis";

const MEMORY_KEY = "jarvis_memory_v2";

const isMemoryItem = (value: unknown): value is MemoryItem => {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<MemoryItem>;
  return typeof item.id === "string" && typeof item.title === "string" && typeof item.content === "string" && Array.isArray(item.tags);
};

export const loadPersistedMemories = (fallback: MemoryItem[]): MemoryItem[] => {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(MEMORY_KEY);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isMemoryItem) : fallback;
  } catch {
    return fallback;
  }
};

export const persistMemories = (memories: MemoryItem[]) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MEMORY_KEY, JSON.stringify(memories.slice(0, 150)));
};

export const createLearnedMemory = (content: string, tags: string[], title = "Aprendizado da sessão"): MemoryItem => {
  const now = new Date().toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return {
    id: `mem-learned-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: "episodic",
    title,
    content,
    category: "Aprendizado",
    tags: ["aprendizado", ...tags],
    createdAt: now,
    updatedAt: now,
    confidence: 0.82,
  };
};
