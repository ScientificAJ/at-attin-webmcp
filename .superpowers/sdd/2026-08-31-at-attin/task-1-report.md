# Task 1 report — Project foundation and test harness

## Status

Complete. At Attin now has a typed React/Vite bootstrap, a jsdom/Vitest smoke-test harness, TypeScript ESLint coverage, the required package scripts, and the original Sites packaging behavior.

## What changed

- Replaced the template JSX entry points with `src/main.tsx` and `src/app/App.tsx`; the initial app renders the required accessible `At Attin` heading.
- Added the smoke test at `src/app/App.test.tsx` and shared jest-dom setup at `src/test/setup.ts`.
- Added the TypeScript solution/app configs, a typed Vite/Vitest config, and a flat TypeScript ESLint config.
- Configured Vitest for jsdom, globals, the shared setup file, and `src/**/*.test.{ts,tsx}`. The include boundary prevents Vitest from collecting the separate Node Sites suite.
- Added all required scripts: `dev`, `build`, `preview`, `test`, `test:watch`, `test:e2e`, and `lint`. Retained `test:sites`; `build` keeps the required `tsc -b && vite build` prefix and then runs the existing Sites preparation step.
- Added React Router, Zod, and the approved `@phosphor-icons/react` dependency; Lucide was not added. Added the TypeScript, Vitest, Testing Library, Playwright, and ESLint toolchain.
- Pinned TypeScript to the supported 6.x line (`6.0.3` installed); TypeScript ESLint 8.68 rejects TypeScript 7.0, while the 6.x combination lints cleanly.
- Kept Vite output at `dist/client` and retained the original server/hosting preparation behavior.
- Enabled the already-approved esbuild build permission in `pnpm-workspace.yaml`.
- Removed stale `package-lock.json`; `pnpm-lock.yaml` is the single authoritative lockfile because this runtime and task use pnpm.
- Added the two Product Design-approved, unmodified 1024×1024 PNG foundation assets:
  - `public/assets/textures/ivory-paper.png` — SHA-256 `af66e322cebeeebe3b169f06b671d6f0d668de27c6c8caf0c062a81f074ffe3d`
  - `public/assets/textures/obsidian-paper.png` — SHA-256 `176c73f9c26aa5427134ff2445e4ff1e46f5802f369369b44e7d3fb959d15733`

## Files

Created:

- `eslint.config.js`
- `src/app/App.test.tsx`
- `src/app/App.tsx`
- `src/main.tsx`
- `src/test/setup.ts`
- `tsconfig.app.json`
- `tsconfig.json`
- `vite.config.ts`
- `public/assets/textures/ivory-paper.png`
- `public/assets/textures/obsidian-paper.png`

Modified:

- `index.html`
- `package.json`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`

Removed as superseded or stale:

- `package-lock.json`
- `src/App.jsx`
- `src/main.jsx`
- `vite.config.mjs`

Retained unchanged:

- `.gitignore` (already contained the required generated-output ignores)
- `.openai/hosting.json`
- `worker/index.js`
- `scripts/prepare-sites-build.mjs`
- `tests/sites-worker.test.mjs`

## RED evidence

The production mutation this test protects against is removing or renaming the At Attin product heading. The test renders the real component without mocks and queries its accessible heading.

Command:

```text
/home/john/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm test src/app/App.test.tsx
```

Relevant output before `src/app/App.tsx` existed:

```text
FAIL  src/app/App.test.tsx [ src/app/App.test.tsx ]
Error: Cannot find module './App' imported from .../src/app/App.test.tsx
Test Files  1 failed (1)
```

The direct npm-to-pnpm translation with an extra separator (`pnpm test -- src/app/App.test.tsx`) also forwarded `--` to Vitest and collected the existing Node Sites file. The clean focused pnpm form above isolated the intended missing-App failure.

## GREEN evidence

Command:

```text
/home/john/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm test src/app/App.test.tsx
```

Relevant output after the minimal implementation and Vitest setup:

```text
Test Files  1 passed (1)
Tests       1 passed (1)
```

## Final verification

Fresh sequence run immediately before reporting:

```text
pnpm test src/app/App.test.tsx
pnpm test
pnpm run lint
pnpm run build
pnpm run test:sites
```

Results:

- Focused smoke test: 1 file passed, 1 test passed.
- Full Vitest suite: 1 file passed, 1 test passed.
- ESLint: exit 0 with no findings.
- TypeScript/Vite/Sites build: exit 0; 29 modules transformed; `dist/client/index.html` emitted; Sites preparation completed.
- Sites worker suite: 1 passed, 0 failed.
- Required artifacts verified by the preserved Sites test: `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.
- Browser smoke check at `http://127.0.0.1:5173/`: title `At Attin`, visible level-one `At Attin` heading, and no console errors.
- Dependency peer check: `No peer dependency issues found`.
- `git diff --check`: exit 0.

## Self-review

- The package scripts named by the brief are present; the build retains the mandated Sites post-build preparation and the pre-existing `test:sites` script.
- `App` remains deliberately minimal and matches the brief; no product behavior was added ahead of later tasks.
- Test setup uses jsdom, Vitest globals, and `@testing-library/jest-dom/vitest` exactly once through the shared setup file.
- TypeScript ESLint recommended rules cover every `*.ts` and `*.tsx` file, including source/tests and future Vite/Playwright TypeScript configs; `dist/**` and `coverage/**` are ignored.
- Vite still binds as required by the prototype template, warms `src/main.tsx`, and writes client assets under `dist/client`.
- A diff check confirmed no changes to the hosting descriptor, worker, Sites preparation script, or Sites test.
- pnpm dependency metadata contains Phosphor and contains no Lucide package.
- The two texture assets were included without modification.

## Concerns

No blocking concerns. `test:e2e` is intentionally a script-only foundation in Task 1; Playwright specs arrive in later tasks. The npm lockfile deletion is deliberate and approved so dependency state cannot drift between two package managers.

## Fix round 1/5 — Consolidated Milestone 1 test contract

Changed `src/app/App.test.tsx` to match the consolidated brief exactly:

- Renamed the test to `renders the At Attin product heading`.
- Replaced the case-insensitive regular expression with the exact accessible-name matcher `name: 'At Attin'`.

Exact covering test file: `src/app/App.test.tsx`

Command:

```text
/home/john/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm test src/app/App.test.tsx
```

Passing output:

```text
Test Files  1 passed (1)
Tests       1 passed (1)
Duration    2.04s
```
