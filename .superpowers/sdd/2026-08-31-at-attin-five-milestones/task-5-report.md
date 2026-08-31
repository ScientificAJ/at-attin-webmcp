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
- Saved version, production URL, and deployed-origin checks will be appended after publication.
