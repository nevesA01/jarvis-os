import { useEffect, useState } from "react";
import { BrainCircuit, Check, Eye, EyeOff, Plus, Save, Trash2, WandSparkles } from "lucide-react";
import { DEFAULT_AI_SETTINGS, AiProviderConfig, AiSettings } from "@/types/ai";

const STORAGE_KEY = "jarvis_ai_settings";

interface Props {
  onSettingsChange?: (settings: AiSettings) => void;
}

const readSettings = (): AiSettings => {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved) as AiSettings;
  } catch {
    return DEFAULT_AI_SETTINGS;
  }
  return DEFAULT_AI_SETTINGS;
};

export const AiSettingsPanel = ({ onSettingsChange }: Props) => {
  const [settings, setSettings] = useState<AiSettings>(() => readSettings());
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => onSettingsChange?.(settings), [onSettingsChange, settings]);

  const updateProvider = (id: string, patch: Partial<AiProviderConfig>) => {
    setSettings((current) => ({ ...current, providers: current.providers.map((provider) => provider.id === id ? { ...provider, ...patch } : provider) }));
  };

  const save = () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
    onSettingsChange?.(settings);
  };

  return (
    <section className="overflow-hidden rounded-[28px] border border-violet-300/15 bg-[linear-gradient(135deg,rgba(30,27,75,.92),rgba(10,15,32,.96))] shadow-2xl shadow-violet-950/20">
      <div className="flex flex-col gap-4 border-b border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl border border-violet-300/25 bg-violet-400/10 p-3 text-violet-200"><BrainCircuit className="h-5 w-5" /></div>
          <div><p className="text-[10px] font-mono uppercase tracking-[.28em] text-violet-300">Cérebro configurável</p><h2 className="mt-1 text-lg font-semibold text-white">Integre suas IAs</h2><p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-300">As chaves ficam no navegador nesta versão. Para produção, use variáveis secretas no gateway Nitro.</p></div>
        </div>
        <button onClick={save} className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-400 px-4 py-2.5 text-xs font-bold text-violet-950 transition hover:bg-violet-300"><Save className="h-4 w-4" /> {saved ? "Salvo" : "Salvar conexões"}</button>
      </div>
      <div className="space-y-3 p-5 sm:p-6">
        {settings.providers.map((provider) => (
          <div key={provider.id} className={`rounded-2xl border p-4 transition ${provider.enabled ? "border-violet-300/40 bg-violet-300/[.07]" : "border-white/10 bg-slate-950/35"}`}>
            <div className="flex flex-wrap items-center gap-3">
              <input value={provider.name} onChange={(event) => updateProvider(provider.id, { name: event.target.value })} className="min-w-[150px] flex-1 bg-transparent text-sm font-semibold text-white outline-none" />
              <label className="flex items-center gap-2 text-[11px] text-slate-300"><input type="checkbox" checked={provider.enabled} onChange={(event) => updateProvider(provider.id, { enabled: event.target.checked })} className="accent-violet-400" /> ativo</label>
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <input value={provider.baseUrl} onChange={(event) => updateProvider(provider.id, { baseUrl: event.target.value })} placeholder="URL base" className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-slate-200 outline-none focus:border-violet-300/60" />
              <input value={provider.model} onChange={(event) => updateProvider(provider.id, { model: event.target.value })} placeholder="Modelo" className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-slate-200 outline-none focus:border-violet-300/60" />
              <div className="relative md:col-span-2"><input type={visibleKeys[provider.id] ? "text" : "password"} value={provider.apiKey} onChange={(event) => updateProvider(provider.id, { apiKey: event.target.value })} placeholder="API key (opcional para Ollama)" className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 pr-10 text-xs text-slate-200 outline-none focus:border-violet-300/60" /><button type="button" onClick={() => setVisibleKeys((current) => ({ ...current, [provider.id]: !current[provider.id] }))} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white">{visibleKeys[provider.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>
            </div>
          </div>
        ))}
        <div className="rounded-2xl border border-amber-300/15 bg-amber-300/[.05] p-4 text-xs leading-relaxed text-amber-100/80"><WandSparkles className="mr-2 inline h-4 w-4 text-amber-300" /> O roteador usa a IA ativa para responder perguntas abertas e pode voltar ao Supervisor local se nenhuma conexão estiver ativa.</div>
      </div>
    </section>
  );
};
