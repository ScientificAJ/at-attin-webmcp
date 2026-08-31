import { formatATC } from '../money';
import type { Card } from '../models';
import type {
  CardOperationName,
  OperationContext,
  OperationPlan,
} from './types';
import {
  appendAudit,
  findCard,
  mutableCard,
  requiredBoolean,
  requiredMinor,
  requiredString,
} from './utils';

function ensureManageable(card: Card): void {
  if (card.status === 'lost' || card.status === 'replaced') {
    throw new Error('This card can no longer be changed');
  }
}

function prepareFreeze(context: OperationContext): OperationPlan {
  const card = findCard(context.state, requiredString(context.args, 'cardId'));
  ensureManageable(card);
  const frozen = requiredBoolean(context.args, 'frozen');
  const nextStatus = frozen ? 'frozen' : 'active';
  if (card.status === nextStatus) {
    throw new Error(`Card is already ${nextStatus}`);
  }
  return {
    title: `${frozen ? 'Freeze' : 'Unfreeze'} card ending ${card.maskedNumber.slice(-4)}`,
    risk: 'high',
    disclosure: [],
    consequences: [`Card status: ${card.status} → ${nextStatus}`],
    reducer(draft) {
      mutableCard(draft, card.id).status = nextStatus;
      appendAudit(draft, context, card.id, `Card ${nextStatus}.`);
    },
  };
}

function prepareLimit(context: OperationContext): OperationPlan {
  const card = findCard(context.state, requiredString(context.args, 'cardId'));
  ensureManageable(card);
  const limit = requiredMinor(context.args, 'limitMinor');
  return {
    title: `Change card limit`,
    risk: 'high',
    disclosure: [],
    consequences: [`Card limit: ${formatATC(card.limit)} → ${formatATC(limit)}`],
    reducer(draft) {
      mutableCard(draft, card.id).limit = limit;
      appendAudit(draft, context, card.id, `Card limit changed to ${formatATC(limit)}.`);
    },
  };
}

function prepareMerchantControl(context: OperationContext): OperationPlan {
  const card = findCard(context.state, requiredString(context.args, 'cardId'));
  ensureManageable(card);
  const requestedCategory = requiredString(context.args, 'category', 50);
  const categoryKey = requestedCategory.toLocaleLowerCase('en-US');
  const category = card.merchantControls.find(
    (item) => item.category.toLocaleLowerCase('en-US') === categoryKey,
  )?.category ?? requestedCategory;
  const enabled = requiredBoolean(context.args, 'enabled');
  return {
    title: `Change ${category} card control`,
    risk: 'medium',
    disclosure: [],
    consequences: [`${category} card payments: ${enabled ? 'allowed' : 'blocked'}`],
    reducer(draft) {
      const mutable = mutableCard(draft, card.id);
      const control = mutable.merchantControls.find(
        (item) => item.category.toLocaleLowerCase('en-US') === categoryKey,
      );
      if (control) {
        control.enabled = enabled;
      } else {
        mutable.merchantControls.push({ category, enabled });
      }
      appendAudit(draft, context, card.id, `${category} control updated.`);
    },
  };
}

function prepareToggle(
  context: OperationContext,
  operation: 'set_online_payments' | 'set_contactless' | 'set_travel_mode',
): OperationPlan {
  const card = findCard(context.state, requiredString(context.args, 'cardId'));
  ensureManageable(card);
  const enabled = requiredBoolean(context.args, 'enabled');
  const fields = {
    set_online_payments: ['onlinePayments', 'Online payments'],
    set_contactless: ['contactless', 'Contactless payments'],
    set_travel_mode: ['travelMode', 'Travel mode'],
  } as const;
  const [field, label] = fields[operation];
  return {
    title: `Change ${label.toLocaleLowerCase('en-US')}`,
    risk: 'medium',
    disclosure: [],
    consequences: [`${label}: ${enabled ? 'on' : 'off'}`],
    reducer(draft) {
      mutableCard(draft, card.id)[field] = enabled;
      appendAudit(draft, context, card.id, `${label} turned ${enabled ? 'on' : 'off'}.`);
    },
  };
}

function preparePinReveal(context: OperationContext): OperationPlan {
  const card = findCard(context.state, requiredString(context.args, 'cardId'));
  if (card.type !== 'physical' || card.status === 'lost' || card.status === 'replaced') {
    throw new Error('A PIN is unavailable for this card');
  }
  return {
    title: `Reveal fictional PIN for card ending ${card.maskedNumber.slice(-4)}`,
    risk: 'critical',
    disclosure: ['The fictional four-digit card PIN'],
    consequences: ['Reveal the PIN once on this device', 'No card settings will change'],
    data: { cardId: card.id, pin: '1844', simulation: true },
  };
}

function prepareLost(context: OperationContext): OperationPlan {
  const card = findCard(context.state, requiredString(context.args, 'cardId'));
  ensureManageable(card);
  return {
    title: `Report card ending ${card.maskedNumber.slice(-4)} lost`,
    risk: 'critical',
    disclosure: [],
    consequences: [
      'Mark the card as lost',
      'Disable online and contactless payments',
      'This cannot be undone by unfreezing the card',
    ],
    reducer(draft) {
      const mutable = mutableCard(draft, card.id);
      mutable.status = 'lost';
      mutable.onlinePayments = false;
      mutable.contactless = false;
      appendAudit(draft, context, card.id, 'Card reported lost and payment controls disabled.');
    },
  };
}

function prepareReplacement(context: OperationContext): OperationPlan {
  const card = findCard(context.state, requiredString(context.args, 'cardId'));
  if (card.status === 'replaced') {
    throw new Error('This card has already been replaced');
  }
  const replacementId = `card-replacement-${context.operationId.slice(-8)}`;
  return {
    title: `Replace card ending ${card.maskedNumber.slice(-4)}`,
    risk: 'critical',
    disclosure: [],
    consequences: [
      'Retire the existing card',
      'Create one frozen replacement card for review',
      'The replacement uses a new masked number',
    ],
    data: { replacementCardId: replacementId },
    reducer(draft) {
      const mutable = mutableCard(draft, card.id);
      mutable.status = 'replaced';
      draft.cards.push({
        ...structuredClone(card),
        id: replacementId,
        maskedNumber: '•••• 7721',
        status: 'frozen',
        onlinePayments: false,
        contactless: false,
      });
      appendAudit(draft, context, card.id, `Replacement card ${replacementId} created frozen.`);
    },
  };
}

export function prepareCardOperation(
  context: OperationContext,
  operation: CardOperationName,
): OperationPlan {
  switch (operation) {
    case 'set_card_freeze':
      return prepareFreeze(context);
    case 'set_card_limit':
      return prepareLimit(context);
    case 'set_merchant_control':
      return prepareMerchantControl(context);
    case 'set_online_payments':
    case 'set_contactless':
    case 'set_travel_mode':
      return prepareToggle(context, operation);
    case 'reveal_card_pin':
      return preparePinReveal(context);
    case 'report_card_lost':
      return prepareLost(context);
    case 'replace_card':
      return prepareReplacement(context);
  }
}
