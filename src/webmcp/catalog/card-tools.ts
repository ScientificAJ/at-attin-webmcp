import type { CardOperationName } from '../../domain/operations/types';
import type { ToolRunner, WebMCPTool } from '../contracts';
import { createToolDescriptor } from './tool';

export const CARD_TOOL_NAMES = [
  'set_card_freeze',
  'set_card_limit',
  'set_merchant_control',
  'set_online_payments',
  'set_contactless',
  'set_travel_mode',
  'reveal_card_pin',
  'report_card_lost',
  'replace_card',
] as const satisfies readonly CardOperationName[];

const DESCRIPTIONS: Record<CardOperationName, string> = {
  set_card_freeze: 'Freeze or unfreeze one manageable card after explicit confirmation.',
  set_card_limit: 'Change one card limit in bounded ATC minor units after confirmation.',
  set_merchant_control: 'Allow or block one bounded merchant category after confirmation.',
  set_online_payments: 'Enable or disable online payments for one card after confirmation.',
  set_contactless: 'Enable or disable contactless payments for one card after confirmation.',
  set_travel_mode: 'Enable or disable fictional travel mode for one card after confirmation.',
  reveal_card_pin: 'Reveal a fictional on-device card PIN only after critical confirmation.',
  report_card_lost: 'Irreversibly mark one card lost after typed critical confirmation.',
  replace_card: 'Retire one card and create a frozen fictional replacement after confirmation.',
};

export function createCardTools(run: ToolRunner): WebMCPTool[] {
  return CARD_TOOL_NAMES.map((name) => createToolDescriptor(
    name,
    DESCRIPTIONS[name],
    run,
    { readOnly: name === 'reveal_card_pin' },
  ));
}
