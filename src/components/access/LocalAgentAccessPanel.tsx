import { useState } from "react";
import { Check, ChevronDown, Laptop, Link2, LockKeyhole, ShieldCheck, Unplug, Wifi, WifiOff } from "lucide-react";
import { LocalAgentStatus } from "@/hooks/useLocalAgent";

const CAPABILITIES = [
  "Validação local de jobs",
  "Política deny-by-default",
  "Auditoria sanitizada",
  "Kill switch e cancelamento",
];

interface Props {
  status: LocalAgentStatus;
  agentName: string;
  error: string;
  onPair: (code: string) => void;
  onDisconnect: () => void;
}

export const LocalAgentAccessPanel = ({ status, agentName, error, onPair, onDisconnect }: Props) => {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [pairingCode, setPairingCode] = useState("");
  const connected = status === "paired";
  const checking = status === "checking";

  return (
    <section className="rounded-[1.5rem] border border-emerald-300/15 bg-[#0a1928]/90 p-5 shadow-[0_18px_55px_rgba(2,12,28,0.3)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl border border-emerald-300/25 bg-emerald-300/10 p-2.5 text-emerald-200">
            <Laptop className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-white">Acesso ao computador</h2>
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wide ${connected ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : "border-amber-400/30 bg-amber-400/10 text-amber-200"}`}>
                {connected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                {checking ? "Verificando" : connected ? `Conectado: ${agentName}` : "Ponte não conectada"}
              </span>
            </div>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-300">
              Fase A ativa: o núcleo local ainda não abre portas, não conecta à VPS e não executa ferramentas. Jobs futuros serão validados localmente antes de qualquer ação.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-200">
          <ShieldCheck className="h-4 w-4" />
          <span>Execução local: desativada na Fase A</span>
        </div>
      </div>

      {!connected && (
        <div className="mt-4 flex flex-col gap-2 rounded-xl border border-amber-400/20 bg-amber-950/20 p-3 sm:flex-row sm:items-center">
          <input
            value={pairingCode}
            onChange={(event) => setPairingCode(event.target.value)}
            placeholder="Pareamento será habilitado após a Fase A"
            disabled
            className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-500 outline-none"
          />
          <button
            type="button"
            disabled
            onClick={() => void onPair(pairingCode)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-700 px-3 py-2 text-xs font-semibold text-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Link2 className="h-3.5 w-3.5" /> Pareamento indisponível
          </button>
        </div>
      )}

      {connected && (
        <button type="button" onClick={() => void onDisconnect()} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-rose-400/30 px-3 py-2 text-xs text-rose-200 transition hover:bg-rose-950/40">
          <Unplug className="h-3.5 w-3.5" /> Desconectar agente
        </button>
      )}

      {error && <p className="mt-3 text-xs text-rose-300">{error}</p>}

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {CAPABILITIES.map((capability) => (
          <div key={capability} className="flex items-center gap-2 rounded-xl border border-white/5 bg-slate-950/35 px-3 py-2 text-[11px] text-slate-300">
            <Check className="h-3.5 w-3.5 shrink-0 text-cyan-300" />
            {capability}
          </div>
        ))}
      </div>

      <button type="button" onClick={() => setDetailsOpen((open) => !open)} className="mt-4 flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.16em] text-cyan-300/80 transition-colors hover:text-cyan-100">
        <LockKeyhole className="h-3.5 w-3.5" />
        {detailsOpen ? "Ocultar política" : "Ver política de autorização"}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${detailsOpen ? "rotate-180" : ""}`} />
      </button>

      {detailsOpen && (
        <div className="mt-3 rounded-xl border border-cyan-500/15 bg-slate-950/50 p-4 text-xs leading-relaxed text-slate-300">
          Na Fase A, os pedidos locais são apenas simulados na interface e nenhum pedido é enviado ao computador. As próximas fases deverão mostrar ação, destino, hash, risco e expiração antes de qualquer aprovação local.
        </div>
      )}
    </section>
  );
};
