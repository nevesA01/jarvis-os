import { useState, useCallback, useRef, useEffect } from "react";
import JarvisCore, { CoreStatus } from "@/components/visuals/JarvisCore";
import ConsoleOverlay from "@/components/console/ConsoleOverlay";
import {
  analyzeIntent,
  attachSkillRoutes,
  buildAgentResponse,
  type AgentResponseDraft,
} from "@/lib/agentEngine";
import {
  describeWeather,
  extractWeatherCity,
  fetchCurrentWeather,
  isWeatherQuestion,
} from "@/lib/weather";
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
  LocalAgentAction,
} from "@/types/jarvis";
import { useVoiceEngine } from "@/hooks/useVoiceEngine";
import { useWakeLock } from "@/hooks/useWakeLock";
import { useLocalAgent } from "@/hooks/useLocalAgent";
import { routeSkills } from "@/lib/skillRouter";
import { askConfiguredAi, activeProvider, loadAiSettings } from "@/lib/aiClient";
import { createLearnedMemory, loadPersistedMemories, persistMemories } from "@/lib/memoryStore";

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
  const [memories, setMemories] = useState<MemoryItem[]>(() => loadPersistedMemories(INITIAL_MEMORIES));
  const [containers, setContainers] = useState<DockerContainer[]>(INITIAL_CONTAINERS);
  const [isThinking, setIsThinking] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [caption, setCaption] = useState<string | null>(null);
  const [agentBusyWith, setAgentBusyWith] = useState<string | null>(null);
  const [aiSettings, setAiSettings] = useState(loadAiSettings);
  const localAgent = useLocalAgent();
  const captionTimerRef = useRef<number | null>(null);
  const streamTimerRef = useRef<number | null>(null);

  const pendingApprovals = approvals.filter((a) => a.status === "pending");
  const pendingApproval = pendingApprovals[0] ?? null;

  const nowTime = () =>
    new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  useEffect(() => {
    persistMemories(memories);
  }, [memories]);

  const appendMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  // ===================== Streaming + fala =====================
  const streamAssistantMessage = useCallback(
    (draft: AgentResponseDraft, viaVoice = false, selectedSkills?: NonNullable<ChatMessage["reasoningPlan"]>["selectedSkills"]) => {
      const id = `msg-${Date.now()}-r${Math.random().toString(36).slice(2, 6)}`;
      const base: ChatMessage = {
        id,
        sender: draft.sender,
        senderName: draft.senderName,
        content: "",
        timestamp: nowTime(),
        reasoningPlan: selectedSkills ? { ...draft.reasoningPlan, selectedSkills } : draft.reasoningPlan,
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
    async (text: string, forceAgent?: AgentId | null, viaVoice = false) => {
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
      setAgentBusyWith("Pensando...");

      const configuredProvider = activeProvider(aiSettings);
      const initialAnalysis = analyzeIntent(text);
      if (forceAgent) initialAnalysis.targetAgent = forceAgent;
      const analysis = attachSkillRoutes(text, initialAnalysis, forceAgent);
      const skillRoutes = analysis.skillRoutes || [];
      const memoryRequest = text.match(/^\s*(?:memorize|guarde|lembre|anote|remember)\s*(?:que|:)?\s+(.+)/i);
      if (memoryRequest) {
        const memory = createLearnedMemory(memoryRequest[1].trim(), ["preferência", viaVoice ? "voz" : "manual"], "Memória ensinada pelo operador");
        setMemories((prev) => [memory, ...prev]);
        streamAssistantMessage({
          sender: "supervisor",
          senderName: "Supervisor Nexus",
          content: `🧠 Entendido. Memorizei: **${memoryRequest[1].trim()}**. Vou usar essa informação como contexto nas próximas respostas.`,
          reasoningPlan: {
            intent: "memory_write",
            delegatedAgent: "supervisor",
            risk: "low",
            requiresApproval: false,
            modelUsed: "Jarvis Memory",
            latencyMs: 18,
            tokens: 40,
            selectedSkills: skillRoutes,
          },
        }, viaVoice);
        return;
      }

      if (configuredProvider && !forceAgent && !isWeatherQuestion(text)) {
        try {
          const recentMessages = [...messages, userMsg].filter((message) => message.sender === "user" || message.sender === "supervisor").slice(-12).map((message) => ({ role: message.sender === "user" ? "user" as const : "assistant" as const, content: message.content }));
          const memoryContext = memories.filter((memory) => `${memory.title} ${memory.content} ${memory.tags.join(" ")}`.toLowerCase().includes(text.toLowerCase().split(/\s+/).find((word) => word.length > 4) || "__none__"));
          const answer = await askConfiguredAi(aiSettings, recentMessages, { memories: memoryContext, agent: forceAgent || "supervisor" });
          streamAssistantMessage({
            sender: "supervisor",
            senderName: `Jarvis · ${configuredProvider.name}`,
            content: answer.content,
            reasoningPlan: {
              intent: "configured_ai_response",
              delegatedAgent: "supervisor",
              risk: "low",
              requiresApproval: false,
              modelUsed: answer.model,
              latencyMs: 0,
              tokens: answer.content.length,
            },
          }, viaVoice);
          return;
        } catch (error) {
          setAgentBusyWith(`Fallback local: ${error instanceof Error ? error.message : "IA indisponível"}`);
        }
      }

      if (isWeatherQuestion(text)) {
        const city = extractWeatherCity(text) || "Manaus";
        try {
          const weather = await fetchCurrentWeather(city);
          streamAssistantMessage({
            sender: "supervisor",
            senderName: "Jarvis",
            content: `Em ${weather.city}, agora está ${weather.temperature.toFixed(1)} °C, com ${describeWeather(weather.weatherCode)}. Sensação de ${weather.feelsLike.toFixed(1)} °C e vento de ${weather.windSpeed.toFixed(1)} km/h.`,
            reasoningPlan: {
              intent: "weather_question",
              delegatedAgent: "supervisor",
              risk: "low",
              requiresApproval: false,
              modelUsed: "Open-Meteo",
              latencyMs: 420,
              tokens: 55,
            },
          }, viaVoice);
        } catch {
          streamAssistantMessage({
            sender: "supervisor",
            senderName: "Jarvis",
            content: `Não consegui consultar o tempo de ${city} agora.`,
            reasoningPlan: {
              intent: "weather_question",
              delegatedAgent: "supervisor",
              risk: "low",
              requiresApproval: false,
              modelUsed: "Open-Meteo",
              latencyMs: 420,
              tokens: 20,
            },
          }, viaVoice);
        }
        return;
      }

      window.setTimeout(() => {
        const analysis = analyzeIntent(text);
        if (forceAgent) {
          analysis.targetAgent = forceAgent as typeof analysis.targetAgent;
        }
        setAgentBusyWith(`Respondendo...`);
        streamAssistantMessage(buildAgentResponse(text, analysis), viaVoice);
      }, 350);
    },
    [aiSettings, appendMessage, messages, memories, streamAssistantMessage]
  );

  // ===================== Voice =====================
  const handleSendRef = useRef<
    (text: string, forceAgent?: AgentId | null, viaVoice?: boolean) => void
  >(() => {});
  const voiceCommandRef = useRef<(text: string) => void>(() => {});

  const voice = useVoiceEngine(useCallback((text: string) => {
    // Intercepta respostas de autorização pendente antes de rotear ao supervisor
    voiceCommandRef.current(text);
  }, []));
  const voiceRef = useRef(voice);
  voiceRef.current = voice;
  useEffect(() => {
    handleSendRef.current = handleSendMessage;
  }, [handleSendMessage]);

  // Esconde a legenda quando você começa a falar de novo
  useEffect(() => {
    if (voice.status === "command") setCaption(null);
  }, [voice.status]);

  // Saudação falada na primeira ativação da sessão
  const greetedRef = useRef(false);
  useEffect(() => {
    if (voice.isEnabled && !greetedRef.current) {
      greetedRef.current = true;
      const hour = new Date().getHours();
      const greeting =
        hour < 12
          ? "Bom dia"
          : hour < 18
          ? "Boa tarde"
          : "Boa noite";
      const msg = `${greeting}, senhor. Todos os sistemas operacionais. Agentes em prontidão.`;
      setCaption(msg);
      voiceRef.current.speakIfEnabled(msg);
      captionTimerRef.current = window.setTimeout(() => setCaption(null), 7000);
    }
  }, [voice.isEnabled]);

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
      if (decision === "approved" && target?.details.localAction) {
        const localAction = target.details.localAction as LocalAgentAction;
        void localAgent.execute({
          requestId: id,
          ...localAction,
        }).then((result) => {
          const resultText = typeof result === "string" ? result : JSON.stringify(result);
          setMemories((prev) => [createLearnedMemory(
            `A ação autorizada "${target.title}" terminou com sucesso. Resultado observado: ${resultText.slice(0, 500)}`,
            ["execução", target.details.localAction?.action || "ação-local"],
            "Execução local aprendida"
          ), ...prev]);
          appendMessage({
            id: `msg-${Date.now()}-local`,
            sender: "supervisor",
            senderName: "Supervisor Nexus",
            content: `✅ Ação local executada pelo agente Windows: **${target.title}**.\n\nResultado: \`${resultText.slice(0, 500)}\``,
            timestamp: nowTime(),
            reasoningPlan: {
              intent: "local_agent_execution",
              delegatedAgent: target.agentId,
              risk: target.risk,
              requiresApproval: false,
              modelUsed: "Jarvis Local Agent",
              latencyMs: 0,
              tokens: 0,
            },
            toolExecution: {
              toolName: "Jarvis Windows Agent",
              target: target.target,
              status: "success",
            },
          });
        }).catch((error: unknown) => {
          appendMessage({
            id: `msg-${Date.now()}-local-error`,
            sender: "supervisor",
            senderName: "Supervisor Nexus",
            content: `⚠️ A autorização foi registrada, mas o agente Windows não executou a ação: **${error instanceof Error ? error.message : "erro desconhecido"}**.`,
            timestamp: nowTime(),
            reasoningPlan: {
              intent: "local_agent_execution",
              delegatedAgent: target.agentId,
              risk: target.risk,
              requiresApproval: false,
              modelUsed: "Jarvis Local Agent",
              latencyMs: 0,
              tokens: 0,
            },
            toolExecution: {
              toolName: "Jarvis Windows Agent",
              target: target.target,
              status: "blocked",
            },
          });
        });
      }
      appendMessage({
        id: `msg-${Date.now()}`,
        sender: "supervisor",
        senderName: "Supervisor Nexus",
      content:
        decision === "approved"
          ? `✅ **Autorização registrada** para o pedido \`${id}\` (${target?.title}).\n\n${target?.details.localAction ? "O pedido foi enviado ao agente local pareado." : "Este pedido é simulado e não possui uma ação local vinculada."}`
          : `🚫 **Ação rejeitada pelo operador** (\`${id}\`).\n\nO pedido foi cancelado antes de chegar a qualquer agente local. A justificativa "${note ?? "sem justificativa"}" foi registrada na memória episódica.`,
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
          ? target?.details.localAction
            ? `Autorização registrada. Enviando a ação para o agente Windows agora.`
            : `Autorização registrada. Este pedido não possui uma ação local vinculada.`
          : `Entendido. Operação cancelada e registrada na memória.`;
      setCaption(spoken);
      voiceRef.current.speakIfEnabled(spoken);
      if (captionTimerRef.current) window.clearTimeout(captionTimerRef.current);
      captionTimerRef.current = window.setTimeout(() => setCaption(null), 6000);
    },
    [approvals, appendMessage, localAgent]
  );

  // Autorização por voz: "autorizar/sim" aprova, "recusar/não/cancelar" rejeita.
  // Roda antes do roteamento normal, só quando há pedido pendente.
  const handleResolveApprovalRef = useRef(handleResolveApproval);
  useEffect(() => {
    handleResolveApprovalRef.current = handleResolveApproval;
  }, [handleResolveApproval]);

  useEffect(() => {
    voiceCommandRef.current = (text: string) => {
      const pending = approvals.find((a) => a.status === "pending");
      if (pending) {
        const t = text.toLowerCase();
        if (/\b(autorizar|autoriza|autorizo|aprovar|aprova|aprovo|confirmar|confirma|confirmo|concedo|sim|pode|executa|execute)\b/.test(t)) {
          handleResolveApprovalRef.current(pending.id, "approved", "Autorizado por voz");
          return;
        }
        if (/\b(recusar|recusa|recuso|rejeitar|rejeita|rejeito|cancelar|cancela|cancelo|não|nao|negar|nego)\b/.test(t)) {
          handleResolveApprovalRef.current(pending.id, "rejected", "Recusado por voz");
          return;
        }
      }
      handleSendRef.current(text, null, true);
    };
  }, [approvals]);

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

  const handleFeedback = useCallback((id: string, feedback: "positive" | "negative") => {
    setMessages((prev) => prev.map((message) => message.id === id ? { ...message, feedback } : message));
    setMemories((prev) => [{
      id: `mem-feedback-${Date.now()}`,
      type: "episodic",
      title: feedback === "positive" ? "Resposta validada pelo operador" : "Resposta a revisar no próximo ciclo",
      content: `Feedback ${feedback === "positive" ? "positivo" : "negativo"} registrado para a resposta do agente: ${id}. Usar este sinal para melhorar roteamento e qualidade.`,
      category: "Aprendizado",
      tags: ["feedback", feedback === "positive" ? "aprovado" : "revisar"],
      createdAt: nowTime(),
      updatedAt: nowTime(),
      confidence: 1,
    }, ...prev]);
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
        onFeedback={handleFeedback}
        approvals={approvals}
        onResolveApproval={handleResolveApproval}
        memories={memories}
        onAddMemory={handleAddMemory}
        onDeleteMemory={handleDeleteMemory}
        containers={containers}
        onRestartContainer={handleRestartContainer}
        voice={voice}
        localAgent={{
          status: localAgent.status,
          agentName: localAgent.agentName,
          error: localAgent.error,
          onPair: (code) => void localAgent.pair(code),
          onDisconnect: () => void localAgent.disconnect(),
        }}
        onAiSettingsChange={setAiSettings}
      />
    </div>
  );
};

export default Index;
