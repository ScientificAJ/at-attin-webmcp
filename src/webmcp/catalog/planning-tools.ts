import type { PlanningOperationName } from '../../domain/operations/types';
import type { ToolRunner, WebMCPTool } from '../contracts';
import { createToolDescriptor } from './tool';

export const PLANNING_TOOL_NAMES = [
  'create_budget',
  'update_budget',
  'create_savings_goal',
  'update_savings_goal',
  'fund_savings_goal',
  'withdraw_from_goal',
  'categorize_transaction',
  'add_transaction_note',
  'prepare_monthly_plan',
] as const satisfies readonly PlanningOperationName[];

const DESCRIPTIONS: Record<PlanningOperationName, string> = {
  create_budget: 'Create one monthly budget with a bounded ATC limit after confirmation.',
  update_budget: 'Update one monthly budget limit or rollover setting after confirmation.',
  create_savings_goal: 'Create one savings goal on an owned account after confirmation.',
  update_savings_goal: 'Update one savings goal name, target, or deadline after confirmation.',
  fund_savings_goal: 'Move fictional ATC into one savings goal after confirmation.',
  withdraw_from_goal: 'Move fictional ATC out of one savings goal after confirmation.',
  categorize_transaction: 'Replace one transaction category after explicit confirmation.',
  add_transaction_note: 'Replace one local transaction note after explicit confirmation.',
  prepare_monthly_plan: 'Share a monthly plan from budgets, goals, subscriptions, and payments after confirmation.',
};

export function createPlanningTools(run: ToolRunner): WebMCPTool[] {
  return PLANNING_TOOL_NAMES.map((name) => createToolDescriptor(
    name,
    DESCRIPTIONS[name],
    run,
    name === 'prepare_monthly_plan'
      ? { readOnly: true, untrustedContent: true }
      : {},
  ));
}
