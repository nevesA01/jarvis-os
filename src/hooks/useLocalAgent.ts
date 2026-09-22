import { useCallback, useState } from "react";

export type LocalAgentStatus = "checking" | "disconnected" | "paired" | "error";

export interface LocalAgentRequest {
  requestId: string;
  action: string;
  [key: string]: unknown;
}

const PHASE_A_AGENT_NAME = "Jarvis Local Agent — Fase A";
const PHASE_A_MESSAGE = "O núcleo local está em Fase A: sem listener local, sem automação e sem ferramentas executáveis.";

export const useLocalAgent = () => {
  const [status] = useState<LocalAgentStatus>("disconnected");
  const [error, setError] = useState("");

  const pair = useCallback(async (_pairingCode: string) => {
    setError("O pareamento WSS será habilitado somente após a revisão e validação da Fase A.");
  }, []);

  const disconnect = useCallback(async () => {
    setError("");
  }, []);

  const execute = useCallback(async (_request: LocalAgentRequest): Promise<never> => {
    throw new Error(PHASE_A_MESSAGE);
  }, []);

  const refresh = useCallback(async () => undefined, []);

  return {
    status,
    agentName: PHASE_A_AGENT_NAME,
    error,
    pair,
    disconnect,
    execute,
    refresh,
  };
};
