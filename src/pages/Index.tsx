import { useState, useCallback, useRef, useEffect } from "react";
import JarvisCore, { CoreStatus } from "@/components/visuals/JarvisCore";
import ConsoleOverlay from "@/components/console/ConsoleOverlay";
import {
  analyzeIntent,
  buildAgentResponse,
  type AgentResponseDraft,
} from "@/lib/agentEngine";
import {
  INITIAL_TELEMETRY,
  INITIAL_CONTAINERS,
  INITIAL_APPROVALS,
  INITIAL_MEMORIES,
  INITIAL_AUDIT_LOGS,
} from "@/data/jarvisData";
import {
  ChatMessage,
  ApprovalRequest,
  MemoryItem,
  AgentId,
  DockerContainer,
} from "@/types/jarvis";
import { useVoiceEngine } from "@/hooks/useVoiceEngine";
import { useWakeLock } from "@/hooks/useWakeLock";

/** Deriva o modo da esfera a partir do estado atual do sistema */
const sphereModeFrom = (
  voiceStatus: string,
  isThinking: boolean,
  streaming: boolean,
  hasApproval: boolean
): CoreStatus => {
  if (hasApproval && voiceStatus === "idle") return "alert";
  if (voiceStatus === "speaking") return "speaking";
  if (voiceStatus === "processing" || isThinking || streaming) return "processing";
  if (voiceStatus === "command") return "command";
  if (voiceStatus === "listening" || voiceStatus === "requesting") return "listening";
  if (voiceStatus === "demo") return "listening";
  return "idle";
};

const Index = () => {
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "msg-welcome",
      sender: "supervisor",
      senderName: "Supervisor Nexus",
      content:
        "👋 Olá, Operador! Sou o **Supervisor Nexus**, o núcleo orquestrador do Jarvis.\n\nEstou monitorando sua VPS e meus 5 agentes especialistas estão em prontidão. Envie um comando por texto ou por voz e farei a análise semântica, verificarei o risco e delegarei a tarefa ao agente adequado.\n\nToda ação crítica passará pela sua aprovação humana antes de ser executada.",
      timestamp: "Agora",
      reasoningPlan: {
        intent: "system_boot",
        delegatedAgent: "supervisor",
        risk: "low",
        requiresApproval: false,
        modelUsed: "Mistral NeMo (Local Ollama)",
        latencyMs: 48,
        tokens: 120,
      },
    },
  ]);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>(INITIAL_APPROVALS);
  const [memories, setMemories] = useState<MemoryItem[]>(INITIAL_MEMORIES);
  const [containers, setContainers] = useState<DockerContainer[]>(INITIAL_CONTAINERS);
  const [isThinking, setIsThinking] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [caption, setCaption] = useState<string | null>(null);
  const [agentBusyWith, setAgentBusyWith] = useState<string | null>(null);
  const captionTimerRef = useRef<number | null>(null);
  const streamTimerRef = useRef<number | null>(null);

  const pendingApprovals = approvals.filter((a) => a.status === "pending");
  const pendingApproval = pendingApprovals[0] ?? null;

  const nowTime = () =>
    new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const appendMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  // ===================== Streaming + fala =====================
  const streamAssistantMessage = useCallback(
    (draft: AgentResponseDraft, viaVoice = false) => {
      const id = `msg-${Date.now()}-r${Math.random().toString(36).slice(2, 6)}`;
      const base: ChatMessage = {
        id,
        sender: draft.sender,
        senderName: draft.senderName,
        content: "",
        timestamp: nowTime(),
        reasoningPlan: draft.reasoningPlan,
        toolExecution: draft.toolExecution,
        approvalRequestId: draft.approvalRequestId,
        viaVoice,
      };
      if (draft.newApproval) {
        setApprovals((prev) => [draft.newApproval as ApprovalRequest, ...prev]);
      }
      appendMessage(base);
      setIsThinking(false);
      setStreamingMessageId(id);

      // Legenda em tela durante a "fala"
      if (captionTimerRef.current) window.clearTimeout(captionTimerRef.current);
      setCaption(null);

      const content = draft.content;
      let i = 0;
      const CHUNK = 4;
      const tick = () => {
        i = Math.min(content.length, i + CHUNK);
        const slice = content.slice(0, i);
        setMessages((prev) =>
          prev.map((m) => (m.id === id ? { ...m, content: slice } : m))
        );
        if (i < content.length) {
          streamTimerRef.current = window.setTimeout(tick, 16);
        } else {
          streamTimerRef.current = null;
          setStreamingMessageId(null);
          // Exibe a legenda por alguns segundos e some — estilo filme
          voiceRef.current.speakIfEnabled(content);
          const plain = content
            .replace(/```[\s\S]*?```/g, "")
            .replace(/[*_#>`]/g, "")
            .trim();
          setCaption(plain.slice(0, 240));
          setAgentBusyWith(null);
          captionTimerRef.current = window.setTimeout(() => setCaption(null), 9000);
        }
      };
      streamTimerRef.current = window.setTimeout(tick, 350);
    },
    [appendMessage]
  );

  // ===================== Supervisor Engine =====================
  const handleSendMessage = useCallback(
    (text: string, forceAgent?: AgentId | null, viaVoice = false) => {
      const userMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        sender: "user",
        senderName: "Você",
        content: text,
        timestamp: nowTime(),
        viaVoice,
      };
      appendMessage(userMsg);
      setIsThinking(true);
      setAgentBusyWith("Analisando intenção e avaliando risco da operação");

      setTimeout(() => {
        const analysis = analyzeIntent(text);
        if (forceAgent) {
          analysis.targetAgent = forceAgent as typeof analysis.targetAgent;
        }
        setAgentBusyWith(`Delegando para: ${analysis.targetAgent ?? "supervisor"}`);
        streamAssistantMessage(buildAgentResponse(text, analysis), viaVoice);
      }, 900);
    },
    [appendMessage, streamAssistantMessage]
  );

  // ===================== Voice =====================
  const handleSendRef = useRef<
    (text: string, forceAgent?: AgentId | null, viaVoice?: boolean) => void
  >(() => {});
  const voice = useVoiceEngine(
    useCallback((text: string) => handleSendRef.current(text), [])
  );
  const voiceRef = useRef(voice);
  voiceRef.current = voice;
  useEffect(() => {
    handleSendRef.current = handleSendMessage;
  }, [handleSendMessage]);

  // Esconde a legenda quando você começa a falar de novo
  useEffect(() => {
    if (voice.status === "command") setCaption(null);
  }, [voice.status]);

  useWakeLock(voice.isEnabled);

  const handleRegenerate = useCallback(() => {
    const lastUser = [...messages].reverse().find((m) => m.sender === "user");
    if (lastUser) handleSendMessage(lastUser.content);
  }, [messages, handleSendMessage]);

  const handleResolveApproval = useCallback(
    (id: string, decision: "approved" | "rejected", note?: string) => {
      setApprovals((prev) =>
        prev.map((appr) =>
          appr.id === id
            ? { ...appr, status: decision, approvedAt: nowTime(), notes: note }
            : appr
        )
      );

      const target = approvals.find((a) => a.id === id);
      appendMessage({
        id: `msg-${Date.now()}`,
        sender: "supervisor",
        senderName: "Supervisor Nexus",
        content:
          decision === "approved"
            ? `✅ **Autorização humana registrada** para o pedido \`${id}\` (${target?.title}).\n\nO agente ${target?.agentName} já está executando a tarefa em ambiente sandboxed. O resultado aparecerá no canal neural em instantes e será registrado nos logs de auditoria.`
            : `🚫 **Ação rejeitada pelo operador** (\`${id}\`).\n\nO agente ${target?.agentName} foi instruído a abortar a operação. A justificativa "${note ?? "sem justificativa"}" foi registrada na memória episódica.`,
        timestamp: nowTime(),
        reasoningPlan: {
          intent: "human_in_the_loop_review",
          delegatedAgent: target?.agentId || "supervisor",
          risk: target?.risk || "high",
          requiresApproval: false,
          modelUsed: "Supervisor Guardrails",
          latencyMs: 25,
          tokens: 60,
        },
      });

      // Jarvis fala a confirmação
      const spoken =
        decision === "approved"
          ? `Autorização concedida. Executando ${target?.title ?? "operação"} agora.`
          : `Entendido. Operação cancelada e registrada na memória.`;
      setCaption(spoken);
      voiceRef.current.speakIfEnabled(spoken);
      if (captionTimerRef.current) window.clearTimeout(captionTimerRef.current);
      captionTimerRef.current = window.setTimeout(() => setCaption(null), 6000);
    },
    [approvals, appendMessage]
  );

  const handleAddMemory = useCallback(
    (memory: Omit<MemoryItem, "id" | "createdAt" | "updatedAt">) => {
      const now = new Date().toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      setMemories((prev) => [
        { ...memory, id: `mem-${Date.now()}`, createdAt: now, updatedAt: now },
        ...prev,
      ]);
    },
    []
  );

  const handleDeleteMemory = useCallback((id: string) => {
    setMemories((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const handleRestartContainer = useCallback((containerId: string) => {
    setContainers((prev) =>
      prev.map((c) =>
        c.id === containerId ? { ...c, status: "restarting" as const } : c
      )
    );
    setTimeout(() => {
      setContainers((prev) =>
        prev.map((c) =>
          c.id === containerId ? { ...c, status: "running" as const } : c
        )
      );
    }, 2000);
  }, []);

  useEffect(() => {
    return () => {
      if (streamTimerRef.current) window.clearTimeout(streamTimerRef.current);
      if (captionTimerRef.current) window.clearTimeout(captionTimerRef.current);
    };
  }, []);

  const sphereMode = sphereModeFrom(
    voice.status,
    isThinking,
    streamingMessageId !== null,
    pendingApproval !== null
  );

  return (
    <div className="bg-[#02040a] min-h-screen">
      <JarvisCore
        status={sphereMode}
        micLevel={voice.micLevel}
        transcript={voice.transcript}
        caption={caption}
        agentBusyWith={agentBusyWith}
        pendingApproval={pendingApproval}
        isSupported={voice.isSupported}
        listeningOn={voice.isEnabled}
        onToggleListening={() => {
          voice.toggle();
        }}
        onToggleVoiceOutput={voice.toggleVoiceOutput}
        voiceOutput={voice.voiceOutput}
        onResolveApproval={(id, decision) =>
          handleResolveApproval(id, decision, undefined)
        }
        onOpenConsole={() => setConsoleOpen(true)}
        onManualCommand={(text) => handleSendMessage(text)}
      />

      <ConsoleOverlay
        open={consoleOpen}
        onClose={() => setConsoleOpen(false)}
        messages={messages}
        streamingMessageId={streamingMessageId}
        isThinking={isThinking}
        onSendMessage={(text, forceAgent) => handleSendMessage(text, forceAgent)}
        onRegenerate={handleRegenerate}
        onClearChat={() => setMessages((prev) => prev.slice(0, 1))}
        approvals={approvals}
        onResolveApproval={handleResolveApproval}
        memories={memories}
        onAddMemory={handleAddMemory}
        onDeleteMemory={handleDeleteMemory}
        containers={containers}
        onRestartContainer={handleRestartContainer}
        voice={voice}
      />
    </div>
  );
};

export default Index;
