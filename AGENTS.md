# AGENTS

This repo contains an offline identification pipeline (TypeScript library + CLI) and a separate OpenAI VLM evaluation script. Use these notes when making changes or running evaluations.

Scope and conventions
- Keep the core library (`packages/identify`) fully offline by default. Heavy deps (OCR, barcode, ONNX) are dynamically imported and should fail gracefully.
- Don’t change any UI/figma export in `figma_files/`. This repo is for logic and scripts only.
- Tests in `packages/identify/test` are ESM/Jest and run offline.
- Prefer small, targeted edits; match existing coding style (TypeScript strict, ESM).

Main CLIs
- Offline CLI: `apps/cli` exposes:
  - `analyze <images...>` — ad-hoc image analysis.
  - `analyze-user` — evaluates a manifest of user fixtures.
  - Verbose output separates Manifest vs Analysis; add `--verbose` and optionally `--pretty` for full JSON.
- OpenAI VLM evaluation (separate script): `scripts/vlm_cli.mjs`
  - Uses OpenAI Responses API with Structured Outputs (JSON Schema).
  - Flags: `--model`, `--userDir`, `--manifest`, `--maxImagesPerItem`, `--outJson`, `--outCsv`, `--printJson`, `--dryRun`, `--images`.
  - Concurrency=2; 60s/item timeout; single retry on parse failure.
  - Logs token usage and estimates cost using `scripts/pricing.json` (no runtime scraping).

Environment & secrets
- Place OpenAI credentials in `.env.local` at the repo root (or cwd):
  - `OPENAI_API_KEY="sk-..."`
- The VLM script will read `.env.local` and then `process.env`.

Pricing
- Edit `scripts/pricing.json` to match https://platform.openai.com/docs/pricing.
- The script computes cost from `usage.input_tokens` and `usage.output_tokens` using per‑1M (preferred) or per‑1K rates if provided.

Wiring OpenAI into the main CLI
- Default behavior remains offline. To enable OpenAI VLM inside the main CLI, wire a new `OpenAIVision` adapter in `packages/identify/src/detectors/vision.ts`, select it when `opts.vlmProvider === 'openai'`, and plumb `--provider=openai` from `apps/cli` commands (both `analyze` and `analyze-user`).
- Optionally route outputs through `fusion.ts` if combining signals with barcode/OCR/CLIP.

Gotchas
- The Responses API expects `input_text` / `input_image` content items and Structured Outputs at top-level `text.format = { type: 'json_schema', name, schema, strict }`.
- For images, send `image_url: "data:<mime>;base64,<b64>"`.
- Do not fetch pricing at runtime; rely on `scripts/pricing.json`.

