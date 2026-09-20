import React, { useState } from "react";
import { MemoryItem } from "@/types/jarvis";
import {
  Brain,
  Database,
  Search,
  Plus,
  Trash2,
  Tag,
  ShieldCheck,
  Calendar,
  Sparkles,
  Layers,
  Heart,
  History,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  memories: MemoryItem[];
  onAddMemory: (memory: Omit<MemoryItem, "id" | "createdAt" | "updatedAt">) => void;
  onDeleteMemory: (id: string) => void;
}

export const MemoryManager: React.FC<Props> = ({
  memories,
  onAddMemory,
  onDeleteMemory,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [isAddOpen, setIsAddOpen] = useState(false);

  // New Memory Form State
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState("Engenharia");
  const [newType, setNewType] = useState<"session" | "semantic" | "episodic" | "preference">("semantic");
  const [newTags, setNewTags] = useState("");

  const filteredMemories = memories.filter((m) => {
    const matchesSearch =
      m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.tags.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = selectedType === "all" || m.type === selectedType;

    return matchesSearch && matchesType;
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    onAddMemory({
      title: newTitle,
      content: newContent,
      category: newCategory,
      type: newType,
      tags: newTags.split(",").map((t) => t.trim()).filter(Boolean),
      confidence: 0.98,
    });

    setNewTitle("");
    setNewContent("");
    setNewTags("");
    setIsAddOpen(false);
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "preference":
        return {
          label: "Preferência",
          icon: <Heart className="w-3 h-3 text-pink-400" />,
          color: "bg-pink-500/15 text-pink-300 border-pink-500/30",
        };
      case "semantic":
        return {
          label: "Semântica (RAG)",
          icon: <Database className="w-3 h-3 text-sky-400" />,
          color: "bg-sky-500/15 text-sky-300 border-sky-500/30",
        };
      case "episodic":
        return {
          label: "Episódica",
          icon: <History className="w-3 h-3 text-amber-400" />,
          color: "bg-amber-500/15 text-amber-300 border-amber-500/30",
        };
      default:
        return {
          label: "Sessão (Redis)",
          icon: <Layers className="w-3 h-3 text-purple-400" />,
          color: "bg-purple-500/15 text-purple-300 border-purple-500/30",
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-4 rounded-2xl hud-border bg-slate-900/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              Matriz de Memória Persistente
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Postgres + Qdrant + Redis
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              O Jarvis lembra preferências de código, topologia da VPS e lições aprendidas em tarefas passadas.
            </p>
          </div>
        </div>

        <Button
          onClick={() => setIsAddOpen(true)}
          className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs font-mono h-9 px-4 rounded-xl shadow-lg shadow-sky-950/40"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Ensinar Nova Memória
        </Button>
      </div>

      {/* Security Rule Notice */}
      <div className="p-3.5 rounded-xl hud-border bg-slate-950/80 flex items-center justify-between gap-3 text-xs font-mono text-slate-400">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            <strong className="text-slate-200">Guarda de Privacidade:</strong> Senhas, tokens JWT e chaves de API são bloqueados de armazenamento por regex e hashing unilateral.
          </span>
        </div>
        <span className="text-[11px] text-sky-400 shrink-0 hidden sm:inline">
          {memories.length} Memórias Carregadas
        </span>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Layer Filters */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 overflow-x-auto">
          {[
            { id: "all", label: "Todas" },
            { id: "preference", label: "Preferências" },
            { id: "semantic", label: "Semântica (RAG)" },
            { id: "episodic", label: "Episódica" },
            { id: "session", label: "Sessão" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedType(tab.id)}
              className={`px-3 py-1.5 text-xs font-mono rounded-lg transition-all shrink-0 ${
                selectedType === tab.id
                  ? "bg-sky-500/20 text-sky-300 font-semibold border border-sky-500/40"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar nas memórias..."
            className="pl-9 bg-slate-950 border-slate-800 text-xs font-mono text-slate-200 rounded-xl"
          />
        </div>
      </div>

      {/* Memories Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredMemories.map((mem) => {
          const typeBadge = getTypeBadge(mem.type);
          return (
            <div
              key={mem.id}
              className="p-4 rounded-2xl hud-border bg-slate-900/60 hover:bg-slate-900/90 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full border flex items-center gap-1.5 ${typeBadge.color}`}
                  >
                    {typeBadge.icon}
                    {typeBadge.label}
                  </span>

                  <button
                    onClick={() => onDeleteMemory(mem.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-all"
                    title="Excluir Memória Permanentemente"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <h3 className="text-sm font-bold text-white mb-1.5">{mem.title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/50 p-3 rounded-xl border border-slate-800/80 mb-3">
                  {mem.content}
                </p>
              </div>

              <div>
                <div className="flex flex-wrap gap-1 mb-3">
                  {mem.tags.map((t, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400"
                    >
                      #{t}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-2 border-t border-slate-800/60">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-500" />
                    {mem.updatedAt}
                  </span>
                  <span className="text-sky-400">
                    Confiança: {Math.round(mem.confidence * 100)}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Memory Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-lg bg-slate-950 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-base font-mono flex items-center gap-2 text-sky-400">
              <Brain className="w-5 h-5" />
              Armazenar Nova Memória Permanente
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-mono text-slate-400 block mb-1">Tipo de Memória</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-700 text-xs text-white p-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
              >
                <option value="preference">Preferência (Regras de estilo, stack e linguagem)</option>
                <option value="semantic">Semântica / RAG (Conhecimento estruturado, infra, docs)</option>
                <option value="episodic">Episódica (Decisões anteriores e incidentes resolvidos)</option>
                <option value="session">Sessão (Contexto temporário ativo)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-mono text-slate-400 block mb-1">Título da Memória</label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ex: Política de Firewall UFW na VPS"
                required
                className="bg-slate-900 border-slate-700 text-xs text-white rounded-xl"
              />
            </div>

            <div>
              <label className="text-xs font-mono text-slate-400 block mb-1">Conteúdo do Conhecimento</label>
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                rows={4}
                placeholder="Ex: O Caddy deve ser o único serviço com portas 80/443 abertas. Postgres e Redis nunca saem da rede interna..."
                required
                className="w-full bg-slate-900 border border-slate-700 text-xs text-white p-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 font-sans"
              />
            </div>

            <div>
              <label className="text-xs font-mono text-slate-400 block mb-1">Tags (separadas por vírgula)</label>
              <Input
                value={newTags}
                onChange={(e) => setNewTags(e.target.value)}
                placeholder="vps, docker, caddy, firewall"
                className="bg-slate-900 border-slate-700 text-xs text-white rounded-xl font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsAddOpen(false)}
                className="text-xs text-slate-400"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs font-mono px-5 rounded-xl"
              >
                Salvar Memória
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
