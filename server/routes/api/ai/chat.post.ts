import { defineHandler } from "nitro";
import { createError, readBody } from "nitro/h3";

interface ChatBody {
  provider: "openai" | "anthropic" | "gemini" | "ollama" | "custom";
  baseUrl: string;
  model: string;
  apiKey?: string;
  systemPrompt: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
}

const jsonHeaders = { "Content-Type": "application/json" };

export default defineHandler(async (event) => {
  const body = await readBody<ChatBody>(event);
  if (!body?.provider || !body.model || !body.baseUrl || !Array.isArray(body.messages) || !body.systemPrompt) {
    throw createError({ statusCode: 400, statusMessage: "Configuração de IA incompleta" });
  }

  const apiKey = body.apiKey?.trim();
  const messages = [{ role: "system", content: body.systemPrompt }, ...body.messages.slice(-20)];
  let url = body.baseUrl.replace(/\/$/, "");
  let headers: Record<string, string> = { ...jsonHeaders };
  let payload: Record<string, unknown>;

  if (body.provider === "anthropic") {
    url = `${url}/messages`;
    headers = { ...headers, "x-api-key": apiKey || "", "anthropic-version": "2023-06-01" };
    payload = { model: body.model, max_tokens: 1200, system: body.systemPrompt, messages: body.messages.slice(-20) };
  } else if (body.provider === "gemini") {
    url = `${url}/models/${encodeURIComponent(body.model)}:generateContent${apiKey ? `?key=${encodeURIComponent(apiKey)}` : ""}`;
    payload = { systemInstruction: { parts: [{ text: body.systemPrompt }] }, contents: body.messages.slice(-20).map((message) => ({ role: message.role === "assistant" ? "model" : "user", parts: [{ text: message.content }] })) };
  } else {
    url = `${url}/chat/completions`;
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
    payload = { model: body.model, messages, temperature: 0.2, max_tokens: 1200 };
  }

  const response = await fetch(url, { method: "POST", headers, body: JSON.stringify(payload) });
  const data = await response.json().catch(() => ({})) as Record<string, any>;
  if (!response.ok) throw createError({ statusCode: response.status, statusMessage: data?.error?.message || data?.error?.status || "Provedor de IA recusou a solicitação" });

  const content = body.provider === "anthropic"
    ? data.content?.map((part: { text?: string }) => part.text || "").join("")
    : body.provider === "gemini"
      ? data.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("")
      : data.choices?.[0]?.message?.content;

  if (!content) throw createError({ statusCode: 502, statusMessage: "A IA não retornou texto" });
  return { content, model: body.model };
});
