export type AgentId = 
  | "supervisor"
  | "coder"
  | "cybersecurity"
  | "researcher"
  | "devops"
  | "document"
  | "automation";

export type RiskLevel = "low" | "medium" | "high";

export type TaskStatus = "pending" | "approved" | "rejected" | "executing" | "completed" | "failed";

export type ModelProvider = "ollama_local" | "groq_fast" | "claude_premium" | "openai_gpt" | "gemini_pro";

export interface AgentMeta {
  id: AgentId;
  name: string;
  role: string;
  avatar: string;
  color: string;
  badge: string;
  description: string;
  specialties: string[];
  defaultModel: string;
  status: "idle" | "thinking" | "executing" | "awaiting_approval";
}

export interface ChatMessage {
  id: string;
  sender: "user" | "supervisor" | "coder" | "cybersecurity" | "researcher" | "devops" | "system";
  senderName: string;
  avatar?: string;
  content: string;
  timestamp: string;
  viaVoice?: boolean;
  reasoningPlan?: {
    intent: string;
    delegatedAgent: AgentId;
    risk: RiskLevel;
    requiresApproval: boolean;
    modelUsed: string;
    latencyMs: number;
    tokens: number;
  };
  toolExecution?: {
    toolName: string;
    command?: string;
    target?: string;
    resultSnippet?: string;
    status: "success" | "pending_approval" | "blocked" | "running";
  };
  feedback?: "positive" | "negative";
  approvalRequestId?: string;
}

export interface LocalAgentAction {
  action: "read_file" | "write_file" | "list_directory" | "open_application" | "close_application" | "run_command" | "download_file";
  path?: string;
  content?: string;
  application?: string;
  args?: string[];
  command?: string;
  workingDirectory?: string;
  url?: string;
  destination?: string;
}

export interface ApprovalRequest {
  id: string;
  title: string;
  agentId: AgentId;
  agentName: string;
  tool: string;
  target: string;
  risk: RiskLevel;
  status: "pending" | "approved" | "rejected";
  timestamp: string;
  details: {
    command?: string;
    localAction?: LocalAgentAction;
    fileAffected?: string;
    actionDescription: string;
    riskReason: string;
    diffOrPayload?: string;
    rollbackPlan: string;
  };
  approvedAt?: string;
  notes?: string;
}

export interface SystemTelemetry {
  cpuUsage: number; // percentage
  ramUsage: {
    usedGb: number;
    totalGb: number;
    percent: number;
  };
  storage: {
    usedGb: number;
    totalGb: number;
    percent: number;
  };
  uptime: string;
  vpsIp: string;
  osName: string;
  activeContainers: number;
  monthlyCostEstimate: number;
  tokensToday: number;
}

export interface DockerContainer {
  id: string;
  name: string;
  image: string;
  status: "running" | "restarting" | "stopped";
  port: string;
  cpu: string;
  memory: string;
  restartPolicy: string;
}

export interface MemoryItem {
  id: string;
  type: "session" | "semantic" | "episodic" | "preference";
  title: string;
  content: string;
  category: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  confidence: number;
  expiresAt?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  agent: AgentId | "user" | "system";
  action: string;
  details: string;
  risk: RiskLevel;
  status: "success" | "warning" | "danger";
}
