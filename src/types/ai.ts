export type AiProviderKind = "openai" | "anthropic" | "gemini" | "ollama" | "custom";

export interface AiProviderConfig {
  id: string;
  name: string;
  kind: AiProviderKind;
  baseUrl: string;
  model: string;
  apiKey: string;
  enabled: boolean;
}

export interface AiSettings {
  providers: AiProviderConfig[];
  activeProviderId: string;
  systemPrompt: string;
}

export const DEFAULT_AI_SETTINGS: AiSettings = {
  providers: [
    { id: "openai", name: "OpenAI", kind: "openai", baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini", apiKey: "", enabled: false },
    { id: "anthropic", name: "Anthropic", kind: "anthropic", baseUrl: "https://api.anthropic.com/v1", model: "claude-3-5-sonnet-latest", apiKey: "", enabled: false },
    { id: "gemini", name: "Google Gemini", kind: "gemini", baseUrl: "https://generativelanguage.googleapis.com/v1beta", model: "gemini-1.5-flash", apiKey: "", enabled: false },
    { id: "ollama", name: "Ollama local", kind: "ollama", baseUrl: "http://127.0.0.1:11434", model: "llama3.2", apiKey: "", enabled: false },
    { id: "custom", name: "Endpoint compatível", kind: "custom", baseUrl: "", model: "", apiKey: "", enabled: false },
  ],
  activeProviderId: "openai",
  systemPrompt: "Você é Jarvis, um assistente em português do Brasil. Entenda a intenção, faça perguntas objetivas quando faltar contexto e nunca alegue ter executado algo sem uma confirmação do agente local.",
};
