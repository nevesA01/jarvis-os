import { useMemo, useState } from "react";
import { BookOpen, Check, Download, Search, ShieldCheck, Sparkles, Wrench } from "lucide-react";

interface Skill {
  id: string;
  name: string;
  source: string;
  category: string;
  description: string;
  capability: string;
  installed: boolean;
}

const INITIAL_SKILLS: Skill[] = [
  { id: "deep-research", name: "Deep Research", source: "OpenJarvis", category: "Pesquisa", description: "Divide perguntas complexas em múltiplas buscas, cruza fontes e entrega uma síntese com citações.", capability: "rede · memória", installed: true },
  { id: "code-explainer", name: "Code Explainer", source: "AgentSkills", category: "Código", description: "Explica trechos de código em linguagem simples, destaca riscos e sugere testes verificáveis.", capability: "leitura", installed: true },
  { id: "vps-health", name: "VPS Health Check", source: "Jarvis local", category: "Infra", description: "Lê métricas, containers e logs em modo somente leitura antes de recomendar qualquer mudança.", capability: "telemetria", installed: true },
  { id: "morning-briefing", name: "Morning Briefing", source: "OpenJarvis", category: "Rotina", description: "Combina agenda, mensagens, clima e prioridades em um briefing curto e acionável.", capability: "rede · agenda", installed: false },
  { id: "security-audit", name: "Defensive Security Audit", source: "Jarvis local", category: "Segurança", description: "Organiza uma auditoria defensiva autorizada com escopo, evidências e recomendações de menor privilégio.", capability: "leitura · aprovação", installed: false },
  { id: "workflow-builder", name: "Workflow Builder", source: "Community", category: "Automação", description: "Transforma uma intenção em etapas de workflow, pontos de aprovação e plano de rollback.", capability: "aprovação", installed: false },
];

export const SkillsCatalog = () => {
  const [skills, setSkills] = useState(INITIAL_SKILLS);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todas");
  const categories = ["Todas", ...Array.from(new Set(skills.map((skill) => skill.category)))];
  const filtered = useMemo(() => skills.filter((skill) => {
    const haystack = `${skill.name} ${skill.description} ${skill.category}`.toLowerCase();
    return haystack.includes(query.toLowerCase()) && (category === "Todas" || skill.category === category);
  }), [category, query, skills]);
  const installedCount = skills.filter((skill) => skill.installed).length;

  return (
    <section className="space-y-5">
      <div className="rounded-[28px] border border-amber-300/20 bg-[linear-gradient(135deg,rgba(65,38,17,.72),rgba(11,20,34,.94))] p-5 shadow-2xl shadow-amber-950/20 sm:p-6">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl border border-amber-300/25 bg-amber-300/10 p-3 text-amber-200"><Sparkles className="h-5 w-5" /></div>
            <div><p className="text-[10px] font-mono uppercase tracking-[.28em] text-amber-300">OpenJarvis · Skill system</p><h2 className="mt-1 text-lg font-semibold text-white">Catálogo de habilidades</h2><p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-300">Habilidades são capacidades reutilizáveis: o Jarvis descobre a ferramenta certa, pede somente as permissões necessárias e registra o resultado.</p></div>
          </div>
          <div className="flex shrink-0 items-center gap-2 rounded-2xl border border-emerald-300/20 bg-emerald-300/[.07] px-3 py-2 text-xs text-emerald-100"><ShieldCheck className="h-4 w-4 text-emerald-300" /> {installedCount}/{skills.length} ativas</div>
        </div>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <label className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar skill por nome, categoria ou capacidade" className="w-full rounded-xl border border-white/10 bg-slate-950/60 py-2.5 pl-9 pr-3 text-xs text-white outline-none focus:border-amber-300/50" /></label>
          <div className="flex gap-1 overflow-x-auto rounded-xl border border-white/10 bg-slate-950/50 p-1">{categories.map((item) => <button key={item} onClick={() => setCategory(item)} className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-[11px] ${category === item ? "bg-amber-300/15 text-amber-200" : "text-slate-400 hover:text-white"}`}>{item}</button>)}</div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((skill) => <article key={skill.id} className={`group rounded-2xl border p-4 transition ${skill.installed ? "border-amber-300/25 bg-amber-300/[.045]" : "border-white/10 bg-slate-950/45 hover:border-white/20"}`}>
          <div className="flex items-start justify-between gap-3"><div className="rounded-xl border border-white/10 bg-white/[.04] p-2 text-amber-200"><BookOpen className="h-4 w-4" /></div><span className="rounded-full border border-white/10 px-2 py-1 text-[10px] text-slate-400">{skill.category}</span></div>
          <h3 className="mt-4 text-sm font-semibold text-white">{skill.name}</h3><p className="mt-1 text-[11px] text-amber-200/70">{skill.source}</p><p className="mt-3 min-h-12 text-xs leading-relaxed text-slate-300">{skill.description}</p>
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-3"><span className="flex items-center gap-1.5 text-[10px] text-slate-500"><Wrench className="h-3.5 w-3.5" /> {skill.capability}</span><button onClick={() => setSkills((current) => current.map((item) => item.id === skill.id ? { ...item, installed: !item.installed } : item))} className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition ${skill.installed ? "bg-emerald-300/15 text-emerald-200 hover:bg-rose-300/15 hover:text-rose-200" : "bg-amber-300 text-amber-950 hover:bg-amber-200"}`}>{skill.installed ? <Check className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}{skill.installed ? "Ativa" : "Ativar"}</button></div>
        </article>)}
      </div>
      {filtered.length === 0 && <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-sm text-slate-400">Nenhuma habilidade corresponde à busca.</div>}
    </section>
  );
};
