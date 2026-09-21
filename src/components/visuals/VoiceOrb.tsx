import React from "react";
import { Mic, Power, Volume2, VolumeX } from "lucide-react";
import { JarvisCoreLogo } from "./JarvisVisuals";
import { VoiceStatus } from "@/hooks/useVoiceEngine";

interface Props {
  status: VoiceStatus;
  micLevel: number;
  transcript: string;
  isSupported: boolean;
  voiceOutput: boolean;
  onToggle: () => void;
  onToggleVoiceOutput: () => void;
}

const STATUS_META: Record<
  VoiceStatus,
  { label: string; hint: string; ring: string; text: string; dot: string }
> = {
  idle: {
    label: "MODO VOZ OFFLINE",
    hint: 'Ative para o Jarvis te escutar sempre. Diga "Jarvis" + comando.',
    ring: "border-slate-700/70",
    text: "text-slate-400",
    dot: "bg-slate-500",
  },
  requesting: {
    label: "SOLICITANDO MICROFONE...",
    hint: "Autorize o acesso ao microfone no navegador.",
    ring: "border-sky-500/40",
    text: "text-sky-300",
    dot: "bg-sky-400 animate-ping",
  },
  listening: {
    label: "SEMPRE ESCUTANDO",
    hint: 'Aguardando palavra de ativação: "Jarvis"...',
    ring: "border-sky-400/50",
    text: "text-sky-300",
    dot: "bg-emerald-400 animate-pulse",
  },
  command: {
    label: "CAPTURANDO COMANDO",
    hint: "Silêncio de 1,6s envia o comando ao Supervisor.",
    ring: "border-cyan-300/70",
    text: "text-cyan-200",
    dot: "bg-cyan-300",
  },
  processing: {
    label: "PROCESSANDO INTENÇÃO",
    hint: "Supervisor Nexus analisando risco e delegação...",
    ring: "border-amber-400/60",
    text: "text-amber-300",
    dot: "bg-amber-300 animate-pulse",
  },
  speaking: {
    label: "RESPONDENDO EM VOZ",
    hint: "Microfone suspenso durante a fala para não auto-ativar.",
    ring: "border-emerald-400/60",
    text: "text-emerald-300",
    dot: "bg-emerald-300 animate-pulse",
  },
  demo: {
    label: "MODO DEMO",
    hint: "Microfone indisponível neste ambiente — simulando comandos de voz.",
    ring: "border-fuchsia-400/50",
    text: "text-fuchsia-300",
    dot: "bg-fuchsia-400 animate-pulse",
  },
};

const BARS = [0.45, 0.7, 1, 0.62, 0.85, 0.5, 0.75, 0.4, 0.9, 0.55, 0.8, 0.45];

const VoiceOrb: React.FC<Props> = ({
  status,
  micLevel,
  transcript,
  isSupported,
  voiceOutput,
  onToggle,
  onToggleVoiceOutput,
}) => {
  const meta = STATUS_META[status];
  const active = status !== "idle";
  const level = Math.min(1, Math.max(0.12, micLevel));
  const isActiveState =
    status === "listening" ||
    status === "command" ||
    status === "processing" ||
    status === "speaking" ||
    status === "demo";

  return (
    <div
      className={`fixed z-50 bottom-[4.5rem] right-4 lg:bottom-6 lg:right-6 select-none ${
        active ? "" : "pointer-events-auto"
      }`}
    >
      {/* Waveform strip */}
      {active && (
        <div className="absolute -top-14 right-0 flex items-end justify-end gap-[3px] h-10 pointer-events-none">
          {BARS.map((h, i) => (
            <span
              key={i}
              className="w-[3px] rounded-full transition-[height] duration-100"
              style={{
                height: `${Math.min(100, level * h * 100 + 8)}%`,
                background:
                  status === "command"
                    ? "rgb(103 232 249)"
                    : status === "processing"
                    ? "rgb(252 211 77)"
                    : status === "speaking"
                    ? "rgb(110 231 183)"
                    : "rgb(56 189 248)",
                opacity: 0.35 + h * 0.65,
                boxShadow: "0 0 8px rgba(56,189,248,0.45)",
              }}
            />
          ))}
      </div>
      )}

      {/* Transcript / status bubble */}
      {active && (
        <div
          className={`absolute bottom-full right-0 mb-3 w-[min(78vw,20rem)] rounded-2xl hud-border px-4 py-3 shadow-2xl transition-all ${
            transcript ? "ring-1 ring-cyan-400/40" : ""
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className={`text-[10px] font-mono font-bold tracking-widest ${meta.text} flex items-center gap-1.5`}>
              <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
              {meta.label}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={onToggleVoiceOutput}
                className={`p-1 rounded-md transition-colors ${
                  voiceOutput
                    ? "text-emerald-400 bg-emerald-500/10"
                    : "text-slate-500 hover:text-slate-300"
                }`}
                title={voiceOutput ? "Resposta em voz: ON" : "Resposta em voz: OFF"}
              >
                {voiceOutput ? (
                  <Volume2 className="w-3.5 h-3.5" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5" />
                )}
              </button>
              <button
                onClick={onToggle}
                className="p-1 rounded-md text-slate-500 hover:text-rose-400 transition-colors"
                title="Desligar modo Sempre Escutando"
              >
                <Power className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {transcript ? (
            <p className="text-sm text-cyan-100 leading-snug font-mono">
              “{transcript}
              <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-cyan-300 animate-pulse rounded-sm align-middle" />
              ”
            </p>
          ) : (
            <p className="text-[11px] text-slate-400 leading-snug">{meta.hint}</p>
          )}
        </div>
      )}

      {/* Orb button */}
      <button
        onClick={onToggle}
        aria-label="Alternar modo Sempre Escutando"
        className={`relative block w-14 h-14 lg:w-16 lg:h-16 rounded-full transition-all duration-300 ${
          active ? "jarvis-glow" : "hover:jarvis-glow-subtle"
        }`}
      >
        {/* Reactive halo rings driven by mic level */}
        {isActiveState && (
          <>
            <span
              className={`absolute inset-0 rounded-full border ${meta.ring} pointer-events-none`}
              style={{
                transform: `scale(${1 + level * 0.55})`,
                opacity: 0.65 - level * 0.3,
                transition: "transform 90ms linear, opacity 300ms linear",
              }}
            />
            <span
              className={`absolute inset-0 rounded-full border ${meta.ring} pointer-events-none`}
              style={{
                transform: `scale(${1 + level * 1.15})`,
                opacity: 0.4 - level * 0.25,
                transition: "transform 160ms linear, opacity 300ms linear",
              }}
            />
            <span
              className={`absolute inset-0 rounded-full border border-sky-400/20 pointer-events-none`}
              style={{
                transform: `scale(${1.3 + level * 1.8})`,
                opacity: 0.25 - level * 0.15,
                transition: "transform 260ms linear, opacity 400ms linear",
              }}
            />
          </>
        )}

        {/* Core */}
        <span
          className={`absolute inset-1.5 rounded-full bg-slate-950/90 border ${meta.ring} flex items-center justify-center overflow-hidden`}
        >
          {active ? (
            <span className="relative flex items-center justify-center">
              <JarvisCoreLogo size={30} animated />
            </span>
          ) : (
            <Mic className="w-5 h-5 text-sky-400" />
          )}
        </span>

        {/* Offline label */}
        {!active && (
          <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-mono font-bold tracking-widest text-slate-500">
            SEMPRE ESCUTANDO
          </span>
        )}
      </button>

      {/* Offline explainer */}
      {!active && (
        <div className="absolute bottom-full right-0 mb-3 w-[min(78vw,18rem)] rounded-2xl hud-border px-4 py-3 shadow-2xl opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity pointer-events-none">
          <p className="text-[11px] text-slate-400 leading-snug">
            {isSupported ? (
              <>
                Ative o <span className="text-sky-300 font-semibold">modo sempre escutando</span> e
                fale naturalmente: <span className="text-cyan-300">“Jarvis, status da VPS”</span>.
                O Jarvis detecta a palavra de ativação, responde em voz alta e volta a escutar.
              </>
            ) : (
              <>
                Este navegador não suporta reconhecimento de voz contínuo. Ative para ver o{" "}
                <span className="text-fuchsia-300">modo demo</span> com comandos simulados.
              </>
            )}
          </p>
        </div>
      )}
    </div>
  );
};

export default VoiceOrb;
