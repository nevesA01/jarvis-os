import type { AgentId, RiskLevel } from "@/types/jarvis";

export type SkillRisk = "S0" | "S1" | "S2" | "S3" | "S4";

export interface SkillRecord {
  id: string;
  name: string;
  category: string;
  risk: SkillRisk;
  status: "enabled" | "disabled";
  reviewStatus: "approved" | "pending";
  allowedAgents: AgentId[];
  keywords: string[];
}

export interface SkillRoute {
  id: string;
  name: string;
  category: string;
  risk: SkillRisk;
  status: SkillRecord["status"];
  reason: string;
}

const ALL_AGENTS: AgentId[] = [
  "supervisor",
  "coder",
  "cybersecurity",
  "researcher",
  "devops",
  "document",
  "automation",
];

const categorySkills: Record<string, string[]> = {
  Core: ["daily-briefing", "weekly-review", "goal-breakdown", "decision-framework", "checklist-generator"],
  Coding: ["feature-planner", "fastapi-builder", "code-review", "stacktrace-debugger", "test-generator", "docker-expert", "supabase-expert", "technical-documentation"],
  Security: ["owasp-api-audit", "threat-model", "security-code-review", "secret-scanning-review", "dependency-audit", "docker-security-audit", "vps-hardening-plan", "oauth-security-review", "mcp-security-review", "security-review-before-enablement"],
  Research: ["technical-research", "source-verification", "tool-comparison", "github-project-review", "documentation-reader", "paper-summary", "learning-plan", "quiz-generator"],
  Productivity: ["task-prioritization", "note-organizer", "study-planner", "meeting-prep", "focus-session-planner"],
  Content: ["short-video-script", "quiz-content-generator", "content-calendar", "content-repurposing", "landing-page-copy", "seo-content-plan", "visual-prompt-generator"],
  Integrations: ["github-readonly", "webhook-designer", "n8n-workflow-designer", "api-contract-review", "integration-test-planner"],
  Ops: ["vps-readonly-diagnostics", "docker-compose-audit", "log-analysis", "deployment-planner", "backup-recovery-planner", "capacity-planner", "health-check-designer", "incident-runbook-generator"],
  Data: ["csv-cleaning-plan", "dataset-analysis-plan", "json-schema-validator", "report-generator", "document-classification-plan"],
  Home: ["home-status-readonly-plan", "energy-usage-analysis", "shopping-list-planner", "habit-tracker-plan", "travel-planner"],
};

const disabledSkills = new Set([
  "source-verification",
  "github-project-review",
  "documentation-reader",
  "github-readonly",
  "vps-readonly-diagnostics",
  "docker-compose-audit",
  "log-analysis",
  "dependency-audit",
  "secret-scanning-review",
  "docker-security-audit",
  "energy-usage-analysis",
  "home-status-readonly-plan",
  "supabase-expert",
  "webhook-designer",
  "n8n-workflow-designer",
]);

const skillTerms: Record<string, string[]> = {
  "daily-briefing": ["briefing", "resumo do dia", "agenda de hoje", "prioridades"],
  "weekly-review": ["revisao semanal", "semana", "progresso semanal"],
  "goal-breakdown": ["objetivo", "meta", "quebrar", "etapas", "plano"],
  "decision-framework": ["decidir", "decisao", "alternativas", "trade-off", "comparar"],
  "checklist-generator": ["checklist", "lista de verificacao", "passos"],
  "feature-planner": ["feature", "funcionalidade", "criterios de aceite", "escopo"],
  "fastapi-builder": ["fastapi", "pydantic", "endpoint", "api python"],
  "code-review": ["revisar codigo", "code review", "qualidade do codigo"],
  "stacktrace-debugger": ["stacktrace", "erro", "exception", "bug", "traceback"],
  "test-generator": ["teste", "testes", "pytest", "cobertura"],
  "docker-expert": ["dockerfile", "docker", "container", "imagem"],
  "supabase-expert": ["supabase", "rls", "postgres supabase"],
  "technical-documentation": ["documentacao tecnica", "readme", "documentar"],
  "owasp-api-audit": ["owasp", "api segura", "api security"],
  "threat-model": ["threat model", "modelo de ameacas", "stride", "ativo"],
  "security-code-review": ["revisao de seguranca", "vulnerabilidade no codigo", "sast"],
  "secret-scanning-review": ["secret", "credencial", "gitleaks", "chave exposta"],
  "dependency-audit": ["dependencia", "dependencias", "cve", "supply chain"],
  "docker-security-audit": ["seguranca docker", "trivy", "container seguro"],
  "vps-hardening-plan": ["hardening", "vps segura", "servidor seguro"],
  "oauth-security-review": ["oauth", "pkce", "redirect uri", "token"],
  "mcp-security-review": ["mcp", "model context protocol"],
  "security-review-before-enablement": ["habilitar skill", "instalar skill", "revisao de origem", "integração externa"],
  "technical-research": ["pesquisa tecnica", "investigar", "artigo tecnico"],
  "source-verification": ["verificar fonte", "fonte confiavel", "corroborar"],
  "tool-comparison": ["comparar ferramentas", "melhor ferramenta", "alternativas"],
  "github-project-review": ["github", "repositorio", "projeto open source"],
  "documentation-reader": ["ler documentacao", "docs", "documentação"],
  "paper-summary": ["paper", "artigo cientifico", "resumir artigo"],
  "learning-plan": ["aprender", "plano de estudos", "estudar"],
  "quiz-generator": ["quiz", "questionario", "perguntas"],
  "task-prioritization": ["priorizar tarefas", "prioridade", "backlog"],
  "note-organizer": ["organizar notas", "notas", "anotacoes"],
  "study-planner": ["cronograma de estudo", "estudo", "revisao espaçada"],
  "meeting-prep": ["reuniao", "pauta", "meeting"],
  "focus-session-planner": ["foco", "pomodoro", "sessao de foco"],
  "short-video-script": ["roteiro", "video curto", "reels", "tiktok"],
  "quiz-content-generator": ["conteudo de quiz", "perguntas para conteudo"],
  "content-calendar": ["calendario editorial", "calendario de conteudo"],
  "content-repurposing": ["reaproveitar conteudo", "repurpose"],
  "landing-page-copy": ["landing page", "copy", "pagina de vendas"],
  "seo-content-plan": ["seo", "palavra-chave", "cluster"],
  "visual-prompt-generator": ["prompt visual", "imagem", "ilustracao"],
  "github-readonly": ["ler github", "consultar repositorio"],
  "webhook-designer": ["webhook", "evento http"],
  "n8n-workflow-designer": ["n8n", "workflow n8n"],
  "api-contract-review": ["contrato api", "openapi", "swagger"],
  "integration-test-planner": ["teste de integracao", "integracao"],
  "vps-readonly-diagnostics": ["diagnostico vps", "saude da vps", "telemetria vps"],
  "docker-compose-audit": ["docker compose", "compose audit"],
  "log-analysis": ["analisar logs", "logs", "log de erro"],
  "deployment-planner": ["deploy", "deployment", "publicar versao"],
  "backup-recovery-planner": ["backup", "recuperacao", "rpo", "rto"],
  "capacity-planner": ["capacidade", "escalabilidade", "carga"],
  "health-check-designer": ["health check", "readiness", "liveness"],
  "incident-runbook-generator": ["incidente", "runbook", "plantao"],
  "csv-cleaning-plan": ["csv", "limpar planilha", "dados tabulares"],
  "dataset-analysis-plan": ["dataset", "analise de dados", "métrica"],
  "json-schema-validator": ["json schema", "validar json", "schema"],
  "report-generator": ["relatorio", "relatório", "resumo executivo"],
  "document-classification-plan": ["classificar documentos", "classificacao"],
  "home-status-readonly-plan": ["casa inteligente", "status da casa", "iot"],
  "energy-usage-analysis": ["consumo de energia", "energia"],
  "shopping-list-planner": ["lista de compras", "compras"],
  "habit-tracker-plan": ["habito", "hábitos", "rotina"],
  "travel-planner": ["viagem", "roteiro de viagem", "turismo"],
};

const normalize = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const categoryForAgent: Partial<Record<AgentId, string[]>> = {
  coder: ["Coding"],
  cybersecurity: ["Security"],
  researcher: ["Research"],
  devops: ["Ops", "Integrations"],
  document: ["Content", "Data"],
  automation: ["Productivity", "Integrations", "Home"],
};

const records: SkillRecord[] = Object.entries(categorySkills).flatMap(([category, ids]) => ids.map((id) => ({
  id,
  name: id.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" "),
  category,
  risk: category === "Core" || !disabledSkills.has(id) ? "S0" : "S1",
  status: disabledSkills.has(id) ? "disabled" : "enabled",
  reviewStatus: disabledSkills.has(id) ? "pending" : "approved",
  allowedAgents: ALL_AGENTS,
  keywords: skillTerms[id] || [],
})));

export const SKILL_CATALOG = records;

export const routeSkills = (text: string, preferredAgent?: AgentId | null): SkillRoute[] => {
  const normalized = normalize(text);
  const preferredCategories = preferredAgent ? categoryForAgent[preferredAgent] || [] : [];
  const candidates = records.filter((skill) => skill.status === "enabled" && skill.reviewStatus === "approved");
  const scored = candidates.map((skill) => {
    const keywordScore = skill.keywords.reduce((score, keyword) => score + (normalized.includes(normalize(keyword)) ? 3 : 0), 0);
    const categoryScore = preferredCategories.includes(skill.category) ? 2 : 0;
    return { skill, score: keywordScore + categoryScore };
  }).filter((candidate) => candidate.score > 0).sort((a, b) => b.score - a.score);

  const selected = scored.length > 0 ? scored.slice(0, 3) : candidates.filter((skill) => skill.category === "Core").slice(0, 1).map((skill) => ({ skill, score: 1 }));
  return selected.map(({ skill }) => ({
    id: skill.id,
    name: skill.name,
    category: skill.category,
    risk: skill.risk,
    status: skill.status,
    reason: preferredCategories.includes(skill.category) ? "compatível com o agente e a intenção" : "correspondência semântica com o pedido",
  }));
};

export const skillContext = (routes: SkillRoute[]) => routes.length === 0
  ? "Nenhuma skill habilitada correspondeu diretamente; peça contexto antes de inventar uma capacidade."
  : routes.map((skill) => `- ${skill.name} (${skill.id}, ${skill.risk}): ${skill.reason}`).join("\n");
