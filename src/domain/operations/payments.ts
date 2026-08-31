import { addATC, formatATC, subtractATC } from '../money';
import type { Payment, PaymentRecurrence, Transaction } from '../models';
import type {
  OperationContext,
  OperationPlan,
  PaymentOperationName,
} from './types';
import {
  appendAudit,
  displayDate,
  findAccount,
  findPayee,
  findPayment,
  floorAfter,
  mutableAccount,
  mutablePayment,
  optionalMinor,
  optionalNonEmptyString,
  optionalString,
  requiredBoolean,
  requiredDate,
  requiredMinor,
  requiredString,
  reservedForGoals,
  slug,
} from './utils';

function recurrence(args: Record<string, unknown>, now: Date): PaymentRecurrence {
  const frequency = requiredString(args, 'frequency');
  if (!['weekly', 'fortnightly', 'monthly'].includes(frequency)) {
    throw new Error('frequency must be weekly, fortnightly, or monthly');
  }
  const nextDate = requiredDate(args, 'nextDate', now);
  const endDate = args.endDate === undefined || args.endDate === null || args.endDate === ''
    ? null
    : requiredDate(args, 'endDate');
  if (endDate !== null && endDate < nextDate) {
    throw new Error('endDate must use YYYY-MM-DD and follow nextDate');
  }
  return {
    frequency: frequency as PaymentRecurrence['frequency'],
    nextDate,
    endDate,
  };
}

function completedPaymentRecords(
  context: OperationContext,
  sourceAccountId: string,
  payeeId: string,
  payeeName: string,
  amount: Payment['amount'],
  balanceFloor: NonNullable<Payment['balanceFloor']>,
  note: string,
): { payment: Payment; transaction: Transaction } {
  return {
    payment: {
      id: `payment-${context.operationId}`,
      sourceAccountId,
      payeeId,
      payeeName,
      amount,
      balanceFloor,
      balanceFloorStatus: 'confirmed',
      date: context.now.toISOString(),
      recurrence: null,
      status: 'completed',
      note,
    },
    transaction: {
      id: `transaction-${context.operationId}`,
      accountId: sourceAccountId,
      direction: 'debit',
      amount,
      merchant: payeeName,
      category: 'Payments',
      date: context.now.toISOString(),
      status: 'posted',
      memo: note,
      disputeStatus: 'eligible',
    },
  };
}

function prepareTransfer(context: OperationContext): OperationPlan {
  const { state, args } = context;
  const source = findAccount(state, requiredString(args, 'sourceAccountId'));
  const destination = findAccount(state, requiredString(args, 'destinationAccountId'));
  if (source.id === destination.id) {
    throw new Error('Source and destination accounts must be different');
  }
  const amount = requiredMinor(args, 'amountMinor');
  const requestedFloor = optionalMinor(args, 'balanceFloorMinor', { allowZero: true });
  const { after, floor } = floorAfter(
    source,
    amount,
    requestedFloor,
    reservedForGoals(state, source.id),
  );
  const destinationAfter = addATC(destination.availableBalance, amount);
  const note = optionalString(args, 'note') ?? '';

  return {
    title: `Transfer to ${destination.name}`,
    risk: 'high',
    disclosure: [],
    consequences: [
      `Transfer ${formatATC(amount)} from ${source.name} to ${destination.name}`,
      `${source.name} balance after: ${formatATC(after)}`,
      `${destination.name} balance after: ${formatATC(destinationAfter)}`,
      `Balance floor: ${formatATC(floor)}`,
      ...(note ? [`Note: ${note}`] : []),
    ],
    reducer(draft) {
      const mutableSource = mutableAccount(draft, source.id);
      const mutableDestination = mutableAccount(draft, destination.id);
      mutableSource.balance = subtractATC(mutableSource.balance, amount);
      mutableSource.availableBalance = subtractATC(mutableSource.availableBalance, amount);
      mutableDestination.balance = addATC(mutableDestination.balance, amount);
      mutableDestination.availableBalance = addATC(mutableDestination.availableBalance, amount);
      const common = {
        amount,
        category: 'Internal transfer',
        date: context.now.toISOString(),
        status: 'posted' as const,
        memo: note,
        disputeStatus: 'ineligible' as const,
      };
      draft.transactions.push(
        {
          ...common,
          id: `transaction-transfer-out-${context.operationId}`,
          accountId: source.id,
          direction: 'debit',
          merchant: destination.name,
        },
        {
          ...common,
          id: `transaction-transfer-in-${context.operationId}`,
          accountId: destination.id,
          direction: 'credit',
          merchant: source.name,
        },
      );
      appendAudit(
        draft,
        context,
        `${source.id}:${destination.id}`,
        `${formatATC(amount)} moved between fictional accounts.`,
      );
    },
  };
}

function preparePayPayee(context: OperationContext): OperationPlan {
  const { state, args } = context;
  const source = findAccount(state, requiredString(args, 'sourceAccountId'));
  const payee = findPayee(state, requiredString(args, 'payeeId'));
  const amount = requiredMinor(args, 'amountMinor');
  const requestedFloor = optionalMinor(args, 'balanceFloorMinor', { allowZero: true });
  const { after, floor } = floorAfter(
    source,
    amount,
    requestedFloor,
    reservedForGoals(state, source.id),
  );
  const note = optionalString(args, 'note') ?? '';

  return {
    title: `Pay ${payee.name}`,
    risk: 'high',
    disclosure: [],
    consequences: [
      `Pay ${formatATC(amount)} to ${payee.name}`,
      `From: ${source.name}`,
      `Balance after: ${formatATC(after)}`,
      `Balance floor: ${formatATC(floor)}`,
      ...(note ? [`Note: ${note}`] : []),
    ],
    reducer(draft) {
      const mutableSource = mutableAccount(draft, source.id);
      mutableSource.balance = subtractATC(mutableSource.balance, amount);
      mutableSource.availableBalance = subtractATC(mutableSource.availableBalance, amount);
      const mutablePayee = draft.payees.find(({ id }) => id === payee.id);
      if (!mutablePayee) {
        throw new Error('Prepared payee is no longer available');
      }
      mutablePayee.lastPaidDate = context.now.toISOString();
      const records = completedPaymentRecords(
        context,
        source.id,
        payee.id,
        payee.name,
        amount,
        floor,
        note,
      );
      draft.payments.push(records.payment);
      draft.transactions.push(records.transaction);
      appendAudit(
        draft,
        context,
        records.payment.id,
        `${formatATC(amount)} paid from ${source.name}.`,
      );
    },
  };
}

function prepareSchedule(context: OperationContext, recurring: boolean): OperationPlan {
  const { state, args } = context;
  const source = findAccount(state, requiredString(args, 'sourceAccountId'));
  const payee = findPayee(state, requiredString(args, 'payeeId'));
  const amount = requiredMinor(args, 'amountMinor');
  const requestedFloor = optionalMinor(args, 'balanceFloorMinor', { allowZero: true });
  const { floor } = floorAfter(
    source,
    amount,
    requestedFloor,
    reservedForGoals(state, source.id),
  );
  const paymentRecurrence = recurring ? recurrence(args, context.now) : null;
  const date = recurring
    ? paymentRecurrence!.nextDate
    : requiredDate(args, 'date', context.now);
  const note = optionalString(args, 'note') ?? '';
  const paymentId = `payment-${context.operationId}`;

  return {
    title: recurring ? `Create recurring payment to ${payee.name}` : `Schedule payment to ${payee.name}`,
    risk: 'high',
    disclosure: [],
    consequences: [
      `${recurring ? 'Recurring payment' : 'Payment'}: ${formatATC(amount)} to ${payee.name}`,
      `First payment: ${displayDate(date)}`,
      ...(paymentRecurrence ? [`Cadence: ${paymentRecurrence.frequency}`] : []),
      ...(paymentRecurrence?.endDate
        ? [`Ends: ${displayDate(paymentRecurrence.endDate)}`]
        : []),
      `Balance floor: ${formatATC(floor)}`,
      ...(note ? [`Note: ${note}`] : []),
      'No balance changes until the payment date',
    ],
    reducer(draft) {
      draft.payments.push({
        id: paymentId,
        sourceAccountId: source.id,
        payeeId: payee.id,
        payeeName: payee.name,
        amount,
        balanceFloor: floor,
        balanceFloorStatus: 'confirmed',
        date: `${date}T09:00:00.000Z`,
        recurrence: paymentRecurrence,
        status: 'scheduled',
        note,
      });
      appendAudit(
        draft,
        context,
        paymentId,
        `${formatATC(amount)} payment scheduled for ${date}.`,
      );
    },
  };
}

function prepareUpdateRecurring(context: OperationContext): OperationPlan {
  const { state, args } = context;
  const payment = findPayment(state, requiredString(args, 'paymentId'));
  if (!payment.recurrence || !['scheduled', 'paused'].includes(payment.status)) {
    throw new Error('Payment is not an editable recurring payment');
  }
  const amount = optionalMinor(args, 'amountMinor') ?? payment.amount;
  const frequencyValue = optionalNonEmptyString(args, 'frequency');
  if (frequencyValue && !['weekly', 'fortnightly', 'monthly'].includes(frequencyValue)) {
    throw new Error('frequency must be weekly, fortnightly, or monthly');
  }
  const nextDate = args.nextDate === undefined
    ? payment.recurrence.nextDate
    : requiredDate(args, 'nextDate', context.now);
  const endDate = args.endDate === undefined
    ? payment.recurrence.endDate
    : args.endDate === null || args.endDate === ''
      ? null
      : requiredDate(args, 'endDate');
  if (endDate !== null && endDate < nextDate) {
    throw new Error('endDate must use YYYY-MM-DD and follow nextDate');
  }
  const frequency = (frequencyValue ?? payment.recurrence.frequency) as PaymentRecurrence['frequency'];
  const source = findAccount(state, payment.sourceAccountId);
  const requestedFloor = optionalMinor(args, 'balanceFloorMinor', { allowZero: true });
  if (payment.balanceFloorStatus === 'requires-reconfirmation'
    && requestedFloor === undefined) {
    throw new Error('Explicitly reconfirm a valid balance floor before updating this payment');
  }
  const effectiveFloor = requestedFloor ?? payment.balanceFloor;
  if (effectiveFloor === null) {
    throw new Error('Explicitly reconfirm a valid balance floor before updating this payment');
  }
  const { floor } = floorAfter(
    source,
    amount,
    effectiveFloor,
    reservedForGoals(state, source.id),
  );

  return {
    title: 'Update recurring payment',
    risk: 'high',
    disclosure: [],
    consequences: [
      `Recurring amount: ${formatATC(amount)}`,
      `Cadence: ${frequency}`,
      `Next payment: ${displayDate(nextDate)}`,
      `Balance floor: ${formatATC(floor)}`,
    ],
    reducer(draft) {
      const mutable = mutablePayment(draft, payment.id);
      mutable.amount = amount;
      mutable.balanceFloor = floor;
      mutable.balanceFloorStatus = 'confirmed';
      mutable.date = `${nextDate}T09:00:00.000Z`;
      mutable.recurrence = { frequency, nextDate, endDate };
      appendAudit(draft, context, payment.id, 'Recurring payment details updated.');
    },
  };
}

function preparePaymentStatus(
  context: OperationContext,
  operation: 'pause_recurring_payment' | 'resume_recurring_payment' | 'cancel_scheduled_payment',
): OperationPlan {
  const payment = findPayment(context.state, requiredString(context.args, 'paymentId'));
  const requirements = {
    pause_recurring_payment: { from: 'scheduled', to: 'paused', label: 'Pause' },
    resume_recurring_payment: { from: 'paused', to: 'scheduled', label: 'Resume' },
    cancel_scheduled_payment: { from: 'scheduled', to: 'cancelled', label: 'Cancel' },
  } as const;
  const rule = requirements[operation];
  if (payment.status !== rule.from) {
    throw new Error(`Payment must be ${rule.from} before it can be ${rule.to}`);
  }
  if (operation !== 'cancel_scheduled_payment' && !payment.recurrence) {
    throw new Error('Payment is not recurring');
  }
  if (operation === 'resume_recurring_payment'
    && payment.balanceFloorStatus === 'requires-reconfirmation') {
    throw new Error('Explicitly reconfirm a valid balance floor before resuming this payment');
  }

  return {
    title: `${rule.label} payment`,
    risk: 'medium',
    disclosure: [],
    consequences: [`Payment status: ${payment.status} → ${rule.to}`],
    reducer(draft) {
      mutablePayment(draft, payment.id).status = rule.to;
      appendAudit(draft, context, payment.id, `Payment ${rule.to}.`);
    },
  };
}

function prepareRetry(context: OperationContext): OperationPlan {
  const payment = findPayment(context.state, requiredString(context.args, 'paymentId'));
  if (payment.status !== 'failed') {
    throw new Error('Only a failed payment can be retried');
  }
  const source = findAccount(context.state, payment.sourceAccountId);
  const payee = payment.payeeId ? findPayee(context.state, payment.payeeId) : null;
  const requestedFloor = optionalMinor(
    context.args,
    'balanceFloorMinor',
    { allowZero: true },
  );
  if (payment.balanceFloorStatus === 'requires-reconfirmation'
    && requestedFloor === undefined) {
    throw new Error('Explicitly reconfirm a valid balance floor before retrying this payment');
  }
  const effectiveFloor = requestedFloor ?? payment.balanceFloor;
  if (effectiveFloor === null) {
    throw new Error('Explicitly reconfirm a valid balance floor before retrying this payment');
  }
  const { floor } = floorAfter(
    source,
    payment.amount,
    effectiveFloor,
    reservedForGoals(context.state, source.id),
  );

  return {
    title: 'Retry failed payment',
    risk: 'high',
    disclosure: [],
    consequences: [
      `Retry ${formatATC(payment.amount)}${payee ? ` to ${payee.name}` : ''}`,
      `Balance after: ${formatATC(subtractATC(source.balance, payment.amount))}`,
      `Balance floor: ${formatATC(floor)}`,
    ],
    reducer(draft) {
      const mutableSource = mutableAccount(draft, source.id);
      mutableSource.balance = subtractATC(mutableSource.balance, payment.amount);
      mutableSource.availableBalance = subtractATC(
        mutableSource.availableBalance,
        payment.amount,
      );
      const mutable = mutablePayment(draft, payment.id);
      mutable.balanceFloor = floor;
      mutable.balanceFloorStatus = 'confirmed';
      mutable.status = 'completed';
      draft.transactions.push({
        id: `transaction-${context.operationId}`,
        accountId: source.id,
        direction: 'debit',
        amount: payment.amount,
        merchant: payee?.name ?? 'Retried payment',
        category: 'Payments',
        date: context.now.toISOString(),
        status: 'posted',
        memo: payment.note,
        disputeStatus: 'eligible',
      });
      appendAudit(draft, context, payment.id, 'Failed payment retried successfully.');
    },
  };
}

function prepareRequestMoney(context: OperationContext): OperationPlan {
  const from = requiredString(context.args, 'from', 80);
  const amount = requiredMinor(context.args, 'amountMinor');
  const note = optionalString(context.args, 'note') ?? '';
  const source = findAccount(context.state, 'account-daily');
  const paymentId = `payment-${context.operationId}`;
  return {
    title: `Request money from ${from}`,
    risk: 'low',
    disclosure: [],
    consequences: [
      `Request ${formatATC(amount)} from ${from}`,
      ...(note ? [`Note: ${note}`] : []),
      'No funds move automatically',
    ],
    reducer(draft) {
      draft.payments.push({
        id: paymentId,
        sourceAccountId: source.id,
        requestFrom: from,
        amount,
        balanceFloor: source.balanceFloor,
        balanceFloorStatus: 'confirmed',
        date: context.now.toISOString(),
        recurrence: null,
        status: 'requested',
        note,
      });
      appendAudit(draft, context, paymentId, `${formatATC(amount)} request created.`);
    },
  };
}

function prepareAddPayee(context: OperationContext): OperationPlan {
  const name = requiredString(context.args, 'name', 80);
  const accountAlias = requiredString(context.args, 'accountAlias', 80);
  const trusted = context.args.trusted === undefined
    ? false
    : requiredBoolean(context.args, 'trusted');
  if (context.state.payees.some((payee) =>
    payee.accountAlias.toLocaleLowerCase('en-US') === accountAlias.toLocaleLowerCase('en-US'))) {
    throw new Error('A payee with this account alias already exists');
  }
  const id = `payee-${slug(name)}-${context.operationId.slice(-6)}`;
  return {
    title: `Add ${name} as a payee`,
    risk: 'medium',
    disclosure: [],
    consequences: [
      `Add payee ${name}`,
      `Destination alias: ${accountAlias}`,
      `Trusted payee: ${trusted ? 'yes' : 'no'}`,
    ],
    reducer(draft) {
      draft.payees.push({ id, name, accountAlias, trusted, lastPaidDate: null });
      appendAudit(draft, context, id, `Payee ${name} added.`);
    },
  };
}

function prepareUpdatePayee(context: OperationContext): OperationPlan {
  const payee = findPayee(context.state, requiredString(context.args, 'payeeId'));
  const name = optionalNonEmptyString(context.args, 'name', 80) ?? payee.name;
  const accountAlias = optionalNonEmptyString(context.args, 'accountAlias', 80)
    ?? payee.accountAlias;
  const trusted = context.args.trusted === undefined
    ? payee.trusted
    : requiredBoolean(context.args, 'trusted');
  const destinationChanged = accountAlias !== payee.accountAlias;
  if (destinationChanged && context.state.payees.some((candidate) =>
    candidate.id !== payee.id
    && candidate.accountAlias.toLocaleLowerCase('en-US')
      === accountAlias.toLocaleLowerCase('en-US'))) {
    throw new Error('A payee with this account alias already exists');
  }
  const affectedPayments = context.state.payments.filter((payment) =>
    payment.payeeId === payee.id && ['scheduled', 'paused'].includes(payment.status));
  return {
    title: `Update ${payee.name}`,
    risk: destinationChanged ? 'high' : 'medium',
    disclosure: [],
    consequences: [
      `Payee name: ${payee.name} → ${name}`,
      `Destination alias: ${payee.accountAlias} → ${accountAlias}`,
      ...(destinationChanged ? [
        `${affectedPayments.length} scheduled or recurring payments will use the new destination alias`,
      ] : []),
      `Trusted payee: ${payee.trusted ? 'yes' : 'no'} → ${trusted ? 'yes' : 'no'}`,
    ],
    reducer(draft) {
      const mutable = draft.payees.find(({ id }) => id === payee.id);
      if (!mutable) throw new Error('Prepared payee is no longer available');
      Object.assign(mutable, { name, accountAlias, trusted });
      appendAudit(draft, context, payee.id, `Payee ${payee.name} updated.`);
    },
  };
}

function prepareRemovePayee(context: OperationContext): OperationPlan {
  const payee = findPayee(context.state, requiredString(context.args, 'payeeId'));
  const linkedPayments = context.state.payments.filter(
    (payment) => payment.payeeId === payee.id,
  );
  const actionablePayments = linkedPayments.filter(
    (payment) => !['completed', 'cancelled'].includes(payment.status),
  );
  if (actionablePayments.length > 0) {
    throw new Error(
      'Cancel scheduled payments and resolve failed or otherwise actionable payments before removing this payee',
    );
  }
  return {
    title: `Remove ${payee.name}`,
    risk: 'high',
    disclosure: [],
    consequences: [
      `Remove ${payee.name} from saved payees`,
      `Preserve ${linkedPayments.length} historical payment${linkedPayments.length === 1 ? '' : 's'} under ${payee.name}`,
    ],
    reducer(draft) {
      for (const payment of draft.payments) {
        if (payment.payeeId !== payee.id) continue;
        payment.payeeName = payment.payeeName ?? payee.name;
        delete payment.payeeId;
      }
      draft.payees = draft.payees.filter(({ id }) => id !== payee.id);
      appendAudit(draft, context, payee.id, `Payee ${payee.name} removed.`);
    },
  };
}

export function preparePaymentOperation(
  context: OperationContext,
  operation: PaymentOperationName,
): OperationPlan {
  switch (operation) {
    case 'transfer_money':
      return prepareTransfer(context);
    case 'pay_payee':
      return preparePayPayee(context);
    case 'schedule_payment':
      return prepareSchedule(context, false);
    case 'create_recurring_payment':
      return prepareSchedule(context, true);
    case 'update_recurring_payment':
      return prepareUpdateRecurring(context);
    case 'pause_recurring_payment':
    case 'resume_recurring_payment':
    case 'cancel_scheduled_payment':
      return preparePaymentStatus(context, operation);
    case 'retry_failed_payment':
      return prepareRetry(context);
    case 'request_money':
      return prepareRequestMoney(context);
    case 'add_payee':
      return prepareAddPayee(context);
    case 'update_payee':
      return prepareUpdatePayee(context);
    case 'remove_payee':
      return prepareRemovePayee(context);
  }
}
