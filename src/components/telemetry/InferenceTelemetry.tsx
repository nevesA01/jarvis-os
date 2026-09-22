import { useMemo } from "react";
import { Activity, BarChart3, Gauge, Leaf, Route, Zap } from "lucide-react";
import type { ChatMessage } from "@/types/jarvis";

interface Props { messages: ChatMessage[] }

export const InferenceTelemetry = ({ messages }: Props) => {
  const assistantMessages = useMemo(() => messages.filter((message) => message.sender !== "user" && message.reasoningPlan), [messages]);
  const totalTokens = assistantMessages.reduce((sum, message) => sum + (message.reasoningPlan?.tokens || 0), 0);
  const avgLatency = assistantMessages.length ? Math.round(assistantMessages.reduce((sum, message) => sum + (message.reasoningPlan?.latencyMs || 0), 0) / assistantMessages.length) : 0;
  const approvals = messages.filter((message) => message.toolExecution?.status === "pending_approval").length;
  const localRoutes = assistantMessages.filter((message) => /local|ollama|mistral/i.test(message.reasoningPlan?.modelUsed || "")).length;
  const localShare = assistantMessages.length ? Math.round((localRoutes / assistantMessages.length) * 100) : 0;
  const stats = [
    { label: "Inferências", value: assistantMessages.length, detail: "turns registrados", icon: <Activity className="h-4 w-4 text-cyan-300" /> },
    { label: "Latência média", value: `${avgLatency} ms`, detail: "tempo estimado", icon: <Gauge className="h-4 w-4 text-violet-300" /> },
    { label: "Tokens", value: totalTokens.toLocaleString("pt-BR"), detail: "saída observada", icon: <Zap className="h-4 w-4 text-amber-300" /> },
    { label: "Rota local", value: `${localShare}%`, detail: "prioridade on-device", icon: <Leaf className="h-4 w-4 text-emerald-300" /> },
  ];

  return <section className="rounded-[28px] border border-cyan-300/15 bg-slate-950/50 p-5 shadow-2xl shadow-cyan-950/10 sm:p-6">
    <div className="flex flex-col gap-2 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-mono uppercase tracking-[.28em] text-cyan-300/70">Telemetry · trace loop</p><h2 className="mt-1 text-base font-semibold text-white">Observabilidade da inteligência</h2></div><span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/[.07] px-3 py-1.5 text-[11px] text-emerald-200"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" /> coleta local ativa</span></div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{stats.map((stat) => <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/[.025] p-4"><div className="flex items-center justify-between text-[11px] text-slate-400">{stat.label}{stat.icon}</div><div className="mt-2 text-xl font-semibold text-white">{stat.value}</div><div className="mt-1 text-[10px] text-slate-500">{stat.detail}</div></div>)}</div>
    <div className="mt-4 grid gap-3 lg:grid-cols-[1.1fr_.9fr]"><div className="rounded-2xl border border-white/10 bg-white/[.02] p-4"><div className="flex items-center gap-2 text-xs font-semibold text-slate-200"><BarChart3 className="h-4 w-4 text-cyan-300" /> Últimas rotas</div><div className="mt-3 space-y-2">{assistantMessages.slice(-4).reverse().map((message) => <div key={message.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-[11px]"><span className="truncate text-slate-300">{message.senderName}</span><span className="shrink-0 text-cyan-200/70">{message.reasoningPlan?.modelUsed}</span></div>)}{assistantMessages.length === 0 && <p className="text-xs text-slate-500">As próximas respostas aparecerão aqui como traces.</p>}</div></div><div className="rounded-2xl border border-white/10 bg-white/[.02] p-4"><div className="flex items-center gap-2 text-xs font-semibold text-slate-200"><Route className="h-4 w-4 text-violet-300" /> Governança</div><p className="mt-3 text-xs leading-relaxed text-slate-400">Cada resposta mantém intenção, agente, modelo, latência e tokens. {approvals ? `${approvals} operação(s) aguardaram aprovação humana nesta sessão.` : "Nenhuma operação aguardou aprovação nesta sessão."}</p><div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-emerald-300 transition-all" style={{ width: `${Math.max(localShare, 4)}%` }} /></div><p className="mt-2 text-[10px] text-slate-500">local-first · cloud como fallback consciente</p></div></div>
  </section>;
};
