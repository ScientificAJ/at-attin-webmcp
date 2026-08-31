import type { ReadOperationName } from '../../domain/operations/types';
import type { ToolRunner, WebMCPTool } from '../contracts';
import { createToolDescriptor } from './tool';

export const READ_TOOL_NAMES = [
  'get_overview',
  'list_accounts',
  'get_account',
  'search_transactions',
  'get_transaction',
  'get_spending_summary',
  'get_cash_flow',
  'get_income_summary',
  'list_recurring_activity',
  'list_payees',
  'list_scheduled_payments',
  'list_cards',
  'get_card_controls',
  'list_budgets',
  'list_goals',
  'list_subscriptions',
  'get_agent_audit',
  'get_security_status',
] as const satisfies readonly ReadOperationName[];

const DESCRIPTIONS: Record<ReadOperationName, string> = {
  get_overview: 'Share total and per-account fictional ATC balances after confirmation.',
  list_accounts: 'Share account names, balances, status, and masked identifiers after confirmation.',
  get_account: 'Share one account balance, status, and masked identifier after confirmation.',
  search_transactions: 'Share bounded transactions matching explicit filters after confirmation.',
  get_transaction: 'Share one transaction and its note after confirmation.',
  get_spending_summary: 'Share bounded spending totals and category breakdown after confirmation.',
  get_cash_flow: 'Share confirmed inflow, outflow, and net cash flow for a date range.',
  get_income_summary: 'Share confirmed income totals and matching incoming transactions.',
  list_recurring_activity: 'Share detected recurring merchants, amounts, and next dates after confirmation.',
  list_payees: 'Share saved payee names, masked aliases, and trust status after confirmation.',
  list_scheduled_payments: 'Share upcoming or paused payment details after confirmation.',
  list_cards: 'Share masked card identifiers, linked accounts, types, and status after confirmation.',
  get_card_controls: 'Share one card limit, status, and payment controls after confirmation.',
  list_budgets: 'Share budget categories, limits, and spending progress after confirmation.',
  list_goals: 'Share savings-goal names, targets, balances, and deadlines after confirmation.',
  list_subscriptions: 'Share subscription merchants, amounts, cadence, and next dates after confirmation.',
  get_agent_audit: 'Share a bounded safe audit of confirmed agent activity after confirmation.',
  get_security_status: 'Share agent access, card, dispute, and trusted-contact status after confirmation.',
};

const UNTRUSTED_READS = new Set<ReadOperationName>([
  'search_transactions',
  'get_transaction',
  'get_spending_summary',
  'get_income_summary',
  'list_recurring_activity',
  'list_payees',
  'list_scheduled_payments',
  'list_cards',
  'get_card_controls',
  'list_budgets',
  'list_goals',
  'list_subscriptions',
  'get_agent_audit',
]);

export function createReadTools(run: ToolRunner): WebMCPTool[] {
  return READ_TOOL_NAMES.map((name) => createToolDescriptor(
    name,
    DESCRIPTIONS[name],
    run,
    { readOnly: true, untrustedContent: UNTRUSTED_READS.has(name) },
  ));
}
