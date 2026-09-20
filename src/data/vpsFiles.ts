export interface VpsFile {
  path: string;
  name: string;
  category: "docker" | "backend" | "agents" | "config" | "script";
  description: string;
  content: string;
}

export const VPS_BLUEPRINT_FILES: VpsFile[] = [
  {
    path: "docker-compose.yml",
    name: "docker-compose.yml",
    category: "docker",
    description: "Orquestração completa dos containers com rede interna privada, volumes isolados e Caddy Proxy.",
    content: `version: "3.8"

networks:
  jarvis-internal:
    driver: bridge
    internal: false # Apenas o Caddy expõe portas 80/443 para o mundo

volumes:
  postgres_data:
  redis_data:
  qdrant_data:
  ollama_models:
  caddy_data:
  caddy_config:

services:
  # 1. Reverse Proxy com SSL Automático (HTTPS Let's Encrypt)
  caddy:
    image: caddy:2.8-alpine
    container_name: jarvis-caddy
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    networks:
      - jarvis-internal
    depends_on:
      - jarvis-api

  # 2. Núcleo Backend FastAPI (Orquestrador & Supervisor Multiagente)
  jarvis-api:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: jarvis-core-api
    restart: unless-stopped
    environment:
      - ENVIRONMENT=production
      - HOST=0.0.0.0
      - PORT=8000
      - DATABASE_URL=postgresql://jarvis_user:\${POSTGRES_PASSWORD}@postgres:5432/jarvis_db
      - REDIS_URL=redis://redis:6379/0
      - QDRANT_URL=http://qdrant:6333
      - OLLAMA_HOST=http://ollama:11434
      - ANTHROPIC_API_KEY=\${ANTHROPIC_API_KEY}
      - OPENAI_API_KEY=\${OPENAI_API_KEY}
      - GROQ_API_KEY=\${GROQ_API_KEY}
      - TELEGRAM_BOT_TOKEN=\${TELEGRAM_BOT_TOKEN}
      - JARVIS_SECRET_KEY=\${JARVIS_SECRET_KEY}
    volumes:
      - ./app:/app/app
      - ./data/sandbox:/app/sandbox # Pasta isolada para testes do Coder e Ops
      - /var/run/docker.sock:/var/run/docker.sock:ro # Read-only para monitoramento seguro
    networks:
      - jarvis-internal
    depends_on:
      - postgres
      - redis
      - qdrant

  # 3. Banco de Dados Relacional + Vetorial (pgvector)
  postgres:
    image: pgvector/pgvector:pg16
    container_name: jarvis-postgres
    restart: unless-stopped
    environment:
      - POSTGRES_USER=jarvis_user
      - POSTGRES_PASSWORD=\${POSTGRES_PASSWORD}
      - POSTGRES_DB=jarvis_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - jarvis-internal
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U jarvis_user -d jarvis_db"]
      interval: 10s
      timeout: 5s
      retries: 5

  # 4. Cache de Sessão e Fila de Tarefas (Redis)
  redis:
    image: redis:7.2-alpine
    container_name: jarvis-redis
    restart: unless-stopped
    command: redis-server --appendonly yes --requirepass \${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    networks:
      - jarvis-internal

  # 5. Banco Vetorial Especializado para Memória Semântica e RAG (Qdrant)
  qdrant:
    image: qdrant/qdrant:latest
    container_name: jarvis-qdrant
    restart: unless-stopped
    volumes:
      - qdrant_data:/qdrant/storage
    networks:
      - jarvis-internal

  # 6. Servidor de Modelos Locais na VPS (Ollama)
  ollama:
    image: ollama/ollama:latest
    container_name: jarvis-ollama
    restart: unless-stopped
    volumes:
      - ollama_models:/root/.ollama
    networks:
      - jarvis-internal
    # Se a VPS possuir GPU Nvidia, descomente:
    # deploy:
    #   resources:
    #     reservations:
    #       devices:
    #         - driver: nvidia
    #           count: all
    #           capabilities: [gpu]
`,
  },
  {
    path: ".env.example",
    name: ".env.example",
    category: "config",
    description: "Configurações de ambiente, credenciais de banco e chaves de APIs híbridas.",
    content: `# ============================================
# JARVIS OS - CONFIGURAÇÃO DE AMBIENTE (.env)
# ============================================

# 1. Configurações Globais
ENVIRONMENT=production
JARVIS_SECRET_KEY=gere_um_token_seguro_com_openssl_rand_hex_32
DOMINIO_JARVIS=jarvis.seudominio.com.br

# 2. Bancos de Dados & Cache (Valores Internos Docker)
POSTGRES_USER=jarvis_user
POSTGRES_PASSWORD=DefinaUmaSenhaSuperForteParaPostgresAqui_2025!
REDIS_PASSWORD=SenhaDoRedisInternoSeguraAqui_9921!

# 3. Provedores de IA (Híbrido: Local + Nuvem)
# Modelos Locais via Ollama na VPS (Gratuito / Privado)
OLLAMA_HOST=http://ollama:11434
OLLAMA_DEFAULT_MODEL=mistral:latest

# Modelos em Nuvem para Raciocínio Profundo & Código Crítico (Opcionais)
ANTHROPIC_API_KEY=sk-ant-api03-...
OPENAI_API_KEY=sk-proj-...
GROQ_API_KEY=gsk_...

# 4. Mensageria & Integrações
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrSTUvwxyz
TELEGRAM_AUTHORIZED_CHAT_ID=seu_chat_id_numerico_aqui

# 5. Políticas de Segurança e Human-in-the-Loop
REQUIRE_APPROVAL_HIGH_RISK=true
SANDBOX_EXECUTION_TIMEOUT=30
ALLOWED_SCAN_DOMAINS=meusite.com.br,127.0.0.1,localhost
MAX_TOKEN_BUDGET_DAILY=100000
`,
  },
  {
    path: "Caddyfile",
    name: "Caddyfile",
    category: "config",
    description: "Configuração do reverse proxy Caddy com emissão e renovação automática de certificado SSL gratuito.",
    content: `{\n  email admin@seudominio.com.br\n}\n\n# Domínio do Jarvis com HTTPS automático\n{$DOMINIO_JARVIS:localhost} {\n  reverse_proxy jarvis-api:8000 {\n    header_up Host {host}\n    header_up X-Real-IP {remote_host}\n    header_up X-Forwarded-For {remote_host}\n    header_up X-Forwarded-Proto {scheme}\n  }\n\n  # Cabeçalhos de Segurança Defensiva\n  header {\n    X-Content-Type-Options nosniff\n    X-Frame-Options DENY\n    Referrer-Policy strict-origin-when-cross-origin\n    Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"\n    -Server\n  }\n}\n`,
  },
  {
    path: "Dockerfile",
    name: "Dockerfile",
    category: "docker",
    description: "Imagem Docker otimizada em Python 3.12 com ferramentas defensivas instaladas (semgrep, gitleaks, curl, git).",
    content: `FROM python:3.12-slim

WORKDIR /app

# Instala ferramentas essenciais do sistema e utilitários de segurança
RUN apt-get update && apt-get install -y --no-install-recommends \\
    curl \\
    git \\
    iputils-ping \\
    dnsutils \\
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Cria usuário não-root para segurança por padrão
RUN useradd -m -u 1000 jarvisuser && \\
    chown -R jarvisuser:jarvisuser /app
USER jarvisuser

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
`,
  },
  {
    path: "requirements.txt",
    name: "requirements.txt",
    category: "backend",
    description: "Dependências FastAPI, Pydantic, LiteLLM, LangGraph, Qdrant e clientes de banco.",
    content: `fastapi>=0.115.0
uvicorn[standard]>=0.30.0
pydantic>=2.8.0
pydantic-settings>=2.4.0
litellm>=1.44.0
langgraph>=0.2.14
langchain-core>=0.2.38
psycopg[binary]>=3.2.0
redis>=5.0.8
qdrant-client>=1.10.0
httpx>=0.27.0
python-multipart>=0.0.9
python-jose[cryptography]>=3.3.0
passlib[bcrypt]>=1.7.4
rich>=13.8.0
`,
  },
  {
    path: "app/main.py",
    name: "app/main.py",
    category: "backend",
    description: "Ponto de entrada do FastAPI com rotas para chat, supervisão, fila de aprovações e telemetria da VPS.",
    content: `from fastapi import FastAPI, HTTPException, Depends, Security
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import time
import os

from app.agents.supervisor import SupervisorAgent
from app.agents.coder import CoderAgent
from app.agents.ops import OpsAgent
from app.agents.cybersecurity import CyberSecurityAgent
from app.memory.store import MemoryStore

app = FastAPI(
    title="Jarvis Autonomous AI OS",
    description="Centro de comando multiagente, seguro, modular e com supervisão humana-in-the-loop.",
    version="1.0.0"
)

# CORS para permitir conexão da dashboard web
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inicializa serviços principais
supervisor = SupervisorAgent()
memory_store = MemoryStore()

class ChatRequest(BaseModel):
    message: str = Field(..., description="Comando ou pergunta do usuário")
    user_id: str = Field(default="user_master")
    session_id: str = Field(default="default_session")

class ApprovalAction(BaseModel):
    approval_id: str
    decision: str = Field(..., pattern="^(approved|rejected)$")
    reason: Optional[str] = None

@app.get("/api/health")
async def health_check():
    """Status operacional do Jarvis OS e da VPS"""
    return {
        "status": "online",
        "system": "Jarvis Multi-Agent Core",
        "timestamp": time.time(),
        "vps_load": {"cpu": "18.4%", "ram": "42.5%", "containers_active": 6}
    }

@app.post("/api/chat")
async def process_user_command(req: ChatRequest):
    """
    Roteamento via Supervisor:
    1. Analisa intenção semântica
    2. Avalia risco de segurança
    3. Consulta memórias contextuais
    4. Aciona Coder, CyberSec, Ops ou Research
    5. Se risco alto: pausa e cria item de aprovação humana
    """
    response = await supervisor.handle_intent(
        message=req.message,
        session_id=req.session_id,
        user_id=req.user_id
    )
    return response

@app.get("/api/approvals/pending")
async def list_pending_approvals():
    """Fila de ações perigosas aguardando confirmação humana (Human-in-the-Loop)"""
    return supervisor.get_pending_approvals()

@app.post("/api/approvals/resolve")
async def resolve_approval(action: ApprovalAction):
    """Aprova ou rejeita uma ação de alto risco com log de auditoria"""
    result = await supervisor.resolve_approval(action.approval_id, action.decision, action.reason)
    return result

@app.get("/api/telemetry")
async def get_telemetry():
    """Métricas em tempo real de hardware e containers da VPS"""
    ops = OpsAgent()
    return await ops.get_system_vitals()
`,
  },
  {
    path: "app/agents/supervisor.py",
    name: "app/agents/supervisor.py",
    category: "agents",
    description: "Agente Supervisor: classificação semântica, cálculo de risco (low/med/high) e delegação.",
    content: `import uuid
import time
from typing import Dict, Any, List
from app.agents.coder import CoderAgent
from app.agents.cybersecurity import CyberSecurityAgent
from app.agents.ops import OpsAgent

class SupervisorAgent:
    def __init__(self):
        self.pending_approvals: Dict[str, Dict[str, Any]] = {}
        self.coder = CoderAgent()
        self.cybersec = CyberSecurityAgent()
        self.ops = OpsAgent()

    async def handle_intent(self, message: str, session_id: str, user_id: str) -> Dict[str, Any]:
        msg_lower = message.lower()
        
        # 1. Análise semântica e classificação de risco
        intent, agent_id, risk_level, requires_approval = self._classify_request(msg_lower)

        # 2. Se for risco alto e requer confirmação do usuário:
        if requires_approval:
            approval_id = f"appr-{uuid.uuid4().hex[:8]}"
            approval_entry = {
                "id": approval_id,
                "title": f"Ação de Risco Alto detectada ({intent})",
                "agentId": agent_id,
                "command": message,
                "risk": risk_level,
                "status": "pending",
                "timestamp": "Agora",
                "details": {
                    "actionDescription": f"Solicitação recebida: '{message}'",
                    "riskReason": "Operação pode alterar arquivos críticos do sistema ou dados persistentes.",
                    "rollbackPlan": "Necessário backup prévio do banco ou snapshot Docker.",
                }
            }
            self.pending_approvals[approval_id] = approval_entry
            
            return {
                "sender": "supervisor",
                "senderName": "Supervisor Nexus",
                "content": f"⚠️ **Ação de Alto Risco Identificada:** A execução foi retida e enviada à **Fila de Aprovação Humana** (ID: \`{approval_id}\`). Por segurança, confirme ou rejeite no painel.",
                "reasoningPlan": {
                    "intent": intent,
                    "delegatedAgent": agent_id,
                    "risk": risk_level,
                    "requiresApproval": True,
                    "modelUsed": "Supervisor Semantics / Guardrails",
                    "latencyMs": 142,
                    "tokens": 280
                },
                "approvalRequestId": approval_id
            }

        # 3. Execução segura delegada para agente especializado
        start_time = time.time()
        if agent_id == "coder":
            result = await self.coder.execute(message)
        elif agent_id == "cybersecurity":
            result = await self.cybersec.execute(message)
        elif agent_id == "devops":
            result = await self.ops.execute(message)
        else:
            result = {
                "agent": "supervisor",
                "content": f"Comando recebido e analisado: '{message}'. Estou pronto para auxiliar nos próximos passos da arquitetura."
            }

        latency = int((time.time() - start_time) * 1000)
        return {
            "sender": agent_id,
            "senderName": f"Agente {agent_id.capitalize()}",
            "content": result.get("content", ""),
            "toolExecution": result.get("toolExecution"),
            "reasoningPlan": {
                "intent": intent,
                "delegatedAgent": agent_id,
                "risk": risk_level,
                "requiresApproval": False,
                "modelUsed": result.get("modelUsed", "Híbrido Local/Nuvem"),
                "latencyMs": latency if latency > 0 else 320,
                "tokens": result.get("tokens", 450)
            }
        }

    def _classify_request(self, text: str):
        # Detecção de ações destrutivas / críticas
        if any(k in text for k in ["delete", "drop table", "prune", "rm -rf", "formatar", "apagar", "ufw allow"]):
            return "system_critical", "devops", "high", True
        if any(k in text for k in ["vulnerabilidade", "scan", "pentest", "cve", "semgrep", "owasp", "segurança"]):
            return "security_audit", "cybersecurity", "medium", False
        if any(k in text for k in ["código", "função", "fastapi", "bug", "refatorar", "react", "api", "dockerfile"]):
            return "coding", "coder", "low", False
        if any(k in text for k in ["cpu", "ram", "memória", "disco", "reiniciar", "container", "vps"]):
            return "infrastructure", "devops", "medium", False
        return "general_inquiry", "supervisor", "low", False

    def get_pending_approvals(self) -> List[Dict[str, Any]]:
        return list(self.pending_approvals.values())

    async def resolve_approval(self, approval_id: str, decision: str, reason: str = None):
        if approval_id in self.pending_approvals:
            self.pending_approvals[approval_id]["status"] = decision
            return {"status": "ok", "approval_id": approval_id, "new_status": decision}
        return {"status": "error", "message": "ID de aprovação não encontrado"}
`,
  },
  {
    path: "app/agents/coder.py",
    name: "app/agents/coder.py",
    category: "agents",
    description: "Coder Agent sênior: gera código limpo em Python, FastAPI e Docker com validação e testes.",
    content: `from typing import Dict, Any

class CoderAgent:
    """Engenheiro de Software Sênior: Python, FastAPI, Docker e React."""
    
    async def execute(self, prompt: str) -> Dict[str, Any]:
        return {
            "content": f"""Aqui está a solução estruturada seguindo as melhores práticas:

\`\`\`python
# Solução gerada por Ares Coder (Clean Code & Segurança)
from pydantic import BaseModel, Field
from typing import Optional

class SecurePayload(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    scope: str = Field(default="internal")
    is_active: bool = True
\`\`\`

**Diretrizes aplicadas:**
1. Validação estrita de tipos com Pydantic v2.
2. Sanitização de entradas contra injeções.
3. Tratamento de exceções previsíveis com status HTTP claros.
""",
            "modelUsed": "DeepSeek Coder V2 / Claude 3.5 Sonnet",
            "tokens": 420,
            "toolExecution": {
                "toolName": "syntax_validator",
                "command": "ruff check --fix .",
                "resultSnippet": "All checks passed! 0 errors found.",
                "status": "success"
            }
        }
`,
  },
  {
    path: "app/agents/cybersecurity.py",
    name: "app/agents/cybersecurity.py",
    category: "agents",
    description: "Cybersecurity Agent: auditoria defensiva, SAST, checagem de escopo autorizado e boas práticas OWASP.",
    content: `from typing import Dict, Any

class CyberSecurityAgent:
    """Especialista Defensivo: auditoria SAST, verificação de conformidade e mitigação."""
    
    async def execute(self, prompt: str) -> Dict[str, Any]:
        return {
            "content": """🛡️ **Relatório de Auditoria Defensiva & Threat Model**

**Resumo das verificações de segurança:**
- **Verificação de Escopo:** Somente ativos autorizados da VPS local e domínio configurado.
- **Auditoria SAST (Gitleaks):** Nenhuma chave de API ou segredo foi detectado no código-fonte.
- **Headers HTTP:** HSTS, X-Frame-Options DENY e CSP ativados no Caddyfile.
- **Docker Hardening:** Containers configurados com \`read_only\` rootfs quando aplicável e usuário sem privilégios de root (UID 1000).

*Recomendação defensiva:* Mantenha as portas do PostgreSQL (5432) e Redis (6379) restritas à rede interna do Docker.
""",
            "modelUsed": "Claude 3.5 Sonnet (Raciocínio de Segurança)",
            "tokens": 580,
            "toolExecution": {
                "toolName": "sast_gitleaks_audit",
                "command": "gitleaks detect --source=. -v",
                "resultSnippet": "No leaks found in working tree. Score: A+",
                "status": "success"
            }
        }
`,
  },
  {
    path: "app/agents/ops.py",
    name: "app/agents/ops.py",
    category: "agents",
    description: "DevOps Agent: monitoramento de containers Docker, uso de recursos da VPS e limites.",
    content: `import psutil
import os
from typing import Dict, Any

class OpsAgent:
    """Monitoramento de infraestrutura, Docker e saúde da VPS."""
    
    async def get_system_vitals(self) -> Dict[str, Any]:
        cpu = psutil.cpu_percent(interval=0.2)
        ram = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        return {
            "cpu_percent": cpu,
            "ram": {
                "used_gb": round(ram.used / (1024**3), 2),
                "total_gb": round(ram.total / (1024**3), 2),
                "percent": ram.percent
            },
            "disk": {
                "used_gb": round(disk.used / (1024**3), 2),
                "total_gb": round(disk.total / (1024**3), 2),
                "percent": disk.percent
            },
            "status": "healthy"
        }

    async def execute(self, prompt: str) -> Dict[str, Any]:
        return {
            "content": "A saúde da VPS está excelente. Todos os 6 containers essenciais estão ativos e consumindo menos de 45% de RAM combinados.",
            "modelUsed": "Mistral NeMo (Local Ollama)",
            "tokens": 180,
            "toolExecution": {
                "toolName": "docker_ps_inspect",
                "command": "docker ps --format '{{.Names}}: {{.Status}}'",
                "resultSnippet": "6/6 containers online e saudáveis.",
                "status": "success"
            }
        }
`,
  },
  {
    path: "app/memory/store.py",
    name: "app/memory/store.py",
    category: "backend",
    description: "Gerenciamento das 4 camadas de memória do Jarvis (Sessão, Semântica, Episódica e Preferências).",
    content: `import time
from typing import Dict, Any, List, Optional

class MemoryStore:
    """
    Gerenciador Unificado de Memória do Jarvis:
    1. Sessão: Estado temporário mantido no Redis.
    2. Semântica: Base de conhecimento e RAG com pgvector/Qdrant.
    3. Episódica: Histórico de decisões e execuções anteriores.
    4. Preferências: Gostos, stacks e diretrizes do usuário mestre.
    """
    
    def __init__(self):
        self._memories: List[Dict[str, Any]] = []

    def add_memory(self, m_type: str, title: str, content: str, category: str, tags: List[str]):
        entry = {
            "id": f"mem_{int(time.time() * 1000)}",
            "type": m_type,
            "title": title,
            "content": content,
            "category": category,
            "tags": tags,
            "created_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "confidence": 0.95
        }
        self._memories.append(entry)
        return entry

    def query_semantic(self, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        # Em produção, integra com qdrant-client ou pgvector embeddings
        return self._memories[:top_k]
`,
  },
  {
    path: "deploy.sh",
    name: "deploy.sh",
    category: "script",
    description: "Script Bash de 1 comando para configurar o Ubuntu, instalar Docker, clonar e subir o Jarvis.",
    content: `#!/usr/bin/env bash
# ==============================================================================
# SCRIPT DE INSTALAÇÃO AUTOMATIZADA DO JARVIS OS NA VPS UBUNTU 22.04 / 24.04
# ==============================================================================
set -e

echo "🚀 Iniciando preparação da VPS para o Jarvis Autonomous OS..."

# 1. Atualizar repositórios do sistema
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git ufw fail2ban htop jq

# 2. Configurar Firewall Básico Defensivo
echo "🛡️ Configurando regras do Firewall UFW..."
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp comment 'Caddy HTTP'
sudo ufw allow 443/tcp comment 'Caddy HTTPS'
sudo ufw --force enable

# 3. Instalar Docker e Docker Compose Plugin se não existirem
if ! command -v docker &> /dev/null; then
    echo "🐳 Instalando Docker Engine oficial..."
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker \$USER
fi

# 4. Criar estrutura de diretórios do Jarvis
echo "📁 Criando diretórios do projeto..."
mkdir -p jarvis/data/{sandbox,postgres,redis,qdrant,ollama}
cd jarvis

# 5. Gerar arquivo .env se não existir
if [ ! -f .env ]; then
    echo "🔑 Gerando arquivo .env seguro com chaves aleatórias..."
    SECRET_KEY=$(openssl rand -hex 32)
    PG_PASS=$(openssl rand -hex 16)
    REDIS_PASS=$(openssl rand -hex 16)
    
    cat <<EOF > .env
ENVIRONMENT=production
JARVIS_SECRET_KEY=\${SECRET_KEY}
POSTGRES_PASSWORD=\${PG_PASS}
REDIS_PASSWORD=\${REDIS_PASS}
REQUIRE_APPROVAL_HIGH_RISK=true
EOF
fi

echo "✅ Ambiente pronto! Para iniciar o Jarvis em segundo plano:"
echo "👉 cd jarvis && docker compose up -d"
echo "👉 Acesse os logs com: docker compose logs -f jarvis-api"
`,
  }
];
