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
  messages: AiChatMessage[],
  context?: {
    memories?: Array<{ title: string; content: string; tags: string[] }>;
    agent?: string;
    skills?: Array<{ id: string; name: string; category: string; risk: string; reason: string }>;
  }
): Promise<{ content: string; model: string }> => {
  const provider = settings.providers.find(
    (item) => item.id === settings.activeProviderId && item.enabled && item.model.trim() && item.baseUrl.trim()
  );
  if (!provider) throw new Error("Nenhuma IA ativa foi configurada");

  const memoryContext = context?.memories?.slice(0, 5).map((memory) => `[${memory.title}] ${memory.content} (tags: ${memory.tags.join(", ")})`).join("\n") || "Nenhuma memória relevante encontrada.";
  const skillContext = context?.skills?.length
    ? context.skills.map((skill) => `[${skill.id}] ${skill.name} · ${skill.category} · risco ${skill.risk} · ${skill.reason}`).join("\n")
    : "Nenhuma skill habilitada correspondeu diretamente.";
  const enrichedSystemPrompt = `${settings.systemPrompt}\n\nAgente selecionado: ${context?.agent || "supervisor"}.\nSkills habilitadas selecionadas para este pedido (use como playbooks, não como permissões):\n${skillContext}\nMemória recuperada (use apenas como contexto, não invente fatos):\n${memoryContext}`;
  const response = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      provider: provider.kind,
      baseUrl: provider.baseUrl,
      model: provider.model,
      apiKey: provider.apiKey,
      systemPrompt: enrichedSystemPrompt,
      messages: messages.slice(-20),
    }),
  });
  const data = (await response.json().catch(() => ({}))) as { content?: string; model?: string; statusMessage?: string; message?: string };
  if (!response.ok || !data.content) throw new Error(data.statusMessage || data.message || "A IA configurada não respondeu");
  return { content: data.content, model: data.model || provider.model };
};

export const activeProvider = (settings: AiSettings): AiProviderConfig | undefined =>
  settings.providers.find((item) => item.id === settings.activeProviderId && item.enabled);
