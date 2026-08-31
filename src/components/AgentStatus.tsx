import {
  ArrowClockwise,
  LockSimple,
  ShieldCheck,
  WarningCircle,
} from '@phosphor-icons/react';
import type { ToolRegistrySnapshot } from '../webmcp/registry';

interface AgentStatusProps {
  available: boolean;
  registryStatus: ToolRegistrySnapshot['status'];
  unlocked: boolean;
}

export function AgentStatus({
  available,
  registryStatus,
  unlocked,
}: AgentStatusProps) {
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
  if (registryStatus === 'error') {
    return (
      <span className="agent-status agent-status--unavailable">
        <WarningCircle aria-hidden="true" weight="regular" />
        WebMCP needs attention
      </span>
    );
  }
  if (registryStatus !== 'ready') {
    return (
      <span className="agent-status agent-status--locked">
        <ArrowClockwise aria-hidden="true" weight="regular" />
        WebMCP connecting
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
