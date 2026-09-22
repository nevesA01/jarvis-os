import { AiProviderConfig, AiSettings, DEFAULT_AI_SETTINGS } from "@/types/ai";

const STORAGE_KEY = "jarvis_ai_settings";

export const loadAiSettings = (): AiSettings => {
  if (typeof window === "undefined") return DEFAULT_AI_SETTINGS;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) as AiSettings : DEFAULT_AI_SETTINGS;
  } catch {
    return DEFAULT_AI_SETTINGS;
  }
};

export interface AiChatMessage {
  role: "user" | "assistant";
  content: string;
}

export const askConfiguredAi = async (
  settings: AiSettings,
  messages: AiChatMessage[]
): Promise<{ content: string; model: string }> => {
  const provider = settings.providers.find(
    (item) => item.id === settings.activeProviderId && item.enabled && item.model.trim() && item.baseUrl.trim()
  );
  if (!provider) throw new Error("Nenhuma IA ativa foi configurada");

  const response = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      provider: provider.kind,
      baseUrl: provider.baseUrl,
      model: provider.model,
      apiKey: provider.apiKey,
      systemPrompt: settings.systemPrompt,
      messages: messages.slice(-20),
    }),
  });
  const data = (await response.json().catch(() => ({}))) as { content?: string; model?: string; statusMessage?: string; message?: string };
  if (!response.ok || !data.content) throw new Error(data.statusMessage || data.message || "A IA configurada não respondeu");
  return { content: data.content, model: data.model || provider.model };
};

export const activeProvider = (settings: AiSettings): AiProviderConfig | undefined =>
  settings.providers.find((item) => item.id === settings.activeProviderId && item.enabled);
