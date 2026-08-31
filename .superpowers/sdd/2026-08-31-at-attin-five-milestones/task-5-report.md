# Task 5 report — proof and release

## Scope delivered

- Added five integrated WebMCP hero and rejection evaluations.
- Added the public README, MIT license, exact 60-surface tool catalogue, security-boundary document, under-three-minute demo script, design QA record, and verification summary.
- Preserved the approved Product Design project and created its Sites project without re-scaffolding.
- Ran visual comparison in the selected Codex in-app browser at desktop, compact, tablet, and 200% zoom-equivalent sizes.
- Ran one direct release-branch security diff audit without subagents.

## Test-first evidence

### WebMCP evaluations

- RED: focused test command exited 1 because `src/test/webmcp-evals.test.ts` did not exist.
- GREEN: 5/5 hero and rejection evaluations passed.
- Coverage: confirmed spending read/no state mutation, exact recurring payment/floor, atomic suspicious-charge protection with typed `YES`, closed-schema rejection, untrusted activation, abort, and stale state.

### Sites anti-clickjacking hardening

- RED: `pnpm run test:sites` exited 1 after adding document-response assertions for anti-framing and restrictive browser headers.
- GREEN: the same command passed after the Worker added `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `nosniff`, `no-referrer`, and a restrictive Permissions Policy to every response.

## Fresh verification before the first release commit

- `pnpm test`: 9 files, 133/133 tests passed.
- `pnpm run lint`: exit 0.
- `pnpm run build`: exit 0, 4,755 modules transformed, Sites client/server/hosting artifacts emitted.
- `pnpm run test:sites`: exit 0.
- Tool catalogue: 60/60 rows.
- `design-qa.md`: zero open P0/P1/P2 findings; exact terminal line `final result: passed`.

## Browser proof

- Approved login, home, accounts, payments, and Safety & Agent references were opened with matching live routes at 1487 × 1058.
- Compact 390 × 844, tablet 834 × 1194, and 200% zoom-equivalent layouts had no horizontal page overflow.
- Login, protected routing, navigation, More sheet, account/statement flows, payment preview/cancel, protected home task, Safety & Agent, keyboard focus, and manual fallback were exercised.
- The chosen browser truthfully reported WebMCP unavailable because it did not expose `document.modelContext`; native 56-plus-four behavior is covered by production-contract integration tests.

## Security review

- Scan ID: `1a56dcef-4aea-4e75-a43e-e9b6da2f1f0f`.
- Inventory: 102 release-diff rows plus the supporting production Sites Worker.
- Result: one low-severity clickjacking weakness at the pre-release target, fixed before publication; no surviving authorization, disclosure, persistence, schema, output, or lifecycle issue.
- Report: `/tmp/codex-security-scans-QGpEKe/at-attin-webmcp/e31ad2dcb1523c2eb558bf72247722beb1a50f25_20260831T134827Z_k5tode5u/report.md`.
- TAC advisory status was unavailable; the scan still completed and sealed locally.

## Deployment

- Sites project ID: `appgprj_6a958508a92c81919d2f8252caa4106e`.
- Access check: custom owner-only policy, one allowed user, zero groups, zero external visitors.
- Production URL: `https://at-attin.astronebulae.chatgpt.site`.
- Private publication exposed two real hosting details: matching root assets bypass the Worker by default, and Sites did not apply the packaged `_headers` file to that static-first response. The final build therefore keeps the public root as a harmless immediate `/login` redirect, embeds the complete app shell inside the Worker, and serves every banking route with anti-framing and restrictive browser headers. A build-contract assertion imports the emitted Worker and proves that a deep route returns the protected At Attin shell.
- Sites version 3 saved commit `fabb4c98c6b559d5e830b8c2852d63ae021ccff9` with its exact local archive and deployed successfully.
- Authenticated production checks: `/` returned the redirect-only document; `/settings/agent` returned HTTP 200, the complete app shell, and all required security headers.
- The selected in-app browser reached the private **Continue with ChatGPT** gate but did not hold a ChatGPT web session. No deployed-origin DOM interaction is claimed; the exact archive's browser UI is covered locally and its emitted production Worker is covered directly.

## Approved post-release amendment — embedded Featherless agent

The user clarified that the hackathon prototype must contain a functional agent inside the website, not rely only on an experimental browser agent. The release was therefore extended without adding a deterministic intent engine:

- Added the persistent **Ask At Attin** conversation surface, powered by Featherless and `moonshotai/Kimi-K3`.
- Added a same-origin Sites Worker endpoint with a private server-only Featherless key, an exact 56-tool allowlist, bounded request/provider validation, one-tool-at-a-time execution, and a four-step ceiling.
- Reused the production WebMCP descriptors and `ToolBridge`; no model path can bypass schema validation, Agent Access, read confirmation, typed `YES`, atomic commit, or agent audit.
- Proved that the first model request contains no bank state, an unsupported tool is rejected, and multi-step work opens a separate confirmation for every tool.
- Added the agent UI and Worker tests first. The initial focused runs failed because the runtime, component, and Worker endpoint did not exist; the implemented focused slices then passed.
- Final pre-publication verification passed: 11 files and 140/140 tests, lint with no findings, a 4,758-module production build, and the Sites Worker contract.
- Sites version 4 deployed commit `00a276a5919d02fd99040e3cf36d16cc5627d891` privately with environment revision 1. A live authenticated production probe reached `moonshotai/Kimi-K3`, which selected the allowlisted `get_overview` WebMCP tool from a request containing no bank state.

## Approved judge-access and confirmation amendment

- Ordinary reads and changes retain the visible At Attin popup with direct **Yes, confirm** and **No, cancel** controls.
- Critical actions now require both uppercase `YES` and a fresh single-digit addition answer before the confirmation button enables; the coordinator validates both again before creating its single-use authorization.
- Manual and agent paths use the same critical-friction rule. Focus trapping, cancellation, expiry, trusted activation, stale-state, and replay protections remain unchanged.
- The Sites access policy is intentionally public for hackathon judging, removing the outer **Continue with ChatGPT** gate. At Attin's own visible `john.attin` / `attin2026` prototype login remains the only route to the complete banking UI.
- The final amendment passed 141/141 tests across 12 files, lint, a 4,759-module production build, and the Sites Worker contract before publication.
- Sites version 5 deployed commit `9ed708fa9fed033b2ead4770662fc62c162df7a7` successfully with environment revision 1. The live access policy reports `public`, one owner record, zero groups, and zero external visitors.
- Unauthenticated production verification returned the redirect-only root without a ChatGPT gate, then returned the complete app shell from `/login` for a browser-equivalent request with HTTP 200 and all required security headers.
