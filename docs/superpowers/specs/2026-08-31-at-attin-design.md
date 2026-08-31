# At Attin — Product and System Design Specification

**Status:** Implemented; amended to include the approved embedded Featherless agent
**Date:** 31 August 2026  
**Target:** The WebMCP Challenge  
**Product:** A single-user, fictional-money retail bank operated through normal UI and genuine browser-native WebMCP tools

## 1. Executive summary

At Attin is a complete retail-banking sandbox built around a simple proposition: banking becomes substantially more accessible when a user can state a goal to an agent and the bank exposes precise, structured WebMCP tools for completing it. The shipped prototype includes an in-site Featherless-powered agent and also supports compatible browser-native agents.

The prototype uses fictional Attin Credits (ATC), hard-coded demo credentials, device-local data and no real financial rails. It nevertheless treats agent authorization as a real security boundary. Every agent task—including read-only requests—must pause inside At Attin, display exactly what will be revealed or changed, and receive an explicit human **Yes, confirm** before the tool returns data or commits a mutation. The agent cannot approve its own work.

The product will demonstrate a coherent bank rather than a WebMCP toy: accounts, transactions, payments, schedules, cards, budgets, goals, statements, disputes, alerts, settings, security controls and an immutable-in-session agent audit trail. The visual system follows the approved warm editorial mockups in `outputs/at-attin-design/`.

## 2. Why this product should exist

Banking interfaces force people to translate real intentions—“pay these bills without taking my balance below 5,000” or “find this charge and lock the affected card”—into many screens, filters and forms. That burden is highest for older adults, first-time account holders, young users, people with disabilities and anyone unfamiliar with financial terminology.

At Attin moves the translation work to an agent while preserving human agency. WebMCP is the enabling layer because it lets the bank expose named functions and structured input schemas instead of asking an agent to infer behavior from pixels. The current WebMCP Community Group draft describes JavaScript tools exposed through `document.modelContext`, and Chrome documents both imperative JavaScript tools and declarative form tools. The proposal is still experimental, so At Attin treats progressive enhancement and clear compatibility messaging as product requirements. Sources: [WebMCP draft](https://webmachinelearning.github.io/webmcp/), [Chrome WebMCP overview](https://developer.chrome.com/docs/ai/webmcp), [imperative API](https://developer.chrome.com/docs/ai/webmcp/imperative-api), and [declarative API](https://developer.chrome.com/docs/ai/webmcp/declarative-api).

## 3. Hackathon objective and success criteria

The WebMCP Challenge evaluates four equally weighted dimensions. At Attin must satisfy them as follows:

| Criterion | At Attin evidence |
| --- | --- |
| WebMCP Leverage | A substantial, typed tool catalogue; imperative and declarative tools; secure lifecycle registration; cancellation; annotations; complex workflows; explicit in-page confirmation. |
| Execution | A polished, deployed, responsive bank whose manual and agent paths share the same validated domain operations and persistent sandbox state. |
| Potential Impact | Plain-language banking for older, young and inexperienced users, with meaningful accessibility support and reversible safeguards. |
| Creativity & Ambition | An “agent-capable bank” where the agent can perform broad tasks but cannot cross the human confirmation boundary. |

Submission readiness requires a working Sites URL, a public repository with an open-source license, clear testing credentials, a concise description and a public demo video under three minutes with audio. Official requirements remain governed by [The WebMCP Challenge rules](https://webmcp.devpost.com/rules).

## 4. Product principles

1. **Human authority is visible.** The product never hides when an agent is reading or changing data.
2. **Nothing moves without confirmation.** No WebMCP task reveals protected data or changes state before an app-owned confirmation.
3. **Plain language before banking language.** Technical terms are translated or explained in context.
4. **One dominant decision per screen.** Layout, typography and whitespace replace card grids and dense dashboards.
5. **Manual and agent paths are equal.** An agent calls the same domain operations used by the human UI and receives the same validation.
6. **Fictional money is unmistakable.** Every balance context states that ATC is fictional and has no cash value.
7. **The prototype never pretends to be production banking.** Demo authentication and device-local persistence are explicitly labeled.

## 5. Audience

### Primary users

- **Inexperienced account holder:** needs terminology explained, clear balance consequences and safe defaults.
- **Older adult:** benefits from larger type, fewer steps, unambiguous confirmation and a trustworthy activity record.
- **Young user:** wants budgets, goals, subscriptions and conversational goal completion without losing control.
- **Power user:** wants complex, multi-condition tasks completed accurately without repetitive navigation.

### Judge and evaluator

The judge must be able to sign in immediately, discover the available WebMCP tools, invoke representative workflows and understand the safeguard model without reading the source first.

## 6. Scope

### Functional prototype scope

The following areas are functional and share one seeded, resettable state:

- Authentication and session status
- Account overview and account detail
- Transaction search, filters, categories and detail
- Internal transfers and payee payments
- Scheduled and recurring payments
- Payee management and payment requests
- Card status, freeze/unfreeze, limits and merchant controls
- Budgets, savings goals and subscription review
- Statements and spending reports
- Transaction dispute initiation and fraud-report workflow
- Notifications, accessibility preferences and trusted-contact settings
- WebMCP permissions, pending confirmations, emergency lock and audit history

### Deep demo journeys

Three journeys receive the highest implementation and testing priority:

1. **Understand finances:** the agent summarizes balances and finds relevant transactions only after the user confirms what data may be read.
2. **Execute a complex payment:** the agent schedules a recurring payment with a balance floor, shows an itemized preview, and commits only after explicit confirmation.
3. **Secure an account:** the agent identifies a suspicious transaction, prepares a dispute and card freeze, then displays every consequence before confirmation.

### Explicit non-goals

- Real money, bank connections, payment processors or cryptocurrency
- Multi-user accounts or shared server state
- Real KYC, identity verification, lending or credit decisions
- A deterministic intent parser, model-direct banking execution, or autonomous background actions
- Claims of regulatory compliance or production-grade authentication
- Autonomous background execution without a present user

## 7. Information architecture

### Public state

- **Login:** hard-coded demo credentials, WebMCP readiness indicator, fictional-money disclosure.

### Authenticated navigation

- **Home:** total balance, cash flow, recent activity, upcoming items and active confirmation surface.
- **Accounts:** account ledger, account detail, statements, transactions and card controls.
- **Payments:** payees, transfers, requests, schedules and recurring payments.
- **Activity:** searchable transaction history, receipts, categories and disputes.
- **Reports:** spending, income, cash flow, statements, budgets, subscriptions, savings goals and pots.
- **Settings:** profile, alerts, accessibility, devices, support, fraud help and WebMCP Safety & Agent controls.

Desktop keeps the approved six-item horizontal editorial navigation: Home, Accounts, Payments, Activity, Reports and Settings. Cards, planning and support remain fully functional nested destinations instead of crowding the global navigation. Compact widths use a bottom navigation for the four highest-frequency destinations and an accessible **More** sheet for the rest.

## 8. Visual and interaction system

The approved master direction is `outputs/at-attin-design/home.png`, supported by login, accounts, payments and safety-agent references.

### Visual tokens

- **Canvas:** warm mineral ivory (`#F4F0E8` family)
- **Primary ink:** near black (`#11110F` family)
- **Secondary ink:** warm stone gray (`#6F6B64` family)
- **Signal:** vermilion red-orange (`#F04424` family)
- **Action surface:** tactile obsidian (`#141412` family)
- **Rules:** low-contrast stone hairlines
- **Type:** locally bundled or system sans with editorial proportions; tabular numerals for money
- **Motion:** 160–240 ms; calm easing; disabled under reduced-motion preference

### Layout rules

- Full-bleed product surface; never a dashboard floating inside a generic page card
- One large typographic anchor per route
- At most one dominant obsidian surface in a viewport
- Lists use rows and separators instead of card mosaics
- Vermilion indicates focus, connection and primary action, but never carries meaning alone
- Minimum 44×44 px interactive targets and 15–16 px body type

## 9. Banking domain model

The application uses one versioned device-local store seeded on first sign-in.

### Core records

- `User`: id, display name, username, preferences, accessibility settings
- `Account`: id, name, type, balance, available balance, currency, status
- `Transaction`: id, account id, direction, amount, merchant/payee, category, date, status, memo, dispute status
- `Payee`: id, name, account alias, trusted status, last paid date
- `Payment`: id, source account, payee, amount, date, recurrence, status, note
- `Card`: id, account id, masked number, type, status, limit, merchant controls, travel mode
- `Budget`: id, category, period, limit, spent
- `Goal`: id, name, target, saved amount, deadline
- `Dispute`: id, transaction id, reason, evidence note, status, created date
- `AlertPreference`: event, channel simulation, threshold, enabled
- `AgentAction`: id, tool, arguments digest, risk level, preview, status, created/confirmed/completed timestamps
- `AuditEvent`: id, actor, event type, target, outcome, timestamp, safe detail

### Store invariants

- ATC values are stored as integer minor units; floating-point arithmetic is prohibited.
- No account may fall below its configured floor.
- Posted transactions and account balance changes commit atomically in one reducer operation.
- Idempotency keys prevent duplicate tool commits.
- Cancelled and timed-out agent actions cannot later commit.
- Reset restores the canonical demo seed and records a local reset event.

### Canonical demo seed

The first-run and reset state is deterministic so judges can repeat every flow:

- **Total:** 42,860 ATC across three accounts
- **Daily Account:** 8,440 ATC available
- **Vault:** 24,000 ATC available
- **Rainy Day:** 10,420 ATC available
- **Recent activity:** Orbit Works −1,250 ATC; Solace Labs +3,600 ATC; Foundry Supply −980 ATC
- **Payees:** Orbit Works, Mara Vale, Foundry Supply and Northstar Energy
- **Cards:** one active Daily Account card and one frozen Vault virtual card
- **Planning:** Groceries and Transport budgets; “Lisbon” savings goal; three detected subscriptions
- **Suspicious-charge demo:** one eligible, undisputed card transaction that can drive the dispute-and-freeze hero flow

Seed identifiers are stable constants so evaluation prompts and automated tests never depend on display-string matching.

## 10. Authentication and persistence

The public demo credentials are:

- Username: `john.attin`
- Password: `attin2026`

They are intentionally visible on the login page and must be documented as prototype-only. A successful sign-in creates an in-memory session marker; banking state persists in namespaced, versioned `localStorage`. Each browser profile therefore gets an isolated sandbox, avoiding shared judge data or server-side personal information.

Logout removes the session marker, clears pending confirmations and unregisters all WebMCP tools. “Reset demo” requires a human confirmation and restores seeded local data.

## 11. WebMCP architecture

### Availability and lifecycle

- Feature-detect `document.modelContext`.
- Before login, register no banking tools.
- After login and while Agent Access is unlocked, register tools through a single registry module.
- Use an `AbortController` to unregister tools on logout, emergency lock or application teardown.
- Do not use `exposedTo`; tools remain same-origin only.
- Display `WebMCP connected`, `WebMCP unavailable`, or `Agent access locked` in the UI.

Chrome’s current guidance documents tool registration, unregistration, `AbortSignal`, same-origin defaults and tool annotations. At Attin follows those constraints and keeps descriptions concise: tool names below 30 characters, parameter descriptions below 150 characters, tool descriptions below 500 characters and individual outputs below 1.5K characters. Source: [Chrome WebMCP security guidance](https://developer.chrome.com/docs/ai/webmcp/secure-tools).

### Tool design

Imperative tools handle operations with application state or multi-step effects. Declarative WebMCP annotations are reserved for visible, low-complexity forms such as transaction filtering and statement-period selection. Auto-submit is never used for a banking mutation.

The production target is **60 meaningful WebMCP surfaces**: 56 imperative tools and four declarative tools. Each has a distinct user-facing capability; aliases and tool-count padding are prohibited.

Imperative catalogue:

#### Read and explain

- `get_overview`
- `list_accounts`
- `get_account`
- `search_transactions`
- `get_transaction`
- `get_spending_summary`
- `get_cash_flow`
- `get_income_summary`
- `list_recurring_activity`
- `list_payees`
- `list_scheduled_payments`
- `list_cards`
- `get_card_controls`
- `list_budgets`
- `list_goals`
- `list_subscriptions`
- `get_agent_audit`
- `get_security_status`

#### Payments and payees

- `transfer_money`
- `pay_payee`
- `schedule_payment`
- `create_recurring_payment`
- `update_recurring_payment`
- `pause_recurring_payment`
- `resume_recurring_payment`
- `cancel_scheduled_payment`
- `retry_failed_payment`
- `request_money`
- `add_payee`
- `update_payee`
- `remove_payee`

#### Cards

- `set_card_freeze`
- `set_card_limit`
- `set_merchant_control`
- `set_online_payments`
- `set_contactless`
- `set_travel_mode`
- `reveal_card_pin`
- `report_card_lost`
- `replace_card`

#### Planning, activity and reports

- `create_budget`
- `update_budget`
- `create_savings_goal`
- `update_savings_goal`
- `fund_savings_goal`
- `withdraw_from_goal`
- `categorize_transaction`
- `add_transaction_note`
- `prepare_monthly_plan`

#### Support and settings

- `start_transaction_dispute`
- `add_dispute_note`
- `secure_suspicious_charge`
- `create_support_case`
- `set_alert_preference`
- `set_accessibility_mode`
- `manage_trusted_contact`

The four declarative tools annotate visible, read-oriented forms and still route submission through the At Attin confirmation boundary:

- `filter_transactions_form`
- `choose_statement_period`
- `compare_report_periods`
- `filter_agent_audit`

Tools are annotated with `readOnlyHint` when they do not mutate state. Any output containing payee names, merchant names or free-form memos uses `untrustedContentHint` because such strings could contain adversarial instructions. Tool inputs use enumerated IDs, bounded strings and explicit numeric limits rather than broad free-form parameters.

### Confirmation state machine

Every WebMCP invocation follows the same app-owned state machine:

1. **Validate:** parse against the declared schema, normalize values and run domain invariants.
2. **Prepare:** compute the exact data disclosure or mutation without executing it.
3. **Present:** open the visible At Attin confirmation surface and focus it.
4. **Await:** pause the tool callback on a promise controlled only by human UI events.
5. **Confirm or cancel:** only a direct trusted user activation on the physical/keyboard **Yes, confirm** control resolves approval; the agent cannot call or synthesize approval through another WebMCP tool.
6. **Commit:** revalidate the state version, apply an idempotent atomic operation and append the audit event.
7. **Return:** provide a short structured result containing outcome, identifiers and updated safe summary.

For read-only tasks, the confirmation sheet states what information will be disclosed. For a compound task, one confirmation may authorize the single user-stated task, but the sheet itemizes every included operation and consequence. No confirmation can be reused.

### Confirmation requirements

- Only one pending agent action may exist at a time.
- Confirmation expires after 90 seconds or on navigation, logout, lock or tool cancellation.
- A changed balance or state version invalidates the preview and requires a new confirmation.
- High-impact tasks show account, amount, payee, date, fees, reversibility and resulting balance.
- Sensitive security tasks require the user to type `YES` in addition to selecting **Yes, confirm**.
- **No, cancel** is always visible, keyboard accessible and never visually hidden.
- The confirm handler rejects programmatic `.click()` calls and events without trusted user activation; confirmation has no tool, URL, form-auto-submit or keyboard-shortcut bypass.
- Tool cancellation propagates through the WebMCP `AbortSignal` and records a cancelled audit event.

## 12. Security model

### Threats considered

- Prompt injection inside merchant names, transaction memos or tool output
- Agent selecting the wrong tool or providing over-broad arguments
- Tool-description ambiguity or mismatch with actual behavior
- Duplicate execution, replay or double click
- Stale confirmation after the underlying balance changes
- Cross-origin tool discovery
- Unauthorized execution before login or after logout
- Accidental disclosure through a read-only tool
- User confusion about whether money is real

### Safeguards

- Confirmation is enforced inside the domain operation, not requested merely through agent narration.
- The tool registry and manual UI call the same typed service methods and validation.
- No WebMCP tool exists for approving a pending action or unlocking Agent Access.
- Approval tokens are single-use, bound to the prepared action digest and created only by the confirmation UI after trusted user activation.
- Same-origin exposure only; no cross-origin allowlist.
- Strict schemas, enums, input lengths, amount ceilings and payee/account IDs.
- Read-only tools still require confirmation because financial data is sensitive.
- Untrusted outputs are annotated and rendered as text, never interpreted as HTML.
- Tool output omits secrets, full account numbers and internal state.
- Global execution mutex, idempotency keys and state-version checks.
- Audit trail records actor, tool, safe parameter digest, decision and outcome.
- Emergency human-only lock unregisters all tools immediately.
- Security headers target `Permissions-Policy: tools=(self)`, origin isolation, a restrictive CSP, `Referrer-Policy: no-referrer` and MIME sniffing protection where Sites hosting permits configuration.
- No client-exposed model key, analytics service or third-party financial connection. The Featherless key is a private Sites secret, and all model-selected actions still cross the app-owned WebMCP confirmation boundary.

Chrome explicitly warns that prompt injection cannot be made perfectly safe inside a probabilistic model and recommends `untrustedContentHint`, `readOnlyHint`, cautious origin exposure and concise descriptions. At Attin treats those hints as defense-in-depth rather than authorization. Source: [WebMCP tool security](https://developer.chrome.com/docs/ai/webmcp/secure-tools).

## 13. Accessibility and low-cognitive-load UX

- WCAG 2.2 AA contrast target
- Complete keyboard operation with visible focus
- Semantic headings, landmarks, tables and form labels
- Screen-reader announcements for tool preparation, confirmation, cancellation and completion
- Large-text mode, high-contrast mode and reduced-motion support
- Plain-language alternative labels for banking terms
- Amounts always include direction, account and ATC unit
- Dates use unambiguous formats in confirmations
- Confirmation surfaces trap focus, restore focus on close and never time out silently
- Errors explain both what happened and the safe next action
- No color-only status; icons always have text equivalents

## 14. Error and recovery behavior

- **WebMCP unavailable:** the normal bank remains fully usable; a concise setup note points judges to the supported browser environment.
- **Invalid arguments:** reject before confirmation with field-level, agent-readable errors.
- **Insufficient funds or floor breach:** show the available amount and safe alternatives; do not create a pending action.
- **Stale preview:** cancel and regenerate from current state.
- **Tool cancelled:** leave domain state unchanged and record cancellation.
- **Persistence failure:** preserve the previous state, surface a non-destructive error and offer demo reset/export.
- **Unknown schema version:** back up the local value, restore the canonical seed and disclose the reset.

## 15. Functional microfeatures

### Accounts and activity

- Account switcher, balance/available balance, masked identifier, status
- Transaction search, date/amount/category filters, merchant detail, category editing
- Pending/posted/declined states, receipts, notes, export simulation
- Cash-flow comparison and recurring-merchant detection

### Payments

- Trusted payees, add/edit/remove payee, recent payees
- Immediate, scheduled and recurring transfers
- Balance-floor rule, payment note, review, cancel and retry
- Upcoming timeline, request money and payment status

### Cards

- Freeze/unfreeze, spend limit, merchant categories, online/contactless switches
- PIN reveal simulation behind explicit human confirmation
- Travel mode, replacement workflow and card-linked transaction filter

### Planning and reports

- Category budgets, progress, warnings and rollover simulation
- Savings goals, target date and contributions
- Subscription list, spend trends, monthly report and statement-period selection

### Support and settings

- Dispute reason, evidence note, review and status
- Fraud flow combining card freeze and dispute preparation
- Alert thresholds, large text, high contrast, reduced motion
- Session display, logout, reset demo, Agent Access lock and audit trail

## 16. Testing strategy

### Unit tests

- Money arithmetic, balance floors and atomic reducer behavior
- Recurrence calculations and date handling
- Input validation, sanitization and schema bounds
- Confirmation state transitions, timeout, cancellation and stale-version rejection
- Idempotency and duplicate-execution prevention
- Tool annotation and registry lifecycle

### Integration tests

- Login registers tools; logout and lock unregister them
- Every registered tool opens confirmation before disclosure or mutation
- Cancel leaves state unchanged
- Confirm commits exactly once and returns a concise result
- Manual and tool-driven operations produce equivalent state
- Persistence survives refresh and reset restores seed

### WebMCP evaluations

- Representative natural-language prompts map to the intended tool
- Ambiguous prompts do not trigger unsafe actions
- Tool descriptions remain within recommended budgets
- Prompt-injection strings in transaction data cannot bypass confirmation or alter tool selection
- The three hero journeys work in ChatGPT’s in-app browser and Chrome with WebMCP enabled

Chrome provides guidance for WebMCP evaluations and DevTools inspection; both are part of the final verification pass: [WebMCP evals](https://developer.chrome.com/docs/ai/webmcp/evals) and [WebMCP documentation](https://developer.chrome.com/docs/ai/webmcp).

### Visual and accessibility tests

- Compare each implemented reference route against its approved image at 1440×1024
- Verify compact layout at 390×844 and tablet layout at 834×1194
- Keyboard-only journey, screen-reader landmarks, reduced motion and 200% zoom
- No clipping, horizontal overflow, low-contrast text or focus loss

## 17. Acceptance criteria

The prototype is ready when all of the following are true:

1. Demo credentials sign in and seeded ATC state loads.
2. Home, Accounts, Payments, Activity, Reports and Settings routes—and their Cards, Plan and Support subroutes—are navigable and functional at prototype depth.
3. Exactly 60 meaningful WebMCP surfaces—56 imperative and four declarative—are discoverable only after login and while Agent Access is unlocked.
4. Every WebMCP invocation requires an app-owned explicit confirmation before reading or mutating protected state.
5. No tool can approve itself, unlock Agent Access or bypass domain validation.
6. The three hero journeys complete end to end and update the UI, store and audit log consistently.
7. Cancel, timeout, abort, duplicate and stale-state paths leave balances correct.
8. The UI is responsive, keyboard accessible and visually faithful to the approved references.
9. Production build passes, tool discovery is verified in a WebMCP-capable browser and the deployed Sites URL works without setup beyond the supplied credentials.
10. The repository contains setup instructions, testing prompts, an open-source license and an honest description of prototype limitations.

## 18. Demo narrative

The under-three-minute demo should begin already logged in:

1. Show the warm home screen and WebMCP connected status.
2. Ask the in-site agent to explain recent spending; confirm the read disclosure.
3. Ask it to schedule the Orbit Works payment only if the balance remains above a chosen floor; review and confirm the exact recurring payment.
4. Ask it to investigate a suspicious charge; show the prepared dispute plus card freeze and the stronger typed confirmation.
5. Open Safety & Agent to show the audit trail and activate the emergency lock.
6. Close on the principle: “The agent can prepare anything. Only you can approve it.”

## 19. Implementation boundaries

The build will use a responsive React and TypeScript frontend compatible with Sites hosting. Domain state, WebMCP registration and confirmation orchestration remain framework-independent modules with direct tests. Styling is implemented from the approved references with semantic HTML and real icon-library components; the generated screenshots are design references, not rasterized UI layers.

The prototype remains honest: hard-coded credentials and local persistence are demo infrastructure, ATC has no value, and WebMCP is experimental. Security quality is demonstrated through explicit trust boundaries, schema validation, origin restrictions, lifecycle control and auditability—not through claims that a client-only sandbox is a real bank.
