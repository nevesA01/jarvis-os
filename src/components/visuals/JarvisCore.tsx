import { useState, useEffect, useRef } from "react";
import NeuralSphere, { SphereMode } from "./NeuralSphere";
import { ApprovalRequest } from "@/types/jarvis";
import {
  ShieldCheck,
  X,
  Check,
  Mic,
  Power,
  Terminal,
  Volume2,
  VolumeX,
  Keyboard,
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

const IDLE_HINTS = [
  "Diga: “Jarvis, status da VPS”",
  "Diga: “Jarvis, audite as portas do firewall”",
  "Diga: “Jarvis, crie um endpoint FastAPI”",
  "Diga: “Jarvis, pesquise orquestração com LangGraph”",
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
  const [bootStep, setBootStep] = useState(() =>
    typeof sessionStorage !== "undefined" &&
    sessionStorage.getItem("jarvis_booted")
      ? BOOT_LINES.length
      : 0
  );
  const [manualOpen, setManualOpen] = useState(false);
  const [manualText, setManualText] = useState("");
  const [hintIndex, setHintIndex] = useState(0);
  const [hintVisible, setHintVisible] = useState(true);
  const hintTimerRef = useRef<number | null>(null);

  const booted = bootStep >= BOOT_LINES.length;

  /* ---------- Boot sequence ---------- */
  useEffect(() => {
    if (booted) {
      sessionStorage.setItem("jarvis_booted", "1");
      return;
    }
    const t = window.setTimeout(
      () => setBootStep((s) => s + 1),
      bootStep === 0 ? 300 : 340
    );
    return () => window.clearTimeout(t);
  }, [bootStep, booted]);

  /* ---------- Atalho de teclado: “/” abre o comando manual ---------- */
  useEffect(() => {
    if (!booted || !listeningOn) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA";
      if (typing) return;
      if (e.key === "/" || e.key === "t" || e.key === "T") {
        e.preventDefault();
        setManualOpen(true);
      }
      if (e.key === "Escape") setManualOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [booted, listeningOn]);

  /* ---------- Dicas de voz em rotação quando ocioso ---------- */
  const showIdleHint =
    booted &&
    listeningOn &&
    !caption &&
    !transcript &&
    !pendingApproval &&
    !agentBusyWith &&
    (status === "idle" || status === "listening");

  useEffect(() => {
    if (!showIdleHint) return;
    setHintVisible(true);
    const hide = window.setTimeout(() => setHintVisible(false), 7000);
    return () => window.clearTimeout(hide);
  }, [showIdleHint, hintIndex]);

  useEffect(() => {
    if (!showIdleHint) return;
    const rotate = window.setInterval(
      () => setHintIndex((i) => (i + 1) % IDLE_HINTS.length),
      9500
    );
    return () => window.clearInterval(rotate);
  }, [showIdleHint]);

  /* ---------- Boot screen ---------- */
  if (!booted) {
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
                <span
                  className={
                    i === BOOT_LINES.length - 1
                      ? "text-cyan-200 font-bold tracking-[0.3em] text-base"
                      : ""
                  }
                >
                  {line}
                </span>
                {i < bootStep && (
                  <span className="text-emerald-400 text-xs">✓</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ---------- Portão de ativação (uma única interação) ---------- */
  if (!listeningOn) {
    return (
      <div className="fixed inset-0 bg-[#02040a] overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-[min(92vw,780px)] h-[min(92vw,780px)] max-h-[86vh] opacity-70">
            <NeuralSphere mode="idle" energy={0} />
          </div>
        </div>
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at center, transparent 30%, rgba(2,4,10,0.75) 78%, #02040a 100%)",
          }}
        />
        <div className="absolute inset-x-0 bottom-[14vh] flex flex-col items-center gap-4 px-6">
          <button
            onClick={onToggleListening}
            className="group relative w-20 h-20 rounded-full border border-cyan-400/50 bg-cyan-500/10 flex items-center justify-center transition-all duration-500 hover:scale-105 hover:border-cyan-300 hover:bg-cyan-500/20 shadow-[0_0_50px_rgba(34,211,238,0.25)] hover:shadow-[0_0_80px_rgba(34,211,238,0.45)]"
          >
            <span className="absolute inset-0 rounded-full border border-cyan-400/30 animate-ping" />
            <Mic className="w-7 h-7 text-cyan-200" />
          </button>
          <div className="text-center space-y-1.5">
            <div className="font-mono text-[11px] tracking-[0.5em] text-cyan-200/90">
              {isSupported ? "TOQUE PARA DESPERTAR" : "TOQUE PARA MODO DEMO"}
            </div>
            <div className="text-xs text-slate-500 font-light">
              {isSupported
                ? "O microfone será solicitado — depois basta falar"
                : "Seu navegador não suporta voz — comandos simulados"}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- Núcleo ativo ---------- */
  const statusLabel: Record<string, string> = {
    idle: "EM ESPERA",
    listening: "ESCUTANDO",
    command: "CAPTANDO COMANDO",
    processing: "PROCESSANDO",
    speaking: "RESPONDENDO",
    alert: "AUTORIZAÇÃO PENDENTE",
    demo: "MODO DEMO",
    requesting: "SOLICITANDO MIC",
  };

  return (
    <div className="fixed inset-0 bg-[#02040a] overflow-hidden">
      {/* Esfera neural central */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-9">
        <div className="h-[min(58vh,92vw)] aspect-square shrink-0">
          <NeuralSphere mode={status} energy={micLevel} />
        </div>

        {/* Status + slot único de texto (legenda / transcrição / dica) */}
        <div className="flex flex-col items-center gap-3 px-6 min-h-[96px]">
          <StatusBar label={statusLabel[status] ?? "EM ESPERA"} />
          {agentBusyWith && (
            <div className="font-mono text-[10px] tracking-[0.2em] text-cyan-400/50 max-w-md text-center truncate">
              {agentBusyWith}
            </div>
          )}

          {caption ? (
            <p className="max-w-2xl text-center text-[15px] sm:text-lg leading-relaxed text-cyan-50/90 font-light animate-in fade-in slide-in-from-bottom-2 duration-500">
              {caption}
            </p>
          ) : transcript ? (
            <p className="max-w-2xl text-center text-sm sm:text-base text-cyan-300/50 italic font-light animate-in fade-in duration-300">
              “{transcript}”
            </p>
          ) : (
            <p
              className={`max-w-2xl text-center text-sm text-cyan-300/40 font-light transition-opacity duration-1000 ${
                hintVisible ? "opacity-100" : "opacity-0"
              }`}
            >
              {IDLE_HINTS[hintIndex]}
            </p>
          )}
        </div>
      </div>

      {/* Vinheta */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 32%, rgba(2,4,10,0.7) 80%, #02040a 100%)",
        }}
      />

      {/* ------- Topo: identidade + controles que só aparecem no hover ------- */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 sm:px-10 pt-7 group/ctrl">
        <div className="font-mono text-[11px] tracking-[0.45em] text-cyan-200/70">
          J.A.R.V.I.S.
        </div>
        <div className="flex items-center gap-1.5 opacity-60 sm:opacity-20 sm:hover:opacity-100 hover:!opacity-100 focus-within:!opacity-100 transition-opacity duration-300">
          <button
            onClick={onToggleVoiceOutput}
            title={voiceOutput ? "Desativar resposta falada" : "Ativar resposta falada"}
            className="p-2.5 rounded-full border border-cyan-500/20 text-cyan-300/60 hover:text-cyan-200 hover:border-cyan-400/50 transition-colors"
          >
            {voiceOutput ? (
              <Volume2 className="w-3.5 h-3.5" />
            ) : (
              <VolumeX className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            onClick={() => setManualOpen((o) => !o)}
            title="Digitar comando (tecla /)"
            className="p-2.5 rounded-full border border-cyan-500/20 text-cyan-300/60 hover:text-cyan-200 hover:border-cyan-400/50 transition-colors"
          >
            <Keyboard className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onOpenConsole}
            title="Abrir console tático"
            className="p-2.5 rounded-full border border-cyan-500/20 text-cyan-300/60 hover:text-cyan-200 hover:border-cyan-400/50 transition-colors"
          >
            <Terminal className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onToggleListening}
            title="Encerrar escuta"
            className="p-2.5 rounded-full border border-rose-500/25 text-rose-300/70 hover:text-rose-200 hover:border-rose-400/60 transition-colors"
          >
            <Power className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ------- Card de aprovação crítica ------- */}
      {pendingApproval && (
        <div className="absolute inset-x-0 bottom-8 sm:inset-x-auto sm:right-10 sm:top-24 sm:bottom-auto sm:w-[360px] px-4 sm:px-0 flex justify-center sm:block z-20">
          <div className="rounded-2xl border border-amber-400/40 bg-[#0a0f1c]/90 backdrop-blur-xl p-5 shadow-2xl shadow-amber-950/40 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center shrink-0">
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
            <p className="text-xs text-slate-300/70 leading-relaxed mb-2 line-clamp-3">
              {pendingApproval.details.actionDescription}
            </p>
            <p className="text-[10px] font-mono text-amber-200/50 mb-4 tracking-wider">
              DIGA “AUTORIZAR” OU “RECUSAR”
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

      {/* ------- Entrada manual (palette central discreta) ------- */}
      {manualOpen && (
        <div className="absolute inset-x-0 bottom-[18vh] flex justify-center px-6 z-30">
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
              placeholder="Comando… (Esc para fechar)"
              className="flex-1 bg-slate-900/85 backdrop-blur border border-cyan-500/25 rounded-xl px-4 py-2.5 text-sm text-cyan-50 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/60 shadow-2xl shadow-cyan-950/40"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-cyan-500/20 border border-cyan-400/50 text-cyan-100 text-xs font-semibold hover:bg-cyan-500/30 transition-colors"
            >
              ENVIAR
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default JarvisCore;
