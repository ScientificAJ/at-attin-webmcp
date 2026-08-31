import type {
  Account,
  AuditEvent,
  BankState,
  Budget,
  Card,
  Goal,
  MinorATC,
  Payee,
  Payment,
  Subscription,
  Transaction,
} from './models';

function asMinor(value: number): MinorATC {
  if (!Number.isSafeInteger(value)) {
    throw new Error('Bank state contains an invalid ATC amount');
  }
  return value as MinorATC;
}

function copy<T>(value: T): T {
  return structuredClone(value);
}

export interface OverviewProjection {
  totalBalance: MinorATC;
  totalAvailable: MinorATC;
  accountCount: number;
  accounts: Array<Pick<Account, 'id' | 'name' | 'balance' | 'availableBalance' | 'status'>>;
}

export function selectOverview(state: Readonly<BankState>): OverviewProjection {
  return {
    totalBalance: asMinor(state.accounts.reduce((sum, account) => sum + account.balance, 0)),
    totalAvailable: asMinor(
      state.accounts.reduce((sum, account) => sum + account.availableBalance, 0),
    ),
    accountCount: state.accounts.length,
    accounts: state.accounts.map(({ id, name, balance, availableBalance, status }) => ({
      id,
      name,
      balance,
      availableBalance,
      status,
    })),
  };
}

export function selectAccounts(state: Readonly<BankState>): Account[] {
  return copy(state.accounts);
}

export function selectAccount(state: Readonly<BankState>, accountId: string): Account {
  const account = state.accounts.find(({ id }) => id === accountId);
  if (!account) {
    throw new Error('Account was not found');
  }
  return copy(account);
}

export interface TransactionSearch {
  query?: string;
  accountId?: string;
  category?: string;
  direction?: Transaction['direction'];
  status?: Transaction['status'];
  from?: string;
  to?: string;
  minimumMinor?: MinorATC;
  maximumMinor?: MinorATC;
  limit?: number;
}

export function searchTransactions(
  state: Readonly<BankState>,
  filters: TransactionSearch = {},
): Transaction[] {
  const query = filters.query?.trim().toLocaleLowerCase('en-US') ?? '';
  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 100);

  return copy(state.transactions.filter((transaction) => {
    const searchable = `${transaction.merchant} ${transaction.memo} ${transaction.category}`
      .toLocaleLowerCase('en-US');
    return (!query || searchable.includes(query))
      && (!filters.accountId || transaction.accountId === filters.accountId)
      && (!filters.category || transaction.category === filters.category)
      && (!filters.direction || transaction.direction === filters.direction)
      && (!filters.status || transaction.status === filters.status)
      && (!filters.from || transaction.date >= filters.from)
      && (!filters.to || transaction.date <= filters.to)
      && (filters.minimumMinor === undefined || transaction.amount >= filters.minimumMinor)
      && (filters.maximumMinor === undefined || transaction.amount <= filters.maximumMinor);
  }).slice(0, limit));
}

export function selectTransaction(
  state: Readonly<BankState>,
  transactionId: string,
): Transaction {
  const transaction = state.transactions.find(({ id }) => id === transactionId);
  if (!transaction) {
    throw new Error('Transaction was not found');
  }
  return copy(transaction);
}

export interface SpendingSummary {
  totalSpent: MinorATC;
  byCategory: Array<{ category: string; amount: MinorATC }>;
}

export function selectSpendingSummary(
  state: Readonly<BankState>,
  filters: Omit<TransactionSearch, 'direction'> = {},
): SpendingSummary {
  const debits = searchTransactions(state, { ...filters, direction: 'debit' });
  const categoryTotals = new Map<string, number>();
  for (const transaction of debits) {
    categoryTotals.set(
      transaction.category,
      (categoryTotals.get(transaction.category) ?? 0) + transaction.amount,
    );
  }
  return {
    totalSpent: asMinor(debits.reduce((sum, item) => sum + item.amount, 0)),
    byCategory: Array.from(categoryTotals, ([category, amount]) => ({
      category,
      amount: asMinor(amount),
    })).sort((left, right) => right.amount - left.amount),
  };
}

export interface CashFlowProjection {
  inflow: MinorATC;
  outflow: MinorATC;
  net: MinorATC;
}

export function selectCashFlow(
  state: Readonly<BankState>,
  filters: Pick<TransactionSearch, 'accountId' | 'from' | 'to'> = {},
): CashFlowProjection {
  const transactions = searchTransactions(state, { ...filters, status: 'posted', limit: 100 });
  const inflow = asMinor(transactions
    .filter(({ direction }) => direction === 'credit')
    .reduce((sum, item) => sum + item.amount, 0));
  const outflow = asMinor(transactions
    .filter(({ direction }) => direction === 'debit')
    .reduce((sum, item) => sum + item.amount, 0));
  return { inflow, outflow, net: asMinor(inflow - outflow) };
}

export function selectIncomeSummary(
  state: Readonly<BankState>,
  filters: Pick<TransactionSearch, 'accountId' | 'from' | 'to'> = {},
) {
  const credits = searchTransactions(state, {
    ...filters,
    direction: 'credit',
    status: 'posted',
    limit: 100,
  });
  return {
    totalIncome: asMinor(credits.reduce((sum, item) => sum + item.amount, 0)),
    transactions: credits,
  };
}

export function selectRecurringActivity(state: Readonly<BankState>): Subscription[] {
  return copy(state.subscriptions.filter(({ status }) => status === 'active'));
}

export function selectPayees(state: Readonly<BankState>): Payee[] {
  return copy(state.payees);
}

export function selectScheduledPayments(state: Readonly<BankState>): Payment[] {
  return copy(state.payments.filter(({ status }) => ['scheduled', 'paused'].includes(status)));
}

export function selectCards(state: Readonly<BankState>): Card[] {
  return copy(state.cards);
}

export function selectCardControls(state: Readonly<BankState>, cardId: string): Card {
  const card = state.cards.find(({ id }) => id === cardId);
  if (!card) {
    throw new Error('Card was not found');
  }
  return copy(card);
}

export function selectBudgets(state: Readonly<BankState>): Budget[] {
  return copy(state.budgets);
}

export function selectGoals(state: Readonly<BankState>): Goal[] {
  return copy(state.goals);
}

export function selectSubscriptions(state: Readonly<BankState>): Subscription[] {
  return copy(state.subscriptions);
}

export function selectAgentAudit(state: Readonly<BankState>, limit = 50): AuditEvent[] {
  return copy(state.audit.slice(-Math.min(Math.max(limit, 1), 100)).reverse());
}

export function selectSecurityStatus(state: Readonly<BankState>) {
  return {
    agentAccessUnlocked: state.user.preferences.agentAccessUnlocked,
    activeCards: state.cards.filter(({ status }) => status === 'active').length,
    frozenCards: state.cards.filter(({ status }) => status === 'frozen').length,
    openDisputes: state.disputes.filter(({ status }) => status !== 'resolved').length,
    trustedContactConfigured: state.user.preferences.trustedContact !== null,
  };
}

export function selectStatement(
  state: Readonly<BankState>,
  accountId: string,
  from: string,
  to: string,
) {
  return {
    account: selectAccount(state, accountId),
    transactions: searchTransactions(state, { accountId, from, to, limit: 100 }),
  };
}
