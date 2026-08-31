import { formatATC } from '../money';
import type {
  OperationContext,
  OperationPlan,
  SupportOperationName,
} from './types';
import {
  appendAudit,
  findAccount,
  findCard,
  findDispute,
  findTransaction,
  mutableCard,
  mutableTransaction,
  optionalString,
  requiredString,
} from './utils';

type SupportDomainOperationName = Extract<
  SupportOperationName,
  | 'start_transaction_dispute'
  | 'add_dispute_note'
  | 'secure_suspicious_charge'
  | 'create_support_case'
>;

function ensureDisputable(context: OperationContext, transactionId: string) {
  const transaction = findTransaction(context.state, transactionId);
  if (transaction.direction !== 'debit' || transaction.status !== 'posted') {
    throw new Error('Only a posted outgoing transaction can be disputed');
  }
  if (transaction.disputeStatus !== 'eligible'
    || context.state.disputes.some((dispute) => dispute.transactionId === transaction.id)) {
    throw new Error('This transaction already has a dispute or is not eligible');
  }
  return transaction;
}

function prepareDispute(context: OperationContext): OperationPlan {
  const transaction = ensureDisputable(
    context,
    requiredString(context.args, 'transactionId'),
  );
  const reason = requiredString(context.args, 'reason', 120);
  const evidenceNote = optionalString(context.args, 'evidenceNote', 500) ?? '';
  const disputeId = `dispute-${context.operationId}`;
  return {
    title: `Dispute ${transaction.merchant} transaction`,
    risk: 'critical',
    disclosure: [],
    consequences: [
      `Open a dispute for ${formatATC(transaction.amount)} at ${transaction.merchant}`,
      `Reason: ${reason}`,
      ...(evidenceNote ? [`Evidence note: ${evidenceNote}`] : []),
      'The transaction is not automatically refunded',
    ],
    data: { disputeId },
    reducer(draft) {
      mutableTransaction(draft, transaction.id).disputeStatus = 'open';
      draft.disputes.push({
        id: disputeId,
        transactionId: transaction.id,
        reason,
        evidenceNote,
        status: 'open',
        createdDate: context.now.toISOString(),
      });
      appendAudit(draft, context, disputeId, `Dispute opened for ${transaction.merchant}.`);
    },
  };
}

function prepareDisputeNote(context: OperationContext): OperationPlan {
  const dispute = findDispute(context.state, requiredString(context.args, 'disputeId'));
  if (dispute.status === 'resolved') {
    throw new Error('A resolved dispute cannot be changed');
  }
  const note = requiredString(context.args, 'note', 500);
  const evidenceNote = [dispute.evidenceNote, note].filter(Boolean).join('\n');
  if (evidenceNote.length > 2_000) {
    throw new Error('Accumulated dispute evidence cannot exceed 2,000 characters');
  }
  return {
    title: 'Add dispute evidence note',
    risk: 'medium',
    disclosure: [],
    consequences: [
      'Append the supplied note to the open dispute',
      `Evidence note: ${note}`,
    ],
    reducer(draft) {
      const mutable = draft.disputes.find(({ id }) => id === dispute.id);
      if (!mutable) throw new Error('Prepared dispute is no longer available');
      mutable.evidenceNote = evidenceNote;
      appendAudit(draft, context, dispute.id, 'Evidence note added to dispute.');
    },
  };
}

function prepareSuspiciousCharge(context: OperationContext): OperationPlan {
  const transaction = ensureDisputable(
    context,
    requiredString(context.args, 'transactionId'),
  );
  if (!transaction.cardId) {
    throw new Error('The suspicious transaction is not linked to a card');
  }
  const card = findCard(context.state, transaction.cardId);
  if (card.status === 'lost' || card.status === 'replaced') {
    throw new Error('The linked card can no longer be frozen');
  }
  const account = findAccount(context.state, card.accountId);
  const reason = optionalString(context.args, 'reason', 120)
    ?? 'Card payment not recognized';
  const disputeId = `dispute-${context.operationId}`;
  return {
    title: `Secure suspicious ${transaction.merchant} charge`,
    risk: 'critical',
    disclosure: [],
    consequences: [
      `Freeze ${account.name} card ending ${card.maskedNumber.slice(-4)}`,
      'Open a dispute for the suspicious transaction',
      `Disputed amount: ${formatATC(transaction.amount)}`,
      `Reason: ${reason}`,
      'Both safeguards happen together or neither happens',
    ],
    data: { cardId: card.id, disputeId, transactionId: transaction.id },
    reducer(draft) {
      mutableCard(draft, card.id).status = 'frozen';
      mutableTransaction(draft, transaction.id).disputeStatus = 'open';
      draft.disputes.push({
        id: disputeId,
        transactionId: transaction.id,
        reason,
        evidenceNote: '',
        status: 'open',
        createdDate: context.now.toISOString(),
      });
      appendAudit(
        draft,
        context,
        transaction.id,
        `Card frozen and dispute ${disputeId} opened atomically.`,
      );
    },
  };
}

function prepareSupportCase(context: OperationContext): OperationPlan {
  const topic = requiredString(context.args, 'topic', 80);
  const detail = requiredString(context.args, 'detail', 500);
  const caseId = `support-${context.operationId}`;
  return {
    title: `Open ${topic} support case`,
    risk: 'medium',
    disclosure: [],
    consequences: [
      'Create one fictional in-app support case',
      `Case detail: ${detail}`,
      'No information leaves this device',
    ],
    data: { supportCaseId: caseId },
    reducer(draft) {
      draft.supportCases.push({
        id: caseId,
        topic,
        detail,
        status: 'open',
        createdDate: context.now.toISOString(),
      });
      appendAudit(draft, context, caseId, `${topic} support case opened.`);
    },
  };
}

export function prepareSupportOperation(
  context: OperationContext,
  operation: SupportDomainOperationName,
): OperationPlan {
  switch (operation) {
    case 'start_transaction_dispute':
      return prepareDispute(context);
    case 'add_dispute_note':
      return prepareDisputeNote(context);
    case 'secure_suspicious_charge':
      return prepareSuspiciousCharge(context);
    case 'create_support_case':
      return prepareSupportCase(context);
  }
}
