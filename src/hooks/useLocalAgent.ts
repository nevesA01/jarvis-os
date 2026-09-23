import { useCallback, useEffect, useRef, useState } from "react";

export type LocalAgentStatus = "checking" | "disconnected" | "paired" | "error";

export interface LocalAgentRequest {
  requestId: string;
  action: string;
  [key: string]: unknown;
}

const DESKTOP_BRIDGE = (window as Window & { jarvisDesktop?: { isDesktop: boolean } }).jarvisDesktop;
const LOCAL_AGENT_URL = DESKTOP_BRIDGE?.isDesktop ? "http://127.0.0.1:3211" : "http://127.0.0.1:3210";
const AGENT_NAME = "Jarvis Local Agent — Windows";
const REQUEST_TIMEOUT_MS = 8000;
const TOKEN_STORAGE_KEY = "jarvis.localAgent.token";

const loadStoredToken = () => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
};

const saveStoredToken = (token: string) => {
  try {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch {
    // O pareamento continua válido durante a sessão mesmo se o armazenamento estiver bloqueado.
  }
};

const clearStoredToken = () => {
  try {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // Não impede a desconexão do agente.
  }
};

interface StatusResponse {
  paired?: boolean;
  agentName?: string;
  pairingCode?: string;
}

interface PairResponse {
  token?: string;
  agentName?: string;
  error?: string;
}

interface ExecuteResponse {
  ok?: boolean;
  result?: unknown;
  error?: string;
}

const fetchWithTimeout = async (input: RequestInfo | URL, init?: RequestInit) => {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal, cache: "no-store" });
  } finally {
    window.clearTimeout(timeout);
  }
};

const describeConnectionError = (error: unknown) => {
  if (error instanceof DOMException && error.name === "AbortError") return "O agente local não respondeu em 8 segundos.";
  if (error instanceof TypeError) return DESKTOP_BRIDGE?.isDesktop
    ? "O agente local do Jarvis não respondeu. Feche e abra novamente o aplicativo Windows."
    : "Não foi possível conectar ao agente local. Inicie o Jarvis Local Agent no Windows e mantenha a porta 3210 ativa.";
  return error instanceof Error ? error.message : "Falha de comunicação com o agente local.";
};

export const useLocalAgent = () => {
  const [status, setStatus] = useState<LocalAgentStatus>("checking");
  const [agentName, setAgentName] = useState(AGENT_NAME);
  const [error, setError] = useState("");
  const [desktopPairingCode, setDesktopPairingCode] = useState("");
  const tokenRef = useRef<string | null>(loadStoredToken());

  const refresh = useCallback(async () => {
    try {
      const response = await fetchWithTimeout(`${LOCAL_AGENT_URL}/status`, { cache: "no-store" });
      if (!response.ok) throw new Error(`Agente local indisponível (${response.status})`);
      const data = await response.json() as StatusResponse;
      setAgentName(data.agentName || AGENT_NAME);
      setDesktopPairingCode(data.pairingCode || "");
      if (data.paired && tokenRef.current) setStatus("paired");
      else {
        tokenRef.current = null;
        clearStoredToken();
        setStatus("disconnected");
      }
      setError("");
    } catch (refreshError) {
      setStatus("disconnected");
      setError(describeConnectionError(refreshError));
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
      const response = await fetchWithTimeout(`${LOCAL_AGENT_URL}/pair`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pairingCode: normalizedCode }),
      });
      const data = await response.json() as PairResponse;
      if (!response.ok || !data.token) throw new Error(data.error || "Código de pareamento inválido");
      tokenRef.current = data.token;
      saveStoredToken(data.token);
      setAgentName(data.agentName || AGENT_NAME);
      setStatus("paired");
    } catch (pairError) {
      setStatus("error");
      setError(describeConnectionError(pairError));
    }
  }, []);

  const disconnect = useCallback(async () => {
    if (tokenRef.current) {
      await fetchWithTimeout(`${LOCAL_AGENT_URL}/disconnect`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenRef.current}` },
      }).catch(() => undefined);
    }
    tokenRef.current = null;
    clearStoredToken();
    setStatus("disconnected");
    setError("");
  }, []);

  const execute = useCallback(async (request: LocalAgentRequest): Promise<unknown> => {
    const token = tokenRef.current;
    if (!token) throw new Error("Agente local não está pareado");

    const response = await fetchWithTimeout(`${LOCAL_AGENT_URL}/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(request),
    });
    const data = await response.json() as ExecuteResponse;
    if (!response.ok || !data.ok) {
      if (response.status === 401) {
        tokenRef.current = null;
        clearStoredToken();
        setStatus("disconnected");
      }
      throw new Error(data.error || `O agente local recusou a execução (${response.status})`);
    }
    return data.result;
  }, []);

  return {
    status,
    agentName,
    error,
    desktopPairingCode,
    pair,
    disconnect,
    execute,
    refresh,
  };
};
