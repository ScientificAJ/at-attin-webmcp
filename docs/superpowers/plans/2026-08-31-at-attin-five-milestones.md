# At Attin Five-Milestone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Build, verify, and deploy the complete At Attin fictional bank through five high-cohesion milestones, with 60 genuine WebMCP surfaces and an app-owned human confirmation boundary.

**Architecture:** A Sites-ready React and TypeScript app owns one versioned local banking store. Manual UI, the embedded Featherless agent, and native-browser WebMCP handlers use the same domain services; the WebMCP bridge adds schema validation, prepare-confirm-commit authorization, lifecycle cancellation, and audit logging. The five milestones separate foundation, banking core, WebMCP/security, visual product, and release proof so each review gate judges a complete subsystem.

**Tech Stack:** React 19, TypeScript, Vite, React Router, Zod, Phosphor Icons, Vitest, Testing Library, Playwright, native WebMCP imperative/declarative APIs, Featherless, Product Design prototype runtime, Sites hosting

**Spec:** docs/superpowers/specs/2026-08-31-at-attin-design.md

## Global Constraints

- ATC is fictional, has no cash value, and is stored only as integer minor units.
- Credentials are exactly john.attin / attin2026 and are visibly labeled prototype-only.
- The approved post-plan amendment adds an in-site Featherless/Kimi K3 agent. It has no deterministic intent parser, direct banking execution, client-exposed key, real financial rail, analytics SDK, or autonomous background action.
- Exactly 60 meaningful WebMCP surfaces are discoverable after login and while Agent Access is unlocked: 56 imperative tools and four declarative tools.
- Every agent read and mutation pauses on an At Attin-owned confirmation surface before protected data returns or state commits.
- No WebMCP tool can approve a pending action, unlock Agent Access, or reuse approval.
- Confirmation requires event.isTrusted plus active user activation; critical security actions also require typed uppercase YES.
- Tools remain same-origin, register through one AbortController, unregister on logout/lock/teardown, and propagate callback cancellation.
- Tool names stay below 30 characters, descriptions below 500, parameter descriptions below 150, and output below 1.5K characters.
- Protected free-form output sets untrustedContentHint; every pure read tool sets readOnlyHint.
- Canonical balances are Daily Account 8,440 ATC, Vault 24,000 ATC, and Rainy Day 10,420 ATC, totaling 42,860 ATC.
- Desktop navigation is Home, Accounts, Payments, Activity, Reports, Settings. Cards, Plan, Support, and Safety & Agent are nested.
- Match outputs/at-attin-design/login.png, home.png, accounts.png, payments.png, and safety-agent.png at 1487×1058.
- Meet WCAG 2.2 AA targets, 44×44 px controls, keyboard operation, visible focus, 200% zoom, reduced motion, large text, and high contrast.
- Manual banking remains fully usable when document.modelContext is unavailable.
- Production uses native document.modelContext.registerTool and declarative form annotations; fakes exist only in tests.
- Preserve .openai/hosting.json, worker/index.js, scripts/prepare-sites-build.mjs, tests/sites-worker.test.mjs, and dist/client plus dist/server output.

## Clean Ownership Map

| Milestone | Owns | Reviewable result |
| --- | --- | --- |
| 1. Foundation | Toolchain, typed bootstrap, test/lint/build scripts, Sites runtime, approved textures | Clean typed app that builds and passes Sites tests |
| 2. Banking core | Money, seed, store, operations, auth, route shell | Complete manual-domain engine with protected routes |
| 3. WebMCP and security | Confirmation, bridge, lifecycle, 56 imperative tools, four declarative forms | Exactly 60 real agent surfaces with no authorization bypass |
| 4. Product experience | All routes, components, states, responsive styling, reference fidelity | Complete fictional bank matching the five approved screens |
| 5. Proof and release | Integration/e2e, accessibility, design QA, docs, real-browser WebMCP check, Sites deployment | Verified, documented, deployed hackathon prototype |

---

### Task 1: Sites-ready typed foundation

**Files:**
- Modify: package.json
- Modify: pnpm-lock.yaml
- Modify: pnpm-workspace.yaml
- Create: tsconfig.json
- Create: tsconfig.app.json
- Create: vite.config.ts
- Create: eslint.config.js
- Create: src/main.tsx
- Create: src/app/App.tsx
- Create: src/app/App.test.tsx
- Create: src/test/setup.ts
- Add: public/assets/textures/ivory-paper.png
- Add: public/assets/textures/obsidian-paper.png

**Interfaces:**
- Produces: App(): JSX.Element
- Produces: scripts dev, build, preview, test, test:watch, test:e2e, lint, test:sites
- Produces: Sites output at dist/client/index.html, dist/server/index.js, dist/.openai/hosting.json

- [ ] **Step 1: Write the smoke test before App exists**

    import { render, screen } from '@testing-library/react';
    import { App } from './App';

    it('renders the At Attin product heading', () => {
      render(<App />);
      expect(screen.getByRole('heading', { name: 'At Attin' })).toBeVisible();
    });

- [ ] **Step 2: Capture the missing-App failure**

    pnpm test src/app/App.test.tsx

Expected: FAIL because src/app/App.tsx is absent.

- [ ] **Step 3: Establish the typed bootstrap and quality scripts**

Use React 19, TypeScript, Vite, Vitest/jsdom, Testing Library, React Router, Zod, @phosphor-icons/react, Playwright, and TypeScript ESLint. Keep the template Worker and Sites preparation chain intact. Keep pnpm-lock.yaml as the only dependency lockfile.

- [ ] **Step 4: Verify foundation quality**

    pnpm test
    pnpm run lint
    pnpm run build
    pnpm run test:sites

Expected: smoke test passes, lint is clean, build emits all three Sites artifacts, Sites tests pass.

- [ ] **Step 5: Commit**

    git add .
    git commit -m "chore: establish At Attin frontend"

---

### Task 2: Complete banking core, persistence, authentication, and shell

**Files:**
- Create: src/domain/models.ts
- Create: src/domain/money.ts
- Create: src/domain/seed.ts
- Create: src/domain/storage.ts
- Create: src/domain/store.ts
- Create: src/domain/selectors.ts
- Create: src/domain/operations/types.ts
- Create: src/domain/operations/payments.ts
- Create: src/domain/operations/cards.ts
- Create: src/domain/operations/planning.ts
- Create: src/domain/operations/support.ts
- Create: src/domain/operations/preferences.ts
- Create: src/domain/banking-core.test.ts
- Create: src/auth/session.ts
- Create: src/auth/session.test.ts
- Create: src/app/routes.tsx
- Create: src/components/BankShell.tsx
- Create: src/components/PrimaryNav.tsx
- Create: src/components/AgentStatus.tsx
- Create: src/pages/LoginPage.tsx
- Create: src/pages/HomePage.tsx
- Create: src/pages/SectionIndexPage.tsx
- Create: src/test/memory-storage.ts
- Create: src/test/render-app.tsx
- Modify: src/app/App.tsx
- Modify: src/app/App.test.tsx
- Create: src/styles/tokens.css
- Create: src/styles/global.css
- Create: src/styles/shell.css

**Interfaces:**
- Produces: MinorATC, BankState, createSeedState(now), atc(), formatATC()
- Produces: BankStore.getState(), transact(expectedVersion, idempotencyKey, reducer), subscribe(), reset()
- Produces: PreparedOperation and prepareOperation(store, operation, args, clock)
- Produces: SessionStore.signIn(), signOut(), isSignedIn(), subscribe()
- Produces: protected route tree and renderAuthenticated(path) test harness

- [ ] **Step 1: Write one integrated failing banking-core suite**

    it('seeds the approved 42,860 ATC total', () => {
      const state = createSeedState(new Date('2026-08-31T09:00:00Z'));
      expect(state.accounts.map(account => account.balance)).toEqual([
        atc(8440), atc(24000), atc(10420)
      ]);
      expect(state.accounts.reduce((sum, item) => sum + item.balance, 0))
        .toBe(atc(42860));
    });

    it('previews and atomically commits a floor-protected payment once', () => {
      const prepared = prepareOperation(store, 'pay_payee', {
        sourceAccountId: 'account-daily',
        payeeId: 'payee-mara',
        amountMinor: atc(420),
        balanceFloorMinor: atc(5000)
      }, fixedClock);
      expect(prepared.consequences).toContain('Balance after: 8,020 ATC');
      expect(prepared.commit()).toMatchObject({ ok: true });
      expect(prepared.commit()).toMatchObject({ ok: false, code: 'duplicate' });
    });

    it('accepts only the published demo credentials', () => {
      expect(session.signIn('john.attin', 'attin2026')).toEqual({ ok: true });
      session.signOut();
      expect(session.signIn('john.attin', 'wrong')).toMatchObject({ ok: false });
    });

- [ ] **Step 2: Capture the missing-domain failure**

    pnpm test src/domain/banking-core.test.ts src/auth/session.test.ts

Expected: FAIL because the domain and session modules are absent.

- [ ] **Step 3: Implement the model, canonical seed, and versioned store**

Store ATC as integer minor units. Seed stable IDs, balances, recent transactions, four payees, two cards, budgets, Lisbon goal, subscriptions, suspicious transaction, support state, agent actions, and audit. Persist under at-attin.bank.v1; back up unknown versions to at-attin.bank.backup before reset. transact enforces expected version, idempotency, atomic reducer, persistence, and one notification.

- [ ] **Step 4: Implement the complete shared operation service**

Implement read projections plus payment/payee, card, planning, dispute/support, alert/accessibility, and trusted-contact operations from the approved spec. prepareOperation computes disclosure and consequences without state mutation. commit rechecks stateVersion and writes once. secure_suspicious_charge freezes card-daily and opens one dispute atomically.

- [ ] **Step 5: Implement in-memory auth and the navigable shell**

Never persist credentials or session. Signed-out protected routes redirect to Login. Signed-in navigation exposes Home, Accounts, Payments, Activity, Reports, Settings with nested Cards, Plan, Support, and Safety & Agent section-index pages. Add fictional-funds status, WebMCP availability state, keyboard navigation, and test harness providers.

- [ ] **Step 6: Verify the milestone**

    pnpm test
    pnpm run lint
    pnpm run build
    pnpm run test:sites

Expected: canonical seed, atomicity, idempotency, persistence, operations, credentials, route guards, and Sites compatibility all pass.

- [ ] **Step 7: Commit**

    git add src
    git commit -m "feat: build complete fictional banking core"

---

### Task 3: Secure native WebMCP bridge and all 60 agent surfaces

**Files:**
- Create: src/webmcp/model-context.d.ts
- Create: src/webmcp/contracts.ts
- Create: src/webmcp/schemas.ts
- Create: src/webmcp/confirmation.ts
- Create: src/webmcp/bridge.ts
- Create: src/webmcp/registry.ts
- Create: src/webmcp/catalog/read-tools.ts
- Create: src/webmcp/catalog/payment-tools.ts
- Create: src/webmcp/catalog/card-tools.ts
- Create: src/webmcp/catalog/planning-tools.ts
- Create: src/webmcp/catalog/support-tools.ts
- Create: src/webmcp/webmcp-security.test.ts
- Create: src/components/ConfirmationDialog.tsx
- Create: src/components/DeclarativeToolForm.tsx
- Create: src/components/DeclarativeToolForm.test.tsx
- Create: src/test/model-context-fake.ts
- Create: src/test/confirmation-harness.ts
- Create: src/test/webmcp-harness.ts
- Create: src/pages/ActivityPage.tsx
- Create: src/pages/ReportsPage.tsx
- Create: src/pages/SettingsPage.tsx
- Modify: src/app/App.tsx
- Modify: src/app/routes.tsx
- Create: src/styles/confirmation.css
- Create: src/styles/forms.css

**Interfaces:**
- Produces: ConfirmationCoordinator.request(prepared, signal), approve(event, typedValue), cancel(reason)
- Produces: ToolBridge.run(toolName, args, signal): Promise<string>
- Produces: ToolRegistry.sync({ signedIn, agentUnlocked }), dispose()
- Produces: 56 imperative WebMCPTool descriptors and four visible annotated forms

- [ ] **Step 1: Write the integrated security and catalogue tests**

    expect(IMPERATIVE_TOOL_NAMES).toHaveLength(56);
    expect(DECLARATIVE_TOOL_NAMES).toEqual([
      'filter_transactions_form', 'choose_statement_period',
      'compare_report_periods', 'filter_agent_audit'
    ]);
    expect(new Set([...IMPERATIVE_TOOL_NAMES, ...DECLARATIVE_TOOL_NAMES]).size)
      .toBe(60);

    const promise = executeTool('get_overview', {});
    expect(await promiseSettled(promise)).toBe(false);
    approveTrusted();
    await expect(promise).resolves.toContain('"status":"completed"');

    const critical = executeTool('secure_suspicious_charge', {
      transactionId: 'transaction-suspicious',
      reason: 'card-not-present'
    });
    expect(() => approveUntrusted('YES')).toThrow('trusted-user-activation-required');
    expect(() => approveTrusted('yes')).toThrow('type-YES-to-confirm');
    approveTrusted('YES');
    await critical;

- [ ] **Step 2: Capture the missing-WebMCP failure**

    pnpm test src/webmcp/webmcp-security.test.ts

Expected: FAIL because the catalogue, coordinator, bridge, and registry are absent.

- [ ] **Step 3: Implement prepare-confirm-commit authorization**

Allow one pending task. Bind a single-use approval token to action digest and state version. Expire at 90 seconds and on navigation, logout, lock, AbortSignal, or teardown. Require production event.isTrusted plus active user activation; require uppercase YES for critical actions. Reject programmatic click, replay, duplicate, stale preview, and self-approval. Reads disclose only after approval.

- [ ] **Step 4: Implement native lifecycle and schemas**

Feature-detect document.modelContext. Register each imperative descriptor with registerTool(tool, { signal }) only after login and while unlocked. Never use exposedTo. Callback accepts its AbortSignal. Lock/logout abort registration. Use closed, bounded schemas; same-origin only; output is JSON below 1.5K.

- [ ] **Step 5: Implement the 56 distinct imperative tools**

Read/explain (18):

    get_overview, list_accounts, get_account, search_transactions,
    get_transaction, get_spending_summary, get_cash_flow, get_income_summary,
    list_recurring_activity, list_payees, list_scheduled_payments, list_cards,
    get_card_controls, list_budgets, list_goals, list_subscriptions,
    get_agent_audit, get_security_status

Payments/payees (13):

    transfer_money, pay_payee, schedule_payment, create_recurring_payment,
    update_recurring_payment, pause_recurring_payment,
    resume_recurring_payment, cancel_scheduled_payment, retry_failed_payment,
    request_money, add_payee, update_payee, remove_payee

Cards (9):

    set_card_freeze, set_card_limit, set_merchant_control,
    set_online_payments, set_contactless, set_travel_mode, reveal_card_pin,
    report_card_lost, replace_card

Planning/activity/reports (9):

    create_budget, update_budget, create_savings_goal, update_savings_goal,
    fund_savings_goal, withdraw_from_goal, categorize_transaction,
    add_transaction_note, prepare_monthly_plan

Support/settings (7):

    start_transaction_dispute, add_dispute_note, secure_suspicious_charge,
    create_support_case, set_alert_preference, set_accessibility_mode,
    manage_trusted_contact

Every descriptor uses its own schema and operation, not aliases. Apply readOnlyHint and untrustedContentHint exactly where required. No descriptor can approve or unlock.

- [ ] **Step 6: Implement four declarative forms**

Render lowercase toolname, tooldescription, and toolparamdescription only while unlocked. Never render toolautosubmit. For agentInvoked SubmitEvent, preventDefault, pass the confirmed read promise to respondWith, announce toolactivated/toolcancel, and keep the visible form usable manually when locked.

- [ ] **Step 7: Verify the milestone**

    pnpm test
    pnpm run lint
    pnpm run build
    pnpm run test:sites

Expected: exactly 60 unique discoverable surfaces, every invocation confirmed, lifecycle/abort/security tests pass, no unauthorized state or disclosure.

- [ ] **Step 8: Commit**

    git add src
    git commit -m "feat: expose 60 secured native WebMCP surfaces"

---

### Task 4: Complete award-quality banking product experience

**Files:**
- Create/Modify: src/pages/LoginPage.tsx
- Create/Modify: src/pages/HomePage.tsx
- Create/Modify: src/pages/AccountsPage.tsx
- Create: src/pages/AccountDetailPage.tsx
- Create: src/pages/PaymentsPage.tsx
- Modify: src/pages/ActivityPage.tsx
- Modify: src/pages/ReportsPage.tsx
- Create: src/pages/CardsPage.tsx
- Create: src/pages/PlanPage.tsx
- Create: src/pages/SupportPage.tsx
- Modify: src/pages/SettingsPage.tsx
- Create: src/pages/SafetyAgentPage.tsx
- Create: src/components/Amount.tsx
- Create: src/components/CashFlowLine.tsx
- Create: src/components/TransactionRow.tsx
- Create: src/components/AccountRail.tsx
- Create: src/components/PayeeRail.tsx
- Create: src/components/PaymentComposer.tsx
- Create: src/components/ScheduleTimeline.tsx
- Create: src/components/TransactionFilters.tsx
- Create: src/components/CardControlRow.tsx
- Create: src/components/ReportBars.tsx
- Create: src/components/BudgetRow.tsx
- Create: src/components/GoalProgress.tsx
- Create: src/components/SubscriptionRow.tsx
- Create: src/components/AuditTimeline.tsx
- Create: src/components/AgentAccessControl.tsx
- Create: src/components/PreferenceControl.tsx
- Create: src/styles/login.css
- Create: src/styles/home.css
- Create: src/styles/accounts.css
- Create: src/styles/payments.css
- Create: src/styles/activity.css
- Create: src/styles/cards.css
- Create: src/styles/reports.css
- Create: src/styles/plan.css
- Create: src/styles/settings.css
- Create: src/styles/safety-agent.css
- Modify: src/app/routes.tsx
- Create: src/pages/product-experience.test.tsx

**Interfaces:**
- Consumes: SessionStore, BankStore, selectors, prepareOperation, ConfirmationCoordinator, ToolRegistry
- Produces: complete manual bank and exact visual states for all approved references

- [ ] **Step 1: Write one route-and-core-interaction suite**

    renderAuthenticated('/');
    expect(screen.getByText('42,860')).toBeVisible();
    expect(screen.getByText('Fictional funds')).toBeVisible();

    renderAuthenticated('/payments');
    await user.click(screen.getByRole('button', { name: /mara vale/i }));
    await user.type(screen.getByLabelText('Amount'), '420');
    await user.type(screen.getByLabelText('Protect balance above'), '5000');
    await user.click(screen.getByRole('button', { name: 'Review payment' }));
    expect(screen.getByText('Balance after: 8,020 ATC')).toBeVisible();

    renderAuthenticated('/settings/agent');
    expect(screen.getByText('60 tools available')).toBeVisible();

- [ ] **Step 2: Capture the incomplete-product failure**

    pnpm test src/pages/product-experience.test.tsx

Expected: FAIL because the final routes and interactions are incomplete.

- [ ] **Step 3: Implement the five source-truth screens**

Login matches login.png. Home matches home.png with balance, cash flow, recent rows, agent connection, live obsidian confirmation. Accounts matches accounts.png with account rail and detail surface. Payments matches payments.png with payee rail, upcoming timeline, and prepared recurring-payment surface. Safety & Agent matches safety-agent.png with four safeguards, access control, and audit table.

Use the generated ivory and obsidian texture assets, Phosphor icons, editorial sans typography, tabular numerals, warm stone rules, and vermilion action signal. Do not embed reference PNGs, add generic cards, gradients, blobs, or chat UI.

- [ ] **Step 4: Implement every functional bank destination**

Accounts/detail: balances, ledger, statements, receipt simulation.
Payments: immediate/scheduled/recurring, floor, payees, requests, retry.
Activity: search/filter/detail/category/note/export/dispute.
Cards: freeze, limit, merchant/online/contactless/travel, PIN, lost/replace.
Reports/Plan: spending, income, cash flow, statements, budgets, goals, subscriptions, monthly plan.
Support/Settings: disputes, fraud, support cases, alerts, accessibility, trusted contact, device/session, logout/reset.

All manual mutations use the same consequence renderer and domain operation as WebMCP. Agent lock/unlock remains human-only.

- [ ] **Step 5: Implement responsive and accessible states**

Desktop uses the six-item top navigation. At 390×844 use four bottom destinations plus More. At 834×1194 use compact navigation without overflow. Add hover, focus, selected, open, success, error, empty, large-text, high-contrast, and reduced-motion states; semantic landmarks, tables, labels, live regions, skip link, focus restoration, and 44×44 px controls.

- [ ] **Step 6: Verify the milestone**

    pnpm test
    pnpm run lint
    pnpm run build
    pnpm run test:sites

Expected: all routes, operations, states, accessibility unit tests, and Sites output pass.

- [ ] **Step 7: Commit**

    git add src public
    git commit -m "feat: deliver complete At Attin banking experience"

---

### Task 5: Integrated proof, visual QA, documentation, and Sites release

**Files:**
- Create: playwright.config.ts
- Create: e2e/at-attin.spec.ts
- Create: src/test/webmcp-evals.test.ts
- Create: README.md
- Create: LICENSE
- Create: docs/webmcp-tool-catalog.md
- Create: docs/security-boundary.md
- Create: docs/demo-script.md
- Create: design-qa.md
- Create: outputs/verification-summary.md

**Interfaces:**
- Consumes: complete At Attin application and approved visual references
- Produces: automated proof, real-browser proof, passed design QA, release documentation, and deployed Sites URL

- [ ] **Step 1: Write integrated hero and rejection journeys**

Inject ModelContextFake through Playwright only in tests. Sign in; confirm get_spending_summary disclosure; create a recurring Orbit Works payment with a 5,000 ATC floor; secure transaction-suspicious with typed YES; verify UI/store/result/audit agreement.

Reject cancel, timeout, AbortSignal, duplicate key, stale state, programmatic approval, lowercase yes, logged-out call, locked access, over-broad arguments, and prompt-injection text. Verify manual UI still works without modelContext.

- [ ] **Step 2: Run the full automated gate**

    pnpm run lint
    pnpm test
    pnpm run test:e2e
    pnpm run build
    pnpm run test:sites

Expected: pristine output, all tests pass, Sites artifacts exist.

- [ ] **Step 3: Run blocking Product Design QA**

Open every reference and capture its matching rendered route at 1487×1058. Put source and implementation into one comparison input. Check full view plus focused typography/icon/control regions. Repeat fixes and captures until design-qa.md records no P0/P1/P2 findings and ends with exactly:

    final result: passed

Also verify 390×844, 834×1194, 200% zoom, keyboard operation, reduced motion, high contrast, primary interactions, and console errors.

- [ ] **Step 4: Verify native WebMCP in a capable browser**

After login call document.modelContext.getTools() from same origin and confirm all 56 imperative names. Inspect four declarative form annotations. Execute the three hero prompts through the browser agent. Record browser build, WebMCP enablement, tool count, outcomes, limitations, and evidence in outputs/verification-summary.md.

- [ ] **Step 5: Write release documentation**

README includes value, screenshots, credentials, browser setup, local commands, evaluation prompts, fictional-money limitations, native source paths, and deployed URL. Use MIT license. Catalogue all 60 tools with inputs/effect/risk/confirmation. Document prepare-confirm-commit, same-origin, trusted activation, single-use digest, abort, stale-state, prompt injection, and demo-only auth. Keep demo script under three spoken minutes.

- [ ] **Step 6: Commit the verified release**

    git add .
    git commit -m "release: verify and document At Attin"

- [ ] **Step 7: Final review and Sites deployment**

Run the broad strongest-model code review over the complete branch. Fix and re-review any Critical or Important finding. Hand the exact validated Product Design project to Sites hosting, publish privately when available, poll to success, open the deployed URL, sign in, verify direct routing, and repeat one read plus one mutation on the deployed origin.
