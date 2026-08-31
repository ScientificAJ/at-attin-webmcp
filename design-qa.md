# At Attin design QA

Date: 2026-08-31

Browser: Codex in-app browser
Approved visual target: warm ivory paper, obsidian surfaces, vermilion action color, editorial typography, low cognitive load

## Reference fidelity at 1487 × 1058

Each approved source image and its matching live route were opened together at the same viewport before judging layout, type, icons, spacing, borders, controls, and interaction states.

| Reference | Live state checked | Result |
|---|---|---|
| `outputs/at-attin-design/login.png` | Signed-out login, visible prototype credentials, fictional-money notice, truthful WebMCP status | Passed |
| `outputs/at-attin-design/home.png` | 42,860 ATC overview, cash-flow line, recent activity, 420 ATC protected task preview | Passed |
| `outputs/at-attin-design/accounts.png` | Three-account rail, selected account ledger, statement period, receipt access | Passed |
| `outputs/at-attin-design/payments.png` | Pay-now/schedule/recurring modes, payee rail, 1,250 ATC monthly preview, 5,000 ATC floor | Passed |
| `outputs/at-attin-design/safety-agent.png` | Four safeguards, Agent Access control, 60-surface status, audit timeline | Passed |

The implementation preserves the approved composition and palette while extending the same design language across Activity, Cards, Reports, Plan, Settings, Support, and confirmation states. No gradient, chat surface, placeholder art, or conflicting visual system was introduced.

## Responsive and accessibility checks

| Check | Evidence | Result |
|---|---|---|
| Compact 390 × 844 | Content viewport measured 375 px wide; `scrollWidth` equaled `clientWidth`; bottom navigation and More sheet exposed every destination. | Passed |
| Tablet 834 × 1194 | Content viewport measured 819 px wide; `scrollWidth` equaled `clientWidth`; compact navigation and panels remained readable. | Passed |
| 200% zoom equivalent | At 744 × 529, `scrollWidth` 729 equaled `clientWidth` 729; controls remained reachable without horizontal page scrolling. | Passed |
| Keyboard and focus | Skip link, semantic landmarks, visible focus, dialog initial focus, focus trap, cancel action, and focus restoration were checked. | Passed |
| Motion and contrast | Reduced-motion, large-text, high-contrast, and system forced-motion styles are implemented and covered by application tests. | Passed |
| Status communication | Confirmation expiry and outcomes use live regions; WebMCP availability is stated truthfully; all controls retain readable text labels. | Passed |
| Console | No console errors or warnings appeared in the verified primary journeys. | Passed |

## Interaction checks

- Sign-in and protected routing.
- Desktop navigation, compact bottom navigation, and More-sheet routing.
- Account selection, statement periods, transaction details, filters, and exports.
- Payment now/schedule/recurring modes, payees, previews, cancellation, and completion.
- Card controls, budgets, goals, subscriptions, support cases, accessibility preferences, trusted contact, and reset.
- Normal confirmation, visible cancellation, critical uppercase `YES`, expiry, and successful completion state.
- Manual banking while `document.modelContext` is absent.

## Findings closed during QA

| Priority | Finding | Resolution |
|---|---|---|
| P1 | Login content overflowed the compact viewport. | Added intrinsic width constraints; recheck showed no horizontal overflow. |
| P1 | Compact More sheet remained open after route selection. | Navigation now closes the owning details sheet; regression test added. |
| P2 | A successful manual review did not offer a clear exit. | Added a visible Done action after commit; product test added. |

Open P0 findings: 0

Open P1 findings: 0

Open P2 findings: 0

The selected in-app browser does not expose experimental `document.modelContext`; At Attin correctly reports WebMCP unavailable there. Native registration and agent journeys are therefore proven with the browser-contract integration harness, while the live browser verifies the complete fallback UI and manual banking path.

final result: passed
