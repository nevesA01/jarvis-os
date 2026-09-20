import React from "react";
import { AgentMeta } from "@/types/jarvis";
import { Shield, Code, Server, Search, Zap, Cpu, Lock } from "lucide-react";

interface Props {
  agents: AgentMeta[];
  selectedAgentId: string | null;
  onSelectAgent: (id: string) => void;
  pendingApprovalsCount: number;
}

export const AgentNetworkTopology: React.FC<Props> = ({
  agents,
  selectedAgentId,
  onSelectAgent,
  pendingApprovalsCount,
}) => {
  const getIcon = (id: string) => {
    switch (id) {
      case "coder":
        return <Code className="w-4 h-4 text-emerald-400" />;
      case "cybersecurity":
        return <Shield className="w-4 h-4 text-rose-400" />;
      case "devops":
        return <Server className="w-4 h-4 text-purple-400" />;
      case "researcher":
        return <Search className="w-4 h-4 text-amber-400" />;
      case "automation":
        return <Zap className="w-4 h-4 text-pink-400" />;
      default:
        return <Cpu className="w-4 h-4 text-sky-400" />;
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl hud-border p-4 bg-slate-950/70">
      <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-sky-400 animate-pulse" />
          <span className="text-xs font-mono font-bold tracking-wider text-slate-200 uppercase">
            Topologia do Mesh de Agentes
          </span>
        </div>
        <div className="flex items-center gap-2">
          {pendingApprovalsCount > 0 && (
            <span className="flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
              <Lock className="w-3 h-3 text-amber-400" />
              {pendingApprovalsCount} Ação Crítica Retida
            </span>
          )}
          <span className="text-[11px] font-mono text-slate-500">Clique para inspecionar</span>
        </div>
      </div>

      {/* Grid of Agents */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {agents.map((ag) => {
          const isSelected = selectedAgentId === ag.id;
          return (
            <button
              key={ag.id}
              onClick={() => onSelectAgent(ag.id)}
              className={`p-3 rounded-xl text-left transition-all duration-200 border flex flex-col justify-between relative overflow-hidden group ${
                isSelected
                  ? "bg-sky-950/40 border-sky-400 shadow-[0_0_15px_-3px_rgba(14,165,233,0.3)] ring-1 ring-sky-400"
                  : "bg-slate-900/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900"
              }`}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <div
                  className="p-1.5 rounded-lg border flex items-center justify-center"
                  style={{
                    backgroundColor: `${ag.color}15`,
                    borderColor: `${ag.color}40`,
                  }}
                >
                  {getIcon(ag.id)}
                </div>
                <span
                  className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase"
                  style={{
                    backgroundColor: `${ag.color}20`,
                    color: ag.color,
                  }}
                >
                  {ag.badge}
                </span>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">
                  {ag.name}
                </p>
                <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{ag.role}</p>
              </div>

              <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] font-mono text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Ativo
                </span>
                <span className="text-[9px] text-slate-400 truncate max-w-[70px]">
                  {ag.defaultModel.split("/")[0]}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
