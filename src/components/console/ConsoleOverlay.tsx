import { useState } from "react";
import { AgentChat } from "@/components/chat/AgentChat";
import { ApprovalsQueue } from "@/components/approvals/ApprovalsQueue";
import { LocalAgentAccessPanel } from "@/components/access/LocalAgentAccessPanel";
import { VpsTelemetryView } from "@/components/telemetry/VpsTelemetry";
import { MemoryManager } from "@/components/memory/MemoryManager";
import { VpsDeployHub } from "@/components/deploy/VpsDeployHub";
import { AiSettingsPanel } from "@/components/settings/AiSettingsPanel";
import { JarvisCoreLogo } from "@/components/visuals/JarvisVisuals";
import {
  JARVIS_AGENTS,
  INITIAL_TELEMETRY,
  INITIAL_AUDIT_LOGS,
} from "@/data/jarvisData";
import { AgentNetworkTopology } from "@/components/visuals/AgentNetworkTopology";
import {
  ChatMessage,
  ApprovalRequest,
  MemoryItem,
  AgentId,
  DockerContainer,
} from "@/types/jarvis";
import { UseVoiceEngineReturn } from "@/hooks/useVoiceEngine";
import { AiSettings } from "@/types/ai";
import { SkillsCatalog } from "@/components/skills/SkillsCatalog";
import { InferenceTelemetry } from "@/components/telemetry/InferenceTelemetry";
import {
  MessageSquare,
  ShieldCheck,
  Activity,
  Brain,
  Rocket,
  Sparkles,
  X,
  Settings2,
} from "lucide-react";

interface ConsoleOverlayProps {
  open: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  streamingMessageId: string | null;
  isThinking: boolean;
  onSendMessage: (text: string, forceAgent?: AgentId | null) => void;
  onRegenerate: () => void;
  onClearChat: () => void;
  onFeedback: (id: string, feedback: "positive" | "negative") => void;
  approvals: ApprovalRequest[];
  onResolveApproval: (
    id: string,
    decision: "approved" | "rejected",
    note?: string
  ) => void;
  memories: MemoryItem[];
  onAddMemory: (
    memory: Omit<MemoryItem, "id" | "createdAt" | "updatedAt">
  ) => void;
  onDeleteMemory: (id: string) => void;
  containers: DockerContainer[];
  onRestartContainer: (id: string) => void;
  voice: UseVoiceEngineReturn;
  localAgent: {
    status: "checking" | "disconnected" | "paired" | "error";
    agentName: string;
    error: string;
    desktopPairingCode: string;
    isDesktop: boolean;
    onPair: (code: string) => void;
    onDisconnect: () => void;
    onRefresh: () => void;
  };
  onAiSettingsChange: (settings: AiSettings) => void;
}

type TabId = "chat" | "approvals" | "telemetry" | "memory" | "skills" | "deploy" | "settings";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "chat", label: "Canal Neural", icon: <MessageSquare className="w-4 h-4" /> },
  { id: "approvals", label: "Aprovações", icon: <ShieldCheck className="w-4 h-4" /> },
  { id: "telemetry", label: "Telemetria", icon: <Activity className="w-4 h-4" /> },
  { id: "memory", label: "Memória", icon: <Brain className="w-4 h-4" /> },
  { id: "skills", label: "Skills", icon: <Sparkles className="w-4 h-4" /> },
  { id: "deploy", label: "Deploy", icon: <Rocket className="w-4 h-4" /> },
  { id: "settings", label: "IAs", icon: <Settings2 className="w-4 h-4" /> },
];

const ConsoleOverlay = ({
  open,
  onClose,
  messages,
  streamingMessageId,
  isThinking,
  onSendMessage,
  onRegenerate,
  onClearChat,
  onFeedback,
  approvals,
  onResolveApproval,
  memories,
  onAddMemory,
  onDeleteMemory,
  containers,
  onRestartContainer,
  voice,
  localAgent,
  onAiSettingsChange,
}: ConsoleOverlayProps) => {
  const [tab, setTab] = useState<TabId>("chat");
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  const pendingCount = approvals.filter((a) => a.status === "pending").length;

  return (
    <div
      className={`fixed inset-0 z-50 transition-all duration-500 ${
        open
          ? "opacity-100 pointer-events-auto"
          : "opacity-0 pointer-events-none translate-y-8"
      }`}
    >
      <div className="absolute inset-0 bg-[#06101d]/95 backdrop-blur-2xl" />
      <div className="absolute inset-0 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-5 sm:px-8 h-20 border-b border-white/[0.08] bg-white/[0.025]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="rounded-2xl border border-cyan-300/25 bg-cyan-300/10 p-2">
              <JarvisCoreLogo size={28} animated />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-200/60">J.A.R.V.I.S.</div>
              <div className="text-base font-semibold text-white">Console de comando</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex shrink-0 items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-100/75 transition-colors hover:border-cyan-300/40 hover:bg-cyan-300/10 hover:text-white"
          >
            <X className="w-3.5 h-3.5" /> Fechar
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1.5 px-5 sm:px-8 py-3 border-b border-white/[0.07] bg-[#081524] overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all ${
                tab === t.id
                  ? "border-cyan-300/35 bg-cyan-300/12 text-cyan-100 shadow-[0_0_18px_rgba(103,232,249,0.08)]"
                  : "border-transparent text-slate-400 hover:border-white/[0.08] hover:bg-white/[0.05] hover:text-white"
              }`}
            >
              {t.icon}
              {t.label}
              {t.id === "approvals" && pendingCount > 0 && (
                <span className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white px-1">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto">
            <div className="max-w-7xl mx-auto px-5 sm:px-8 py-6 space-y-6">
              {(tab === "chat" || tab === "telemetry") && (
                <AgentNetworkTopology
                  agents={JARVIS_AGENTS}
                  selectedAgentId={selectedAgentId}
                  onSelectAgent={(id) =>
                    setSelectedAgentId((prev) => (prev === id ? null : id))
                  }
                  pendingApprovalsCount={pendingCount}
                />
              )}

              {tab === "chat" && (
                <>
                  <LocalAgentAccessPanel
                    status={localAgent.status}
                    agentName={localAgent.agentName}
                    error={localAgent.error}
                    desktopPairingCode={localAgent.desktopPairingCode}
                    isDesktop={Boolean((window as Window & { jarvisDesktop?: { isDesktop: boolean } }).jarvisDesktop?.isDesktop)}
                    onPair={localAgent.onPair}
                    onDisconnect={localAgent.onDisconnect}
                    onRefresh={localAgent.onRefresh}
                  />
                  <AgentChat
                  messages={messages}
                  isStreaming={streamingMessageId !== null || isThinking}
                  streamingMessageId={streamingMessageId}
                  onSendMessage={onSendMessage}
                  onRegenerate={onRegenerate}
                  selectedAgentId={selectedAgentId}
                  onSelectAgent={setSelectedAgentId}
                  onClearChat={onClearChat}
                  onRequestApprovalView={() => setTab("approvals")}
                  onFeedback={onFeedback}
                  voice={voice}
                  />
                </>
              )}
              {tab === "approvals" && (
                <ApprovalsQueue
                  approvals={approvals}
                  onResolveApproval={onResolveApproval}
                />
              )}
              {tab === "telemetry" && (
                <>
                  <InferenceTelemetry messages={messages} />
                  <VpsTelemetryView
                    telemetry={INITIAL_TELEMETRY}
                    containers={containers}
                    auditLogs={INITIAL_AUDIT_LOGS}
                    onRestartContainer={onRestartContainer}
                  />
                </>
              )}
              {tab === "memory" && (
                <MemoryManager
                  memories={memories}
                  onAddMemory={onAddMemory}
                  onDeleteMemory={onDeleteMemory}
                />
              )}
              {tab === "skills" && <SkillsCatalog />}
              {tab === "deploy" && <VpsDeployHub />}
              {tab === "settings" && <AiSettingsPanel onSettingsChange={onAiSettingsChange} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConsoleOverlay;
