import React, { useState, useRef, useEffect } from "react";
import { ChatMessage, AgentId, RiskLevel, ApprovalRequest } from "@/types/jarvis";
import { JarvisCoreLogo, CyberShieldIcon } from "../visuals/JarvisVisuals";
import {
  Send,
  Mic,
  MicOff,
  Code,
  Shield,
  Server,
  Search,
  Zap,
  Terminal,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Cpu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface Props {
  messages: ChatMessage[];
  onSendMessage: (text: string, forceAgent?: AgentId) => void;
  selectedAgentId: string | null;
  onClearChat: () => void;
  onRequestApprovalView: (id?: string) => void;
}

export const AgentChat: React.FC<Props> = ({
  messages,
  onSendMessage,
  selectedAgentId,
  onClearChat,
  onRequestApprovalView,
}) => {
  const [inputText, setInputText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const samplePrompts = [
    {
      label: "🛡️ Auditar Segurança VPS",
      prompt: "Executar análise defensiva SAST e verificar portas abertas no firewall",
    },
    {
      label: "💻 Criar Endpoint FastAPI",
      prompt: "Criar uma rota autenticada com Pydantic v2 e rate limiting no FastAPI",
    },
    {
      label: "⚠️ Teste de Risco Alto (Fila)",
      prompt: "Executar docker volume prune -a para remover volumes órfãos da VPS",
    },
    {
      label: "📊 Checar Vitals da VPS",
      prompt: "Verificar consumo de CPU, RAM e integridade dos 6 containers Docker",
    },
  ];

  const toggleMic = () => {
    if (!isRecording) {
      setIsRecording(true);
      // Simula transcrição rápida após 2.5 segundos
      setTimeout(() => {
        setIsRecording(false);
        setInputText("Jarvis, verifique o status dos serviços Docker e me informe a saúde do Caddy.");
      }, 2400);
    } else {
      setIsRecording(false);
    }
  };

  const getAgentBadge = (sender: string) => {
    switch (sender) {
      case "coder":
        return {
          icon: <Code className="w-3.5 h-3.5 text-emerald-400" />,
          label: "Ares Coder",
          color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
        };
      case "cybersecurity":
        return {
          icon: <Shield className="w-3.5 h-3.5 text-rose-400" />,
          label: "Aegis CyberSec",
          color: "bg-rose-500/10 text-rose-400 border-rose-500/30",
        };
      case "devops":
        return {
          icon: <Server className="w-3.5 h-3.5 text-purple-400" />,
          label: "Titan Ops",
          color: "bg-purple-500/10 text-purple-400 border-purple-500/30",
        };
      case "researcher":
        return {
          icon: <Search className="w-3.5 h-3.5 text-amber-400" />,
          label: "Athena Research",
          color: "bg-amber-500/10 text-amber-400 border-amber-500/30",
        };
      case "automation":
        return {
          icon: <Zap className="w-3.5 h-3.5 text-pink-400" />,
          label: "Hermes Auto",
          color: "bg-pink-500/10 text-pink-400 border-pink-500/30",
        };
      default:
        return {
          icon: <Cpu className="w-3.5 h-3.5 text-sky-400" />,
          label: "Supervisor Nexus",
          color: "bg-sky-500/10 text-sky-400 border-sky-500/30",
        };
    }
  };

  return (
    <div className="flex flex-col h-[750px] rounded-2xl hud-border bg-slate-950/80 overflow-hidden shadow-2xl relative">
      {/* Top Chat Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur">
        <div className="flex items-center gap-3">
          <JarvisCoreLogo size={36} animated={true} />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-white">Canal Neural de Orquestração</h2>
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            </div>
            <p className="text-[11px] font-mono text-slate-400">
              {selectedAgentId
                ? `Roteamento travado no agente: ${selectedAgentId.toUpperCase()}`
                : "Supervisão semântica automática e Human-in-the-Loop ativa"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearChat}
            className="text-xs text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Limpar Sessão
          </Button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
        {messages.map((msg) => {
          const isUser = msg.sender === "user";
          const agentInfo = getAgentBadge(msg.sender);

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? "items-end" : "items-start"} transition-all`}
            >
              {/* Sender Name & Badge */}
              <div className="flex items-center gap-2 mb-1 px-1">
                {isUser ? (
                  <span className="text-xs font-mono text-slate-400">Você (Operador Mestre)</span>
                ) : (
                  <div
                    className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-mono font-medium ${agentInfo.color}`}
                  >
                    {agentInfo.icon}
                    {agentInfo.label}
                  </div>
                )}
                <span className="text-[10px] font-mono text-slate-500">{msg.timestamp}</span>
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[90%] sm:max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed ${
                  isUser
                    ? "bg-sky-600 text-white rounded-tr-sm shadow-md"
                    : "bg-slate-900/90 text-slate-200 border border-slate-800 rounded-tl-sm shadow-lg"
                }`}
              >
                {/* Supervisor Reasoning Plan Card (if available) */}
                {!isUser && msg.reasoningPlan && (
                  <div className="mb-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs font-mono space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] border-b border-slate-800 pb-1.5">
                      <span className="text-sky-400 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        Decisão do Supervisor
                      </span>
                      <span className="text-slate-400">
                        {msg.reasoningPlan.latencyMs}ms • {msg.reasoningPlan.tokens} tokens
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                      <div>
                        <span className="text-slate-500">Intenção: </span>
                        <span className="text-slate-300 font-semibold">{msg.reasoningPlan.intent}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Modelo: </span>
                        <span className="text-slate-300">{msg.reasoningPlan.modelUsed}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Nível de Risco: </span>
                        <span
                          className={`font-semibold ${
                            msg.reasoningPlan.risk === "high"
                              ? "text-rose-400"
                              : msg.reasoningPlan.risk === "medium"
                              ? "text-amber-400"
                              : "text-emerald-400"
                          }`}
                        >
                          {msg.reasoningPlan.risk.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">Aprovação: </span>
                        <span
                          className={
                            msg.reasoningPlan.requiresApproval ? "text-rose-400 font-bold" : "text-slate-400"
                          }
                        >
                          {msg.reasoningPlan.requiresApproval ? "EXIGIDA ⚠️" : "Não Requerida"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Content with markdown formatting */}
                <div className="whitespace-pre-wrap font-sans text-sm text-slate-100">
                  {msg.content}
                </div>

                {/* Tool Execution Card */}
                {msg.toolExecution && (
                  <div className="mt-3 p-3 rounded-xl bg-black/40 border border-slate-800 text-xs font-mono space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center gap-1.5 text-sky-400">
                        <Terminal className="w-3.5 h-3.5" />
                        Ferramenta Executada: {msg.toolExecution.toolName}
                      </span>
                      <span className="flex items-center gap-1 text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" />
                        Sucesso
                      </span>
                    </div>
                    {msg.toolExecution.command && (
                      <div className="text-[11px] text-slate-400 bg-slate-950 p-1.5 rounded border border-slate-900 overflow-x-auto">
                        $ {msg.toolExecution.command}
                      </div>
                    )}
                    {msg.toolExecution.resultSnippet && (
                      <div className="text-[10px] text-emerald-300/90 font-mono bg-emerald-950/20 p-2 rounded border border-emerald-900/30">
                        {msg.toolExecution.resultSnippet}
                      </div>
                    )}
                  </div>
                )}

                {/* High Risk Approval Callout Button */}
                {msg.approvalRequestId && (
                  <div className="mt-3 p-3 rounded-xl bg-rose-950/30 border border-rose-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-rose-300 text-xs">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>Ação pendente de autorização humana no sistema.</span>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => onRequestApprovalView(msg.approvalRequestId)}
                      className="bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs shadow-lg shadow-rose-950/50"
                    >
                      Revisar na Fila
                      <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompts */}
      <div className="px-4 py-2 bg-slate-950 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto text-xs no-scrollbar">
        <span className="text-[11px] font-mono text-slate-500 shrink-0">Comandos rápidos:</span>
        {samplePrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => onSendMessage(p.prompt)}
            className="shrink-0 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-sky-500/40 text-slate-300 hover:text-white transition-all text-xs font-mono"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Input Form with Voice Dictation */}
      <div className="p-3 sm:p-4 bg-slate-900/80 border-t border-slate-800 relative">
        {isRecording && (
          <div className="absolute -top-10 left-4 right-4 bg-rose-950/90 border border-rose-500/40 text-rose-300 text-xs px-3 py-1.5 rounded-lg flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Ouvindo comando de voz... (simulação de Whisper/faster-whisper)</span>
            </div>
            <button onClick={toggleMic} className="text-slate-400 hover:text-white text-[11px]">
              Cancelar
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <div className="relative flex-1">
            <Textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Envie uma instrução para o Jarvis (ex: Criar rota FastAPI, auditar portas da VPS, etc)..."
              rows={2}
              className="bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-500 focus-visible:ring-sky-500 text-sm resize-none pr-12 rounded-xl"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={toggleMic}
              className={`absolute right-2 bottom-2 rounded-lg transition-all ${
                isRecording ? "text-rose-400 bg-rose-950/50" : "text-slate-400 hover:text-sky-400"
              }`}
              title="Comando por voz (Whisper)"
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>
          </div>

          <Button
            type="submit"
            disabled={!inputText.trim()}
            className="h-14 px-5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-sky-950/50 transition-all disabled:opacity-40"
          >
            <Send className="w-5 h-5" />
          </Button>
        </form>
      </div>
    </div>
  );
};
