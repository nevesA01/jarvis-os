import { useState } from "react";
import { AgentChat } from "@/components/chat/AgentChat";
import { ApprovalsQueue } from "@/components/approvals/ApprovalsQueue";
import { LocalAgentAccessPanel } from "@/components/access/LocalAgentAccessPanel";
import { VpsTelemetryView } from "@/components/telemetry/VpsTelemetry";
import { MemoryManager } from "@/components/memory/MemoryManager";
import { VpsDeployHub } from "@/components/deploy/VpsDeployHub";
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
import {
  MessageSquare,
  ShieldCheck,
  Activity,
  Brain,
  Rocket,
  X,
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
}

type TabId = "chat" | "approvals" | "telemetry" | "memory" | "deploy";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "chat", label: "Canal Neural", icon: <MessageSquare className="w-4 h-4" /> },
  { id: "approvals", label: "Aprovações", icon: <ShieldCheck className="w-4 h-4" /> },
  { id: "telemetry", label: "Telemetria", icon: <Activity className="w-4 h-4" /> },
  { id: "memory", label: "Memória", icon: <Brain className="w-4 h-4" /> },
  { id: "deploy", label: "Deploy", icon: <Rocket className="w-4 h-4" /> },
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
  approvals,
  onResolveApproval,
  memories,
  onAddMemory,
  onDeleteMemory,
  containers,
  onRestartContainer,
  voice,
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
      <div className="absolute inset-0 bg-[#040814]/97 backdrop-blur-2xl" />
      <div className="absolute inset-0 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-8 h-16 border-b border-cyan-500/15">
          <div className="flex items-center gap-3">
            <JarvisCoreLogo size={28} animated />
            <span className="font-mono text-[11px] tracking-[0.4em] text-cyan-200/70">
              CONSOLE TÁTICO
            </span>
          </div>
          <button
            onClick={onClose}
            className="flex items-center gap-2 font-mono text-[10px] tracking-[0.3em] text-cyan-300/60 hover:text-cyan-100 border border-cyan-500/25 rounded-full px-4 py-2 hover:border-cyan-400/50 transition-colors"
          >
            <X className="w-3.5 h-3.5" /> VOLTAR AO NÚCLEO
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1.5 px-5 sm:px-8 py-3 border-b border-cyan-500/10 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-semibold whitespace-nowrap transition-all ${
                tab === t.id
                  ? "bg-cyan-500/15 text-cyan-200 border border-cyan-400/40"
                  : "text-slate-400 hover:text-white border border-transparent hover:bg-slate-800/50"
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
                  <LocalAgentAccessPanel />
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
                <VpsTelemetryView
                  telemetry={INITIAL_TELEMETRY}
                  containers={containers}
                  auditLogs={INITIAL_AUDIT_LOGS}
                  onRestartContainer={onRestartContainer}
                />
              )}
              {tab === "memory" && (
                <MemoryManager
                  memories={memories}
                  onAddMemory={onAddMemory}
                  onDeleteMemory={onDeleteMemory}
                />
              )}
              {tab === "deploy" && <VpsDeployHub />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConsoleOverlay;
