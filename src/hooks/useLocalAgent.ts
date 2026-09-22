import { useCallback, useEffect, useRef, useState } from "react";

export type LocalAgentStatus = "checking" | "disconnected" | "paired" | "error";

export interface LocalAgentRequest {
  requestId: string;
  action: string;
  [key: string]: unknown;
}

const LOCAL_AGENT_URL = "http://127.0.0.1:3210";
const AGENT_NAME = "Jarvis Local Agent — Windows";
const PHASE_A_MESSAGE = "O agente local ainda não aceita execuções nesta fase.";

interface StatusResponse {
  paired?: boolean;
  agentName?: string;
}

interface PairResponse {
  token?: string;
  agentName?: string;
  error?: string;
}

export const useLocalAgent = () => {
  const [status, setStatus] = useState<LocalAgentStatus>("checking");
  const [agentName, setAgentName] = useState(AGENT_NAME);
  const [error, setError] = useState("");
  const tokenRef = useRef<string | null>(localStorage.getItem("jarvis.localAgent.token"));

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`${LOCAL_AGENT_URL}/status`, { cache: "no-store" });
      if (!response.ok) throw new Error("Agente local indisponível");
      const data = await response.json() as StatusResponse;
      setAgentName(data.agentName || AGENT_NAME);
      setStatus(data.paired && tokenRef.current ? "paired" : "disconnected");
      setError("");
    } catch {
      setStatus("disconnected");
      setError("Inicie o Local Agent no computador e tente novamente.");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const pair = useCallback(async (pairingCode: string) => {
    const normalizedCode = pairingCode.replace(/\D/g, "").slice(0, 6);
    if (normalizedCode.length !== 6) {
      setStatus("error");
      setError("Digite o código numérico de 6 dígitos exibido no agente local.");
      return;
    }

    setStatus("checking");
    setError("");
    try {
      const response = await fetch(`${LOCAL_AGENT_URL}/pair`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pairingCode: normalizedCode }),
      });
      const data = await response.json() as PairResponse;
      if (!response.ok || !data.token) throw new Error(data.error || "Código de pareamento inválido");
      tokenRef.current = data.token;
      localStorage.setItem("jarvis.localAgent.token", data.token);
      setAgentName(data.agentName || AGENT_NAME);
      setStatus("paired");
    } catch (pairError) {
      setStatus("error");
      setError(pairError instanceof Error ? pairError.message : "Não foi possível parear o agente.");
    }
  }, []);

  const disconnect = useCallback(async () => {
    if (tokenRef.current) {
      await fetch(`${LOCAL_AGENT_URL}/disconnect`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenRef.current}` },
      }).catch(() => undefined);
    }
    tokenRef.current = null;
    localStorage.removeItem("jarvis.localAgent.token");
    setStatus("disconnected");
    setError("");
  }, []);

  const execute = useCallback(async (_request: LocalAgentRequest): Promise<never> => {
    throw new Error(PHASE_A_MESSAGE);
  }, []);

  return {
    status,
    agentName,
    error,
    pair,
    disconnect,
    execute,
    refresh,
  };
};
