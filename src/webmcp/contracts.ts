import type {
  OperationCommitResult,
  OperationRisk,
} from '../domain/operations/types';

export const DECLARATIVE_TOOL_NAMES = [
  'filter_transactions_form',
  'choose_statement_period',
  'compare_report_periods',
  'filter_agent_audit',
] as const;

export type DeclarativeToolName = (typeof DECLARATIVE_TOOL_NAMES)[number];

export interface JSONSchema {
  type?: 'object' | 'string' | 'integer' | 'number' | 'boolean' | 'null';
  description?: string;
  properties?: Record<string, JSONSchema>;
  required?: string[];
  additionalProperties?: boolean;
  enum?: Array<string | number | boolean | null>;
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  anyOf?: JSONSchema[];
}

export interface WebMCPToolAnnotations {
  readOnlyHint?: boolean;
  untrustedContentHint?: boolean;
}

export interface WebMCPTool {
  name: string;
  description: string;
  inputSchema: JSONSchema;
  annotations?: WebMCPToolAnnotations;
  execute(
    args: Record<string, unknown>,
    context: { signal: AbortSignal },
  ): Promise<string>;
}

export interface ModelContext {
  registerTool(
    tool: WebMCPTool,
    options: { signal: AbortSignal },
  ): void | Promise<void>;
}

export type ToolRunner = (
  toolName: string,
  args: Record<string, unknown>,
  signal: AbortSignal,
) => Promise<string>;

export interface ConfirmableAction {
  id: string;
  operation: string;
  title: string;
  risk: OperationRisk;
  readOnly: boolean;
  requiresTypedConfirmation: boolean;
  disclosure: string[];
  consequences: string[];
  expectedVersion: number;
  idempotencyKey: string;
  commit(): OperationCommitResult;
}

export type ConfirmationCancelReason =
  | 'aborted'
  | 'expired'
  | 'lock'
  | 'logout'
  | 'navigation'
  | 'teardown'
  | 'tool-cancel'
  | 'user-cancelled';

export type TrustPredicate = (event: Event) => boolean;
