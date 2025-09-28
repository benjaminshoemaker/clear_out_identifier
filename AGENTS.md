# Repository Guidelines

## Project Structure & Module Organization
- `packages/identify/` — Core TypeScript library (ESM). Source in `src/`, tests in `test/`, data in `data/`.
- `apps/cli/` — Offline CLI wrapper for the library (ad‑hoc analyze, analyze‑user).
- `scripts/` — Tooling and evaluation scripts (e.g., `vlm_cli.mjs`, `pricing.json`).
- `dataset/` — Sample evaluation manifest; no PII or secrets.
- `figma_files/` — UI export; do not modify as part of logic work.

## Build, Test, and Development Commands
- Build all: `pnpm build` (builds library then CLI)
- Run tests (library): `pnpm test`
- Offline analyze (images): `pnpm cli analyze <img...> --enableStages=barcode,ocr --verbose`
- Offline analyze (manifest): `pnpm cli analyze-user --userDir packages/identify/test/user_fixtures --verbose`
- OpenAI VLM eval: `node scripts/vlm_cli.mjs --model gpt-4o --printJson`

## Coding Style & Naming Conventions
- Language: TypeScript (Node 20+, ESM). Strict mode enabled.
- Indentation: 2 spaces. Avoid trailing whitespace; keep lines concise.
- Naming: `PascalCase` types/interfaces; `camelCase` functions/variables; filenames in `kebab-case.ts`.
- Imports: extensionful ESM within the package (e.g., `./file.js`).
- Keep changes minimal and focused; prefer small, composable functions.

## Testing Guidelines
- Framework: Jest (ESM via ts‑jest). Tests live in `packages/identify/test` and end with `.spec.ts`.
- Tests run offline; avoid network calls. Prefer deterministic inputs (buffers/fixtures).
- Run: `pnpm test`. Add tests for new logic and edge cases; keep them fast.

## Commit & Pull Request Guidelines
- Commits: imperative mood and concise scope (e.g., `feat(cli): add verbose manifest section`). Group related changes.
- PRs: include a clear description, steps to validate (commands), and relevant screenshots/console output. Link issues when applicable.
- Ensure CI passes locally (`pnpm build`, `pnpm test`) before opening PRs.

## Security & Configuration Tips
- Never commit secrets. `.env.local` is git‑ignored; keep `OPENAI_API_KEY` there. Provide `.env.local.example` if needed.
- The VLM script reads pricing from `scripts/pricing.json` (edit to match the OpenAI pricing page). No runtime scraping.
- Push protection may block commits with secrets—remove the file from commits and amend before pushing.
