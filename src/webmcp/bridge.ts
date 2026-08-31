import type { AgentAction, AuditEvent } from '../domain/models';
import {
  isOperationName,
  prepareOperation,
  type Clock,
  type OperationCommitResult,
} from '../domain/operations/types';
import type { BankStore } from '../domain/store';
import {
  DECLARATIVE_TOOL_NAMES,
  type ConfirmableAction,
  type ConfirmationCancelReason,
  type DeclarativeToolName,
} from './contracts';
import { ConfirmationCoordinator } from './confirmation';
import {
  validateDeclarativeArgs,
  validateToolArgs,
} from './schemas';

const MAX_OUTPUT_CHARACTERS = 1_499;

export interface ToolBridgeOptions {
  clock?: Clock;
}

function compactValue(
  value: unknown,
  arrayLimit: number,
  stringLimit: number,
  depth = 0,
): unknown {
  if (typeof value === 'string') {
    return value.length <= stringLimit
      ? value
      : `${value.slice(0, Math.max(1, stringLimit - 1))}…`;
  }
  if (value === null || typeof value !== 'object') return value;
  if (depth >= 5) return '[bounded]';
  if (Array.isArray(value)) {
    const items = value.slice(0, arrayLimit).map((item) => compactValue(
      item,
      arrayLimit,
      stringLimit,
      depth + 1,
    ));
    if (value.length > arrayLimit) {
      items.push({ omittedItems: value.length - arrayLimit });
    }
    return items;
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .slice(0, 24)
      .map(([key, nested]) => [
        key,
        compactValue(nested, arrayLimit, stringLimit, depth + 1),
      ]),
  );
}

function boundedJson(payload: Record<string, unknown>): string {
  for (const [arrayLimit, stringLimit] of [[6, 160], [4, 120], [2, 80], [1, 48]]) {
    const candidate = JSON.stringify(compactValue(payload, arrayLimit, stringLimit));
    if (candidate.length <= MAX_OUTPUT_CHARACTERS) return candidate;
  }
  const data = payload.data;
  const summary = Array.isArray(data)
    ? { kind: 'array', itemCount: data.length }
    : data && typeof data === 'object'
      ? { kind: 'object', fields: Object.keys(data as Record<string, unknown>).slice(0, 12) }
      : { kind: typeof data };
  return JSON.stringify({
    status: payload.status,
    tool: payload.tool,
    operationId: payload.operationId,
    stateVersion: payload.stateVersion,
    truncated: true,
    data: summary,
  });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'webmcp-operation-failed';
}

function outcomeFor(message: string): {
  actionStatus: AgentAction['status'];
  auditOutcome: AuditEvent['outcome'];
} {
  if (message === 'confirmation-expired') {
    return { actionStatus: 'expired', auditOutcome: 'cancelled' };
  }
  if (message.startsWith('confirmation-')) {
    return { actionStatus: 'cancelled', auditOutcome: 'cancelled' };
  }
  return { actionStatus: 'cancelled', auditOutcome: 'rejected' };
}

function isDeclarativeToolName(value: string): value is DeclarativeToolName {
  return DECLARATIVE_TOOL_NAMES.includes(value as DeclarativeToolName);
}

function wrapRead(
  toolName: DeclarativeToolName,
  title: string,
  prepared: ConfirmableAction,
  disclosure: string[],
  transform: (data: unknown) => unknown = (data) => data,
): ConfirmableAction {
  return {
    ...prepared,
    id: `prepared-${toolName}-${prepared.id.replace(/^prepared-/, '')}`,
    operation: toolName,
    title,
    risk: 'read',
    readOnly: true,
    requiresTypedConfirmation: false,
    disclosure,
    consequences: ['Return the selected view without changing banking state.'],
    idempotencyKey: `declarative-${toolName}-${prepared.id}`,
    commit(): OperationCommitResult {
      const result = prepared.commit();
      if (!result.ok) return result;
      return { ...result, data: transform(result.data) };
    },
  };
}

export class ToolBridge {
  private readonly clock: Clock;

  constructor(
    private readonly store: BankStore,
    private readonly coordinator: ConfirmationCoordinator,
    options: ToolBridgeOptions = {},
  ) {
    this.clock = options.clock ?? (() => new Date());
  }

  async run(
    toolName: string,
    args: Record<string, unknown>,
    signal: AbortSignal,
  ): Promise<string> {
    const prepared = isOperationName(toolName)
      ? prepareOperation(
        this.store,
        toolName,
        validateToolArgs(toolName, args),
        this.clock,
      )
      : isDeclarativeToolName(toolName)
        ? this.prepareDeclarative(toolName, validateDeclarativeArgs(toolName, args))
        : null;
    if (!prepared) throw new Error(`Unsupported WebMCP tool: ${toolName}`);
    try {
      const result = await this.coordinator.request(prepared, signal);
      if (!result.ok) throw new Error(`operation-${result.code}`);
      this.recordOutcome(prepared, 'completed', 'success');
      return boundedJson({
        status: 'completed',
        tool: toolName,
        operationId: prepared.id,
        stateVersion: this.store.getState().stateVersion,
        ...(result.data === undefined ? {} : { data: result.data }),
      });
    } catch (error) {
      const message = errorMessage(error);
      // Recording a rejected concurrent request would change the state version
      // underneath the task that already owns the confirmation boundary.
      if (message !== 'agent-action-already-pending') {
        const { actionStatus, auditOutcome } = outcomeFor(message);
        this.recordOutcome(prepared, actionStatus, auditOutcome);
      }
      throw error;
    }
  }

  cancel(reason: ConfirmationCancelReason): void {
    this.coordinator.cancel(reason);
  }

  private prepareDeclarative(
    toolName: DeclarativeToolName,
    args: Record<string, unknown>,
  ): ConfirmableAction {
    switch (toolName) {
      case 'filter_transactions_form': {
        const prepared = prepareOperation(
          this.store,
          'search_transactions',
          args,
          this.clock,
        );
        return wrapRead(
          toolName,
          'Share filtered transaction activity',
          prepared,
          ['Transactions matching the visible filter fields.'],
        );
      }
      case 'choose_statement_period': {
        const prepared = prepareOperation(this.store, 'search_transactions', {
          accountId: args.accountId,
          from: args.from,
          to: args.to,
          limit: 100,
        }, this.clock);
        return wrapRead(
          toolName,
          'Share the selected statement period',
          prepared,
          ['Transactions for the selected account and statement dates.'],
        );
      }
      case 'compare_report_periods': {
        const account = args.accountId === undefined ? {} : { accountId: args.accountId };
        const current = prepareOperation(this.store, 'get_spending_summary', {
          ...account,
          from: args.currentFrom,
          to: args.currentTo,
        }, this.clock);
        const previous = prepareOperation(this.store, 'get_spending_summary', {
          ...account,
          from: args.previousFrom,
          to: args.previousTo,
        }, this.clock);
        return {
          id: `prepared-${toolName}-${current.id.slice(-8)}-${previous.id.slice(-8)}`,
          operation: toolName,
          title: 'Share a two-period spending comparison',
          risk: 'read',
          readOnly: true,
          requiresTypedConfirmation: false,
          disclosure: ['Spending totals and categories for both selected periods.'],
          consequences: ['Return one comparison without changing banking state.'],
          expectedVersion: current.expectedVersion,
          idempotencyKey: `declarative-${toolName}-${current.id}-${previous.id}`,
          commit(): OperationCommitResult {
            const currentResult = current.commit();
            if (!currentResult.ok) return currentResult;
            const previousResult = previous.commit();
            if (!previousResult.ok) return previousResult;
            return {
              ok: true,
              state: previousResult.state,
              data: {
                current: currentResult.data,
                previous: previousResult.data,
              },
            };
          },
        };
      }
      case 'filter_agent_audit': {
        const prepared = prepareOperation(this.store, 'get_agent_audit', {
          limit: args.limit ?? 50,
        }, this.clock);
        const outcome = args.outcome;
        const query = typeof args.query === 'string'
          ? args.query.toLocaleLowerCase('en-US')
          : '';
        return wrapRead(
          toolName,
          'Share filtered agent audit activity',
          prepared,
          ['Safe audit entries matching the visible filter fields.'],
          (data) => Array.isArray(data)
            ? data.filter((entry) => {
              if (!entry || typeof entry !== 'object') return false;
              const audit = entry as Record<string, unknown>;
              const searchable = `${audit.eventType ?? ''} ${audit.safeDetail ?? ''}`
                .toLocaleLowerCase('en-US');
              return (outcome === undefined || audit.outcome === outcome)
                && (!query || searchable.includes(query));
            })
            : [],
        );
      }
    }
  }

  private recordOutcome(
    prepared: ConfirmableAction,
    status: AgentAction['status'],
    auditOutcome: AuditEvent['outcome'],
  ): void {
    const now = this.clock().toISOString();
    const idempotencyKey = `webmcp-audit-${prepared.id}-${status}`;
    this.store.transact(
      this.store.getState().stateVersion,
      idempotencyKey,
      (draft) => {
        const completed = status === 'completed';
        draft.agentActions.push({
          id: `agent-${prepared.id}-${status}`,
          tool: prepared.operation,
          argumentsDigest: prepared.id.replace(/^prepared-/, ''),
          riskLevel: prepared.risk,
          preview: [...prepared.disclosure, ...prepared.consequences],
          status,
          createdAt: now,
          confirmedAt: completed ? now : null,
          completedAt: completed ? now : null,
        });
        draft.audit.push({
          id: `audit-agent-${prepared.id}-${status}`,
          actor: 'agent',
          eventType: prepared.operation,
          target: prepared.id,
          outcome: auditOutcome,
          timestamp: now,
          safeDetail: completed
            ? 'At Attin confirmation completed the prepared action.'
            : `Prepared action ended: ${status}.`,
        });
      },
    );
  }
}
