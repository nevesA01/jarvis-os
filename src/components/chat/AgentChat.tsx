import React, { useState, useRef, useEffect } from "react";
import { ChatMessage, AgentId } from "@/types/jarvis";
import { JarvisCoreLogo } from "../visuals/JarvisVisuals";
import { RichContent } from "./RichContent";
import { UseVoiceEngineReturn } from "@/hooks/useVoiceEngine";
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
  Sparkles,
  ArrowRight,
  RefreshCw,
  Cpu,
  Copy,
  Check,
  ChevronDown,
  User,
  ThumbsUp,
  ThumbsDown,
  Brain,
  Radio,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingMessageId: string | null;
  onSendMessage: (text: string, forceAgent?: AgentId | null) => void;
  onRegenerate: () => void;
  selectedAgentId: string | null;
  onSelectAgent: (id: string | null) => void;
  onClearChat: () => void;
  onRequestApprovalView: (id?: string) => void;
  voice: UseVoiceEngineReturn;
}

const VOICE_STRIP: Record<
  string,
  { label: string; border: string; bg: string; text: string }
> = {
  listening: {
    label: 'SEMPRE ESCUTANDO — DIGA "JARVIS" + COMANDO',
    border: "border-sky-500/30",
    bg: "bg-sky-950/30",
    text: "text-sky-300",
  },
  command: {
    label: "⚡ WAKE WORD DETECTADA — CAPTURANDO COMANDO",
    border: "border-cyan-400/50",
    bg: "bg-cyan-950/25",
    text: "text-cyan-200",
  },
  processing: {
    label: "PROCESSANDO INTENÇÃO...",
    border: "border-amber-500/40",
    bg: "bg-amber-950/20",
    text: "text-amber-300",
  },
  speaking: {
    label: "🔊 RESPONDENDO EM VOZ ALTA",
    border: "border-emerald-500/40",
    bg: "bg-emerald-950/20",
    text: "text-emerald-300",
  },
  requesting: {
    label: "SOLICITANDO MICROFONE...",
    border: "border-amber-500/30",
    bg: "bg-amber-950/10",
    text: "text-amber-300",
  },
  demo: {
    label: "MODO DEMO — COMANDOS SIMULADOS",
    border: "border-fuchsia-500/40",
    bg: "bg-fuchsia-950/20",
    text: "text-fuchsia-300",
  },
};

export const AgentChat: React.FC<Props> = ({
  messages,
  isStreaming,
  streamingMessageId,
  onSendMessage,
  onRegenerate,
  selectedAgentId,
  onSelectAgent,
  onClearChat,
  onRequestApprovalView,
  voice,
}) => {
  const [inputText, setInputText] = useState("");
  const [agentSelectorOpen, setAgentSelectorOpen] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Follow streaming only when autoScroll is enabled
  useEffect(() => {
    if (autoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, autoScroll]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    setAutoScroll(nearBottom);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isStreaming) return;
    onSendMessage(inputText, selectedAgentId as AgentId | null);
    setInputText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const copyMessage = async (msg: ChatMessage) => {
    try {
      await navigator.clipboard.writeText(msg.content);
      setCopiedMsgId(msg.id);
      setTimeout(() => setCopiedMsgId(null), 1500);
    } catch {
      /* noop */
    }
  };

  const samplePrompts = [
    {
      label: "🛡️ Auditar Segurança",
      prompt: "Executar análise defensiva SAST e verificar portas abertas no firewall",
    },
    {
      label: "💻 Criar Endpoint FastAPI",
      prompt: "Criar uma rota autenticada com Pydantic v2 e rate limiting no FastAPI",
    },
    {
      label: "⚠️ Teste de Risco Alto",
      prompt: "Executar docker volume prune -a para remover volumes órfãos da VPS",
    },
    {
      label: "📊 Vitals da VPS",
      prompt: "Verificar consumo de CPU, RAM e integridade dos 6 containers Docker",
    },
    {
      label: "📚 Pesquisar Frameworks",
      prompt: "Pesquisar a melhor forma de orquestrar agentes com LangGraph na VPS",
    },
  ];

  const AGENT_SELECTOR = [
    { id: null, label: "Auto (Supervisor decide)", icon: <Cpu className="w-3.5 h-3.5 text-sky-400" /> },
    { id: "coder", label: "Ares Coder", icon: <Code className="w-3.5 h-3.5 text-emerald-400" /> },
    { id: "cybersecurity", label: "Aegis Sentinel", icon: <Shield className="w-3.5 h-3.5 text-rose-400" /> },
    { id: "devops", label: "Titan Ops", icon: <Server className="w-3.5 h-3.5 text-purple-400" /> },
    { id: "researcher", label: "Athena Research", icon: <Search className="w-3.5 h-3.5 text-amber-400" /> },
    { id: "automation", label: "Hermes Auto", icon: <Zap className="w-3.5 h-3.5 text-pink-400" /> },
  ];

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

  const voiceStrip = VOICE_STRIP[voice.status];
  const voiceDemo = !voice.isSupported || voice.status === "demo";

  return (
    <div className="flex flex-col h-[calc(100vh-13rem)] min-h-[560px] rounded-2xl hud-border bg-slate-950/80 overflow-hidden shadow-2xl relative">
      {/* Top Chat Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur shrink-0">
        <div className="flex items-center gap-3">
          <JarvisCoreLogo size={36} animated={true} />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-white">Canal Neural de Orquestração</h2>
              <span
                className={`w-2 h-2 rounded-full ${
                  isStreaming ? "bg-sky-400 animate-ping" : "bg-emerald-400"
                }`}
              />
            </div>
            <p className="text-[11px] font-mono text-slate-400">
              {isStreaming
                ? "⚡ Processando pipeline neural em tempo real..."
                : selectedAgentId
                ? `Roteamento travado no agente: ${selectedAgentId.toUpperCase()}`
                : "Supervisão semântica automática e Human-in-the-Loop ativa"}
            </p>
          </div>
        </div>

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

      {/* Messages Scroll Area */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5"
      >
        {messages.map((msg) => {
          const isUser = msg.sender === "user";
          const agentInfo = getAgentBadge(msg.sender);
          const isCurrentlyStreaming = msg.id === streamingMessageId;

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? "items-end" : "items-start"} group`}
            >
              {/* Sender Name & Badge */}
              <div className="flex items-center gap-2 mb-1 px-1">
                {isUser ? (
                  <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
                    <User className="w-3 h-3" /> Você (Operador Mestre)
                    {msg.viaVoice && (
                      <span
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-300 text-[9px]"
                        title="Comando enviado por voz"
                      >
                        <Mic className="w-2.5 h-2.5" /> VOZ
                      </span>
                    )}
                  </span>
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
                className={`max-w-[95%] sm:max-w-[85%] rounded-2xl p-4 text-sm relative ${
                  isUser
                    ? "bg-sky-600 text-white rounded-tr-sm shadow-md shadow-sky-950/40"
                    : "bg-slate-900/90 text-slate-200 border border-slate-800 rounded-tl-sm shadow-lg"
                }`}
              >
                {/* Rich Content (markdown + streaming cursor) */}
                <div className="font-sans text-sm text-slate-100">
                  {isUser ? (
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  ) : (
                    <>
                      <RichContent content={msg.content} />
                      {isCurrentlyStreaming && (
                        <span className="inline-block w-2 h-4 ml-1 bg-sky-400 animate-pulse rounded-sm align-text-bottom" />
                      )}
                    </>
                  )}
                </div>

                {/* Tool Execution Card */}
                {msg.toolExecution && (
                  <div className="mt-3 p-3 rounded-xl bg-black/40 border border-slate-800 text-xs font-mono space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center gap-1.5 text-sky-400">
                        <Terminal className="w-3.5 h-3.5" />
                        {msg.toolExecution.toolName}
                      </span>
                      <span className="flex items-center gap-1 text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" />
                        Sucesso
                      </span>
                    </div>
                    {msg.toolExecution.command && (
                      <div className="text-[11px] text-slate-300 bg-slate-950 p-1.5 rounded border border-slate-900 overflow-x-auto">
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

                {/* High Risk Approval Callout */}
                {msg.approvalRequestId && (
                  <div className="mt-3 p-3 rounded-xl bg-rose-950/30 border border-rose-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-rose-300 text-xs">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>Ação pendente de autorização humana no sistema.</span>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => onRequestApprovalView(msg.approvalRequestId)}
                      className="bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs shadow-lg shadow-rose-950/50 shrink-0"
                    >
                      Revisar na Fila
                      <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Message hover actions (agents only) */}
              {!isUser && !isCurrentlyStreaming && (
                <div className="flex items-center gap-1 mt-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => copyMessage(msg)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-all"
                    title="Copiar resposta"
                  >
                    {copiedMsgId === msg.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={onRegenerate}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-all"
                    title="Regenerar resposta"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-slate-800 transition-all"
                    title="Resposta útil (reforça memória)"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-all"
                    title="Resposta ruim (ajusta roteamento)"
                  >
                    <ThumbsDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {!autoScroll && (
        <button
          onClick={() => {
            setAutoScroll(true);
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
          }}
          className="absolute bottom-32 right-6 z-10 p-2 rounded-full bg-sky-500 text-slate-950 shadow-lg shadow-sky-950/50 hover:bg-sky-400 transition-all animate-bounce"
          title="Voltar para o final"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      )}

      {/* Suggested Quick Prompts */}
      <div className="px-4 py-2 bg-slate-950 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto text-xs shrink-0">
        <span className="text-[11px] font-mono text-slate-500 shrink-0">Rápido:</span>
        {samplePrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => onSendMessage(p.prompt)}
            disabled={isStreaming}
            className="shrink-0 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-sky-500/40 text-slate-300 hover:text-white transition-all text-xs font-mono disabled:opacity-40"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Input Form with Agent Selector & Voice */}
      <div className="p-3 sm:p-4 bg-slate-900/80 border-t border-slate-800 relative shrink-0">
        {/* Live voice status strip (always-listening engine) */}
        {voice.isEnabled && voiceStrip && (
          <div
            className={`mb-2 flex items-center justify-between gap-3 rounded-xl border px-3 py-2 ${voiceStrip.border} ${voiceStrip.bg}`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-end gap-[3px] h-5 shrink-0">
                {voice.status === "command" || voice.status === "listening" || voice.status === "demo"
                  ? [0.5, 0.9, 0.65, 1, 0.55, 0.85, 0.45, 0.7, 0.5, 0.95, 0.6, 0.8].map((h, i) => (
                      <span
                        key={i}
                        className={`w-[3px] rounded-full animate-pulse ${voiceStrip.text.replace("text-", "bg-")}`}
                        style={{ height: `${h * 100}%`, animationDelay: `${i * 0.1}s` }}
                      />
                    ))
                  : (
                    <Radio className={`w-4 h-4 animate-pulse ${voiceStrip.text}`} />
                  )}
              </div>
              <div className="min-w-0">
                <div className={`text-[10px] font-mono font-bold tracking-widest ${voiceStrip.text}`}>
                  {voiceStrip.label}
                  {voiceDemo && (
                    <span className="ml-2 px-1.5 py-0.5 rounded bg-fuchsia-500/20 border border-fuchsia-500/40 text-fuchsia-300">
                      DEMO
                    </span>
                  )}
                </div>
                <div className="text-xs font-mono text-slate-300 truncate">
                  {voice.transcript ||
                    (voice.status === "speaking"
                      ? "Sintetizando resposta em pt-BR..."
                      : voice.status === "processing"
                      ? "Enviando comando ao Supervisor Nexus..."
                      : 'Aguardando wake word "Jarvis"…')}
                </div>
              </div>
            </div>
            <button
              onClick={voice.toggle}
              className="shrink-0 text-[11px] font-mono text-slate-400 hover:text-rose-400 transition-colors"
              title="Desligar escuta contínua"
            >
              <MicOff className="w-4 h-4" />
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-2">
          {/* Agent Selector Row */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setAgentSelectorOpen((v) => !v)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-sky-500/50 text-xs font-mono text-slate-300 transition-all"
              >
                {AGENT_SELECTOR.find((a) => a.id === (selectedAgentId as any))?.icon || (
                  <Cpu className="w-3.5 h-3.5 text-sky-400" />
                )}
                <span className="max-w-[140px] truncate">
                  {AGENT_SELECTOR.find((a) => a.id === (selectedAgentId as any))?.label ||
                    "Auto (Supervisor)"}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-500 transition-transform ${
                    agentSelectorOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {agentSelectorOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setAgentSelectorOpen(false)}
                  />
                  <div className="absolute bottom-full mb-2 left-0 z-20 w-56 rounded-xl bg-slate-950 border border-slate-800 shadow-2xl overflow-hidden">
                    {AGENT_SELECTOR.map((ag) => (
                      <button
                        key={ag.label}
                        type="button"
                        onClick={() => {
                          onSelectAgent(ag.id);
                          setAgentSelectorOpen(false);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-mono transition-all ${
                          selectedAgentId === ag.id
                            ? "bg-sky-500/15 text-sky-300"
                            : "text-slate-300 hover:bg-slate-900"
                        }`}
                      >
                        {ag.icon}
                        {ag.label}
                        {selectedAgentId === ag.id && (
                          <Check className="w-3.5 h-3.5 ml-auto text-sky-400" />
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">
              Enter envia • Shift+Enter quebra linha
            </span>
          </div>

          <div className="flex items-end gap-2">
            <div className="relative flex-1">
              <Textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  voice.isEnabled
                    ? 'Modo voz ativo — ou apenas digite: "Jarvis, status da VPS"'
                    : "Envie uma instrução para o Jarvis (ex: Criar rota FastAPI, auditar portas da VPS...)"
                }
                rows={2}
                disabled={isStreaming}
                className="bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-500 focus-visible:ring-sky-500 text-sm resize-none pr-12 rounded-xl"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={voice.toggle}
                className={`absolute right-2 bottom-2 rounded-lg transition-all ${
                  voice.isEnabled
                    ? "text-sky-300 bg-sky-500/15 shadow-[0_0_12px_rgba(56,189,248,0.35)]"
                    : "text-slate-400 hover:text-sky-400"
                }`}
                title={
                  voice.isEnabled
                    ? "Sempre escutando: ATIVO — clique para desligar"
                    : "Ativar modo Sempre Escutando (wake word: Jarvis)"
                }
              >
                {voice.isEnabled ? <Mic className="w-4 h-4 animate-pulse" /> : <MicOff className="w-4 h-4" />}
              </Button>
            </div>

            <Button
              type="submit"
              disabled={!inputText.trim() || isStreaming}
              className="h-14 px-5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-sky-950/50 transition-all disabled:opacity-40"
            >
              {isStreaming ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
