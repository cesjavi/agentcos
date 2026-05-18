export type AgentRole = 'planner' | 'executor' | 'reviewer' | 'optimizer' | 'memory';

export interface Project {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  githubUrl?: string;
  metadata?: {
    owner: string;
    branch: string;
    stars: number;
  };
  createdAt: any;
  updatedAt: any;
}

export type AgentStatus = 'online' | 'offline' | 'error';

export interface Agent {
  id: string;
  projectId: string;
  name: string;
  role: AgentRole;
  instructions: string;
  status?: AgentStatus;
  modelConfig: {
    model: string;
    temperature: number;
    maxOutputTokens?: number;
  };
  activePromptVersionId?: string;
  createdAt: any;
}

export interface PromptVersion {
  id: string;
  agentId: string;
  content: string;
  versionNumber: number;
  performanceScore: number;
  changes: string;
  createdAt: any;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  input: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  currentExecutionId?: string;
  createdAt: any;
}

export interface Execution {
  id: string;
  taskId: string;
  promptVersionId?: string;
  status: string;
  result: string;
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cost: number;
  startedAt: any;
  finishedAt: any;
}

export interface ExecutionLog {
  id: string;
  executionId: string;
  agentId: string;
  promptVersionId?: string;
  step: string;
  content: string;
  timestamp: any;
  type: 'info' | 'result' | 'error' | 'prompt';
}

export interface Feedback {
  id: string;
  executionId?: string;
  agentId?: string;
  userId: string;
  rating: number;
  comment: string;
  corrections?: string;
  isApproved?: boolean;
  createdAt: any;
}

export interface Memory {
  id: string;
  projectId: string;
  content: string;
  tags: string[];
  type: 'preference' | 'error_fix' | 'success_pattern' | 'rule' | 'manual_commit' | 'task_result';
  useCount?: number;
  lastUsedAt?: any;
  isPinned?: boolean;
  createdAt: any;
}
