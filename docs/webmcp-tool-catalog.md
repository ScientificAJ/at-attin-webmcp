# At Attin WebMCP tool catalogue

At Attin exposes exactly **60 browser-native WebMCP surfaces** while the single user is signed in and Agent Access is unlocked: **56 imperative tools** registered through `document.modelContext.registerTool(...)` and **four declarative form tools**. There is no built-in assistant, parser, model, or deterministic banking agent.

Every surface uses a closed, bounded schema and pauses on an At Attin-owned confirmation before protected data is returned or fictional banking state changes. `Yes` below means the visible **Yes, confirm** control. `Typed YES` means the user must first type uppercase `YES`, then activate that control with a trusted human gesture.

Money inputs are integer ATC minor units. Identifiers are stable fictional IDs. Optional inputs are marked `?`.

## Account and insight tools — 18

| # | Tool | Inputs | Effect | Risk | Confirmation |
|---:|---|---|---|---|---|
| 1 | `get_overview` | — | Discloses total and per-account balances. | Read | Yes |
| 2 | `list_accounts` | — | Discloses account names, balances, status, and masked identifiers. | Read | Yes |
| 3 | `get_account` | `accountId` | Discloses one account summary. | Read | Yes |
| 4 | `search_transactions` | `query?`, `accountId?`, `category?`, `direction?`, `status?`, `from?`, `to?`, `minimumMinor?`, `maximumMinor?`, `limit?` | Returns a bounded filtered transaction list. | Read, untrusted content | Yes |
| 5 | `get_transaction` | `transactionId` | Discloses one transaction and local note. | Read, untrusted content | Yes |
| 6 | `get_spending_summary` | `query?`, `accountId?`, `category?`, `status?`, `from?`, `to?`, `minimumMinor?`, `maximumMinor?` | Summarizes outgoing ATC and categories. | Read, untrusted content | Yes |
| 7 | `get_cash_flow` | `accountId?`, `from?`, `to?` | Discloses inflow, outflow, and net position. | Read | Yes |
| 8 | `get_income_summary` | `accountId?`, `from?`, `to?` | Summarizes incoming ATC and matching transactions. | Read, untrusted content | Yes |
| 9 | `list_recurring_activity` | — | Discloses detected recurring merchants, amounts, and dates. | Read, untrusted content | Yes |
| 10 | `list_payees` | — | Discloses saved payees, masked aliases, and trust status. | Read, untrusted content | Yes |
| 11 | `list_scheduled_payments` | — | Discloses upcoming, paused, failed, or cancelled payments. | Read, untrusted content | Yes |
| 12 | `list_cards` | — | Discloses masked cards, linked accounts, types, and status; never the PIN. | Read, untrusted content | Yes |
| 13 | `get_card_controls` | `cardId` | Discloses one card's limit and controls; never the PIN. | Read, untrusted content | Yes |
| 14 | `list_budgets` | — | Discloses budget limits and progress. | Read, untrusted content | Yes |
| 15 | `list_goals` | — | Discloses savings targets, balances, and deadlines. | Read, untrusted content | Yes |
| 16 | `list_subscriptions` | — | Discloses subscription merchants, cadence, and next dates. | Read, untrusted content | Yes |
| 17 | `get_agent_audit` | `limit?` | Discloses a bounded safe WebMCP activity journal. | Read, untrusted content | Yes |
| 18 | `get_security_status` | — | Discloses Agent Access, cards, disputes, and trusted-contact status. | Read | Yes |

## Payment and payee tools — 13

| # | Tool | Inputs | Effect | Risk | Confirmation |
|---:|---|---|---|---|---|
| 19 | `transfer_money` | `sourceAccountId`, `destinationAccountId`, `amountMinor`, `balanceFloorMinor?`, `note?` | Moves fictional ATC between owned accounts and enforces the effective floor. | High | Yes |
| 20 | `pay_payee` | `sourceAccountId`, `payeeId`, `amountMinor`, `balanceFloorMinor?`, `note?` | Pays one saved payee and records a completed payment. | High | Yes |
| 21 | `schedule_payment` | `sourceAccountId`, `payeeId`, `amountMinor`, `date`, `balanceFloorMinor?`, `note?` | Creates one future payment with a persisted floor. | High | Yes |
| 22 | `create_recurring_payment` | `sourceAccountId`, `payeeId`, `amountMinor`, `frequency`, `nextDate`, `balanceFloorMinor?`, `endDate?`, `note?` | Creates a weekly, fortnightly, or monthly schedule. | High | Yes |
| 23 | `update_recurring_payment` | `paymentId`, `amountMinor?`, `balanceFloorMinor?`, `frequency?`, `nextDate?`, `endDate?` | Changes a recurring schedule and reconfirms any supplied floor. | High | Yes |
| 24 | `pause_recurring_payment` | `paymentId` | Pauses one active recurring schedule. | Medium | Yes |
| 25 | `resume_recurring_payment` | `paymentId` | Resumes one eligible paused schedule. | Medium | Yes |
| 26 | `cancel_scheduled_payment` | `paymentId` | Cancels one eligible scheduled or recurring payment. | Medium | Yes |
| 27 | `retry_failed_payment` | `paymentId`, `balanceFloorMinor?` | Retries one failed payment using the effective protected floor. | High | Yes |
| 28 | `request_money` | `from`, `amountMinor`, `note?` | Creates a device-local fictional money request; no funds move. | Low | Yes |
| 29 | `add_payee` | `name`, `accountAlias`, `trusted?` | Adds one bounded fictional payee. | Medium | Yes |
| 30 | `update_payee` | `payeeId`, `name?`, `accountAlias?`, `trusted?` | Updates a payee and previews affected schedules. | Medium; high if destination changes | Yes |
| 31 | `remove_payee` | `payeeId` | Removes an eligible payee while preserving completed history. | High | Yes |

## Card tools — 9

| # | Tool | Inputs | Effect | Risk | Confirmation |
|---:|---|---|---|---|---|
| 32 | `set_card_freeze` | `cardId`, `frozen` | Freezes or unfreezes one manageable card. | High | Yes |
| 33 | `set_card_limit` | `cardId`, `limitMinor` | Changes one fictional card limit. | High | Yes |
| 34 | `set_merchant_control` | `cardId`, `category`, `enabled` | Allows or blocks a normalized merchant category. | Medium | Yes |
| 35 | `set_online_payments` | `cardId`, `enabled` | Enables or disables online card payments. | Medium | Yes |
| 36 | `set_contactless` | `cardId`, `enabled` | Enables or disables contactless payments. | Medium | Yes |
| 37 | `set_travel_mode` | `cardId`, `enabled` | Enables or disables fictional travel mode. | Medium | Yes |
| 38 | `reveal_card_pin` | `cardId` | Discloses a fictional PIN on-device without mutating state. | Critical read | Typed YES |
| 39 | `report_card_lost` | `cardId` | Irreversibly marks one card lost. | Critical | Typed YES |
| 40 | `replace_card` | `cardId` | Retires one card and creates a frozen fictional replacement. | Critical | Typed YES |

## Planning and transaction tools — 9

| # | Tool | Inputs | Effect | Risk | Confirmation |
|---:|---|---|---|---|---|
| 41 | `create_budget` | `category`, `limitMinor`, `rollover?` | Creates one monthly category budget. | Medium | Yes |
| 42 | `update_budget` | `budgetId`, `limitMinor?`, `rollover?` | Changes one budget limit or rollover setting. | Medium | Yes |
| 43 | `create_savings_goal` | `name`, `accountId`, `targetMinor`, `deadline` | Creates an account-backed savings goal. | Medium | Yes |
| 44 | `update_savings_goal` | `goalId`, `name?`, `targetMinor?`, `deadline?` | Changes one goal's name, target, or deadline. | Medium | Yes |
| 45 | `fund_savings_goal` | `goalId`, `sourceAccountId`, `amountMinor`, `balanceFloorMinor?` | Moves fictional ATC into a goal and reserves its backing balance. | High | Yes |
| 46 | `withdraw_from_goal` | `goalId`, `destinationAccountId`, `amountMinor` | Moves available saved ATC out of a goal. | High | Yes |
| 47 | `categorize_transaction` | `transactionId`, `category` | Replaces one local transaction category. | Low | Yes |
| 48 | `add_transaction_note` | `transactionId`, `note` | Replaces one bounded device-local transaction note. | Low | Yes |
| 49 | `prepare_monthly_plan` | `month` | Discloses a plan from budgets, goals, subscriptions, and payments. | Read, untrusted content | Yes |

## Support, safety, and preference tools — 7

| # | Tool | Inputs | Effect | Risk | Confirmation |
|---:|---|---|---|---|---|
| 50 | `start_transaction_dispute` | `transactionId`, `reason`, `evidenceNote?` | Opens one fictional dispute. | Critical | Typed YES |
| 51 | `add_dispute_note` | `disputeId`, `note` | Appends bounded evidence to an open dispute. | Medium | Yes |
| 52 | `secure_suspicious_charge` | `transactionId`, `reason` | Atomically freezes the linked card and opens exactly one dispute. | Critical | Typed YES |
| 53 | `create_support_case` | `topic`, `detail` | Creates one device-local fictional support case. | Medium | Yes |
| 54 | `set_alert_preference` | `event`, `channel`, `enabled`, `thresholdMinor?` | Changes one local simulated alert preference. | Low | Yes |
| 55 | `set_accessibility_mode` | `mode`, `enabled` | Changes large text, high contrast, reduced motion, or plain language. | Low | Yes |
| 56 | `manage_trusted_contact` | `action`, `contact?` | Sets or removes the device-local trusted contact. | High to set; critical to remove | Yes to set; typed YES to remove |

## Declarative form tools — 4

These visible forms receive native `toolname` and `tooldescription` annotations only while Agent Access is unlocked. Their `toolactivated` and `toolcancel` events are filtered by exact tool name and use the same bridge, confirmation, cancellation, audit, and output limits as imperative tools.

| # | Tool | Inputs | Effect | Risk | Confirmation |
|---:|---|---|---|---|---|
| 57 | `filter_transactions_form` | `query?`, `accountId?`, `category?`, `direction?`, `status?`, `from?`, `to?`, `limit?` | Discloses a bounded filtered transaction view. | Read, untrusted content | Yes |
| 58 | `choose_statement_period` | `accountId`, `from`, `to` | Discloses one account statement period. | Read | Yes |
| 59 | `compare_report_periods` | `accountId?`, `currentFrom`, `currentTo`, `previousFrom`, `previousTo` | Discloses two bounded cash-flow periods for comparison. | Read | Yes |
| 60 | `filter_agent_audit` | `limit?`, `outcome?`, `query?` | Discloses a bounded filtered safe agent journal. | Read, untrusted content | Yes |

## Contract limits

- Tool names are shorter than 30 characters; descriptions and parameter descriptions are bounded.
- Every schema is an object with `additionalProperties: false`.
- Text, identifiers, dates, amounts, and result counts have explicit limits.
- Same-origin is retained; no tool uses `exposedTo`.
- Outputs are compact JSON below 1,500 characters.
- Lock, logout, teardown, registration failure, callback abort, cancellation, expiry, stale state, replay, invalid persistence, and audit failure all fail closed.

The source of truth is `src/webmcp/catalog/`, `src/webmcp/schemas.ts`, and `src/webmcp/bridge.ts`.
