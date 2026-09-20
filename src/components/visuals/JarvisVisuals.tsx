import React from "react";

export const JarvisCoreLogo: React.FC<{ size?: number; className?: string; animated?: boolean }> = ({
  size = 48,
  className = "",
  animated = true,
}) => {
  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 100 100"
        className={`w-full h-full ${animated ? "drop-shadow-[0_0_12px_rgba(14,165,233,0.8)]" : ""}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="jarvisGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="50%" stopColor="#0EA5E9" />
            <stop offset="100%" stopColor="#0369A1" />
          </linearGradient>
          <radialGradient id="jarvisCoreGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#E0F2FE" stopOpacity="1" />
            <stop offset="40%" stopColor="#38BDF8" stopOpacity="0.8" />
            <stop offset="80%" stopColor="#0EA5E9" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#0369A1" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Outer Ring with tech notches */}
        <circle
          cx="50"
          cy="50"
          r="46"
          stroke="url(#jarvisGradient)"
          strokeWidth="1.5"
          strokeDasharray="14 6 4 6"
          className={animated ? "animate-spin" : ""}
          style={{ animationDuration: "28s" }}
        />

        {/* Middle Counter-rotating Ring */}
        <circle
          cx="50"
          cy="50"
          r="38"
          stroke="#0EA5E9"
          strokeWidth="1.2"
          strokeDasharray="22 10 2 10"
          strokeOpacity="0.7"
          className={animated ? "animate-spin" : ""}
          style={{ animationDuration: "18s", animationDirection: "reverse" }}
        />

        {/* Hexagonal Tech Nexus Frame */}
        <polygon
          points="50,18 78,34 78,66 50,82 22,66 22,34"
          stroke="#38BDF8"
          strokeWidth="1.5"
          strokeOpacity="0.85"
          fill="rgba(3, 7, 18, 0.7)"
        />

        {/* Inner Crosshair Lines */}
        <line x1="50" y1="22" x2="50" y2="34" stroke="#38BDF8" strokeWidth="1.5" strokeOpacity="0.8" />
        <line x1="50" y1="66" x2="50" y2="78" stroke="#38BDF8" strokeWidth="1.5" strokeOpacity="0.8" />
        <line x1="26" y1="50" x2="38" y2="50" stroke="#38BDF8" strokeWidth="1.5" strokeOpacity="0.8" />
        <line x1="62" y1="50" x2="74" y2="50" stroke="#38BDF8" strokeWidth="1.5" strokeOpacity="0.8" />

        {/* Glowing Neural Core */}
        <circle cx="50" cy="50" r="16" fill="url(#jarvisCoreGlow)" />
        <circle cx="50" cy="50" r="7" fill="#F0F9FF" />
        <circle
          cx="50"
          cy="50"
          r="12"
          stroke="#38BDF8"
          strokeWidth="1.5"
          className={animated ? "animate-pulse" : ""}
          style={{ animationDuration: "2s" }}
        />
      </svg>
    </div>
  );
};

export const CyberShieldIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 32,
  className = "",
}) => {
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" fill="none" className="w-full h-full drop-shadow-[0_0_10px_rgba(244,63,94,0.6)]">
        <defs>
          <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FB7185" />
            <stop offset="60%" stopColor="#E11D48" />
            <stop offset="100%" stopColor="#881337" />
          </linearGradient>
        </defs>
        <path
          d="M50 8 L84 22 V50 C84 72 69 90 50 96 C31 90 16 72 16 50 V22 Z"
          fill="rgba(15, 23, 42, 0.85)"
          stroke="url(#shieldGrad)"
          strokeWidth="3"
        />
        {/* Digital Grid inside shield */}
        <path d="M30 36 L70 36" stroke="#FB7185" strokeWidth="1.2" strokeOpacity="0.5" strokeDasharray="4 3" />
        <path d="M26 50 L74 50" stroke="#FB7185" strokeWidth="1.2" strokeOpacity="0.5" strokeDasharray="4 3" />
        <path d="M32 64 L68 64" stroke="#FB7185" strokeWidth="1.2" strokeOpacity="0.5" strokeDasharray="4 3" />
        <path d="M50 24 V80" stroke="#FB7185" strokeWidth="1.5" strokeOpacity="0.7" />
        {/* Core Lock / Check */}
        <circle cx="50" cy="50" r="8" fill="#E11D48" fillOpacity="0.3" stroke="#FDA4AF" strokeWidth="1.5" />
      </svg>
    </div>
  );
};

export const CommandBanner: React.FC<{ activeAgentCount?: number }> = ({ activeAgentCount = 6 }) => {
  return (
    <div className="relative overflow-hidden rounded-2xl hud-border p-6 bg-gradient-to-r from-slate-950 via-slate-900 to-sky-950/40">
      {/* Background Decorative Tech Grid */}
      <div className="absolute inset-0 hud-grid-pattern opacity-40 pointer-events-none" />
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <JarvisCoreLogo size={56} animated={true} />
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs font-mono font-semibold tracking-wider text-sky-400 uppercase">
                Jarvis Autonomous Nexus • Online
              </span>
              <span className="bg-sky-500/15 border border-sky-500/30 text-sky-300 text-[10px] font-mono px-2 py-0.5 rounded-full">
                v1.0.0 Prod
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white mt-1">
              Centro de Comando & Orquestração Multiagente
            </h1>
            <p className="text-xs md:text-sm text-slate-400 max-w-xl mt-0.5">
              Supervisão em tempo real, guarda-chuva de cibersegurança defensiva, memória persistente e controle soberano na sua VPS.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-6">
          <div className="text-left">
            <span className="text-[11px] font-mono text-slate-400 block uppercase">Agentes Ativos</span>
            <span className="text-lg font-bold font-mono text-emerald-400">{activeAgentCount} / 6 Especialistas</span>
          </div>
          <div className="h-8 w-px bg-slate-800" />
          <div className="text-left">
            <span className="text-[11px] font-mono text-slate-400 block uppercase">Human-in-the-Loop</span>
            <span className="text-lg font-bold font-mono text-amber-400">Ativado (Proteção Total)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
