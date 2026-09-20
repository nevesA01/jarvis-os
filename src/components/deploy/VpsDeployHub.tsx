import React, { useState } from "react";
import { VPS_BLUEPRINT_FILES } from "@/data/vpsFiles";
import {
  FileCode,
  Copy,
  Check,
  Download,
  FolderTree,
  Terminal,
  Rocket,
  Server,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ReactNode }> = {
  docker: { label: "Docker & Infra", icon: <Server className="w-3.5 h-3.5 text-sky-400" /> },
  backend: { label: "Backend FastAPI", icon: <Terminal className="w-3.5 h-3.5 text-emerald-400" /> },
  agents: { label: "Agentes Python", icon: <ShieldCheck className="w-3.5 h-3.5 text-rose-400" /> },
  config: { label: "Configuração", icon: <FolderTree className="w-3.5 h-3.5 text-purple-400" /> },
  script: { label: "Scripts Deploy", icon: <Rocket className="w-3.5 h-3.5 text-amber-400" /> },
};

export const VpsDeployHub: React.FC = () => {
  const [activeFile, setActiveFile] = useState(VPS_BLUEPRINT_FILES[0]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [copied, setCopied] = useState(false);

  const categories = ["all", ...Object.keys(CATEGORY_CONFIG)];

  const filteredFiles =
    activeCategory === "all"
      ? VPS_BLUEPRINT_FILES
      : VPS_BLUEPRINT_FILES.filter((f) => f.category === activeCategory);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeFile.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (err) {
      console.error("Erro ao copiar", err);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([activeFile.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = activeFile.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-4 rounded-2xl hud-border bg-slate-900/60">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
            <Rocket className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Hub de Deploy — Código Fonte da VPS</h2>
            <p className="text-xs text-slate-400">
              Estrutura completa e funcional do núcleo Python/FastAPI, Docker Compose e scripts de instalação. Copie, cole e execute na sua VPS.
            </p>
          </div>
        </div>

        {/* Install Instructions Summary */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] font-mono text-sky-400 block uppercase mb-1">Passo 1: Acessar VPS</span>
            <code className="text-xs text-slate-300 font-mono">ssh root@seu-ip-vps</code>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] font-mono text-sky-400 block uppercase mb-1">Passo 2: Rodar Setup</span>
            <code className="text-xs text-slate-300 font-mono">bash deploy.sh</code>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] font-mono text-sky-400 block uppercase mb-1">Passo 3: Iniciar Núcleo</span>
            <code className="text-xs text-emerald-400 font-mono">docker compose up -d</code>
          </div>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 overflow-x-auto">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 text-xs font-mono rounded-lg transition-all shrink-0 flex items-center gap-1.5 ${
              activeCategory === cat
                ? "bg-sky-500/20 text-sky-300 font-semibold border border-sky-500/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {cat !== "all" && CATEGORY_CONFIG[cat]?.icon}
            {cat === "all" ? "Todos os Arquivos" : CATEGORY_CONFIG[cat]?.label}
          </button>
        ))}
      </div>

      {/* File Explorer Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: File tree list */}
        <div className="lg:col-span-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 px-1 pb-1">
            <FolderTree className="w-3.5 h-3.5 text-slate-500" />
            Estrutura do Projeto (Jarvis/)
          </div>

          {filteredFiles.map((file) => {
            const isActive = activeFile.path === file.path;
            return (
              <button
                key={file.path}
                onClick={() => setActiveFile(file)}
                className={`w-full p-3 rounded-xl border transition-all text-left group ${
                  isActive
                    ? "bg-slate-900 border-sky-500/70 ring-1 ring-sky-500/50"
                    : "bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/40"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-xs font-mono font-semibold flex items-center gap-2 truncate ${
                      isActive ? "text-sky-300" : "text-slate-300"
                    }`}
                  >
                    <FileCode className="w-3.5 h-3.5 text-slate-500 group-hover:text-sky-400 shrink-0" />
                    {file.path}
                  </span>
                  <ChevronRight
                    className={`w-3.5 h-3.5 shrink-0 transition-all ${
                      isActive ? "text-sky-400 rotate-90" : "text-slate-600"
                    }`}
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1 line-clamp-1 text-left">{file.description}</p>
              </button>
            );
          })}
        </div>

        {/* Right Column: Code viewer */}
        <div className="lg:col-span-8">
          <div className="rounded-2xl hud-border bg-slate-950/80 overflow-hidden">
            {/* Code Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 bg-slate-900/80 border-b border-slate-800">
              <div className="flex items-center gap-2 min-w-0">
                <FileCode className="w-4 h-4 text-sky-400 shrink-0" />
                <span className="text-sm font-mono font-bold text-white truncate">{activeFile.path}</span>
                <Badge
                  variant="outline"
                  className="hidden sm:inline-flex text-[9px] font-mono uppercase border-slate-700 text-slate-400"
                >
                  {CATEGORY_CONFIG[activeFile.category]?.label}
                </Badge>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  className="text-xs font-mono h-8 border-slate-700 hover:bg-slate-800 text-slate-300"
                >
                  <Download className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                  Baixar
                </Button>
                <Button
                  size="sm"
                  onClick={handleCopy}
                  className={`text-xs font-mono h-8 transition-all ${
                    copied
                      ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                      : "bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold"
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 mr-1" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 mr-1" />
                      Copiar Código
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Description */}
            <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800/60">
              <p className="text-[11px] font-mono text-slate-400">
                <span className="text-slate-500 uppercase text-[10px] mr-2">Sobre:</span>
                {activeFile.description}
              </p>
            </div>

            {/* Code block */}
            <div className="p-4 bg-black max-h-[560px] overflow-auto">
              <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed">
                {activeFile.content}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
