import type { PaymentOperationName } from '../../domain/operations/types';
import type { ToolRunner, WebMCPTool } from '../contracts';
import { createToolDescriptor } from './tool';

export const PAYMENT_TOOL_NAMES = [
  'transfer_money',
  'pay_payee',
  'schedule_payment',
  'create_recurring_payment',
  'update_recurring_payment',
  'pause_recurring_payment',
  'resume_recurring_payment',
  'cancel_scheduled_payment',
  'retry_failed_payment',
  'request_money',
  'add_payee',
  'update_payee',
  'remove_payee',
] as const satisfies readonly PaymentOperationName[];

const DESCRIPTIONS: Record<PaymentOperationName, string> = {
  transfer_money: 'Move fictional ATC between owned accounts only after explicit confirmation.',
  pay_payee: 'Pay one saved payee from an owned account only after explicit confirmation.',
  schedule_payment: 'Schedule one future payment to a saved payee after explicit confirmation.',
  create_recurring_payment: 'Create one bounded recurring payment after explicit confirmation.',
  update_recurring_payment: 'Update one recurring payment after explicit confirmation.',
  pause_recurring_payment: 'Pause one active recurring payment after explicit confirmation.',
  resume_recurring_payment: 'Resume one paused recurring payment after explicit confirmation.',
  cancel_scheduled_payment: 'Cancel one scheduled payment after explicit confirmation.',
  retry_failed_payment: 'Retry one failed payment with balance-floor protection after confirmation.',
  request_money: 'Create a fictional request for ATC without moving funds after confirmation.',
  add_payee: 'Add one bounded fictional payee after explicit confirmation.',
  update_payee: 'Update one saved payee and show affected payments before confirmation.',
  remove_payee: 'Remove an eligible saved payee after explicit confirmation.',
};

export function createPaymentTools(run: ToolRunner): WebMCPTool[] {
  return PAYMENT_TOOL_NAMES.map((name) => createToolDescriptor(name, DESCRIPTIONS[name], run));
}
