# Repository Guidelines

## Project Structure & Module Organization
The MCP DevTools server lives in `src/`, with `src/index.ts` wiring tool adapters found under `src/tools/`, shared helpers in `src/utils/`, plug-ins in `src/plugins/`, and generated prompts in `src/instructions.md`. Jest specs reside in `src/__tests__`, mirroring the runtime folder layout and using fixtures under `src/__tests__/fixtures`. Shared declaration files sit in `types/`, while `examples/` holds sample MCP client wiring and `docs/` powers the VitePress site. Dockerfiles and the Makefile mirror the npm scripts, so CI and local workflows stay aligned.

## Build, Test, and Development Commands
- `npm run dev`: launches the server via `tsx` with live TypeScript execution.
- `npm run build && npm start`: produces `dist/` with `tsc` (plus instruction copy) and runs the compiled server.
- `npm run lint`, `npm run lint:md`, `npm run lint:yaml`, `npm run lint:changelog`: TypeScript lint, Markdown rules, YAML sanity checks, and CHANGELOG format validation.
- `npm test`, `npm run test:watch`, `npm run test:coverage`: Jest in VM modules mode; use coverage before submitting non-trivial changes.
- `npm run docs:dev` / `npm run docs:build`: preview or generate the VitePress documentation site.

## Coding Style & Naming Conventions
TypeScript is authored in strict ESM mode with two-space indentation and trailing commas enforced by `eslint.config.js`. Prefer descriptive camelCase for variables/functions, PascalCase for classes, and kebab-cased filenames (e.g., `file-validation-tools.ts`). Re-export shared contracts through `types/` instead of deep relative imports. Run `npm run lint` prior to commits; the configuration already includes `@typescript-eslint` rules for null safety, explicit return types, and import ordering.

## Testing Guidelines
Tests belong next to their domain peers under `src/__tests__` and should mirror folder names (`tools/git-tools.test.ts` exercises `src/tools/git-tools.ts`). Use Jest describe blocks for tool categories and prefer deterministic fixtures over shelling out. Aim to cover new code paths plus the caching utilities; add coverage assertions when extending cache or suggestion logic. Run `npm test` locally and `npm run test:coverage` before opening a PR to catch any regressions flagged by the CI thresholds.

## Commit & Pull Request Guidelines
Follow Conventional Commits, as enforced by `commitlint.config.cjs` and Husky (e.g., `feat(tools): add actionlint parser`). Keep messages imperative and mention the affected package scope where possible. Pull requests should link to an issue, summarize behavior changes, list validation commands, and include screenshots or logs when user-visible output changes (docs updates should reference the affected VitePress page). Re-run linting, tests, and docs builds when the PR touches those areas, and mention any follow-up tasks explicitly.

## Security & Configuration Tips
Secrets are loaded through `dotenv`, so rely on `.env` (excluded from git) rather than hardcoding credentials. The runtime reads `.mcp-devtools.json` for per-project overrides; default to safe fallbacks so the server can boot without it. See `SECURITY.md` before shipping tooling that executes shell commands, and never expand the plugin surface without explicit validation in `src/plugins/plugin-manager.ts`.
