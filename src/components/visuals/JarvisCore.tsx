import { useState, useEffect } from "react";
import NeuralSphere, { SphereMode } from "./NeuralSphere";
import { ApprovalRequest } from "@/types/jarvis";
import {
  ShieldCheck,
  X,
  Check,
  Mic,
  MicOff,
  Terminal,
} from "lucide-react";

const StatusBar = ({ label }: { label: string }) => (
  <div className="flex items-center gap-3">
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-60" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-300" />
    </span>
    <span className="font-mono text-[11px] tracking-[0.45em] text-cyan-200/80">
      {label}
    </span>
  </div>
);

const CommandRow = () => (
  <div className="flex items-center gap-2 opacity-40">
    {["DASH", "▸", "◈", "◉", "◇", "▣"].map((glyph, i) => (
      <span
        key={i}
        className="w-6 h-6 flex items-center justify-center font-mono text-[9px] text-cyan-300/70 border border-cyan-500/25 rounded-md"
      >
        {glyph}
      </span>
    ))}
  </div>
);

export type CoreStatus = SphereMode;

interface JarvisCoreProps {
  status: CoreStatus;
  micLevel: number;
  transcript: string;
  caption: string | null;
  agentBusyWith: string | null;
  pendingApproval: ApprovalRequest | null;
  isSupported: boolean;
  listeningOn: boolean;
  onToggleListening: () => void;
  onToggleVoiceOutput: () => void;
  voiceOutput: boolean;
  onResolveApproval: (id: string, decision: "approved" | "rejected") => void;
  onOpenConsole: () => void;
  onManualCommand: (text: string) => void;
}

const BOOT_LINES = [
  "INICIALIZANDO NÚCLEO NEURAL v4.2.1",
  "CARREGANDO MODELO LINGUÍSTICO LOCAL... OK",
  "CONECTANDO À VPS — HANDSHAKE CRIPTOGRAFADO... OK",
  "DESPERTANDO 5 AGENTES ESPECIALISTAS... OK",
  "PROTOCOLOS DE SEGURANÇA: ATIVOS",
  "J.A.R.V.I.S. ONLINE",
];

const JarvisCore = ({
  status,
  micLevel,
  transcript,
  caption,
  agentBusyWith,
  pendingApproval,
  isSupported,
  listeningOn,
  onToggleListening,
  onToggleVoiceOutput,
  voiceOutput,
  onResolveApproval,
  onOpenConsole,
  onManualCommand,
}: JarvisCoreProps) => {
  const [bootStep, setBootStep] = useState(0);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualText, setManualText] = useState("");

  const booted = bootStep >= BOOT_LINES.length;

  useEffect(() => {
    if (booted) return;
    const t = window.setTimeout(
      () => setBootStep((s) => s + 1),
      bootStep === 0 ? 350 : 480
    );
    return () => window.clearTimeout(t);
  }, [bootStep, booted]);

  if (!booted) {
    // ---------------- Boot sequence ----------------
    return (
      <div className="fixed inset-0 bg-[#02040a] flex items-center justify-center overflow-hidden">
        <div className="w-full max-w-xl px-8">
          <div className="font-mono text-[13px] leading-7 text-cyan-300/80 space-y-1">
            {BOOT_LINES.slice(0, bootStep + 1).map((line, i) => (
              <div
                key={i}
                className="animate-in fade-in slide-in-from-bottom-1 duration-500 flex items-center gap-3"
              >
                <span className="text-cyan-500/60">›</span>
                <span className={i === BOOT_LINES.length - 1 ? "text-cyan-200 font-bold tracking-[0.3em] text-base" : ""}>
                  {line}
                </span>
                {i < bootStep && <span className="text-emerald-400 text-xs">✓</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const statusLabel: Record<CoreStatus, string> = {
    idle: listeningOn ? "ESCUTANDO" : "EM ESPERA",
    listening: "ESCUTANDO",
    command: "CAPTANDO COMANDO",
    processing: "PROCESSANDO",
    speaking: "RESPONDENDO",
    alert: "ALERTA",
    demo: "MODO DEMO",
    requesting: "SOLICITANDO MIC",
  } as Record<CoreStatus, string>;

  return (
    <div className="fixed inset-0 bg-[#02040a] overflow-hidden">
      {/* Esfera neural central */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-[min(92vw,780px)] h-[min(92vw,780px)] max-h-[86vh]">
          <NeuralSphere mode={status} energy={micLevel} />
        </div>
      </div>

      {/* Vinheta escura nas bordas */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 30%, rgba(2,4,10,0.75) 78%, #02040a 100%)",
        }}
      />

      {/* ------- Topo: status minimalista ------- */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 sm:px-10 pt-7 pointer-events-none">
        <div className="font-mono text-[11px] tracking-[0.45em] text-cyan-200/70">
          J.A.R.V.I.S.
        </div>
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={onToggleVoiceOutput}
            className="font-mono text-[10px] tracking-[0.25em] px-3 py-1.5 rounded-full border border-cyan-500/20 text-cyan-300/60 hover:text-cyan-200 hover:border-cyan-400/50 transition-colors"
          >
            VOZ {voiceOutput ? "ON" : "OFF"}
          </button>
          <button
            onClick={onOpenConsole}
            className="flex items-center gap-2 font-mono text-[10px] tracking-[0.25em] px-3 py-1.5 rounded-full border border-cyan-500/20 text-cyan-300/60 hover:text-cyan-200 hover:border-cyan-400/50 transition-colors"
          >
            <Terminal className="w-3 h-3" /> CONSOLE
          </button>
        </div>
      </div>

      {/* ------- Status sob a esfera ------- */}
      <div className="absolute inset-x-0 top-1/2 translate-y-[190px] flex flex-col items-center gap-2 pointer-events-none">
        <StatusBar label={statusLabel[status] ?? "EM ESPERA"} />
        {agentBusyWith && (
          <div className="font-mono text-[10px] tracking-[0.2em] text-cyan-400/50 max-w-md text-center truncate px-6">
            {agentBusyWith}
          </div>
        )}
      </div>

      {/* ------- Legenda (fala do Jarvis) ------- */}
      {caption && (
        <div className="absolute inset-x-0 bottom-32 sm:bottom-36 px-6 flex justify-center pointer-events-none">
          <p className="max-w-2xl text-center text-[15px] sm:text-lg leading-relaxed text-cyan-50/90 font-light animate-in fade-in slide-in-from-bottom-2 duration-500">
            {caption}
          </p>
        </div>
      )}

      {/* ------- Transcrição ao vivo (você falando) ------- */}
      {!caption && transcript && (
        <div className="absolute inset-x-0 bottom-32 sm:bottom-36 px-6 flex justify-center pointer-events-none">
          <p className="max-w-2xl text-center text-sm sm:text-base text-cyan-300/50 italic font-light">
            “{transcript}”
          </p>
        </div>
      )}

      {/* ------- Card de aprovação crítica ------- */}
      {pendingApproval && (
        <div className="absolute inset-x-0 bottom-48 sm:inset-x-auto sm:right-10 sm:top-24 sm:bottom-auto sm:w-[360px] px-4 sm:px-0 flex justify-center sm:block">
          <div className="rounded-2xl border border-amber-400/40 bg-[#0a0f1c]/90 backdrop-blur-xl p-5 shadow-2xl shadow-amber-950/40 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-amber-300" />
              </div>
              <div>
                <div className="font-mono text-[10px] tracking-[0.25em] text-amber-300/80">
                  AUTORIZAÇÃO NECESSÁRIA
                </div>
                <div className="text-sm font-semibold text-white">
                  {pendingApproval.title}
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-300/70 leading-relaxed mb-4 line-clamp-3">
              {pendingApproval.details.actionDescription}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => onResolveApproval(pendingApproval.id, "rejected")}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border border-rose-500/40 text-rose-300 hover:bg-rose-500/10 transition-colors"
              >
                <X className="w-3.5 h-3.5" /> RECUSAR
              </button>
              <button
                onClick={() => onResolveApproval(pendingApproval.id, "approved")}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold bg-amber-400 text-slate-950 hover:bg-amber-300 transition-colors"
              >
                <Check className="w-3.5 h-3.5" /> AUTORIZAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------- Barra inferior de comandos ------- */}
      <div className="absolute bottom-0 left-0 right-0 pb-7 flex flex-col items-center gap-3">
        <CommandRow />
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleListening}
            disabled={!isSupported}
            className={`group relative w-14 h-14 rounded-full flex items-center justify-center border transition-all duration-300 ${
              listeningOn && isSupported
                ? "bg-cyan-500/15 border-cyan-400/60 shadow-[0_0_30px_rgba(34,211,238,0.35)]"
                : "bg-slate-900/60 border-slate-600/40 hover:border-cyan-500/40"
            } ${!isSupported ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {listeningOn && isSupported ? (
              <Mic className="w-5 h-5 text-cyan-200" />
            ) : (
              <MicOff className="w-5 h-5 text-slate-400 group-hover:text-cyan-300" />
            )}
          </button>
          <button
            onClick={() => setManualOpen((o) => !o)}
            className="font-mono text-[10px] tracking-[0.3em] text-cyan-300/50 hover:text-cyan-200 transition-colors px-4 py-2"
          >
            DIGITAR COMANDO
          </button>
        </div>

        {/* Entrada manual discreta */}
        {manualOpen && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!manualText.trim()) return;
              onManualCommand(manualText.trim());
              setManualText("");
              setManualOpen(false);
            }}
            className="animate-in fade-in slide-in-from-bottom-2 duration-300 flex items-center gap-2 w-[min(92vw,520px)]"
          >
            <input
              autoFocus
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="Ex.: status da VPS, auditar firewall, criar endpoint FastAPI..."
              className="flex-1 bg-slate-900/80 border border-cyan-500/25 rounded-xl px-4 py-2.5 text-sm text-cyan-50 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/60"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-cyan-500/20 border border-cyan-400/50 text-cyan-100 text-xs font-semibold hover:bg-cyan-500/30 transition-colors"
            >
              ENVIAR
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default JarvisCore;
