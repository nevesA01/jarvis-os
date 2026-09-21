import { useState, useCallback, useRef } from "react";
import { CommandBanner, JarvisCoreLogo } from "@/components/visuals/JarvisVisuals";
import { AgentNetworkTopology } from "@/components/visuals/AgentNetworkTopology";
import { AgentChat } from "@/components/chat/AgentChat";
import { ApprovalsQueue } from "@/components/approvals/ApprovalsQueue";
import { VpsTelemetryView } from "@/components/telemetry/VpsTelemetry";
import { MemoryManager } from "@/components/memory/MemoryManager";
import { VpsDeployHub } from "@/components/deploy/VpsDeployHub";
import VoiceOrb from "@/components/visuals/VoiceOrb";
import {
  analyzeIntent,
  buildAgentResponse,
  type AgentResponseDraft,
} from "@/lib/agentEngine";
import {
  JARVIS_AGENTS,
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
} from "@/types/jarvis";
import { useVoiceEngine } from "@/hooks/useVoiceEngine";
import { useWakeLock } from "@/hooks/useWakeLock";
import {
  MessageSquare,
  ShieldCheck,
  Activity,
  Brain,
  Rocket,
} from "lucide-react";

type TabId = "chat" | "approvals" | "telemetry" | "memory" | "deploy";

const Index = () => {
  const [activeTab, setActiveTab] = useState<TabId>("chat");

  // ===================== Jarvis State =====================
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "msg-welcome",
      sender: "supervisor",
      senderName: "Supervisor Nexus",
      content:
        "👋 Olá, Operador! Sou o **Supervisor Nexus**, o núcleo orquestrador do Jarvis.\n\nEstou monitorando sua VPS e meus 5 agentes especialistas estão em prontidão. Envie um comando por texto ou por voz (\"Jarvis, status da VPS\") e farei a análise semântica, verificarei o risco e delegarei a tarefa ao agente adequado.\n\nToda ação crítica passará pela sua aprovação humana antes de ser executada.",
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
  const [containers, setContainers] = useState(INITIAL_CONTAINERS);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const streamTimerRef = useRef<number | null>(null);

  const pendingApprovalsCount = approvals.filter((a) => a.status === "pending").length;

  const nowTime = () =>
    new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const appendMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  // Voice engine is created first; commands are forwarded through a stable ref
  // so the hook can call handleSendMessage defined further below.
  const handleSendRef = useRef<
    (text: string, forceAgent?: AgentId | null, viaVoice?: boolean) => void
  >(() => {});
  const voice = useVoiceEngine(
    useCallback((text: string) => handleSendRef.current(text), [])
  );
  const voiceRef = useRef(voice);
  voiceRef.current = voice;

  // ===================== Streaming reveal engine =====================
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
          voiceRef.current.speakIfEnabled(content);
        }
      };
      streamTimerRef.current = window.setTimeout(tick, 350);
    },
    [appendMessage]
  );

  // ===================== Supervisor Simulation Engine =====================
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

      // Pipeline: Supervisor analyzes intent + risk, then delegates
      setTimeout(() => {
        const analysis = analyzeIntent(text);
        if (forceAgent) {
          analysis.targetAgent = forceAgent as typeof analysis.targetAgent;
        }
        streamAssistantMessage(buildAgentResponse(text, analysis), viaVoice);
      }, 900);
    },
    [appendMessage, streamAssistantMessage]
  );

  handleSendRef.current = handleSendMessage;

  const handleRegenerate = useCallback(() => {
    const lastUser = [...messages].reverse().find((m) => m.sender === "user");
    if (lastUser) handleSendMessage(lastUser.content);
  }, [messages, handleSendMessage]);
  const handleResolveApproval = useCallback(
    (id: string, decision: "approved" | "rejected", note?: string) => {
      setApprovals((prev) =>
        prev.map((appr) =>
          appr.id === id ? { ...appr, status: decision, approvedAt: nowTime(), notes: note } : appr
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
            : `🚫 **Ação rejeitada pelo operador** (\`${id}\`).\n\nO agente ${target?.agentName} foi instruído a abortar a operação. A justificativa "${note}" foi registrada na memória episódica para aprendizado futuro do sistema.`,
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
    },
    [approvals, appendMessage]
  );

  const handleAddMemory = useCallback((memory: Omit<MemoryItem, "id" | "createdAt" | "updatedAt">) => {
    const now = new Date().toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    setMemories((prev) => [
      {
        ...memory,
        id: `mem-${Date.now()}`,
        createdAt: now,
        updatedAt: now,
      },
      ...prev,
    ]);
  }, []);

  const handleDeleteMemory = useCallback((id: string) => {
    setMemories((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const handleRestartContainer = useCallback((containerId: string) => {
    setContainers((prev) =>
      prev.map((c) =>
        c.id === containerId
          ? { ...c, status: "restarting" as const }
          : c
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

  // Keep the screen awake while "Sempre Escutando" is active
  useWakeLock(voice.isEnabled);

  const NAV_TABS = [
    { id: "chat" as TabId, label: "Canal Neural", icon: <MessageSquare className="w-4 h-4" /> },
    { id: "approvals" as TabId, label: "Aprovações", icon: <ShieldCheck className="w-4 h-4" />, badge: pendingApprovalsCount },
    { id: "telemetry" as TabId, label: "Telemetria VPS", icon: <Activity className="w-4 h-4" /> },
    { id: "memory" as TabId, label: "Memória", icon: <Brain className="w-4 h-4" /> },
    { id: "deploy" as TabId, label: "Deploy VPS", icon: <Rocket className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100">
      {/* ===================== Top Header Bar ===================== */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#030712]/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab("chat")}
              className="flex items-center gap-2.5 group"
            >
              <JarvisCoreLogo size={34} animated />
              <span className="text-lg font-extrabold tracking-tight text-white group-hover:text-sky-400 transition-colors">
                JARVIS <span className="text-sky-400 font-mono text-sm font-semibold">OS</span>
              </span>
            </button>
            <span className="hidden md:inline-flex text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              ● SISTEMA ONLINE — VPS CONECTADA
            </span>
          </div>

          {/* Quick nav for desktop */}
          <nav className="hidden lg:flex items-center gap-1.5">
            {NAV_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-3.5 py-2 rounded-xl text-xs font-mono font-semibold transition-all flex items-center gap-2 ${
                  activeTab === tab.id
                    ? "bg-sky-500/15 text-sky-300 border border-sky-500/40"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent"
                }`}
              >
                {tab.icon}
                {tab.label}
                {!!tab.badge && tab.badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white px-1 shadow-lg shadow-rose-950/60">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* ===================== Main Content Area ===================== */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 pb-16">
        {/* HUD Banner (visible on top-level views) */}
        {activeTab !== "chat" && <CommandBanner activeAgentCount={6} />}

        {/* Agent Topology strip on Chat and Telemetry tabs */}
        {(activeTab === "chat" || activeTab === "telemetry") && (
          <AgentNetworkTopology
            agents={JARVIS_AGENTS}
            selectedAgentId={selectedAgentId}
            onSelectAgent={(id) =>
              setSelectedAgentId((prev) => (prev === id ? null : id))
            }
            pendingApprovalsCount={pendingApprovalsCount}
          />
        )}

        {/* --- TAB: CHAT --- */}
        {activeTab === "chat" && (
          <AgentChat
            messages={messages}
            isStreaming={streamingMessageId !== null || isThinking}
            streamingMessageId={streamingMessageId}
            onSendMessage={handleSendMessage}
            onRegenerate={handleRegenerate}
            selectedAgentId={selectedAgentId}
            onSelectAgent={setSelectedAgentId}
            onClearChat={() => setMessages((prev) => prev.slice(0, 1))}
            onRequestApprovalView={() => setActiveTab("approvals")}
            voice={voice}
          />
        )}

        {/* --- TAB: APPROVALS --- */}
        {activeTab === "approvals" && (
          <ApprovalsQueue
            approvals={approvals}
            onResolveApproval={handleResolveApproval}
          />
        )}

        {/* --- TAB: TELEMETRY --- */}
        {activeTab === "telemetry" && (
          <VpsTelemetryView
            telemetry={INITIAL_TELEMETRY}
            containers={containers}
            auditLogs={INITIAL_AUDIT_LOGS}
            onRestartContainer={handleRestartContainer}
          />
        )}

        {/* --- TAB: MEMORY --- */}
        {activeTab === "memory" && (
          <MemoryManager
            memories={memories}
            onAddMemory={handleAddMemory}
            onDeleteMemory={handleDeleteMemory}
          />
        )}

        {/* --- TAB: DEPLOY HUB --- */}
        {activeTab === "deploy" && <VpsDeployHub />}

        {/* Supervisor thinking indicator */}
        {isThinking && !streamingMessageId && (
          <div className="fixed bottom-24 lg:bottom-6 left-1/2 -translate-x-1/2 lg:left-auto lg:right-24 lg:translate-x-0 z-40 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 border border-sky-500/40 shadow-2xl shadow-sky-950/50">
            <JarvisCoreLogo size={22} animated />
            <span className="text-xs font-mono text-sky-300 animate-pulse">
              Supervisor Nexus analisando intenção e risco...
            </span>
          </div>
        )}
      </main>

      {/* Futuristic always-listening voice orb */}
      <VoiceOrb
        status={voice.status}
        micLevel={voice.micLevel}
        transcript={voice.transcript}
        isSupported={voice.isSupported}
        voiceOutput={voice.voiceOutput}
        onToggle={voice.toggle}
        onToggleVoiceOutput={voice.toggleVoiceOutput}
      />

      {/* Mobile bottom navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-slate-800 bg-[#030712]/95 backdrop-blur-xl">
        <div className="flex items-center justify-around px-2 py-2">
          {NAV_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all ${
                activeTab === tab.id ? "text-sky-400 bg-sky-500/10" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {tab.icon}
              <span className="text-[10px] font-mono font-semibold">{tab.label.split(" ")[0]}</span>
              {!!tab.badge && tab.badge > 0 && (
                <span className="absolute top-0 right-1 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white px-1">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>

      <div className="pb-20 lg:pb-0" />
    </div>
  );
};

export default Index;
