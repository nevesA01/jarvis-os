import React, { useState } from "react";
import { SystemTelemetry, DockerContainer, AuditLog } from "@/types/jarvis";
import {
  Cpu,
  HardDrive,
  Activity,
  Server,
  Terminal,
  RefreshCw,
  Coins,
  ShieldCheck,
  AlertTriangle,
  Play,
  RotateCw,
  Eye,
  CheckCircle2,
  Layers,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  telemetry: SystemTelemetry;
  containers: DockerContainer[];
  auditLogs: AuditLog[];
  onRestartContainer: (containerId: string) => void;
}

export const VpsTelemetryView: React.FC<Props> = ({
  telemetry,
  containers,
  auditLogs,
  onRestartContainer,
}) => {
  const [selectedContainerLogs, setSelectedContainerLogs] = useState<DockerContainer | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 600);
  };

  return (
    <div className="space-y-6">
      {/* Top Status & Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CPU Card */}
        <div className="p-4 rounded-2xl hud-border bg-slate-900/70 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono uppercase tracking-wider">Carga de CPU</span>
            <Cpu className="w-4 h-4 text-sky-400" />
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-2xl font-bold font-mono text-white">{telemetry.cpuUsage}%</span>
            <span className="text-[11px] font-mono text-emerald-400 flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse" />
              Normal (4 vCPUs)
            </span>
          </div>
          <Progress value={telemetry.cpuUsage} className="h-1.5 bg-slate-800" />
        </div>

        {/* RAM Card */}
        <div className="p-4 rounded-2xl hud-border bg-slate-900/70 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono uppercase tracking-wider">Memória RAM</span>
            <Activity className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-2xl font-bold font-mono text-white">
              {telemetry.ramUsage.usedGb} <span className="text-xs text-slate-400 font-normal">/ {telemetry.ramUsage.totalGb} GB</span>
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              ({telemetry.ramUsage.percent}%)
            </span>
          </div>
          <Progress value={telemetry.ramUsage.percent} className="h-1.5 bg-slate-800" />
        </div>

        {/* Storage Card */}
        <div className="p-4 rounded-2xl hud-border bg-slate-900/70 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono uppercase tracking-wider">Armazenamento SSD</span>
            <HardDrive className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-2xl font-bold font-mono text-white">
              {telemetry.storage.usedGb} <span className="text-xs text-slate-400 font-normal">/ {telemetry.storage.totalGb} GB</span>
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              ({telemetry.storage.percent}%)
            </span>
          </div>
          <Progress value={telemetry.storage.percent} className="h-1.5 bg-slate-800" />
        </div>

        {/* Tokens & Cost Card */}
        <div className="p-4 rounded-2xl hud-border bg-slate-900/70 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono uppercase tracking-wider">Tokens & Custo Hoje</span>
            <Coins className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-2xl font-bold font-mono text-amber-300">
              ${telemetry.monthlyCostEstimate.toFixed(2)}
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              {telemetry.tokensToday.toLocaleString()} tkns
            </span>
          </div>
          <div className="text-[10px] font-mono text-emerald-400 flex items-center justify-between">
            <span>Modelos Locais: 72%</span>
            <span>APIs Nuvem: 28%</span>
          </div>
        </div>
      </div>

      {/* VPS Metadata Bar */}
      <div className="p-3.5 rounded-xl hud-border bg-slate-950 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
        <div className="flex items-center gap-4">
          <span className="text-slate-400">
            Host VPS: <strong className="text-white">{telemetry.osName}</strong>
          </span>
          <span className="text-slate-400">
            IP: <strong className="text-sky-400">{telemetry.vpsIp}</strong>
          </span>
          <span className="text-slate-400">
            Uptime: <strong className="text-emerald-400">{telemetry.uptime}</strong>
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          className="text-xs font-mono text-slate-400 hover:text-white h-8"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isRefreshing ? "animate-spin text-sky-400" : ""}`} />
          Atualizar Métricas
        </Button>
      </div>

      {/* Docker Containers Section */}
      <div className="rounded-2xl hud-border bg-slate-950/60 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
              Containers Docker do Jarvis OS ({containers.length} Ativos)
            </h3>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Isolamento de Rede Interna Ativo
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {containers.map((c) => (
            <div
              key={c.id}
              className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    {c.name}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[9px] font-mono uppercase bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                  >
                    {c.status}
                  </Badge>
                </div>

                <p className="text-[11px] font-mono text-slate-400 truncate mb-1">
                  Imagem: {c.image}
                </p>
                <p className="text-[10px] font-mono text-sky-400 truncate mb-3">
                  Portas: {c.port}
                </p>

                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono bg-slate-950 p-2 rounded border border-slate-800/80 mb-3">
                  <div>
                    <span className="text-slate-500 block">CPU</span>
                    <span className="text-slate-200">{c.cpu}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">RAM</span>
                    <span className="text-slate-200">{c.memory}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedContainerLogs(c)}
                  className="flex-1 text-[11px] font-mono h-8 border-slate-700 hover:bg-slate-800 text-slate-300"
                >
                  <Eye className="w-3 h-3 mr-1 text-sky-400" />
                  Logs
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRestartContainer(c.id)}
                  className="text-[11px] font-mono h-8 border-slate-700 hover:bg-slate-800 text-slate-300"
                  title="Reiniciar Container de Forma Segura"
                >
                  <RotateCw className="w-3 h-3 text-amber-400" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Audit Logs Trail */}
      <div className="rounded-2xl hud-border bg-slate-950/60 p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
              Trilha de Auditoria & Observabilidade (JSON Logs)
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-500">Persistente em Postgres</span>
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto font-mono text-xs">
          {auditLogs.map((log) => (
            <div
              key={log.id}
              className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <span className="text-slate-500 text-[10px]">{log.timestamp}</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                    log.agent === "supervisor"
                      ? "text-sky-400 bg-sky-950"
                      : log.agent === "cybersecurity"
                      ? "text-rose-400 bg-rose-950"
                      : log.agent === "coder"
                      ? "text-emerald-400 bg-emerald-950"
                      : "text-purple-400 bg-purple-950"
                  }`}
                >
                  {log.agent}
                </span>
                <span className="text-slate-300 font-semibold">{log.action}:</span>
                <span className="text-slate-400 line-clamp-1">{log.details}</span>
              </div>

              <span
                className={`text-[10px] uppercase px-2 py-0.5 rounded ${
                  log.risk === "high"
                    ? "text-rose-400 bg-rose-950/60 border border-rose-800"
                    : log.risk === "medium"
                    ? "text-amber-400 bg-amber-950/60 border border-amber-800"
                    : "text-emerald-400 bg-emerald-950/60 border border-emerald-800"
                }`}
              >
                {log.risk}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Dialog for Container Logs */}
      {selectedContainerLogs && (
        <Dialog open={!!selectedContainerLogs} onOpenChange={() => setSelectedContainerLogs(null)}>
          <DialogContent className="max-w-2xl bg-slate-950 border-slate-800 text-white font-mono">
            <DialogHeader>
              <DialogTitle className="text-sm font-mono flex items-center gap-2 text-sky-400">
                <Terminal className="w-4 h-4" />
                Logs ao Vivo: {selectedContainerLogs.name}
              </DialogTitle>
            </DialogHeader>
            <div className="bg-black p-4 rounded-xl text-xs font-mono text-emerald-400/90 h-64 overflow-y-auto space-y-1 border border-slate-800">
              <div>[2025-02-23 10:42:01] INFO: Container {selectedContainerLogs.name} initialized successfully.</div>
              <div>[2025-02-23 10:42:02] INFO: Healthcheck endpoint responding 200 OK.</div>
              <div>[2025-02-23 10:45:15] INFO: Worker thread pool active. Connections: 4 established.</div>
              <div>[2025-02-23 10:50:00] INFO: Memory footprint stable at {selectedContainerLogs.memory}.</div>
              <div>[2025-02-23 10:55:22] INFO: 0 fatal errors, 0 dropped frames. Service running normally.</div>
            </div>
            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedContainerLogs(null)}
                className="text-xs font-mono border-slate-700"
              >
                Fechar Logs
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
