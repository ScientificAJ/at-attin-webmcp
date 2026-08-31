import {
  LockSimple,
  ShieldCheck,
  WarningCircle,
} from '@phosphor-icons/react';

interface AgentStatusProps {
  available: boolean;
  unlocked: boolean;
}

export function AgentStatus({ available, unlocked }: AgentStatusProps) {
  if (!available) {
    return (
      <span className="agent-status agent-status--unavailable">
        <WarningCircle aria-hidden="true" weight="regular" />
        WebMCP unavailable
      </span>
    );
  }
  if (!unlocked) {
    return (
      <span className="agent-status agent-status--locked">
        <LockSimple aria-hidden="true" weight="regular" />
        Agent access locked
      </span>
    );
  }
  return (
    <span className="agent-status agent-status--connected">
      <ShieldCheck aria-hidden="true" weight="regular" />
      WebMCP connected
    </span>
  );
}
