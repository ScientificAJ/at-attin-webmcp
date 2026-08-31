# At Attin verification summary

Release date: 2026-08-31

Branch: `feature/at-attin-webmcp`

Sites project: `At Attin`

Production URL: [https://at-attin.astronebulae.chatgpt.site](https://at-attin.astronebulae.chatgpt.site)

## Automated proof

| Gate | Result |
|---|---|
| Integrated WebMCP hero and rejection evaluations | 5/5 passed |
| Complete unit and integration suite | 133/133 passed across 9 files |
| ESLint | Passed with no findings |
| TypeScript and production build | Passed; 4,755 modules transformed and all Sites artifacts emitted |
| Sites Worker contract | Passed, including direct routing and security-header checks |

The WebMCP evaluation suite proves a confirmed spending read with no banking-state mutation, the exact monthly 1,250 ATC Orbit Works recurrence with a persisted 5,000 ATC floor, atomic suspicious-charge protection with typed uppercase `YES`, closed-schema rejection without protected output, and fail-closed untrusted activation, abort, and stale-state behavior.

## Native WebMCP contract proof

- Exact inventory: 56 imperative descriptors plus four declarative forms.
- Production registration path: native `document.modelContext.registerTool(tool, { signal })`.
- Lifecycle: nothing registers while signed out or locked; lock, logout, teardown, and partial registration failure abort the owning generation.
- Authorization: every read and mutation waits on the app-owned confirmation coordinator.
- Critical actions: trusted activation plus uppercase `YES`.
- Output: compact JSON below 1,500 characters; protected free-form reads carry `untrustedContentHint`.
- Fakes are test-only and are not shipped as a browser agent or deterministic execution engine.

The selected Codex in-app browser did not expose `document.modelContext`, so a live `getTools()` call was not available in that browser build. The product reported **WebMCP unavailable** and manual banking remained fully usable. The 56-tool native lifecycle, four form annotations, callbacks, cancellation, audit, and three hero flows were exercised against the production bridge and a test-only `ModelContextFake`.

## Product and accessibility proof

- Five approved references compared to matching live routes at 1487 × 1058.
- Compact 390 × 844, tablet 834 × 1194, and 200% zoom-equivalent layouts checked without horizontal overflow.
- Primary routes and manual interactions checked in the selected browser with no console errors.
- Keyboard focus, visible cancel, focus trap/restoration, live announcements, large text, high contrast, and reduced motion covered.
- `design-qa.md` records zero open P0/P1/P2 findings and a passed final result.

## Direct security review

A complete release-branch diff scan reviewed 102 inventory rows plus the supporting Sites Worker response path. The authorization, disclosure, native lifecycle, schema, atomic persistence, output, and untrusted-content controls produced no surviving issue.

One low-severity deployment weakness was validated before release: the new trusted-click confirmation UI could be framed because the template Worker did not set repository-owned anti-clickjacking headers. A focused Worker assertion failed first. Private publication then proved that Sites serves matching root assets before the Worker and does not apply the packaged `_headers` file on that path. The final architecture removes protected UI from that path: the public root is a redirect-only document, while the complete app shell is embedded in the Worker and returned with `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `nosniff`, `no-referrer`, and a restrictive Permissions Policy. A build-contract test imports the emitted Worker, requests a deep route, and proves both the protected shell and headers.

## Release boundary

- ATC is fictional, local, and has no cash value.
- Credentials are intentionally hard-coded for one hackathon user.
- No bank rails, hosted model, built-in assistant, parser, API key, analytics SDK, or autonomous background execution exists.
- The prototype demonstrates interaction and safety architecture; it does not claim production banking, privacy, accessibility, regulatory, or security certification.

## Deployment proof

- Sites version 3 saved from commit `fabb4c98c6b559d5e830b8c2852d63ae021ccff9` with the locally built archive and deployed successfully to production.
- Access remained private and owner-only: one allowed user, zero groups, and zero external visitors.
- An authenticated root request returned only the intentional `/login` redirect document.
- An authenticated direct request to `/settings/agent` returned HTTP 200, the complete At Attin app shell, `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `nosniff`, `no-referrer`, and the restrictive Permissions Policy.
- The selected in-app browser reached the private Sites **Continue with ChatGPT** gate but did not hold a ChatGPT web session, so deployed-origin DOM interaction was not claimed. The identical commit/archive was exercised through the local selected-browser journeys and the emitted-Worker integration test; the production HTTP path was checked with Sites' owner bypass credential.
