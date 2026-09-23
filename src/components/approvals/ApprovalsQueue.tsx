import React, { useState } from "react";
import { ApprovalRequest, RiskLevel } from "@/types/jarvis";
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Terminal,
  RotateCcw,
  Clock,
  FileCode,
  Lock,
  ChevronRight,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Props {
  approvals: ApprovalRequest[];
  onResolveApproval: (id: string, decision: "approved" | "rejected", note?: string) => void;
  selectedApprovalId?: string | null;
}

export const ApprovalsQueue: React.FC<Props> = ({
  approvals,
  onResolveApproval,
  selectedApprovalId,
}) => {
  const [activeId, setActiveId] = useState<string | null>(
    selectedApprovalId || (approvals.length > 0 ? approvals[0].id : null)
  );
  const [filter, setFilter] = useState<"all" | "pending" | "resolved">("pending");
  const [rejectionNote, setRejectionNote] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);

  const filteredApprovals = approvals.filter((appr) => {
    if (filter === "pending") return appr.status === "pending";
    if (filter === "resolved") return appr.status !== "pending";
    return true;
  });

  const currentApproval = approvals.find((a) => a.id === (activeId || selectedApprovalId)) || filteredApprovals[0];

  const handleApprove = (id: string) => {
    onResolveApproval(id, "approved");
  };

  const handleReject = (id: string) => {
    onResolveApproval(id, "rejected", rejectionNote || "Rejeitado pelo operador humano por precaução de segurança.");
    setIsRejecting(false);
    setRejectionNote("");
  };

  return (
    <div className="space-y-6">
      {/* Header Info Banner */}
      <div className="p-4 rounded-2xl hud-border bg-slate-900/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              Fila de Governança Human-in-the-Loop
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Guarda-Chuva Ativo
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Nenhuma ação destrutiva, modificação de firewall ou alteração em produção é executada sem o seu aval explícito.
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setFilter("pending")}
            className={`px-3 py-1 text-xs font-mono rounded-lg transition-all ${
              filter === "pending"
                ? "bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Pendentes ({approvals.filter((a) => a.status === "pending").length})
          </button>
          <button
            onClick={() => setFilter("resolved")}
            className={`px-3 py-1 text-xs font-mono rounded-lg transition-all ${
              filter === "resolved"
                ? "bg-sky-500/20 text-sky-300 font-semibold border border-sky-500/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Resolvidas ({approvals.filter((a) => a.status !== "pending").length})
          </button>
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1 text-xs font-mono rounded-lg transition-all ${
              filter === "all"
                ? "bg-slate-800 text-white font-semibold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Todas ({approvals.length})
          </button>
        </div>
      </div>

      {/* Main Grid: List on Left, Inspection Detail on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: List of items */}
        <div className="lg:col-span-5 space-y-3">
          {filteredApprovals.length === 0 ? (
            <div className="p-8 rounded-2xl hud-border text-center bg-slate-950/40">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-80" />
              <p className="text-sm font-semibold text-slate-200">Nenhuma solicitação pendente</p>
              <p className="text-xs text-slate-500 mt-1">
                O sistema de agentes está operando dentro dos limites seguros sem ações perigosas no momento.
              </p>
            </div>
          ) : (
            filteredApprovals.map((appr) => {
              const isSelected = (currentApproval?.id || "") === appr.id;
              return (
                <div
                  key={appr.id}
                  onClick={() => setActiveId(appr.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer text-left relative overflow-hidden ${
                    isSelected
                      ? "bg-slate-900 border-sky-500/70 shadow-lg ring-1 ring-sky-500/50"
                      : "bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase border ${
                        appr.risk === "high"
                          ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                          : "bg-amber-500/15 text-amber-400 border-amber-500/30"
                      }`}
                    >
                      Risco {appr.risk.toUpperCase()}
                    </span>

                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-semibold ${
                        appr.status === "pending"
                          ? "bg-amber-500/20 text-amber-300 animate-pulse"
                          : appr.status === "approved"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-rose-500/20 text-rose-300"
                      }`}
                    >
                      {appr.status === "pending"
                        ? "Aguardando"
                        : appr.status === "approved"
                        ? "Aprovado"
                        : "Rejeitado"}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white line-clamp-1">{appr.title}</h3>
                  <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                    {appr.details.actionDescription}
                  </p>

                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 mt-3 pt-2 border-t border-slate-800/80">
                    <span className="text-sky-400 font-semibold">{appr.agentName}</span>
                    <span>{appr.timestamp}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Inspection details & Decision actions */}
        <div className="lg:col-span-7">
          {currentApproval ? (
            <div className="rounded-2xl hud-border bg-slate-900/80 p-6 space-y-5">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      variant="outline"
                      className={`font-mono text-[10px] uppercase ${
                        currentApproval.risk === "high"
                          ? "border-rose-500 text-rose-400 bg-rose-950/40"
                          : "border-amber-500 text-amber-400 bg-amber-950/40"
                      }`}
                    >
                      Classificação: {currentApproval.risk}
                    </Badge>
                    <span className="text-xs font-mono text-slate-400">ID: {currentApproval.id}</span>
                  </div>
                  <h3 className="text-lg font-bold text-white">{currentApproval.title}</h3>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-mono text-slate-400 block">Agente Solicitante</span>
                  <span className="text-sm font-bold font-mono text-sky-400">
                    {currentApproval.agentName}
                  </span>
                </div>
              </div>

              {/* Action Description */}
              <div className="space-y-1.5">
                <span className="text-xs font-mono text-slate-400 uppercase tracking-wide">
                  Descrição da Ação Proposta
                </span>
                <p className="text-sm text-slate-200 bg-slate-950/60 p-3 rounded-xl border border-slate-800 leading-relaxed">
                  {currentApproval.details.actionDescription}
                </p>
              </div>

              {/* Target & Command */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                  <span className="text-[11px] font-mono text-slate-500 uppercase">Alvo da Operação</span>
                  <p className="text-xs font-mono text-slate-200 truncate">{currentApproval.target}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                  <span className="text-[11px] font-mono text-slate-500 uppercase">Ferramenta Solicitada</span>
                  <p className="text-xs font-mono text-sky-300 truncate">{currentApproval.tool}</p>
                </div>
              </div>

              {/* Command or Diff Code */}
              {currentApproval.details.command && (
                <div className="space-y-1.5">
                  <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5 uppercase">
                    <Terminal className="w-3.5 h-3.5 text-sky-400" />
                    Comando Shell que seria executado
                  </span>
                  <div className="p-3 rounded-xl bg-black border border-slate-800 text-xs font-mono text-emerald-400 overflow-x-auto">
                    $ {currentApproval.details.command}
                  </div>
                </div>
              )}

              {currentApproval.details.diffOrPayload && (
                <div className="space-y-1.5">
                  <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5 uppercase">
                    <FileCode className="w-3.5 h-3.5 text-sky-400" />
                    Payload / Diferença / Arquivos Impactados
                  </span>
                  <pre className="p-3 rounded-xl bg-black border border-slate-800 text-xs font-mono text-slate-300 whitespace-pre-wrap overflow-x-auto max-h-48">
                    {currentApproval.details.diffOrPayload}
                  </pre>
                </div>
              )}

              {/* Risk Assessment & Rollback */}
              <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30 space-y-2">
                <div className="flex items-center gap-2 text-rose-400 font-semibold text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Por que esta ação exige aprovação humana?</span>
                </div>
                <p className="text-xs text-rose-200/90 leading-relaxed">
                  {currentApproval.details.riskReason}
                </p>

                <div className="pt-2 border-t border-rose-500/20 flex items-start gap-2 text-xs text-slate-400">
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-slate-300">Plano de Contingência / Rollback: </strong>
                    {currentApproval.details.rollbackPlan}
                  </span>
                </div>
              </div>

              {/* Decision Section */}
              {currentApproval.status === "pending" ? (
                <div className="pt-2 space-y-3">
                  {isRejecting ? (
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                      <p className="text-xs font-semibold text-slate-200">
                        Justificativa de Rejeição (será registrada nos Logs de Auditoria):
                      </p>
                      <input
                        type="text"
                        value={rejectionNote}
                        onChange={(e) => setRejectionNote(e.target.value)}
                        placeholder="Ex: Risco desnecessário no momento. Prefiro fazer backup manual antes..."
                        className="w-full bg-slate-900 border border-slate-700 text-xs text-white p-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsRejecting(false)}
                          className="text-xs text-slate-400"
                        >
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleReject(currentApproval.id)}
                          className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono"
                        >
                          Confirmar Rejeição
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
                      <Button
                        variant="outline"
                        onClick={() => setIsRejecting(true)}
                        className="w-full sm:w-auto border-rose-500/40 text-rose-400 hover:bg-rose-950/40 text-xs font-mono h-11 px-5"
                      >
                        <XCircle className="w-4 h-4 mr-2 text-rose-400" />
                        Rejeitar Ação
                      </Button>
                      <Button
                        onClick={() => handleApprove(currentApproval.id)}
                        className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs font-mono h-11 px-6 shadow-lg shadow-emerald-950/60"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Autorizar solicitação
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className={`p-4 rounded-xl border text-center font-mono text-xs flex items-center justify-center gap-2 ${
                  currentApproval.status === "approved"
                    ? currentApproval.executionStatus === "failed"
                      ? "bg-rose-950/30 border-rose-500/30 text-rose-300"
                      : currentApproval.executionStatus === "running"
                      ? "bg-amber-950/30 border-amber-500/30 text-amber-300"
                      : "bg-emerald-950/30 border-emerald-500/30 text-emerald-300"
                    : "bg-rose-950/30 border-rose-500/30 text-rose-300"
               }`}>
                  {currentApproval.status === "approved" ? (
                    currentApproval.executionStatus === "failed" ? (
                      <>
                        <XCircle className="w-4 h-4 text-rose-400" />
                        Autorizada, mas não executada: {currentApproval.executionError}
                      </>
                    ) : currentApproval.executionStatus === "running" ? (
                      <>
                        <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
                        Autorizada; aguardando confirmação do agente Windows...
                      </>
                    ) : currentApproval.details.localAction ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        Ação aprovada e confirmada pelo agente Windows.
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        Solicitação aprovada pelo operador.
                      </>
                    )
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-rose-400" />
                      Ação bloqueada e rejeitada pelo operador.
                    </>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="h-full min-h-[300px] flex items-center justify-center rounded-2xl hud-border bg-slate-950/40 text-slate-500 text-xs font-mono">
              Selecione uma solicitação para inspecionar os detalhes de segurança.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
