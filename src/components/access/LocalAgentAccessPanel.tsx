import { useState } from "react";
import { Check, ChevronDown, Laptop, LockKeyhole, ShieldCheck, WifiOff } from "lucide-react";

const CAPABILITIES = [
  "Arquivos e pastas",
  "PowerShell / CMD",
  "Aplicativos e processos",
  "Git, Docker e ferramentas de desenvolvimento",
];

export const LocalAgentAccessPanel = () => {
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <section className="rounded-2xl border border-cyan-500/20 bg-slate-900/90 p-5 shadow-2xl shadow-cyan-950/20">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 p-2.5 text-cyan-200">
            <Laptop className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-white">Acesso ao computador</h2>
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wide text-amber-200">
                <WifiOff className="h-3 w-3" /> Ponte não conectada
              </span>
            </div>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-300">
              O Jarvis está configurado para pedir autorização antes de cada ação local. A interface web não executa comandos no seu Windows sem um agente local pareado.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-200">
          <ShieldCheck className="h-4 w-4" />
          <span>Autorização por ação: ativa</span>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {CAPABILITIES.map((capability) => (
          <div key={capability} className="flex items-center gap-2 rounded-xl border border-white/5 bg-slate-950/35 px-3 py-2 text-[11px] text-slate-300">
            <Check className="h-3.5 w-3.5 shrink-0 text-cyan-300" />
            {capability}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setDetailsOpen((open) => !open)}
        className="mt-4 flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.16em] text-cyan-300/80 transition-colors hover:text-cyan-100"
      >
        <LockKeyhole className="h-3.5 w-3.5" />
        {detailsOpen ? "Ocultar política" : "Ver política de autorização"}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${detailsOpen ? "rotate-180" : ""}`} />
      </button>

      {detailsOpen && (
        <div className="mt-3 rounded-xl border border-cyan-500/15 bg-slate-950/50 p-4 text-xs leading-relaxed text-slate-300">
          Cada pedido mostra a ação, o comando, os arquivos afetados e o risco. Nada é enviado ao agente local até você clicar em <strong className="text-emerald-300">Autorizar e Executar</strong> ou dizer “Jarvis, autorizar”. Recusar cancela o pedido e registra a decisão no histórico.
        </div>
      )}
    </section>
  );
};
