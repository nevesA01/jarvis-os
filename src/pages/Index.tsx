import { useState, useCallback } from "react";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { CommandBanner, JarvisCoreLogo } from "@/components/visuals/JarvisVisuals";
import { AgentNetworkTopology } from "@/components/visuals/AgentNetworkTopology";
import { AgentChat } from "@/components/chat/AgentChat";
import { ApprovalsQueue } from "@/components/approvals/ApprovalsQueue";
import { VpsTelemetryView } from "@/components/telemetry/VpsTelemetry";
import { MemoryManager } from "@/components/memory/MemoryManager";
import { VpsDeployHub } from "@/components/deploy/VpsDeployHub";
import {
  JARVIS_AGENTS,
  INITIAL_TELEMETRY,
  INITIAL_CONTAINERS,
  INITIAL_APPROVALS,
  INITIAL_MEMORIES,
  INITIAL_AUDIT_LOGS,
} from "@/data/jarvisData";
import {
  ChatMessage,
  ApprovalRequest,
  MemoryItem,
  AgentId,
} from "@/types/jarvis";
import {
  MessageSquare,
  ShieldCheck,
  Activity,
  Brain,
  Rocket,
} from "lucide-react";

type TabId = "chat" | "approvals" | "telemetry" | "memory" | "deploy";

const Index = () => {
  const [activeTab, setActiveTab] = useState<TabId>("chat");

  // ===================== Jarvis State =====================
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "msg-welcome",
      sender: "supervisor",
      senderName: "Supervisor Nexus",
      content:
        "👋 Olá, Operador! Sou o **Supervisor Nexus**, o núcleo orquestrador do Jarvis.\n\nEstou monitorando sua VPS e meus 5 agentes especialistas estão em prontidão. Envie um comando e eu farei a análise semântica, verificarei o risco e delegarei a tarefa ao agente adequado.\n\nToda ação crítica passará pela sua aprovação humana antes de ser executada.",
      timestamp: "Agora",
      reasoningPlan: {
        intent: "system_boot",
        delegatedAgent: "supervisor",
        risk: "low",
        requiresApproval: false,
        modelUsed: "Mistral NeMo (Local Ollama)",
        latencyMs: 48,
        tokens: 120,
      },
    },
  ]);

  const [approvals, setApprovals] = useState<ApprovalRequest[]>(INITIAL_APPROVALS);
  const [memories, setMemories] = useState<MemoryItem[]>(INITIAL_MEMORIES);
  const [containers, setContainers] = useState(INITIAL_CONTAINERS);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);

  const pendingApprovalsCount = approvals.filter((a) => a.status === "pending").length;

  const nowTime = () =>
    new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  // ===================== Supervisor Simulation Engine =====================
  const handleSendMessage = useCallback(
    (text: string) => {
      const userMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        sender: "user",
        senderName: "Você",
        content: text,
        timestamp: nowTime(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsThinking(true);

      // Simulated pipeline: Supervisor analyzes intent and risk (mirrors app/agents/supervisor.py)
      setTimeout(() => {
        const lower = text.toLowerCase();
        const isDestructive = ["delete", "prune", "apagar", "rm -rf", "drop table", "formatar", "ufw allow"].some((k) =>
          lower.includes(k)
        );
        const isSecurity = ["vulnerabilidade", "scan", "pentest", "cve", "semgrep", "owasp", "segurança", "firewall"].some((k) =>
          lower.includes(k)
        );
        const isCoding = ["código", "função", "fastapi", "bug", "refatorar", "react", "api", "dockerfile", "python", "rota"].some((k) =>
          lower.includes(k)
        );
        const isInfra = ["cpu", "ram", "disco", "container", "vps", "docker", "status", "saúde", "memória"].some((k) =>
          lower.includes(k)
        );

        if (isDestructive) {
          const approvalId = `appr-${Math.random().toString(36).slice(2, 8)}`;
          const newApproval: ApprovalRequest = {
            id: approvalId,
            title: "Operação Crítica Retida pelo Supervisor",
            agentId: "devops",
            agentName: "Titan Ops",
            tool: "sandbox_shell_exec",
            target: "VPS Local / Docker Engine",
            risk: "high",
            status: "pending",
            timestamp: nowTime(),
            details: {
              command: text,
              actionDescription: `O comando recebido foi identificado como potencialmente destrutivo: "${text}"`,
              riskReason:
                "Ação pode causar perda de dados, indisponibilidade de serviço ou alteração de configuração crítica da VPS. Requer validação humana obrigatória.",
              rollbackPlan:
                "Necessário snapshot prévio. Sem rollback direto disponível para esta operação destrutiva.",
              diffOrPayload: "Comando enviado ao sandbox de execução para revisão humana.",
            },
          };
          setApprovals((prev) => [newApproval, ...prev]);
          setIsThinking(false);

          setMessages((prev) => [
            ...prev,
            {
              id: `msg-${Date.now() + 1}`,
              sender: "supervisor",
              senderName: "Supervisor Nexus",
              content: `⚠️ **Ação de Alto Risco Identificada e BLOQUEADA.**\n\nO comando foi retido e enviado para a **Fila de Aprovação Humana** (ID: ${approvalId}). Nada será executado até o seu aval explícito — este é o princípio do Human-in-the-Loop.`,
              timestamp: nowTime(),
              reasoningPlan: {
                intent: "system_critical",
                delegatedAgent: "devops",
                risk: "high",
                requiresApproval: true,
                modelUsed: "Claude 3.5 (Guardrails)",
                latencyMs: 156,
                tokens: 240,
              },
              approvalRequestId: approvalId,
            },
          ]);
        } else if (isSecurity) {
          setIsThinking(false);
          setMessages((prev) => [
            ...prev,
            {
              id: `msg-${Date.now() + 1}`,
              sender: "cybersecurity",
              senderName: "Aegis Sentinel",
              content: `🛡️ **Relatório de Auditoria Defensiva concluído.**\n\n**Resultados da varredura (somente ativos autorizados):**\n• 0 credenciais vazadas no código-fonte (Gitleaks)\n• 2 CVEs de severidade média encontradas em dependências Python (corrigíveis com pip-audit)\n• Headers HTTP HSTS e X-Frame-Options: ATIVOS no Caddy\n• Escaneamento limitado ao escopo: 127.0.0.1 e meusite.com.br\n\n**Recomendação:** Rodar \`trivy fs --severity HIGH,CRITICAL .\` no pipeline CI/CD semanalmente.`,
              timestamp: nowTime(),
              reasoningPlan: {
                intent: "security_audit",
                delegatedAgent: "cybersecurity",
                risk: "medium",
                requiresApproval: false,
                modelUsed: "Claude 3.5 Sonnet",
                latencyMs: 842,
                tokens: 620,
              },
              toolExecution: {
                toolName: "gitleaks + trivy scan",
                command: "gitleaks detect --source . && trivy fs .",
                resultSnippet: "Scan finalizado: 2 achados médios, 0 críticos.",
                status: "success",
              },
            },
          ]);
        } else if (isCoding) {
          setIsThinking(false);
          setMessages((prev) => [
            ...prev,
            {
              id: `msg-${Date.now() + 1}`,
              sender: "coder",
              senderName: "Ares Coder",
              content: `💻 **Plano de implementação elaborado pelo Ares Coder:**\n\n\`\`\`python\nfrom fastapi import APIRouter, Depends, HTTPException\nfrom pydantic import BaseModel, Field\n\nrouter = APIRouter(prefix="/api/tasks", tags=["tasks"])\n\nclass TaskCreate(BaseModel):\n    title: str = Field(..., min_length=3, max_length=120)\n    priority: int = Field(default=1, ge=1, le=5)\n\n@router.post("/", status_code=201)\nasync def create_task(payload: TaskCreate):\n    # Validação estrita já garantida pelo Pydantic v2\n    return {"ok": True, "task": payload.model_dump()}\n\`\`\`\n\n**Checklist do Coder:**\n1. ✅ Schema Pydantic v2 validado\n2. ✅ Sanitização de entrada aplicada\n3. ✅ Testes pytest sugeridos (test_create_task_201)\n4. ⏳ Aplicar em \`app/api/routes.py\`? (pedir confirmação antes de salvar arquivo)`,
              timestamp: nowTime(),
              reasoningPlan: {
                intent: "coding",
                delegatedAgent: "coder",
                risk: "low",
                requiresApproval: false,
                modelUsed: "DeepSeek Coder V2",
                latencyMs: 1240,
                tokens: 850,
              },
              toolExecution: {
                toolName: "syntax_validator",
                command: "ruff check app/ --fix",
                resultSnippet: "All checks passed! 0 errors found.",
                status: "success",
              },
            },
          ]);
        } else if (isInfra) {
          setIsThinking(false);
          setMessages((prev) => [
            ...prev,
            {
              id: `msg-${Date.now() + 1}`,
              sender: "devops",
              senderName: "Titan Ops",
              content: `🖥️ **Diagnóstico de Infraestrutura — VPS Ubuntu 24.04:**\n\n• **CPU:** 18.4% (4 vCPUs) — ótimo headroom\n• **RAM:** 3.4 GB / 8 GB usados (42.5%)\n• **Containers:** 6/6 ativos e saudáveis\n• **Latência interna de rede Docker:** < 0.4ms\n\nTudo dentro dos limites seguros. Nenhuma ação corretiva necessária.`,
              timestamp: nowTime(),
              reasoningPlan: {
                intent: "infrastructure_check",
                delegatedAgent: "devops",
                risk: "low",
                requiresApproval: false,
                modelUsed: "Mistral NeMo (Local)",
                latencyMs: 310,
                tokens: 190,
              },
              toolExecution: {
                toolName: "docker_ps_inspect",
                command: "docker stats --no-stream",
                resultSnippet: "6/6 containers online. RAM total: 2.7GB consumidos.",
                status: "success",
              },
            },
          ]);
        } else {
          setIsThinking(false);
          setMessages((prev) => [
            ...prev,
            {
              id: `msg-${Date.now() + 1}`,
              sender: "supervisor",
              senderName: "Supervisor Nexus",
              content: `Entendido. Analisei sua solicitação: "${text}"\n\n**Meu plano de execução:**\n1. Recuperei 2 memórias relevantes do seu contexto persistente (stack FastAPI + topologia VPS).\n2. Nenhum risco crítico identificado — classificação: **baixo risco**.\n3. Posso delegar ao **Ares Coder** (código), **Athena Research** (pesquisa) ou executar diretamente.\n\nMe diga qual agente você prefere ou envie "continuar" para eu escolher a melhor rota automaticamente.`,
              timestamp: nowTime(),
              reasoningPlan: {
                intent: "general_planning",
                delegatedAgent: "supervisor",
                risk: "low",
                requiresApproval: false,
                modelUsed: "Groq Llama-3-70B",
                latencyMs: 420,
                tokens: 350,
              },
            },
          ]);
        }
      }, 1200);
    },
    []
  );

  const handleResolveApproval = useCallback(
    (id: string, decision: "approved" | "rejected", note?: string) => {
      setApprovals((prev) =>
        prev.map((appr) =>
          appr.id === id ? { ...appr, status: decision, approvedAt: nowTime(), notes: note } : appr
        )
      );

      const target = approvals.find((a) => a.id === id);
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          sender: "supervisor",
          senderName: "Supervisor Nexus",
          content:
            decision === "approved"
              ? `✅ **Autorização humana registrada** para o pedido \`${id}\` (${target?.title}).\n\nO agente ${target?.agentName} já está executando a tarefa em ambiente sandboxed. O resultado aparecerá no canal neural em instantes e será registrado nos logs de auditoria.`
              : `🚫 **Ação rejeitada pelo operador** (\`${id}\`).\n\nO agente ${target?.agentName} foi instruído a abortar a operação. A justificativa "${note}" foi registrada na memória episódica para aprendizado futuro do sistema.`,
          timestamp: nowTime(),
          reasoningPlan: {
            intent: "human_in_the_loop_review",
            delegatedAgent: target?.agentId || "supervisor",
            risk: target?.risk || "high",
            requiresApproval: false,
            modelUsed: "Supervisor Guardrails",
            latencyMs: 25,
            tokens: 60,
          },
        },
      ]);
    },
    [approvals]
  );

  const handleAddMemory = useCallback((memory: Omit<MemoryItem, "id" | "createdAt" | "updatedAt">) => {
    const now = new Date().toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    setMemories((prev) => [
      {
        ...memory,
        id: `mem-${Date.now()}`,
        createdAt: now,
        updatedAt: now,
      },
      ...prev,
    ]);
  }, []);

  const handleDeleteMemory = useCallback((id: string) => {
    setMemories((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const handleRestartContainer = useCallback((containerId: string) => {
    setContainers((prev) =>
      prev.map((c) =>
        c.id === containerId
          ? { ...c, status: "restarting" }
          : c
      )
    );
    setTimeout(() => {
      setContainers((prev) =>
        prev.map((c) =>
          c.id === containerId ? { ...c, status: "running" } : c
        )
      );
    }, 2000);
  }, []);

  const NAV_TABS = [
    { id: "chat" as TabId, label: "Canal Neural", icon: <MessageSquare className="w-4 h-4" /> },
    { id: "approvals" as TabId, label: "Aprovações", icon: <ShieldCheck className="w-4 h-4" />, badge: pendingApprovalsCount },
    { id: "telemetry" as TabId, label: "Telemetria VPS", icon: <Activity className="w-4 h-4" /> },
    { id: "memory" as TabId, label: "Memória", icon: <Brain className="w-4 h-4" /> },
    { id: "deploy" as TabId, label: "Deploy VPS", icon: <Rocket className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100">
      {/* ===================== Top Header Bar ===================== */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#030712]/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab("chat")}
              className="flex items-center gap-2.5 group"
            >
              <JarvisCoreLogo size={34} animated />
              <span className="text-lg font-extrabold tracking-tight text-white group-hover:text-sky-400 transition-colors">
                JARVIS <span className="text-sky-400 font-mono text-sm font-semibold">OS</span>
              </span>
            </button>
            <span className="hidden md:inline-flex text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              ● SISTEMA ONLINE — VPS CONECTADA
            </span>
          </div>

          {/* Quick nav icons for desktop */}
          <nav className="hidden lg:flex items-center gap-1.5">
            {NAV_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-3.5 py-2 rounded-xl text-xs font-mono font-semibold transition-all flex items-center gap-2 ${
                  activeTab === tab.id
                    ? "bg-sky-500/15 text-sky-300 border border-sky-500/40"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent"
                }`}
              >
                {tab.icon}
                {tab.label}
                {!!tab.badge && tab.badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white px-1 shadow-lg shadow-rose-950/60">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* ===================== Main Content Area ===================== */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 pb-16">
        {/* HUD Banner (visible on top-level views) */}
        {activeTab !== "chat" && <CommandBanner activeAgentCount={6} />}

        {/* Agent Topology strip on Chat and Telemetry tabs */}
        {(activeTab === "chat" || activeTab === "telemetry") && (
          <AgentNetworkTopology
            agents={JARVIS_AGENTS}
            selectedAgentId={selectedAgentId}
            onSelectAgent={(id) =>
              setSelectedAgentId((prev) => (prev === id ? null : id))
            }
            pendingApprovalsCount={pendingApprovalsCount}
          />
        )}

        {/* --- TAB: CHAT --- */}
        {activeTab === "chat" && (
          <AgentChat
            messages={messages}
            onSendMessage={handleSendMessage}
            selectedAgentId={selectedAgentId}
            onClearChat={() => setMessages((prev) => prev.slice(0, 1))}
            onRequestApprovalView={() => setActiveTab("approvals")}
          />
        )}

        {/* --- TAB: APPROVALS --- */}
        {activeTab === "approvals" && (
          <ApprovalsQueue
            approvals={approvals}
            onResolveApproval={handleResolveApproval}
          />
        )}

        {/* --- TAB: TELEMETRY --- */}
        {activeTab === "telemetry" && (
          <VpsTelemetryView
            telemetry={INITIAL_TELEMETRY}
            containers={containers}
            auditLogs={INITIAL_AUDIT_LOGS}
            onRestartContainer={handleRestartContainer}
          />
        )}

        {/* --- TAB: MEMORY --- */}
        {activeTab === "memory" && (
          <MemoryManager
            memories={memories}
            onAddMemory={handleAddMemory}
            onDeleteMemory={handleDeleteMemory}
          />
        )}

        {/* --- TAB: DEPLOY HUB --- */}
        {activeTab === "deploy" && <VpsDeployHub />}

        {/* Supervisor thinking indicator */}
        {isThinking && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 border border-sky-500/40 shadow-2xl shadow-sky-950/50">
            <JarvisCoreLogo size={22} animated />
            <span className="text-xs font-mono text-sky-300 animate-pulse">
              Supervisor Nexus analisando intenção e risco...
            </span>
          </div>
        )}
      </main>

      {/* Mobile bottom navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-slate-800 bg-[#030712]/95 backdrop-blur-xl">
        <div className="flex items-center justify-around px-2 py-2">
          {NAV_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all ${
                activeTab === tab.id ? "text-sky-400 bg-sky-500/10" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {tab.icon}
              <span className="text-[10px] font-mono font-semibold">{tab.label.split(" ")[0]}</span>
              {!!tab.badge && tab.badge > 0 && (
                <span className="absolute top-0 right-1 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white px-1">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>

      <div className="pb-20 lg:pb-0">
        <div className="text-center py-4">
          <MadeWithDyad />
        </div>
      </div>
    </div>
  );
};

export default Index;
