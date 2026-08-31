# At Attin verification summary

Release date: 2026-08-31

Branch: `feature/at-attin-webmcp`

Sites project: `At Attin`

Production URL: [https://at-attin.astronebulae.chatgpt.site](https://at-attin.astronebulae.chatgpt.site)

## Automated proof

| Gate | Result |
|---|---|
| Integrated WebMCP hero and rejection evaluations | 5/5 passed |
| Complete unit and integration suite | 141/141 passed across 12 files |
| ESLint | Passed with no findings |
| TypeScript and production build | Passed; 4,759 modules transformed and all Sites artifacts emitted |
| Sites Worker contract | Passed, including Featherless proxy, allowlist, routing, and security-header checks |

The WebMCP evaluation suite proves a confirmed spending read with no banking-state mutation, the exact monthly 1,250 ATC Orbit Works recurrence with a persisted 5,000 ATC floor, atomic suspicious-charge protection with typed uppercase `YES` plus a math check, closed-schema rejection without protected output, and fail-closed untrusted activation, abort, and stale-state behavior.

## Embedded Featherless agent proof

- The deployed app includes a real in-site conversation surface powered by Featherless and `moonshotai/Kimi-K3`; there is no deterministic intent parser.
- The first model call receives only the user's request and the 56 public WebMCP descriptions/schemas. It receives no banking state before confirmation.
- A model-selected tool is looked up in the exact production catalogue, revalidated, and executed through the same `ToolBridge` used by native WebMCP.
- Every read or mutation pauses on the existing app-owned confirmation; multi-step requests run one tool at a time with a maximum of four individually confirmed steps.
- The Featherless credential is a private Sites secret. It is absent from the browser bundle, prompts, local storage, test fixtures, and repository.
- The same-origin Worker rejects missing secrets, cross-origin calls, invalid content types, oversized requests, unknown tools, malformed tool calls, and invalid provider responses.

## Native WebMCP contract proof

- Exact inventory: 56 imperative descriptors plus four declarative forms.
- Production registration path: native `document.modelContext.registerTool(tool, { signal })`.
- Lifecycle: nothing registers while signed out or locked; lock, logout, teardown, and partial registration failure abort the owning generation.
- Authorization: every read and mutation waits on the app-owned confirmation coordinator.
- Critical actions: trusted activation plus uppercase `YES` and the correct displayed addition answer.
- Output: compact JSON below 1,500 characters; protected free-form reads carry `untrustedContentHint`.
- `ModelContextFake` is test-only. The shipped in-site agent is a real Featherless model client over the production WebMCP descriptors, not a deterministic execution engine.

The selected Codex in-app browser did not expose `document.modelContext`, so a live native `getTools()` call was not available in that browser build. The product reports browser WebMCP as unavailable without disabling the in-site agent or manual banking. The 56-tool native lifecycle, four form annotations, callbacks, cancellation, audit, and three hero flows were exercised against the production bridge and a test-only `ModelContextFake`.

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
- No bank rails, deterministic parser, client-exposed API key, analytics SDK, or autonomous background execution exists. Featherless/Kimi K3 provides reasoning behind the same-origin Worker boundary.
- The prototype demonstrates interaction and safety architecture; it does not claim production banking, privacy, accessibility, regulatory, or security certification.

## Deployment proof

- Sites version 4 saved from commit `00a276a5919d02fd99040e3cf36d16cc5627d891` with the locally built archive and deployed successfully to production.
- Access remained private and owner-only: one allowed user, zero groups, and zero external visitors.
- Environment revision 1 was applied to the deployment with a hidden `FEATHERLESS_API_KEY` secret and `FEATHERLESS_MODEL=moonshotai/Kimi-K3`.
- An authenticated production `POST /api/agent` probe asked for an account overview with no bank state in the request. The live Featherless response identified `moonshotai/Kimi-K3` and selected the allowlisted `get_overview` WebMCP tool.
- An authenticated root request returned only the intentional `/login` redirect document.
- An authenticated direct request to `/settings/agent` returned HTTP 200, the complete At Attin app shell, `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `nosniff`, `no-referrer`, and the restrictive Permissions Policy.
- The selected in-app browser reached the private Sites **Continue with ChatGPT** gate but did not hold a ChatGPT web session, so deployed-origin DOM interaction was not claimed. The exact UI was exercised through local selected-browser journeys; the production Worker, Featherless request, model identity, and tool selection were verified at the deployed origin with the existing owner bypass credential.
