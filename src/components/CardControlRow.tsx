import type { Icon } from '@phosphor-icons/react';

interface CardControlRowProps {
  icon: Icon;
  label: string;
  detail: string;
  enabled?: boolean;
  actionLabel: string;
  onAction(): void;
  danger?: boolean;
}

export function CardControlRow({
  icon: ControlIcon,
  label,
  detail,
  enabled,
  actionLabel,
  onAction,
  danger = false,
}: CardControlRowProps) {
  return (
    <div className={`card-control-row${danger ? ' card-control-row--danger' : ''}`}>
      <ControlIcon aria-hidden="true" weight="regular" />
      <span>
        <strong>{label}</strong>
        <small>{detail}</small>
      </span>
      {enabled === undefined ? null : <span className="state-pill">{enabled ? 'On' : 'Off'}</span>}
      <button onClick={onAction} type="button">{actionLabel}</button>
    </div>
  );
}
