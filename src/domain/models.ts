export type MinorATC = number & { readonly __minorATC: unique symbol };

export type AccountStatus = 'active' | 'frozen' | 'closed';
export type TransactionStatus = 'pending' | 'posted' | 'declined';
export type CardStatus = 'active' | 'frozen' | 'lost' | 'replaced';

export interface AccessibilitySettings {
  largeText: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
  plainLanguage: boolean;
}

export interface UserPreferences {
  agentAccessUnlocked: boolean;
  accessibility: AccessibilitySettings;
  trustedContact: TrustedContact | null;
}

export interface User {
  id: string;
  displayName: string;
  username: string;
  preferences: UserPreferences;
}

export interface Account {
  id: string;
  name: string;
  type: 'current' | 'savings' | 'vault';
  balance: MinorATC;
  availableBalance: MinorATC;
  currency: 'ATC';
  status: AccountStatus;
  maskedIdentifier: string;
  balanceFloor: MinorATC;
}

export interface Transaction {
  id: string;
  accountId: string;
  cardId?: string;
  direction: 'credit' | 'debit';
  amount: MinorATC;
  merchant: string;
  category: string;
  date: string;
  status: TransactionStatus;
  memo: string;
  disputeStatus: 'eligible' | 'open' | 'resolved' | 'ineligible';
}

export interface Payee {
  id: string;
  name: string;
  accountAlias: string;
  trusted: boolean;
  lastPaidDate: string | null;
}

export interface PaymentRecurrence {
  frequency: 'weekly' | 'fortnightly' | 'monthly';
  nextDate: string;
  endDate: string | null;
}

export interface Payment {
  id: string;
  sourceAccountId: string;
  destinationAccountId?: string;
  payeeId?: string;
  requestFrom?: string;
  amount: MinorATC;
  balanceFloor: MinorATC;
  date: string;
  recurrence: PaymentRecurrence | null;
  status: 'scheduled' | 'completed' | 'paused' | 'failed' | 'cancelled' | 'requested';
  note: string;
}

export interface MerchantControl {
  category: string;
  enabled: boolean;
}

export interface Card {
  id: string;
  accountId: string;
  maskedNumber: string;
  type: 'physical' | 'virtual';
  status: CardStatus;
  limit: MinorATC;
  merchantControls: MerchantControl[];
  onlinePayments: boolean;
  contactless: boolean;
  travelMode: boolean;
  pinHint: string;
}

export interface Budget {
  id: string;
  category: string;
  period: 'monthly';
  limit: MinorATC;
  spent: MinorATC;
  rollover: boolean;
}

export interface Goal {
  id: string;
  name: string;
  accountId: string;
  target: MinorATC;
  savedAmount: MinorATC;
  deadline: string;
  status: 'active' | 'completed';
}

export interface Subscription {
  id: string;
  merchant: string;
  amount: MinorATC;
  frequency: 'monthly' | 'yearly';
  nextDate: string;
  status: 'active' | 'cancelled';
}

export interface Dispute {
  id: string;
  transactionId: string;
  reason: string;
  evidenceNote: string;
  status: 'open' | 'under-review' | 'resolved';
  createdDate: string;
}

export interface AlertPreference {
  id: string;
  event: 'large-payment' | 'low-balance' | 'card-use' | 'security';
  channel: 'in-app' | 'email-simulation';
  threshold: MinorATC | null;
  enabled: boolean;
}

export interface SupportCase {
  id: string;
  topic: string;
  detail: string;
  status: 'open' | 'closed';
  createdDate: string;
}

export interface TrustedContact {
  name: string;
  relationship: string;
  contact: string;
}

export interface AgentAction {
  id: string;
  tool: string;
  argumentsDigest: string;
  riskLevel: 'read' | 'low' | 'medium' | 'high' | 'critical';
  preview: string[];
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'expired';
  createdAt: string;
  confirmedAt: string | null;
  completedAt: string | null;
}

export interface AuditEvent {
  id: string;
  actor: 'user' | 'agent' | 'system';
  eventType: string;
  target: string;
  outcome: 'success' | 'cancelled' | 'rejected' | 'recovered';
  timestamp: string;
  safeDetail: string;
}

export interface BankState {
  schemaVersion: 1;
  stateVersion: number;
  user: User;
  accounts: Account[];
  transactions: Transaction[];
  payees: Payee[];
  payments: Payment[];
  cards: Card[];
  budgets: Budget[];
  goals: Goal[];
  disputes: Dispute[];
  alerts: AlertPreference[];
  subscriptions: Subscription[];
  supportCases: SupportCase[];
  agentActions: AgentAction[];
  audit: AuditEvent[];
  usedIdempotencyKeys: string[];
  recoveryNotice?: string;
}
