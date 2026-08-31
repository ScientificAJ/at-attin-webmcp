import {
  ArrowRight,
  ShieldCheck,
  X,
} from '@phosphor-icons/react';
import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
} from 'react';
import type {
  OperationCommitSuccess,
  PreparedOperation,
} from '../domain/operations/types';
import { OperationDetails } from './OperationDetails';

interface ManualActionReviewProps {
  ariaLabel: string;
  prepared: PreparedOperation;
  successMessage: string;
  onCancel(): void;
  onComplete?(result: OperationCommitSuccess): void;
}

export function ManualActionReview({
  ariaLabel,
  prepared,
  successMessage,
  onCancel,
  onComplete,
}: ManualActionReviewProps) {
  const [typedValue, setTypedValue] = useState('');
  const [message, setMessage] = useState('');
  const [done, setDone] = useState(false);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setTypedValue('');
    setMessage('');
    setDone(false);
    confirmRef.current?.focus();
  }, [prepared.id]);

  const confirm = (event: MouseEvent<HTMLButtonElement>) => {
    if (!event.isTrusted && import.meta.env.MODE !== 'test') {
      setMessage('Use a direct, trusted click to confirm this task.');
      return;
    }
    if (prepared.requiresTypedConfirmation && typedValue !== 'YES') {
      setMessage('Type YES exactly before confirming this critical task.');
      return;
    }
    const result = prepared.commit();
    if (!result.ok) {
      const descriptions = {
        duplicate: 'This confirmation was already used.',
        stale: 'The account changed. Review the task again.',
        invalid: 'The task is no longer valid.',
        persistence: 'The task could not be saved on this device.',
      } as const;
      setMessage(descriptions[result.code]);
      return;
    }
    setDone(true);
    setMessage(successMessage);
    onComplete?.(result);
  };

  return (
    <section
      aria-label={ariaLabel}
      className="action-review obsidian-surface"
      role="region"
    >
      <header className="action-review__header">
        <p className="eyebrow">Prepared for your approval</p>
        <h2>{prepared.title}</h2>
        <p>{prepared.readOnly ? 'Review exactly what will be shared.' : 'Nothing happens until you confirm.'}</p>
      </header>
      <OperationDetails
        compact
        consequences={prepared.consequences}
        disclosure={prepared.disclosure}
      />
      <div className="action-review__safeguard">
        <ShieldCheck aria-hidden="true" weight="regular" />
        <p>One task, one confirmation. This approval cannot be reused.</p>
      </div>
      {prepared.requiresTypedConfirmation && !done ? (
        <label className="action-review__typed">
          <span>Type YES to confirm this critical task</span>
          <input
            autoComplete="off"
            maxLength={3}
            onChange={(event) => setTypedValue(event.currentTarget.value)}
            value={typedValue}
          />
        </label>
      ) : null}
      {message ? (
        <p className="action-review__status" role={done ? 'status' : 'alert'}>{message}</p>
      ) : null}
      {!done ? (
        <div className="action-review__actions">
          <button
            className="signal-action"
            disabled={prepared.requiresTypedConfirmation && typedValue !== 'YES'}
            onClick={confirm}
            ref={confirmRef}
            type="button"
          >
            <ArrowRight aria-hidden="true" weight="regular" />
            <span>Yes, confirm</span>
          </button>
          <button className="outline-action" onClick={onCancel} type="button">
            <X aria-hidden="true" weight="regular" />
            <span>No, cancel</span>
          </button>
        </div>
      ) : (
        <button className="outline-action" onClick={onCancel} type="button">
          <ArrowRight aria-hidden="true" weight="regular" />
          <span>Done</span>
        </button>
      )}
    </section>
  );
}
