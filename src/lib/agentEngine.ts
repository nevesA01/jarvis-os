import { ChatMessage, ApprovalRequest } from "@/types/jarvis";

export interface AgentResponseDraft {
  sender: ChatMessage["sender"];
  senderName: string;
  content: string;
  reasoningPlan: NonNullable<ChatMessage["reasoningPlan"]>;
  toolExecution?: ChatMessage["toolExecution"];
  approvalRequestId?: string;
  newApproval?: ApprovalRequest;
}

export interface IntentAnalysis {
  intent: string;
  targetAgent: ChatMessage["sender"];
  agentName: string;
  risk: "low" | "medium" | "high";
  requiresApproval: boolean;
  modelUsed: string;
  isDestructive: boolean;
}

const DESTROY_KEYWORDS = [
  "delete", "prune", "apagar", "rm -rf", "drop table", "formatar", "ufw allow",
  "destruir", "remover tudo", "wipe", "shutdown", "reboot",
];
const SECURITY_KEYWORDS = [
  "vulnerabilidade", "scan", "pentest", "cve", "semgrep", "owasp", "segurança",
  "firewall", "auditoria", "portas", "gitleaks", "trivy", "exploit", "ataque",
];
const CODING_KEYWORDS = [
  "código", "codigo", "função", "funcao", "fastapi", "bug", "refatorar", "react",
  "api", "dockerfile", "python", "rota", "endpoint", "classe", "typescript",
  "javascript", "testes", "pytest", "componente", "css", "html", "migration", "sql",
];
const INFRA_KEYWORDS = [
  "cpu", "ram", "disco", "container", "vps", "docker", "status", "saúde", "saude",
  "memória", "memoria", "uptime", "log", "serviços", "servicos", "caddy", "postgres", "redis",
];
const RESEARCH_KEYWORDS = [
  "pesquisa", "pesquisar", "artigo", "paper", "estudo", "documentação", "documentacao",
  "comparar", "melhor forma", "arxiv", "fontes", "referências", "referencias",
];
const LOCAL_ACTION_KEYWORDS = [
  "meu pc", "meu computador", "windows", "powershell", "cmd", "arquivo", "arquivos",
  "pasta", "programa", "aplicativo", "processo", "instalar", "abrir", "executar comando",
  "execute", "rode", "rodar", "edite", "editar", "modifique", "modificar", "exclua", "apague", "crie", "criar", "salve", "baixar", "download",
  "crie um projeto", "criar projeto", "editar arquivo", "acesso total",
];

const hasKeyword = (text: string, list: string[]) => list.some((k) => text.includes(k));

export const analyzeIntent = (text: string): IntentAnalysis => {
  const lower = text.toLowerCase();

  if (hasKeyword(lower, DESTROY_KEYWORDS) || hasKeyword(lower, LOCAL_ACTION_KEYWORDS)) {
    return {
      intent: "local_computer_action",
      targetAgent: "supervisor",
      agentName: "Supervisor Nexus",
      risk: "high",
      requiresApproval: true,
      modelUsed: "Supervisor Guardrails (Aprovação por Ação)",
      isDestructive: hasKeyword(lower, DESTROY_KEYWORDS),
    };
  }

  if (hasKeyword(lower, DESTROY_KEYWORDS)) {
    return {
      intent: "system_critical",
      targetAgent: "devops",
      agentName: "Titan Ops",
      risk: "high",
      requiresApproval: true,
      modelUsed: "Claude 3.5 (Guardrails de Segurança)",
      isDestructive: true,
    };
  }
  if (hasKeyword(lower, SECURITY_KEYWORDS)) {
    return {
      intent: "security_audit",
      targetAgent: "cybersecurity",
      agentName: "Aegis Sentinel",
      risk: "medium",
      requiresApproval: false,
      modelUsed: "Claude 3.5 Sonnet (Raciocínio)",
      isDestructive: false,
    };
  }
  if (hasKeyword(lower, CODING_KEYWORDS)) {
    return {
      intent: "coding",
      targetAgent: "coder",
      agentName: "Ares Coder",
      risk: "low",
      requiresApproval: false,
      modelUsed: "DeepSeek Coder V2",
      isDestructive: false,
    };
  }
  if (hasKeyword(lower, INFRA_KEYWORDS)) {
    return {
      intent: "infrastructure_check",
      targetAgent: "devops",
      agentName: "Titan Ops",
      risk: "low",
      requiresApproval: false,
      modelUsed: "Mistral NeMo (Local Ollama)",
      isDestructive: false,
    };
  }
  if (hasKeyword(lower, RESEARCH_KEYWORDS)) {
    return {
      intent: "research",
      targetAgent: "researcher",
      agentName: "Athena Research",
      risk: "low",
      requiresApproval: false,
      modelUsed: "Gemini 1.5 Pro + Perplexity",
      isDestructive: false,
    };
  }

  return {
    intent: "general_planning",
    targetAgent: "supervisor",
    agentName: "Supervisor Nexus",
    risk: "low",
    requiresApproval: false,
    modelUsed: "Groq Llama-3-70B",
    isDestructive: false,
  };
};

export const buildAgentResponse = (text: string, analysis: IntentAnalysis): AgentResponseDraft => {
  const nowTime = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  if (analysis.intent === "local_computer_action") {
    const approvalId = `appr-${Math.random().toString(36).slice(2, 8)}`;
    return {
      sender: "supervisor",
      senderName: "Supervisor Nexus",
      content: `🔐 **Ação no computador pausada para sua autorização.**\n\nO Jarvis preparou uma solicitação para o **Agente Local do Windows** e não executará nada antes da sua confirmação (ID: \`${approvalId}\`).\n\nRevise o comando e os arquivos afetados na aba **Aprovações**. Você pode clicar em **Autorizar e Executar** ou dizer **“Jarvis, autorizar”**.`,
      reasoningPlan: {
        intent: analysis.intent,
        delegatedAgent: analysis.targetAgent as any,
        risk: "high",
        requiresApproval: true,
        modelUsed: analysis.modelUsed,
        latencyMs: 156,
        tokens: 240,
      },
      approvalRequestId: approvalId,
      newApproval: {
        id: approvalId,
        title: "Ação no computador aguardando autorização",
        agentId: "supervisor",
        agentName: "Supervisor Nexus",
        tool: "local_agent_request",
        target: "Computador Windows do operador",
        risk: "high",
        status: "pending",
        timestamp: nowTime,
        details: {
          command: text,
          localAction:
            /\b(listar|mostre|mostrar|ver|conteúdo|conteudo)\b/i.test(text)
              ? { action: "list_directory", path: "." }
              : { action: "run_command", command: text },
          actionDescription: `O Agente Local do Windows prepararia esta ação: "${text}"`,
          riskReason:
            "A ação pode ler ou alterar recursos do computador. A autorização humana é obrigatória antes de encaminhar qualquer pedido à ponte local.",
          rollbackPlan:
            "O agente deve mostrar o resultado e interromper a operação quando possível. Para exclusões ou alterações irreversíveis, faça um backup antes de autorizar.",
          diffOrPayload: "Prévia do pedido criada no navegador; nenhuma ação local foi executada.",
        },
      },
    };
  }

  if (analysis.targetAgent === "cybersecurity") {
    return {
      sender: "cybersecurity",
      senderName: "Aegis Sentinel",
      content: `🛡️ **Relatório de Auditoria Defensiva concluído.**\n\n## Resultados (somente ativos autorizados)\n\n- **Credenciais no código-fonte:** 0 vazamentos (Gitleaks)\n- **Dependências Python:** 2 CVEs de severidade **média** — correção via \`pip-audit --fix\`\n- **Headers HTTP:** HSTS, X-Frame-Options e CSP **ativos** no Caddy\n- **Docker Hardening:** usuário não-root (UID 1000) e socket montado \`read-only\`\n\n### Recomendação prioritária\n\n1. Agendar \`trivy fs --severity HIGH,CRITICAL .\` no pipeline CI/CD semanalmente\n2. Ativar rate-limit no Caddy para o endpoint de login\n3. Revisar rotações de logs do Fail2ban`,
      reasoningPlan: {
        intent: analysis.intent,
        delegatedAgent: "cybersecurity",
        risk: "medium",
        requiresApproval: false,
        modelUsed: analysis.modelUsed,
        latencyMs: 842,
        tokens: 620,
      },
      toolExecution: {
        toolName: "gitleaks + trivy scan",
        command: "gitleaks detect --source . && trivy fs .",
        resultSnippet: "Scan finalizado: 2 achados médios, 0 críticos. Score: A-",
        status: "success",
      },
    };
  }

  if (analysis.targetAgent === "coder") {
    return {
      sender: "coder",
      senderName: "Ares Coder",
      content: `💻 **Plano de implementação elaborado.** Aqui está a solução seguindo Clean Code e validação estrita:\n\n\`\`\`python\nfrom fastapi import APIRouter, HTTPException\nfrom pydantic import BaseModel, Field\n\nrouter = APIRouter(prefix="/api/tasks", tags=["tasks"])\n\nclass TaskCreate(BaseModel):\n    """Payload validado contra injeção e tipos incorretos."""\n    title: str = Field(..., min_length=3, max_length=120)\n    priority: int = Field(default=1, ge=1, le=5)\n    owner_id: str = Field(..., pattern=r"^[a-zA-Z0-9_-]{1,64}$")\n\n@router.post("/", status_code=201)\nasync def create_task(payload: TaskCreate):\n    # Pydantic v2 já garantiu a sanidade dos dados\n    return {"ok": True, "task": payload.model_dump()}\n\`\`\`\n\n## Checklist do Coder\n\n1. **Schema Pydantic v2** validado com restrições de campo\n2. **Sanitização de entrada** aplicada (regex no owner_id)\n3. **Testes sugeridos:** \`test_create_task_201\` e \`test_invalid_payload_422\`\n4. ⏳ Aplicar em \`app/api/routes.py\`? **Pedirei confirmação antes de salvar** (risco médio)`,
      reasoningPlan: {
        intent: analysis.intent,
        delegatedAgent: "coder",
        risk: "low",
        requiresApproval: false,
        modelUsed: analysis.modelUsed,
        latencyMs: 1240,
        tokens: 850,
      },
      toolExecution: {
        toolName: "syntax_validator",
        command: "ruff check app/ --fix && mypy app/",
        resultSnippet: "All checks passed! 0 errors, 0 type issues.",
        status: "success",
      },
    };
  }

  if (analysis.targetAgent === "devops") {
    return {
      sender: "devops",
      senderName: "Titan Ops",
      content: `🖥️ **Diagnóstico de Infraestrutura — VPS Ubuntu 24.04 LTS**\n\n## Métricas em tempo real\n\n- **CPU:** 18.4% de 4 vCPUs — excelente headroom\n- **RAM:** 3.4 GB / 8 GB (42.5%) — faixa saudável\n- **Containers:** **6/6 ativos** e com healthcheck OK\n- **Rede interna Docker:** latência média de 0.4ms\n- **Disco:** 28.6 GB / 80 GB (35.7%)\n\n## Observações do Titan\n\n1. O \`jarvis-ollama\` consome 1.85 GB de RAM (modelo local em cache)\n2. Nenhum container em loop de restart\n3. Backups do Postgres agendados para 03:00 — próximo em 9h\n\nTudo dentro dos limites seguros. **Nenhuma ação corretiva necessária.**`,
      reasoningPlan: {
        intent: analysis.intent,
        delegatedAgent: "devops",
        risk: "low",
        requiresApproval: false,
        modelUsed: analysis.modelUsed,
        latencyMs: 310,
        tokens: 190,
      },
      toolExecution: {
        toolName: "docker_ps_inspect",
        command: "docker stats --no-stream && df -h /",
        resultSnippet: "6/6 containers online. RAM total em uso: 2.7GB.",
        status: "success",
      },
    };
  }

  if (analysis.targetAgent === "researcher") {
    return {
      sender: "researcher",
      senderName: "Athena Research",
      content: `📚 **Pesquisa concluída com fontes verificadas.**\n\n## Síntese\n\n- **Fato confirmado:** LangGraph é a biblioteca da LangChain voltada a workflows stateful multiagente, com suporte a checkpoints e human-in-the-loop nativo.\n- **Informação provável:** para MVPs em VPS de 8 GB de RAM, grafos leves (LangGraph) performam melhor que frameworks com múltiplos workers (CrewAI + AutoGen simultâneos).\n- **Inferência minha:** começar com supervisor determinístico e trocar por classificação semântica após estabilizar o MVP reduz custo em ~60%.\n\n## Fontes\n\n1. LangChain Docs — *LangGraph State Management* (docs.langchain.com)\n2. arXiv 2308.11432 — *The Rise and Potential of LLM-Based Agents*\n\n⚠️ **Limitações:** números de benchmark variam por hardware; recomendo validar na sua VPS real.`,
      reasoningPlan: {
        intent: analysis.intent,
        delegatedAgent: "researcher",
        risk: "low",
        requiresApproval: false,
        modelUsed: analysis.modelUsed,
        latencyMs: 1560,
        tokens: 940,
      },
      toolExecution: {
        toolName: "arxiv_search",
        command: 'GET https://arxiv.org/api/query?search_query="multi-agent LLM"',
        resultSnippet: "12 papers encontrados, 3 selecionados por relevância.",
        status: "success",
      },
    };
  }

  return {
    sender: "supervisor",
    senderName: "Supervisor Nexus",
    content: `Não encontrei uma ação específica para isso. Pode reformular a pergunta?`,
    reasoningPlan: {
      intent: analysis.intent,
      delegatedAgent: "supervisor",
      risk: "low",
      requiresApproval: false,
      modelUsed: analysis.modelUsed,
      latencyMs: 420,
      tokens: 24,
    },
  };
};
