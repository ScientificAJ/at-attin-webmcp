import {
  ArrowClockwise,
  LockSimple,
  ShieldCheck,
  WarningCircle,
} from '@phosphor-icons/react';
import type { ToolRegistrySnapshot } from '../webmcp/registry';

interface AgentStatusProps {
  registryStatus: ToolRegistrySnapshot['status'];
  unlocked: boolean;
}

export function AgentStatus({
  registryStatus,
  unlocked,
}: AgentStatusProps) {
  if (!unlocked) {
    return (
      <span className="agent-status agent-status--locked">
        <LockSimple aria-hidden="true" weight="regular" />
        56 WebMCP tools ready · Agent Access locked
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
        {registryStatus === 'unavailable'
          ? 'WebMCP handshake pending'
          : 'Connecting 56 WebMCP tools'}
      </span>
    );
  }
  return (
    <span className="agent-status agent-status--connected">
      <ShieldCheck aria-hidden="true" weight="regular" />
      WebMCP connected · 56 tools available
    </span>
  );
}
