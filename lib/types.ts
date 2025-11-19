/**
 * Shared TypeScript types for iris-prime-api
 *
 * Defines core data structures for telemetry, signatures, and reflexions
 */

export interface TelemetryEvent {
  projectId: string;
  agentId?: string;
  sessionId?: string;
  event: string;
  metadata?: Record<string, any>;
  timestamp?: string;
}

export interface SignatureEvent {
  projectId: string;
  signatureName: string;
  signature: string;
  inputFields: Array<{
    name: string;
    type: string;
    description?: string;
  }>;
  outputFields: Array<{
    name: string;
    type: string;
    description?: string;
  }>;
  metadata?: Record<string, any>;
  timestamp?: string;
}

export interface ReflexionEvent {
  projectId: string;
  agentId?: string;
  sessionId?: string;
  input: string;
  output: string;
  verdict: 'correct' | 'incorrect' | 'partial';
  reasoning?: string;
  metadata?: Record<string, any>;
  timestamp?: string;
}

export interface ConsensusEvent {
  projectId: string;
  consensusId: string;
  agentId?: string;
  vote: 'approve' | 'reject' | 'abstain';
  reasoning?: string;
  metadata?: Record<string, any>;
  timestamp?: string;
}

export interface ProjectConfig {
  id: string;
  name: string;
  apiKey: string;
  apiKeyHash: string;
  settings?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface AuthContext {
  projectId: string;
  projectName?: string;
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
}

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export interface ErrorResponse {
  error: {
    message: string;
    code: string;
    statusCode: number;
    details?: Record<string, any>;
    timestamp: string;
    path?: string;
  };
}

// E2B Code Execution Types
export interface ExecutionResult {
  success: boolean;
  output: any;
  error?: {
    message: string;
    stack?: string;
    name: string;
  };
  logs?: string[];
  executionTime: number;
}

export interface IrisCodeResult extends ExecutionResult {
  metadata: {
    sandboxId?: string;
    projectId?: string;
    sessionId?: string;
    timestamp: string;
  };
}

export interface SandboxConfig {
  apiKey?: string;
  template?: string;
  timeout?: number;
  memoryLimit?: number;
  projectId?: string;
  sessionId?: string;
}

export interface CodeExecutionRequest {
  code: string;
  projectId?: string;
  sessionId?: string;
  context?: Record<string, any>;
  sandboxId?: string;
  language?: 'typescript' | 'javascript' | 'python';
}

export interface CodeExecutionResponse {
  success: boolean;
  result: IrisCodeResult;
  sandboxId?: string;
  timestamp: string;
}

// IRIS Prime Tool Types
export interface PatternDiscoveryConfig {
  minSupport?: number;
  minConfidence?: number;
  maxPatterns?: number;
}

export interface ReflexionEvaluation {
  input: string;
  output: string;
  verdict: 'correct' | 'incorrect' | 'partial';
  reasoning?: string;
}

export interface ConsensusVote {
  consensusId: string;
  agentId: string;
  vote: 'approve' | 'reject' | 'abstain';
  reasoning?: string;
}

export interface TelemetryLog {
  event: string;
  metadata?: Record<string, any>;
  timestamp?: string;
}

export interface PromptTemplate {
  name: string;
  template: string;
  variables?: string[];
  metadata?: Record<string, any>;
}

export interface LineageEntry {
  signature: string;
  input: any;
  output: any;
  timestamp: string;
  parentId?: string;
}

export interface MetricRecord {
  metric: string;
  value: number;
  tags?: Record<string, string>;
  timestamp?: string;
}
