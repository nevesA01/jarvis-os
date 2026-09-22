import { useCallback, useEffect, useRef, useState } from "react";

export type LocalAgentStatus = "checking" | "disconnected" | "paired" | "error";

export interface LocalAgentRequest {
  requestId: string;
  action: "read_file" | "write_file" | "list_directory" | "open_application" | "close_application" | "run_command" | "download_file";
  path?: string;
  content?: string;
  application?: string;
  args?: string[];
  command?: string;
  workingDirectory?: string;
  url?: string;
  destination?: string;
}

interface AgentStatusResponse {
  paired: boolean;
  agentName: string;
  capabilities: string[];
}

const AGENT_URLS = ["http://127.0.0.1:3210", "http://localhost:3210"];
const TOKEN_KEY = "jarvis_local_agent_token";

const fetchAgent = async (path: string, init?: RequestInit) => {
  let lastError: unknown;
  for (const baseUrl of AGENT_URLS) {
    try {
      return await fetch(`${baseUrl}${path}`, {
        ...init,
        cache: "no-store",
        signal: AbortSignal.timeout(1800),
      });
    } catch (caught) {
      lastError = caught;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("agent_unreachable");
};

export const useLocalAgent = () => {
  const [status, setStatus] = useState<LocalAgentStatus>("checking");
  const [agentName, setAgentName] = useState("");
  const [error, setError] = useState("");
  const tokenRef = useRef<string | null>(null);

  const checkStatus = useCallback(async () => {
    try {
      const response = await fetchAgent("/status");
      if (!response.ok) throw new Error("status_failed");
      const data = (await response.json()) as AgentStatusResponse;
      setAgentName(data.agentName);
      const savedToken = window.localStorage.getItem(TOKEN_KEY);
      if (data.paired && savedToken) {
        tokenRef.current = savedToken;
        setStatus("paired");
      } else {
        tokenRef.current = null;
        setStatus("disconnected");
      }
      setError("");
    } catch {
      tokenRef.current = null;
      setStatus("disconnected");
      setError("Agente Windows não encontrado em 127.0.0.1:3210");
    }
  }, []);

  useEffect(() => {
    void checkStatus();
    const timer = window.setInterval(() => void checkStatus(), 4000);
    return () => window.clearInterval(timer);
  }, [checkStatus]);

  const pair = useCallback(async (pairingCode: string) => {
    setStatus("checking");
    setError("");
    try {
      const response = await fetchAgent("/pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pairingCode: pairingCode.trim() }),
      });
      const data = (await response.json()) as { token?: string; agentName?: string; error?: string };
      if (!response.ok || !data.token) throw new Error(data.error || "Código de pareamento inválido");
      tokenRef.current = data.token;
      window.localStorage.setItem(TOKEN_KEY, data.token);
      setAgentName(data.agentName || "Agente Windows");
      setStatus("paired");
    } catch (caught) {
      setStatus("error");
      setError(caught instanceof Error ? caught.message : "Falha ao parear o agente");
    }
  }, []);

  const disconnect = useCallback(async () => {
    const token = tokenRef.current;
    if (token) {
      await fetchAgent("/disconnect", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => undefined);
    }
    tokenRef.current = null;
    window.localStorage.removeItem(TOKEN_KEY);
    setStatus("disconnected");
  }, []);

  const execute = useCallback(async (request: LocalAgentRequest) => {
    const token = tokenRef.current;
    if (!token) throw new Error("Agente Windows não está pareado");
    const response = await fetchAgent("/execute", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(request),
    });
    const data = (await response.json()) as { ok?: boolean; result?: unknown; error?: string };
    if (!response.ok || !data.ok) throw new Error(data.error || "O agente recusou a ação");
    return data.result;
  }, []);

  return { status, agentName, error, pair, disconnect, execute, refresh: checkStatus };
};
