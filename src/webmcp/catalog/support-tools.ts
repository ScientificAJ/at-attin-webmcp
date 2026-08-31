import type { SupportOperationName } from '../../domain/operations/types';
import type { ToolRunner, WebMCPTool } from '../contracts';
import { createToolDescriptor } from './tool';

export const SUPPORT_TOOL_NAMES = [
  'start_transaction_dispute',
  'add_dispute_note',
  'secure_suspicious_charge',
  'create_support_case',
  'set_alert_preference',
  'set_accessibility_mode',
  'manage_trusted_contact',
] as const satisfies readonly SupportOperationName[];

const DESCRIPTIONS: Record<SupportOperationName, string> = {
  start_transaction_dispute: 'Open one fictional transaction dispute after typed critical confirmation.',
  add_dispute_note: 'Append one bounded evidence note to an open dispute after confirmation.',
  secure_suspicious_charge: 'Atomically freeze a card and dispute its charge after typed confirmation.',
  create_support_case: 'Create one device-local fictional support case after confirmation.',
  set_alert_preference: 'Set one local simulated alert preference after confirmation.',
  set_accessibility_mode: 'Enable or disable one accessibility preference after confirmation.',
  manage_trusted_contact: 'Set or remove the device-local trusted contact after confirmation.',
};

export function createSupportTools(run: ToolRunner): WebMCPTool[] {
  return SUPPORT_TOOL_NAMES.map((name) => createToolDescriptor(name, DESCRIPTIONS[name], run));
}
