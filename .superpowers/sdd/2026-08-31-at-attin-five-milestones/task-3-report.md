# Task 3 Report — Secure native WebMCP bridge and all 60 agent surfaces

## Outcome

Milestone 3 is implemented on `feature/at-attin-webmcp` from base commit
`ee9182837839e3d01d7ecd8f18e5c2bbe6c1142a`. At Attin now exposes exactly
56 distinct imperative descriptors plus four distinct visible declarative forms
through the browser-native WebMCP surface. This is a native bridge around the
Milestone 2 operation service, not an assistant, chat surface, language parser,
model, or deterministic task engine.

All protected reads and mutations stop at one app-owned confirmation boundary
before data is disclosed or state is committed. Imperative registration exists
only after sign-in and human-unlocked Agent Access, and all registration is
removed on lock, logout, or teardown.

## TDD and RED evidence

### Initial integrated catalogue/security RED

The first Milestone 3 source change was
`src/webmcp/webmcp-security.test.ts`. It defined the exact catalogue and native
lifecycle contract and exercised every one of the 56 operations through the
confirmation boundary before any WebMCP production module existed.

The focused run used the required bundled pnpm executable and failed genuinely
with exit code `1` while resolving the absent `./bridge` module; the suite could
not execute any tests. That was the expected missing-feature RED, not a modified
assertion against existing behavior.

After the minimal catalogue, coordinator, bridge, registry, and fake native
context were implemented, the focused security suite passed 14 tests. It then
expanded to cover the final lifecycle cases and now passes 15 tests.

### UI and integration RED/GREEN slices

- The declarative-form test was added before the component and failed on the
  missing `DeclarativeToolForm` import. It then passed four tests covering locked
  manual use, unlocked lowercase annotations, `agentInvoked` interception with
  `respondWith`, and `toolactivated` / `toolcancel` announcements.
- The confirmation-dialog test was added before the component and failed on the
  missing `ConfirmationDialog` import. The initial implementation passed its
  behavior assertions; the test was tightened to attach rejection expectations
  before cancellation so there were no unhandled promise rejections.
- The app integration assertion for four route-level forms failed because no
  form was present, then passed after Activity, Reports, and Settings were wired
  into the protected route tree.
- A final lifecycle regression run captured two genuine failures: after
  teardown/re-sync the native fake had `0` tools instead of `56`, and an
  explicitly undefined `document.modelContext` incorrectly rendered `WebMCP
  ready`. Re-registration after React StrictMode's teardown rehearsal and
  callable native feature detection fixed both. The focused result became two
  files and 43 passing tests.
- The accessibility audit added focus trap/restoration and non-silent expiry
  tests first. The focused confirmation run failed two of five tests because Tab
  stayed on the confirm control and no expiry status existed. The final dialog
  traps focus, restores the opener, and exposes a visible polite live status;
  the final combined security/app/dialog run passes three files and 48 tests.

## Security architecture

### Native registration lifecycle

- `ToolRegistry` feature-detects a callable
  `document.modelContext.registerTool` and otherwise leaves manual banking fully
  usable.
- Registration uses the approved native call shape exactly:
  `await modelContext.registerTool(tool, { signal })`.
- Each descriptor callback uses `async (args, { signal })` and forwards that
  invocation signal into the bridge.
- Registration begins only when both `signedIn` and `agentUnlocked` are true.
  One `AbortController` owns all 56 registrations, and lock, logout, and teardown
  abort it. A later authorized sync can re-establish the lifecycle after React
  StrictMode's development teardown rehearsal.
- There is no `exposedTo`, cross-origin allowlist, URL endpoint, approval tool,
  or unlock tool. Native discovery remains on the current document/origin.

### Prepare-confirm-commit authorization

- `ToolBridge` validates the exact closed schema and delegates each imperative
  operation to Milestone 2 `prepareOperation`; it does not duplicate banking
  mutation logic.
- `ConfirmationCoordinator` permits exactly one pending action and owns the
  promise awaited by both reads and mutations. A read receives no result until
  the same confirmation path succeeds.
- Pending confirmation expires at exactly 90,000 ms and cancels on navigation,
  logout, Agent Access lock, invocation abort, native `toolcancel`, user cancel,
  or teardown.
- Production approval requires both `event.isTrusted === true` and active
  `navigator.userActivation.isActive`. Tests can inject only the trust predicate;
  the production default remains the real browser predicate.
- Critical operations require typed uppercase `YES` in addition to a trusted
  click on the visible **Yes, confirm** button.
- Approval creates a private, single-use nonce-bound authorization tied to the
  prepared action digest and expected state version. The coordinator consumes
  it once; duplicate approval, replay, stale state, or changed authorization is
  rejected.
- The dialog is not a form and exposes no autosubmit, URL, shortcut, or
  programmatic approval route. **No, cancel** is always visible and keyboard
  reachable. The dialog focuses its decision control, traps Tab focus, restores
  the opener, and announces cancellation/expiry without silently disappearing.
- Completed, cancelled, expired, and rejected agent outcomes append bounded safe
  agent-action and audit records. A rejected concurrent request does not mutate
  the version underneath the task that owns the mutex.

### Schema, output, and untrusted-content controls

- Every imperative descriptor owns a distinct root schema. All objects are
  closed with `additionalProperties: false`; strings, dates, months, stable IDs,
  integers, ATC amounts, enums, and list limits are explicitly bounded.
- Runtime validation uses the same schemas before preparation. Unknown fields,
  overlong values, unsupported enums, unsafe integers, and malformed identifiers
  fail before a confirmation is opened.
- Results are structured JSON and are compacted to at most 1,499 characters,
  below the required 1.5K ceiling. Protected strings are returned as data and
  never interpreted as HTML.
- `readOnlyHint` appears on the 18 pure read tools plus `reveal_card_pin` and
  `prepare_monthly_plan`.
- `untrustedContentHint` appears only on `search_transactions`,
  `get_transaction`, `get_spending_summary`, `get_income_summary`,
  `list_recurring_activity`, `list_payees`, `list_scheduled_payments`,
  `list_budgets`, `list_goals`, `list_subscriptions`, `get_agent_audit`, and
  `prepare_monthly_plan`, whose results may include merchant, payee, memo, name,
  or other protected free-form content.

## Catalogue and forms inventory

### 56 imperative descriptors

Read/explain (18):

`get_overview`, `list_accounts`, `get_account`, `search_transactions`,
`get_transaction`, `get_spending_summary`, `get_cash_flow`,
`get_income_summary`, `list_recurring_activity`, `list_payees`,
`list_scheduled_payments`, `list_cards`, `get_card_controls`, `list_budgets`,
`list_goals`, `list_subscriptions`, `get_agent_audit`, `get_security_status`.

Payments/payees (13):

`transfer_money`, `pay_payee`, `schedule_payment`,
`create_recurring_payment`, `update_recurring_payment`,
`pause_recurring_payment`, `resume_recurring_payment`,
`cancel_scheduled_payment`, `retry_failed_payment`, `request_money`,
`add_payee`, `update_payee`, `remove_payee`.

Cards (9):

`set_card_freeze`, `set_card_limit`, `set_merchant_control`,
`set_online_payments`, `set_contactless`, `set_travel_mode`, `reveal_card_pin`,
`report_card_lost`, `replace_card`.

Planning/activity/reports (9):

`create_budget`, `update_budget`, `create_savings_goal`,
`update_savings_goal`, `fund_savings_goal`, `withdraw_from_goal`,
`categorize_transaction`, `add_transaction_note`, `prepare_monthly_plan`.

Support/settings (7):

`start_transaction_dispute`, `add_dispute_note`,
`secure_suspicious_charge`, `create_support_case`, `set_alert_preference`,
`set_accessibility_mode`, `manage_trusted_contact`.

### Four visible declarative forms

1. `filter_transactions_form` — Activity
2. `choose_statement_period` — Reports
3. `compare_report_periods` — Reports
4. `filter_agent_audit` — Settings

The forms stay visible and manually usable while locked. Only the unlocked state
adds lowercase `toolname`, `tooldescription`, and `toolparamdescription`.
Production code never emits `toolautosubmit`. Agent-invoked submit is prevented,
passes the confirmation-gated promise to `respondWith`, propagates the supplied
abort signal, and announces activation, cancellation, and completion through a
polite live region.

## App integration and accessibility

- Added protected Activity, Reports, and Settings pages using the approved warm
  editorial shell and existing state/selectors for manual results.
- Settings includes the sole Agent Access control. Its event must pass the same
  production trusted-active-human predicate; only then is the local preference
  updated and the registry synchronized. Locking immediately unregisters all
  imperative descriptors.
- Navigation cancels pending confirmation, sign-out locks Agent Access and
  unregisters tools, and app teardown disposes the lifecycle.
- The confirmation surface has semantic dialog naming, disclosure and
  consequence lists, exact expiry copy, visible error and cancel states,
  focus management, keyboard containment, and polite live outcomes.

## Verification

All commands used the required bundled pnpm executable in the isolated
worktree.

1. Focused security/app/dialog verification:
   `/home/john/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm exec vitest run src/components/ConfirmationDialog.test.tsx src/webmcp/webmcp-security.test.ts src/app/App.test.tsx`
   - Exit `0`
   - 3 test files passed
   - 48 tests passed, 0 failed
2. Full test suite:
   `/home/john/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm test`
   - Exit `0`
   - 7 test files passed
   - 98 tests passed, 0 failed
3. Lint:
   `/home/john/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm run lint`
   - Exit `0`
   - ESLint completed with 0 errors
4. Production/Sites build:
   `/home/john/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm run build`
   - Exit `0`
   - TypeScript passed
   - Vite transformed 4,719 modules and emitted `dist/client/index.html`
   - Sites preparation emitted `dist/server/index.js` and
     `dist/.openai/hosting.json`
5. Sites worker test:
   `/home/john/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm run test:sites`
   - Exit `0`
   - 1 test passed, 0 failed
6. Static contract and scope audit:
   - `git diff --check` is clean.
   - Source search finds the native registration call, exact callback shape, and
     only the three approved lowercase declarative attributes.
   - Source search finds no `exposedTo`, `toolautosubmit`, assistant, chatbot,
     parser, or deterministic task-engine implementation.
   - The integrated catalogue assertion proves 56 imperative names, four exact
     declarative names, and 60 distinct total surfaces.

The app was also opened with the environment's in-app browser. Login, Home,
Activity, Reports, and Settings rendered without console warnings or errors; the
visible statement form returned four matching statement transactions. An
automated attempt to unlock Agent Access was correctly rejected with
`trusted-user-activation-required`, demonstrating that automation was not
treated as active human authorization. No bypass was attempted.

## Files changed

- `.superpowers/sdd/2026-08-31-at-attin-five-milestones/task-3-report.md`
- `src/app/App.test.tsx`
- `src/app/App.tsx`
- `src/app/routes.tsx`
- `src/components/BankShell.tsx`
- `src/components/ConfirmationDialog.test.tsx`
- `src/components/ConfirmationDialog.tsx`
- `src/components/DeclarativeToolForm.test.tsx`
- `src/components/DeclarativeToolForm.tsx`
- `src/pages/ActivityPage.tsx`
- `src/pages/ReportsPage.tsx`
- `src/pages/SettingsPage.tsx`
- `src/styles/confirmation.css`
- `src/styles/forms.css`
- `src/test/confirmation-harness.ts`
- `src/test/model-context-fake.ts`
- `src/test/render-app.tsx`
- `src/test/webmcp-harness.ts`
- `src/webmcp/bridge.ts`
- `src/webmcp/catalog/card-tools.ts`
- `src/webmcp/catalog/index.ts`
- `src/webmcp/catalog/payment-tools.ts`
- `src/webmcp/catalog/planning-tools.ts`
- `src/webmcp/catalog/read-tools.ts`
- `src/webmcp/catalog/support-tools.ts`
- `src/webmcp/catalog/tool.ts`
- `src/webmcp/confirmation.ts`
- `src/webmcp/contracts.ts`
- `src/webmcp/model-context.d.ts`
- `src/webmcp/registry.ts`
- `src/webmcp/schemas.ts`
- `src/webmcp/webmcp-security.test.ts`

## Self-review

- The 56 imperative names equal the Milestone 2 `OPERATION_NAMES` in exact order;
  the four declarative names match the approved contract and all 60 are unique.
- All 56 valid operation invocations are tested to remain unresolved while the
  confirmation is pending and return bounded output only after approval.
- Untrusted events, inactive production activation, lowercase typed approval,
  duplicates, replay, concurrent work, stale versions, expiry, abort,
  navigation, logout, lock, `toolcancel`, teardown, unusable native context, and
  StrictMode re-registration have direct regression coverage.
- Every schema is closed and bounded, descriptors are concise, no descriptor can
  approve or unlock, and registration is AbortController-owned.
- Manual declarative behavior and WebMCP behavior share the existing domain
  selectors/service. No banking business reducer was copied into the WebMCP
  catalogue.
- The change is limited to the requested source, tests, styles, and this report.
  The ledger, package files, lockfile, Sites infrastructure, worker, and assets
  are unchanged.

## Concerns and follow-ons

No Milestone 3 blocker remains. The ordinary preview browser does not supply a
native `document.modelContext`, so exact native registration and callback
behavior is verified with the contract-faithful fake; absence leaves all manual
banking functional and visibly reports WebMCP unavailable. The full
reference-by-reference visual comparison and pixel-level polish remain the
explicit scope of Milestones 4 and 5.

## Post-review security hardening

The independent review of commit `365f20e` identified one Critical disclosure
boundary defect and four Important lifecycle/audit/preview defects. Per the
user's revised execution direction, the controller completed one direct,
test-first repair pass with no additional agents or repeated review loop.

### RED evidence

- The first focused regression run failed seven assertions: protected
  state-dependent preparation returned before confirmation, payee destination
  data was omitted, card projections leaked undeclared fields and `pinHint`,
  card reads lacked untrusted-content annotations, window-level declarative
  cancellation was ignored, partial native registration remained exposed, and
  a non-callable native method threw.
- The append-only audit slice then failed at import because `src/webmcp/audit.ts`
  did not exist.
- The exact-preview slice failed eleven assertions covering typed `YES` on a
  rejected critical request and ten persisted free-form values omitted from the
  confirmation sheet.
- The shell status regression failed because a native registration error still
  rendered `WebMCP connected`.
- The rejected-read classification regression failed because a failed read was
  presented as a state-changing high-risk action.

### Fixes

- State-dependent domain preparation failures now become a generic app-owned
  confirmable result. No balance, existence, eligibility, or other protected
  state is returned before confirmation; critical operations retain typed
  uppercase `YES`, and failed reads remain read-only.
- A separate append-only, device-local WebMCP audit journal records attempts
  without changing the bank authorization version. It writes before opening
  confirmation, fails closed if unavailable, records mutex/schema/cancellation
  outcomes, persists safe final events, and merges them into confirmed audit
  reads. Successful reads therefore remain genuinely read-only.
- A failed native registration aborts its entire partial generation, clears the
  controller, exposes an error state, and can retry to all 56 tools from a clean
  generation. The registry itself checks that `registerTool` is callable, and
  UI callers consume rejected registration promises.
- Declarative `toolactivated` and `toolcancel` events are handled on `window`,
  filtered by `toolName`, and no undocumented declarative submit signal is
  assumed.
- Card reads use explicit safe projections. `pinHint` and undeclared controls
  no longer leak from summaries; card-control content is marked untrusted.
- Confirmation previews now show destination aliases and every persisted
  free-form note, reason, support detail, evidence item, and contact value.

### Final fix-pass evidence

- Focused WebMCP/UI gate: 2 files, 37 tests passed.
- Full suite: 7 files, 117 tests passed.
- Lint: exit 0.
- Production/Sites build: exit 0, 4,720 modules transformed, all Sites
  artifacts emitted.
- Sites worker: 1 test passed.
- `git diff --check`: clean.
