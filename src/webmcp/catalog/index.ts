import type { OperationName } from '../../domain/operations/types';
import type { ToolRunner, WebMCPTool } from '../contracts';
import { createCardTools, CARD_TOOL_NAMES } from './card-tools';
import { createPaymentTools, PAYMENT_TOOL_NAMES } from './payment-tools';
import { createPlanningTools, PLANNING_TOOL_NAMES } from './planning-tools';
import { createReadTools, READ_TOOL_NAMES } from './read-tools';
import { createSupportTools, SUPPORT_TOOL_NAMES } from './support-tools';

export const IMPERATIVE_TOOL_NAMES = [
  ...READ_TOOL_NAMES,
  ...PAYMENT_TOOL_NAMES,
  ...CARD_TOOL_NAMES,
  ...PLANNING_TOOL_NAMES,
  ...SUPPORT_TOOL_NAMES,
] as const satisfies readonly OperationName[];

export const READ_ONLY_TOOL_NAMES = [
  ...READ_TOOL_NAMES,
  'reveal_card_pin',
  'prepare_monthly_plan',
] as const;

export const UNTRUSTED_CONTENT_TOOL_NAMES = [
  'search_transactions',
  'get_transaction',
  'get_spending_summary',
  'get_income_summary',
  'list_recurring_activity',
  'list_payees',
  'list_scheduled_payments',
  'list_budgets',
  'list_goals',
  'list_subscriptions',
  'get_agent_audit',
  'prepare_monthly_plan',
] as const;

export function createImperativeTools(run: ToolRunner): WebMCPTool[] {
  return [
    ...createReadTools(run),
    ...createPaymentTools(run),
    ...createCardTools(run),
    ...createPlanningTools(run),
    ...createSupportTools(run),
  ];
}

export {
  CARD_TOOL_NAMES,
  PAYMENT_TOOL_NAMES,
  PLANNING_TOOL_NAMES,
  READ_TOOL_NAMES,
  SUPPORT_TOOL_NAMES,
};
