import type { OperationName } from '../domain/operations/types';
import type {
  DeclarativeToolName,
  JSONSchema,
} from './contracts';

const MAX_MINOR = 100_000_000;

function text(description: string, maxLength: number): JSONSchema {
  return { type: 'string', description, minLength: 1, maxLength };
}

function identifier(description: string): JSONSchema {
  return {
    ...text(description, 120),
    pattern: '^[a-z0-9][a-z0-9-]{0,119}$',
  };
}

function money(description: string, allowZero = false): JSONSchema {
  return {
    type: 'integer',
    description,
    minimum: allowZero ? 0 : 1,
    maximum: MAX_MINOR,
  };
}

function integer(description: string, minimum: number, maximum: number): JSONSchema {
  return { type: 'integer', description, minimum, maximum };
}

function bool(description: string): JSONSchema {
  return { type: 'boolean', description };
}

function choice(description: string, values: string[]): JSONSchema {
  return { type: 'string', description, enum: values, minLength: 1, maxLength: 80 };
}

function date(description: string): JSONSchema {
  return {
    type: 'string',
    description,
    minLength: 10,
    maxLength: 10,
    pattern: '^\\d{4}-\\d{2}-\\d{2}$',
  };
}

function month(description: string): JSONSchema {
  return {
    type: 'string',
    description,
    minLength: 7,
    maxLength: 7,
    pattern: '^\\d{4}-(0[1-9]|1[0-2])$',
  };
}

function nullableDate(description: string): JSONSchema {
  return {
    description,
    anyOf: [date(description), { type: 'null', description }],
  };
}

function closed(
  properties: Record<string, JSONSchema>,
  required: string[] = [],
): JSONSchema {
  return {
    type: 'object',
    properties,
    required,
    additionalProperties: false,
  };
}

function noArgs(): JSONSchema {
  return closed({});
}

function accountId(label = 'Stable account identifier.'): JSONSchema {
  return identifier(label);
}

function transactionId(): JSONSchema {
  return identifier('Stable transaction identifier.');
}

function cardId(): JSONSchema {
  return identifier('Stable card identifier.');
}

function paymentId(): JSONSchema {
  return identifier('Stable scheduled or recurring payment identifier.');
}

function payeeId(): JSONSchema {
  return identifier('Stable saved-payee identifier.');
}

function goalId(): JSONSchema {
  return identifier('Stable savings-goal identifier.');
}

function readDateRange(): Record<string, JSONSchema> {
  return {
    from: date('Inclusive start date in YYYY-MM-DD format.'),
    to: date('Inclusive end date in YYYY-MM-DD format.'),
  };
}

function transactionFilters(mode: 'search' | 'spending'): Record<string, JSONSchema> {
  return {
    query: text('Optional bounded merchant, memo, or category search text.', 120),
    accountId: accountId(),
    category: text('Exact transaction category.', 50),
    ...(mode === 'search' ? {
      direction: choice('Transaction direction.', ['credit', 'debit']),
    } : {}),
    status: choice('Transaction posting status.', ['pending', 'posted', 'declined']),
    ...readDateRange(),
    minimumMinor: money('Minimum amount in ATC minor units.', true),
    maximumMinor: money('Maximum amount in ATC minor units.', true),
    ...(mode === 'search' ? {
      limit: integer('Maximum number of transactions to return.', 1, 100),
    } : {}),
  };
}

function sourceAmountFloor(): Record<string, JSONSchema> {
  return {
    sourceAccountId: accountId('Stable source-account identifier.'),
    amountMinor: money('Amount in ATC minor units.'),
    balanceFloorMinor: money('Minimum source balance after the operation.', true),
  };
}

function note(): JSONSchema {
  return text('Optional plain-text note stored only on this device.', 240);
}

export const TOOL_INPUT_SCHEMAS: Record<OperationName, JSONSchema> = {
  get_overview: noArgs(),
  list_accounts: noArgs(),
  get_account: closed({ accountId: accountId() }, ['accountId']),
  search_transactions: closed(transactionFilters('search')),
  get_transaction: closed({ transactionId: transactionId() }, ['transactionId']),
  get_spending_summary: closed(transactionFilters('spending')),
  get_cash_flow: closed({ accountId: accountId(), ...readDateRange() }),
  get_income_summary: closed({ accountId: accountId(), ...readDateRange() }),
  list_recurring_activity: noArgs(),
  list_payees: noArgs(),
  list_scheduled_payments: noArgs(),
  list_cards: noArgs(),
  get_card_controls: closed({ cardId: cardId() }, ['cardId']),
  list_budgets: noArgs(),
  list_goals: noArgs(),
  list_subscriptions: noArgs(),
  get_agent_audit: closed({
    limit: integer('Maximum number of safe audit entries to return.', 1, 100),
  }),
  get_security_status: noArgs(),

  transfer_money: closed({
    ...sourceAmountFloor(),
    destinationAccountId: accountId('Stable destination-account identifier.'),
    note: note(),
  }, ['sourceAccountId', 'destinationAccountId', 'amountMinor']),
  pay_payee: closed({
    ...sourceAmountFloor(),
    payeeId: payeeId(),
    note: note(),
  }, ['sourceAccountId', 'payeeId', 'amountMinor']),
  schedule_payment: closed({
    ...sourceAmountFloor(),
    payeeId: payeeId(),
    date: date('Future payment date in YYYY-MM-DD format.'),
    note: note(),
  }, ['sourceAccountId', 'payeeId', 'amountMinor', 'date']),
  create_recurring_payment: closed({
    ...sourceAmountFloor(),
    payeeId: payeeId(),
    frequency: choice('Payment cadence.', ['weekly', 'fortnightly', 'monthly']),
    nextDate: date('First payment date in YYYY-MM-DD format.'),
    endDate: nullableDate('Optional final payment date, or null for no end date.'),
    note: note(),
  }, ['sourceAccountId', 'payeeId', 'amountMinor', 'frequency', 'nextDate']),
  update_recurring_payment: closed({
    paymentId: paymentId(),
    amountMinor: money('New amount in ATC minor units.'),
    balanceFloorMinor: money('Reconfirmed minimum source balance.', true),
    frequency: choice('New payment cadence.', ['weekly', 'fortnightly', 'monthly']),
    nextDate: date('New next-payment date in YYYY-MM-DD format.'),
    endDate: nullableDate('Optional final payment date, or null for no end date.'),
  }, ['paymentId']),
  pause_recurring_payment: closed({ paymentId: paymentId() }, ['paymentId']),
  resume_recurring_payment: closed({ paymentId: paymentId() }, ['paymentId']),
  cancel_scheduled_payment: closed({ paymentId: paymentId() }, ['paymentId']),
  retry_failed_payment: closed({
    paymentId: paymentId(),
    balanceFloorMinor: money('Reconfirmed minimum source balance.', true),
  }, ['paymentId']),
  request_money: closed({
    from: text('Name of the person asked to pay.', 80),
    amountMinor: money('Requested amount in ATC minor units.'),
    note: note(),
  }, ['from', 'amountMinor']),
  add_payee: closed({
    name: text('Payee display name.', 80),
    accountAlias: text('Masked fictional destination alias.', 80),
    trusted: bool('Whether the saved payee is marked trusted.'),
  }, ['name', 'accountAlias']),
  update_payee: closed({
    payeeId: payeeId(),
    name: text('Replacement payee display name.', 80),
    accountAlias: text('Replacement masked destination alias.', 80),
    trusted: bool('Whether the saved payee is marked trusted.'),
  }, ['payeeId']),
  remove_payee: closed({ payeeId: payeeId() }, ['payeeId']),

  set_card_freeze: closed({
    cardId: cardId(),
    frozen: bool('True to freeze the card; false to unfreeze it.'),
  }, ['cardId', 'frozen']),
  set_card_limit: closed({
    cardId: cardId(),
    limitMinor: money('New card limit in ATC minor units.'),
  }, ['cardId', 'limitMinor']),
  set_merchant_control: closed({
    cardId: cardId(),
    category: text('Bounded merchant category to allow or block.', 50),
    enabled: bool('True to allow this category; false to block it.'),
  }, ['cardId', 'category', 'enabled']),
  set_online_payments: closed({
    cardId: cardId(),
    enabled: bool('Whether online card payments are allowed.'),
  }, ['cardId', 'enabled']),
  set_contactless: closed({
    cardId: cardId(),
    enabled: bool('Whether contactless card payments are allowed.'),
  }, ['cardId', 'enabled']),
  set_travel_mode: closed({
    cardId: cardId(),
    enabled: bool('Whether fictional travel mode is enabled.'),
  }, ['cardId', 'enabled']),
  reveal_card_pin: closed({ cardId: cardId() }, ['cardId']),
  report_card_lost: closed({ cardId: cardId() }, ['cardId']),
  replace_card: closed({ cardId: cardId() }, ['cardId']),

  create_budget: closed({
    category: text('Budget category name.', 50),
    limitMinor: money('Monthly budget limit in ATC minor units.'),
    rollover: bool('Whether unused budget rolls into the next month.'),
  }, ['category', 'limitMinor']),
  update_budget: closed({
    budgetId: identifier('Stable budget identifier.'),
    limitMinor: money('New monthly budget limit in ATC minor units.'),
    rollover: bool('Whether unused budget rolls into the next month.'),
  }, ['budgetId']),
  create_savings_goal: closed({
    name: text('Savings-goal name.', 60),
    accountId: accountId('Stable account that backs this savings goal.'),
    targetMinor: money('Savings target in ATC minor units.'),
    deadline: date('Savings deadline in YYYY-MM-DD format.'),
  }, ['name', 'accountId', 'targetMinor', 'deadline']),
  update_savings_goal: closed({
    goalId: goalId(),
    name: text('Replacement savings-goal name.', 60),
    targetMinor: money('New savings target in ATC minor units.'),
    deadline: date('New savings deadline in YYYY-MM-DD format.'),
  }, ['goalId']),
  fund_savings_goal: closed({
    goalId: goalId(),
    ...sourceAmountFloor(),
  }, ['goalId', 'sourceAccountId', 'amountMinor']),
  withdraw_from_goal: closed({
    goalId: goalId(),
    destinationAccountId: accountId('Stable destination-account identifier.'),
    amountMinor: money('Amount to withdraw in ATC minor units.'),
  }, ['goalId', 'destinationAccountId', 'amountMinor']),
  categorize_transaction: closed({
    transactionId: transactionId(),
    category: text('Replacement transaction category.', 50),
  }, ['transactionId', 'category']),
  add_transaction_note: closed({
    transactionId: transactionId(),
    note: text('Replacement plain-text transaction note.', 240),
  }, ['transactionId', 'note']),
  prepare_monthly_plan: closed({
    month: month('Planning month in YYYY-MM format.'),
  }, ['month']),

  start_transaction_dispute: closed({
    transactionId: transactionId(),
    reason: text('Reason for opening the dispute.', 120),
    evidenceNote: text('Optional initial evidence note.', 500),
  }, ['transactionId', 'reason']),
  add_dispute_note: closed({
    disputeId: identifier('Stable open-dispute identifier.'),
    note: text('Evidence note to append to the dispute.', 500),
  }, ['disputeId', 'note']),
  secure_suspicious_charge: closed({
    transactionId: transactionId(),
    reason: text('Reason this card charge is suspicious.', 120),
  }, ['transactionId']),
  create_support_case: closed({
    topic: text('Short support topic.', 80),
    detail: text('Plain-text support request detail.', 500),
  }, ['topic', 'detail']),
  set_alert_preference: closed({
    event: choice('Alert event type.', ['large-payment', 'low-balance', 'card-use', 'security']),
    channel: choice('Local simulated delivery channel.', ['in-app', 'email-simulation']),
    thresholdMinor: money('Optional alert threshold in ATC minor units.', true),
    enabled: bool('Whether this alert is enabled.'),
  }, ['event', 'channel', 'enabled']),
  set_accessibility_mode: closed({
    mode: choice('Accessibility preference to change.', [
      'largeText',
      'highContrast',
      'reducedMotion',
      'plainLanguage',
    ]),
    enabled: bool('Whether the selected accessibility preference is enabled.'),
  }, ['mode', 'enabled']),
  manage_trusted_contact: closed({
    action: choice('Whether to set or remove the trusted contact.', ['set', 'remove']),
    contact: closed({
      name: text('Trusted-contact name.', 80),
      relationship: text('Trusted-contact relationship.', 60),
      contact: text('Bounded fictional contact detail.', 120),
    }, ['name', 'relationship', 'contact']),
  }, ['action']),
};

export const DECLARATIVE_INPUT_SCHEMAS: Record<DeclarativeToolName, JSONSchema> = {
  filter_transactions_form: closed({
    query: text('Optional merchant, memo, or category search text.', 120),
    accountId: accountId(),
    category: text('Exact transaction category.', 50),
    direction: choice('Transaction direction.', ['credit', 'debit']),
    status: choice('Transaction posting status.', ['pending', 'posted', 'declined']),
    ...readDateRange(),
    limit: integer('Maximum number of transactions to return.', 1, 100),
  }),
  choose_statement_period: closed({
    accountId: accountId(),
    from: date('Inclusive statement start date in YYYY-MM-DD format.'),
    to: date('Inclusive statement end date in YYYY-MM-DD format.'),
  }, ['accountId', 'from', 'to']),
  compare_report_periods: closed({
    accountId: accountId(),
    currentFrom: date('Current period start date in YYYY-MM-DD format.'),
    currentTo: date('Current period end date in YYYY-MM-DD format.'),
    previousFrom: date('Comparison period start date in YYYY-MM-DD format.'),
    previousTo: date('Comparison period end date in YYYY-MM-DD format.'),
  }, ['currentFrom', 'currentTo', 'previousFrom', 'previousTo']),
  filter_agent_audit: closed({
    limit: integer('Maximum number of safe audit entries to inspect.', 1, 100),
    outcome: choice('Optional audit outcome filter.', [
      'success',
      'cancelled',
      'rejected',
      'recovered',
    ]),
    query: text('Optional bounded event or safe-detail search text.', 80),
  }),
};

function fail(path: string, message: string): never {
  throw new Error(`${path} ${message}`);
}

function validateValue(value: unknown, schema: JSONSchema, path: string): void {
  if (schema.anyOf) {
    const valid = schema.anyOf.some((candidate) => {
      try {
        validateValue(value, candidate, path);
        return true;
      } catch {
        return false;
      }
    });
    if (!valid) fail(path, 'does not match the declared schema');
    return;
  }

  switch (schema.type) {
    case 'object': {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        fail(path, 'must be an object');
      }
      const record = value as Record<string, unknown>;
      const properties = schema.properties ?? {};
      for (const required of schema.required ?? []) {
        if (record[required] === undefined) fail(`${path}.${required}`, 'is required');
      }
      if (schema.additionalProperties === false) {
        const unknown = Object.keys(record).find((key) => !(key in properties));
        if (unknown) fail(`${path}.${unknown}`, 'is not accepted');
      }
      for (const [key, nested] of Object.entries(properties)) {
        if (record[key] !== undefined) validateValue(record[key], nested, `${path}.${key}`);
      }
      return;
    }
    case 'string': {
      if (typeof value !== 'string') fail(path, 'must be text');
      if (schema.minLength !== undefined && value.length < schema.minLength) {
        fail(path, `must contain at least ${schema.minLength} characters`);
      }
      if (schema.maxLength !== undefined && value.length > schema.maxLength) {
        fail(path, `must contain at most ${schema.maxLength} characters`);
      }
      if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
        fail(path, 'has an invalid format');
      }
      if (schema.enum && !schema.enum.includes(value)) fail(path, 'is not supported');
      return;
    }
    case 'integer':
      if (!Number.isSafeInteger(value)) fail(path, 'must be a safe integer');
      if (schema.minimum !== undefined && (value as number) < schema.minimum) {
        fail(path, `must be at least ${schema.minimum}`);
      }
      if (schema.maximum !== undefined && (value as number) > schema.maximum) {
        fail(path, `must not exceed ${schema.maximum}`);
      }
      return;
    case 'number':
      if (typeof value !== 'number' || !Number.isFinite(value)) fail(path, 'must be a number');
      return;
    case 'boolean':
      if (typeof value !== 'boolean') fail(path, 'must be true or false');
      return;
    case 'null':
      if (value !== null) fail(path, 'must be null');
      return;
    default:
      fail(path, 'uses an unsupported schema');
  }
}

export function validateToolArgs(
  operation: OperationName,
  args: unknown,
): Record<string, unknown> {
  validateValue(args, TOOL_INPUT_SCHEMAS[operation], 'arguments');
  return structuredClone(args) as Record<string, unknown>;
}

export function validateDeclarativeArgs(
  toolName: DeclarativeToolName,
  args: unknown,
): Record<string, unknown> {
  validateValue(args, DECLARATIVE_INPUT_SCHEMAS[toolName], 'arguments');
  return structuredClone(args) as Record<string, unknown>;
}
