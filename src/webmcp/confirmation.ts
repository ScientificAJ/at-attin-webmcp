import type { OperationCommitResult } from '../domain/operations/types';
import type {
  ConfirmableAction,
  ConfirmationCancelReason,
  TrustPredicate,
} from './contracts';
import {
  createMathChallenge,
  mathChallengeAnswer,
  type MathChallenge,
} from '../security/math-challenge';

const CONFIRMATION_LIFETIME_MS = 90_000;

export interface PendingConfirmationSnapshot {
  status: 'pending';
  actionId: string;
  toolName: string;
  title: string;
  risk: ConfirmableAction['risk'];
  readOnly: boolean;
  requiresTypedConfirmation: boolean;
  mathChallenge: MathChallenge | null;
  disclosure: string[];
  consequences: string[];
  expectedVersion: number;
  expiresAt: string;
}

export type ConfirmationSnapshot =
  | { status: 'idle'; announcement?: string }
  | PendingConfirmationSnapshot;

interface PendingConfirmation {
  prepared: ConfirmableAction;
  actionDigest: string;
  expiresAtMs: number;
  signal: AbortSignal;
  abortListener: () => void;
  timer: ReturnType<typeof setTimeout>;
  resolve: (result: OperationCommitResult) => void;
  reject: (error: Error) => void;
  mathChallenge: MathChallenge | null;
}

interface AuthorizationGrant {
  nonce: number;
  actionDigest: string;
  expectedVersion: number;
  used: boolean;
}

export interface ConfirmationCoordinatorOptions {
  clock?: () => Date;
  trustPredicate?: TrustPredicate;
  mathChallengeFactory?: () => MathChallenge;
}

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, nested]) => `${JSON.stringify(key)}:${stableSerialize(nested)}`)
    .join(',')}}`;
}

function digest(value: unknown): string {
  const serialized = stableSerialize(value);
  let hash = 2166136261;
  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function cancellationAnnouncement(reason: ConfirmationCancelReason): string {
  switch (reason) {
    case 'expired':
      return 'Confirmation expired without sharing or changing anything.';
    case 'navigation':
      return 'Confirmation cancelled because you navigated away.';
    case 'logout':
      return 'Confirmation cancelled because you signed out.';
    case 'lock':
      return 'Confirmation cancelled because Agent Access was locked.';
    case 'aborted':
    case 'tool-cancel':
      return 'Agent confirmation cancelled without sharing or changing anything.';
    case 'teardown':
      return 'Confirmation closed without sharing or changing anything.';
    case 'user-cancelled':
      return 'Confirmation cancelled. Nothing was shared or changed.';
  }
}

export function hasTrustedUserActivation(event: Event): boolean {
  return event.isTrusted === true
    && typeof navigator !== 'undefined'
    && navigator.userActivation?.isActive === true;
}

export class ConfirmationCoordinator {
  private readonly clock: () => Date;
  private readonly trustPredicate: TrustPredicate;
  private readonly mathChallengeFactory: () => MathChallenge;
  private readonly listeners = new Set<() => void>();
  private pending: PendingConfirmation | null = null;
  private snapshot: ConfirmationSnapshot = { status: 'idle' };
  private nonce = 0;

  constructor(options: ConfirmationCoordinatorOptions = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.trustPredicate = options.trustPredicate ?? hasTrustedUserActivation;
    this.mathChallengeFactory = options.mathChallengeFactory ?? createMathChallenge;
  }

  getSnapshot = (): ConfirmationSnapshot => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  request(
    prepared: ConfirmableAction,
    signal: AbortSignal,
  ): Promise<OperationCommitResult> {
    if (this.pending) {
      return Promise.reject(new Error('agent-action-already-pending'));
    }
    if (signal.aborted) {
      return Promise.reject(new Error('confirmation-aborted'));
    }

    const createdAt = this.clock().getTime();
    const expiresAtMs = createdAt + CONFIRMATION_LIFETIME_MS;
    const actionDigest = digest({
      id: prepared.id,
      operation: prepared.operation,
      expectedVersion: prepared.expectedVersion,
      idempotencyKey: prepared.idempotencyKey,
    });
    const mathChallenge = prepared.requiresTypedConfirmation
      ? this.mathChallengeFactory()
      : null;

    return new Promise<OperationCommitResult>((resolve, reject) => {
      const abortListener = () => this.cancel('aborted');
      const timer = setTimeout(() => this.cancel('expired'), CONFIRMATION_LIFETIME_MS);
      this.pending = {
        prepared,
        actionDigest,
        expiresAtMs,
        signal,
        abortListener,
        timer,
        resolve,
        reject,
        mathChallenge,
      };
      signal.addEventListener('abort', abortListener, { once: true });
      this.snapshot = {
        status: 'pending',
        actionId: prepared.id,
        toolName: prepared.operation,
        title: prepared.title,
        risk: prepared.risk,
        readOnly: prepared.readOnly,
        requiresTypedConfirmation: prepared.requiresTypedConfirmation,
        mathChallenge,
        disclosure: [...prepared.disclosure],
        consequences: [...prepared.consequences],
        expectedVersion: prepared.expectedVersion,
        expiresAt: new Date(expiresAtMs).toISOString(),
      };
      this.notify();
    });
  }

  approve(event: Event, typedValue?: string, mathAnswer?: number): void {
    const pending = this.pending;
    if (!pending) throw new Error('no-pending-confirmation');
    if (!this.trustPredicate(event)) {
      throw new Error('trusted-user-activation-required');
    }
    if (pending.prepared.requiresTypedConfirmation && typedValue !== 'YES') {
      throw new Error('type-YES-to-confirm');
    }
    if (pending.mathChallenge
      && mathAnswer !== mathChallengeAnswer(pending.mathChallenge)) {
      throw new Error('solve-math-challenge-to-confirm');
    }
    if (this.clock().getTime() >= pending.expiresAtMs) {
      this.cancel('expired');
      return;
    }

    const authorization: AuthorizationGrant = {
      nonce: ++this.nonce,
      actionDigest: pending.actionDigest,
      expectedVersion: pending.prepared.expectedVersion,
      used: false,
    };
    this.clearPending(
      pending,
      'Confirmation accepted. At Attin is completing the prepared action.',
    );
    this.consumeAuthorization(pending, authorization);
  }

  cancel(reason: ConfirmationCancelReason = 'user-cancelled'): void {
    const pending = this.pending;
    if (!pending) return;
    this.clearPending(pending, cancellationAnnouncement(reason));
    const status = reason === 'expired' ? 'expired' : reason;
    pending.reject(new Error(`confirmation-${status}`));
  }

  dispose(): void {
    this.cancel('teardown');
    this.listeners.clear();
  }

  private consumeAuthorization(
    pending: PendingConfirmation,
    authorization: AuthorizationGrant,
  ): void {
    if (authorization.used
      || authorization.nonce <= 0
      || authorization.actionDigest !== pending.actionDigest
      || authorization.expectedVersion !== pending.prepared.expectedVersion) {
      pending.reject(new Error('invalid-confirmation-authorization'));
      return;
    }
    authorization.used = true;
    try {
      const result = pending.prepared.commit();
      if (!result.ok) {
        const message = result.code === 'stale'
          ? 'stale-preview'
          : `operation-${result.code}`;
        pending.reject(new Error(message));
        return;
      }
      pending.resolve(result);
    } catch (error) {
      pending.reject(error instanceof Error ? error : new Error('operation-commit-failed'));
    }
  }

  private clearPending(pending: PendingConfirmation, announcement?: string): void {
    if (this.pending !== pending) return;
    clearTimeout(pending.timer);
    pending.signal.removeEventListener('abort', pending.abortListener);
    this.pending = null;
    this.snapshot = { status: 'idle', ...(announcement ? { announcement } : {}) };
    this.notify();
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }
}
