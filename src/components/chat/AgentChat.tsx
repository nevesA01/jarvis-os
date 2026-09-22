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
  Activity,
  Lightbulb,
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
  onFeedback?: (id: string, feedback: "positive" | "negative") => void;
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
  onFeedback,
  voice,
}) => {
  const [inputText, setInputText] = useState("");
  const [agentSelectorOpen, setAgentSelectorOpen] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showPromptGuide, setShowPromptGuide] = useState(true);

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
      label: "Status da VPS",
      prompt: "Verificar consumo de CPU, RAM e integridade dos containers Docker",
      icon: <Activity className="h-3.5 w-3.5 text-cyan-300" />,
    },
    {
      label: "Auditar segurança",
      prompt: "Executar análise defensiva SAST e verificar portas abertas no firewall",
      icon: <Shield className="h-3.5 w-3.5 text-rose-300" />,
    },
    {
      label: "Criar endpoint",
      prompt: "Criar uma rota autenticada com Pydantic v2 e rate limiting no FastAPI",
      icon: <Code className="h-3.5 w-3.5 text-emerald-300" />,
    },
    {
      label: "Pesquisar solução",
      prompt: "Pesquisar a melhor forma de orquestrar agentes com LangGraph",
      icon: <Search className="h-3.5 w-3.5 text-amber-300" />,
    },
    {
      label: "Ação crítica",
      prompt: "Executar docker volume prune -a para remover volumes órfãos da VPS",
      icon: <AlertTriangle className="h-3.5 w-3.5 text-orange-300" />,
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
    <div className="flex flex-col h-[calc(100vh-13rem)] min-h-[560px] rounded-[1.75rem] border border-cyan-400/20 bg-[#07111f]/90 overflow-hidden shadow-[0_24px_80px_rgba(1,8,20,0.55)] relative">
      {/* Top Chat Header */}
      <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-white/[0.07] bg-white/[0.025] backdrop-blur shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="rounded-2xl border border-cyan-300/25 bg-cyan-300/10 p-2">
            <JarvisCoreLogo size={30} animated={true} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold tracking-tight text-white truncate">Canal Neural</h2>
              <span className={`h-2 w-2 rounded-full shrink-0 ${isStreaming ? "bg-cyan-300 animate-ping" : "bg-emerald-300"}`} />
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              {isStreaming
                ? "Processando sua solicitação..."
                : selectedAgentId
                ? `Agente fixado: ${selectedAgentId}`
                : "Supervisor ativo · aprovação humana protegida"}
            </p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onClearChat}
          className="shrink-0 rounded-xl border border-white/[0.07] bg-white/[0.025] text-[11px] text-slate-400 hover:bg-white/[0.08] hover:text-white"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1" />
          Limpar
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
                    onClick={() => onFeedback?.(msg.id, "positive")}
                    className={`p-1.5 rounded-lg transition-all ${msg.feedback === "positive" ? "bg-emerald-400/15 text-emerald-300" : "text-slate-500 hover:text-emerald-400 hover:bg-slate-800"}`}
                    title="Resposta útil (registra feedback)"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onFeedback?.(msg.id, "negative")}
                    className={`p-1.5 rounded-lg transition-all ${msg.feedback === "negative" ? "bg-rose-400/15 text-rose-300" : "text-slate-500 hover:text-rose-400 hover:bg-slate-800"}`}
                    title="Resposta ruim (registra feedback)"
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
      <div className="border-t border-white/[0.07] bg-[#081524] px-4 py-3 shrink-0">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            <Lightbulb className="h-3.5 w-3.5 text-amber-300" /> Comece por aqui
          </div>
          <button
            type="button"
            onClick={() => setShowPromptGuide((visible) => !visible)}
            className="text-[10px] text-cyan-300/70 hover:text-cyan-100"
          >
            {showPromptGuide ? "Ocultar sugestões" : "Mostrar sugestões"}
          </button>
        </div>
        {showPromptGuide && (
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
            {samplePrompts.map((p) => (
              <button
                key={p.label}
                onClick={() => onSendMessage(p.prompt)}
                disabled={isStreaming}
                className="flex shrink-0 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 py-2 text-xs text-slate-300 transition hover:border-cyan-300/40 hover:bg-cyan-300/10 hover:text-white disabled:opacity-40"
              >
                {p.icon}
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input Form with Agent Selector & Voice */}
      <div className="p-3 sm:p-4 bg-[#0b1929] border-t border-white/[0.07] relative shrink-0">
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

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="rounded-2xl border border-cyan-300/15 bg-[#07111f] p-3 shadow-inner shadow-cyan-950/20">
            <div className="mb-2 flex items-center justify-between gap-3">
              <label htmlFor="jarvis-command" className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-100/60">
                Próximo comando
              </label>
              <span className="text-[10px] text-slate-500">Enter envia · Shift + Enter quebra linha</span>
            </div>
            <div className="flex items-end gap-2">
              <div className="relative flex-1">
                <Textarea
                  id="jarvis-command"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    voice.isEnabled
                      ? 'Diga “Jarvis” + comando ou escreva aqui...'
                      : "Descreva o que precisa: objetivo, alvo e resultado esperado"
                  }
                  rows={2}
                  disabled={isStreaming}
                  className="min-h-[72px] rounded-xl border-white/[0.08] bg-white/[0.035] pr-12 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:ring-cyan-300/50 resize-none"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={voice.toggle}
                  className={`absolute right-2 bottom-2 rounded-xl transition-all ${voice.isEnabled ? "bg-cyan-300/15 text-cyan-200 shadow-[0_0_18px_rgba(103,232,249,0.25)]" : "text-slate-400 hover:bg-white/[0.06] hover:text-cyan-200"}`}
                  title={voice.isEnabled ? "Desligar microfone" : "Ativar escuta por voz"}
                >
                  {voice.isEnabled ? <Mic className="w-4 h-4 animate-pulse" /> : <MicOff className="w-4 h-4" />}
                </Button>
              </div>
              <Button
                type="submit"
                disabled={!inputText.trim() || isStreaming}
                className="h-[72px] rounded-xl bg-cyan-300 px-5 font-semibold text-slate-950 shadow-[0_8px_24px_rgba(103,232,249,0.18)] hover:bg-cyan-200 disabled:opacity-40"
              >
                {isStreaming ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                <span className="sr-only">Enviar comando</span>
              </Button>
            </div>
          </div>

          {/* Agent Selector Row */}
          <div className="flex items-center justify-between gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setAgentSelectorOpen((v) => !v)}
                className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 py-1.5 text-xs text-slate-300 transition-all hover:border-cyan-300/40"
              >
                {AGENT_SELECTOR.find((a) => a.id === (selectedAgentId as any))?.icon || <Cpu className="h-3.5 w-3.5 text-cyan-300" />}
                <span className="max-w-[160px] truncate">{AGENT_SELECTOR.find((a) => a.id === (selectedAgentId as any))?.label || "Auto · Supervisor decide"}</span>
                <ChevronDown className={`h-3.5 w-3.5 text-slate-500 transition-transform ${agentSelectorOpen ? "rotate-180" : ""}`} />
              </button>

              {agentSelectorOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setAgentSelectorOpen(false)} />
                  <div className="absolute bottom-full left-0 z-20 mb-2 w-56 overflow-hidden rounded-2xl border border-white/[0.1] bg-[#0b1929] shadow-2xl">
                    {AGENT_SELECTOR.map((ag) => (
                      <button
                        key={ag.label}
                        type="button"
                        onClick={() => { onSelectAgent(ag.id); setAgentSelectorOpen(false); }}
                        className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-xs transition-all ${selectedAgentId === ag.id ? "bg-cyan-300/10 text-cyan-100" : "text-slate-300 hover:bg-white/[0.06]"}`}
                      >
                        {ag.icon}
                        {ag.label}
                        {selectedAgentId === ag.id && <Check className="ml-auto h-3.5 w-3.5 text-cyan-300" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <span className="hidden text-[10px] text-slate-500 sm:inline">A IA confirma antes de ações críticas</span>
          </div>

        </form>
      </div>
    </div>
  );
};
