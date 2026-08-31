import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type MouseEvent,
} from 'react';
import type { ConfirmationCoordinator } from '../webmcp/confirmation';

export interface ConfirmationDialogProps {
  coordinator: ConfirmationCoordinator;
}

export function ConfirmationDialog({ coordinator }: ConfirmationDialogProps) {
  const snapshot = useSyncExternalStore(
    coordinator.subscribe,
    coordinator.getSnapshot,
    coordinator.getSnapshot,
  );
  const dialogRef = useRef<HTMLElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const typedRef = useRef<HTMLInputElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const [typedValue, setTypedValue] = useState('');
  const [error, setError] = useState('');
  const actionId = snapshot.status === 'pending' ? snapshot.actionId : '';

  useEffect(() => {
    setTypedValue('');
    setError('');
    if (snapshot.status !== 'pending') return;
    restoreFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const target = snapshot.requiresTypedConfirmation
      ? typedRef.current
      : confirmRef.current;
    target?.focus();

    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = [...dialog.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), [href], [tabindex]:not([tabindex="-1"])',
      )];
      if (focusable.length === 0) return;
      const current = focusable.indexOf(document.activeElement as HTMLElement);
      const next = event.shiftKey
        ? (current <= 0 ? focusable.length - 1 : current - 1)
        : (current < 0 || current === focusable.length - 1 ? 0 : current + 1);
      event.preventDefault();
      focusable[next]?.focus();
    };
    document.addEventListener('keydown', trapFocus);
    return () => {
      document.removeEventListener('keydown', trapFocus);
      const restoreTarget = restoreFocusRef.current;
      restoreFocusRef.current = null;
      if (restoreTarget?.isConnected) restoreTarget.focus();
    };
  }, [actionId, snapshot.status, snapshot.status === 'pending'
    ? snapshot.requiresTypedConfirmation
    : false]);

  if (snapshot.status !== 'pending') {
    return snapshot.announcement ? (
      <p aria-live="polite" className="confirmation-status" role="status">
        {snapshot.announcement}
      </p>
    ) : null;
  }

  const approve = (event: MouseEvent<HTMLButtonElement>) => {
    setError('');
    try {
      coordinator.approve(event.nativeEvent, typedValue || undefined);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Confirmation was rejected.');
    }
  };

  return (
    <div className="confirmation-backdrop">
      <section
        aria-labelledby="confirmation-title"
        aria-modal="true"
        className="confirmation-dialog"
        ref={dialogRef}
        role="dialog"
      >
        <header className="confirmation-dialog__header">
          <p className="eyebrow">
            {snapshot.readOnly ? 'Information disclosure' : `${snapshot.risk} impact`}
          </p>
          <h2 id="confirmation-title">{snapshot.title}</h2>
          <p>
            {snapshot.readOnly
              ? 'At Attin will share only the information listed below.'
              : 'At Attin will make only the changes listed below.'}
          </p>
        </header>

        {snapshot.disclosure.length > 0 ? (
          <section aria-labelledby="confirmation-disclosure-title">
            <h3 id="confirmation-disclosure-title">Information to disclose</h3>
            <ul>
              {snapshot.disclosure.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </section>
        ) : null}
        {snapshot.consequences.length > 0 ? (
          <section aria-labelledby="confirmation-consequences-title">
            <h3 id="confirmation-consequences-title">What will happen</h3>
            <ul>
              {snapshot.consequences.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </section>
        ) : null}

        <p className="confirmation-dialog__expiry">
          This confirmation expires after 90 seconds and cannot be reused.
        </p>

        {snapshot.requiresTypedConfirmation ? (
          <div className="confirmation-dialog__typed">
            <p>Type YES to confirm this critical action.</p>
            <label htmlFor="critical-confirmation">Type YES to confirm</label>
            <input
              autoComplete="off"
              id="critical-confirmation"
              maxLength={3}
              onChange={(event) => setTypedValue(event.currentTarget.value)}
              ref={typedRef}
              spellCheck={false}
              value={typedValue}
            />
          </div>
        ) : null}

        {error ? <p className="confirmation-dialog__error" role="alert">{error}</p> : null}

        <div className="confirmation-dialog__actions">
          <button
            className="confirmation-dialog__confirm"
            disabled={snapshot.requiresTypedConfirmation && typedValue !== 'YES'}
            onClick={approve}
            ref={confirmRef}
            type="button"
          >
            Yes, confirm
          </button>
          <button
            className="confirmation-dialog__cancel"
            onClick={() => coordinator.cancel('user-cancelled')}
            type="button"
          >
            No, cancel
          </button>
        </div>
      </section>
    </div>
  );
}
