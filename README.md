# ClearOut Identification Monorepo (Logic + CLI)

This repository contains a production‑ready, UI‑agnostic logic module for image→item identification and a CLI harness for local evaluation. It runs fully offline with graceful fallbacks and timeouts. No UI changes are required or made.

New: optional OpenAI VLM evaluation script for structured, vision‑model outputs and cost tracking.

## Packages

- packages/identify — TypeScript module `@clearout/identify`
  - API: `analyzeItem(images: Buffer[], opts?: Options): Promise<IdentifyResult>`
  - Stages (toggleable): barcode (ZXing), OCR (Tesseract). VLM/CLIP are present but OFF by default.
  - Rule‑based baseline classifier using local keyword rules restricted to your manifest’s categories.
- apps/cli — CLI for ad‑hoc analysis and running against user fixtures.
- scripts/vlm_cli.mjs — Standalone Node.js script that evaluates items with an OpenAI vision‑capable model using the Responses API + Structured Outputs.

## Install, Build, Test

- Build all: `pnpm build`
- Test module: `pnpm test`
  - Jest ESM + ts‑jest; tests run fully offline.

## CLI

Two entry points:

1) Analyze one or more images

- Command: `pnpm cli analyze <img...> [flags]`
- Flags:
  - `--enableStages=barcode,ocr` — comma list (default: `barcode,ocr` for analyze‑user; `barcode,ocr,vlm,clip` for analyze)
  - `--timeoutMs=2000` — per‑stage timeout
  - `--provider=mock|openai` — VLM provider (kept for future; default `mock`)
  - `--allowFilenameText` — if set, filenames can be used as evidence when decoders fail
  - `--saveDebug=./debug` — reserved for stage debug artifacts

2) Analyze a user fixtures dataset

- Command: `pnpm cli analyze-user [flags]`
- Flags:
  - `--enableStages=barcode,ocr` — comma list (default: `barcode,ocr`)
  - `--userDir <path>` — default `packages/identify/test/user_fixtures`
  - `--userManifest <path>` — default `<userDir>/user_manifest.json`
  - `--pretty` — pretty print IdentifyResult JSON per item
  - `--timeoutMs=2000`

Output format (analyze-user):
- One summary line per item: `item_id | pred_category | gt_category | resolution | conf | brand`
- If `--pretty`, prints full IdentifyResult JSON after each line
- Final accuracy: `Accuracy: 0.xx (correct/total)`

3) Evaluate with an OpenAI Vision model (separate script)

- Command:
  - `node scripts/vlm_cli.mjs --model gpt-4o`
  - or explicit paths:
    - `node scripts/vlm_cli.mjs --model gpt-4o --userDir packages/identify/test/user_fixtures --manifest packages/identify/test/user_fixtures/user_manifest.json --outJson eval_vlm_results.json --outCsv eval_vlm_results.csv`
- Flags:
  - `--model` one of: `gpt-5`, `gpt-5-mini`, `gpt-4o`, `gpt-4.1`, `gpt-4o-mini`
  - `--userDir` default `packages/identify/test/user_fixtures`
  - `--manifest` default `<userDir>/user_manifest.json`
  - `--maxImagesPerItem` default `4`
  - `--outJson` default `eval_vlm_results.json` (raw per‑item rows)
  - `--outCsv` default `eval_vlm_results.csv` (summary table)
  - `--printJson` also print full JSON results to stdout
  - `--dryRun` print which images would be sent (no network)
  - `--images "a.jpg,b.jpg"` ad‑hoc evaluation without a manifest
- Env / pricing:
  - Reads `OPENAI_API_KEY` from `.env.local` (repo root or cwd) or environment.
  - Reads per‑model prices from `scripts/pricing.json` and estimates cost via token usage (per million tokens if available). Edit this file to match https://platform.openai.com/docs/pricing.
- Output:
  - JSON rows: `{ item_id, model, output, usage, est_cost, extra }` where `extra` contains any fields (including `evidence`) not shown in the CSV.
  - CSV columns: `item_id, model, brand, model_name, category, hazards, resolution_level, input_tokens, output_tokens, est_cost_usd`

### Manifest formats accepted

The CLI accepts either of the following manifest shapes:

- Top‑level array (your format):
```
[
  {
    "item_id": "item_01",
    "images": ["item_01_a.jpg", ...],
    "ground_truth": {
      "category": "electronics",
      "brand": "Apple",
      "model": "..."
    }
  }
]
```

- Object with `items` array:
```
{
  "items": [
    { "id": "item_01", "images": ["item_01_a.jpg"], "category": "electronics" }
  ]
}
```

Notes:
- Categories used by the baseline rule classifier are restricted to the set present in the manifest (either `item.category` or `ground_truth.category`).
- Image paths are resolved relative to `--userDir`.

## Baseline Identification (local‑only)

- Barcode stage (ZXing):
  - Uses `@zxing/library` on raw pixels from `sharp`.
  - Attempts rotations 0°/90°/180°/270°.
  - 800ms timeout per image; returns symbology and code (e.g., `EAN_13:978...`).
  - ISBN → category mapped to `Media > Books` (or matched via your keyword rules if you prefer slugs).
- OCR stage (Tesseract.js):
  - `sharp` preprocess: autorotate, grayscale, max 1600px side.
  - Two‑pass OCR: bottom strip + center “tag” crop, then full‑frame fallback.
  - 2s timeout per image.
  - Filenames are ignored by default (can be allowed with `--allowFilenameText`).
- Keyword/rule classifier:
  - Rules in `packages/identify/data/keyword_rules.json` (editable).
  - Function `classifyFromText(text, allowedCategories)` picks the best rule whose category appears in your manifest.
  - Example rules included for MagSafe adapters, ISBN, Jackets/RN.
- Resolution level (baseline):
  - `sku` if any barcode found (ISBN)
  - `brand_model` if brand + model present
  - `brand_category` if brand + category present
  - `category_only` if only category inferred
- Confidence (baseline):
  - 0.9 if ISBN
  - 0.75 if ≥2 rule signals
  - 0.6 if 1 rule signal
  - 0.3 otherwise
- Next step (baseline):
  - ‘sell’ for Books, Adapters, and Jackets/Outerwear/Clothing
  - otherwise ‘needs_more_info’
- Hazards: baseline leaves `hazards: []` (intentionally off). You can enable hazards rules later.

## OpenAI VLM (Structured Outputs)

- The repo includes `scripts/vlm_cli.mjs` to evaluate items with an OpenAI vision‑capable model using the Responses API and a strict JSON Schema. It supports multiple models via `--model`, enforces a 60s per‑item timeout, concurrency=2, retries once on parse error, and logs token usage and estimated cost.
- Place your API key in `.env.local` at repo root:
  - `OPENAI_API_KEY="sk-..."`
- Pricing for cost estimation is read from `scripts/pricing.json` (edit to match OpenAI pricing); no pricing is scraped at runtime.

### Main CLI + OpenAI VLM

- The main CLI remains offline by default. It can be extended to call OpenAI by enabling the VLM stage and using `--provider=openai`. After wiring, usage will look like:
  - `pnpm build && pnpm cli analyze <img...> --enableStages=barcode,ocr,vlm --provider=openai`
  - `pnpm build && pnpm cli analyze-user --enableStages=barcode,ocr,vlm --provider=openai`
- The `scripts/vlm_cli.mjs` path is recommended for evaluation against strict schemas and cost reporting.

## Library API

- Import: `import { analyzeItem } from '@clearout/identify'`
- Call: `analyzeItem(images: Buffer[], opts?: Options)`
- Options (subset):
  - `enableStages?: { barcode?: boolean; ocr?: boolean; vlm?: boolean; clip?: boolean }`
  - `timeoutMs?: number`
  - `allowFilenameText?: boolean`
  - `userAllowedCategories?: string[]` (limit rule outputs)
  - `imageNames?: string[]` (for logging/fallbacks only)
- IdentifyResult (summary):
  - `resolution_level: 'sku'|'brand_model'|'brand_category'|'category_only'`
  - `attributes: { brand?: string; model?: string; material?: string; size_class?: 'small'|'medium'|'large'; power?: 'plug'|'battery'|'none' }`
  - `hazards: string[]` (baseline empty)
  - `confidence: number`
  - `evidence: { codes: string[]; ocr: string[]; logos: string[]; neighbors: {id:string, score:number}[] }`
  - `next_step: 'sell'|'give'|'recycle'|'needs_more_info'`

## Editing Rules to Match Your Taxonomy

- Edit `packages/identify/data/keyword_rules.json` to emit the exact category strings used in your `user_manifest.json`.
- The classifier only selects categories that are present in the manifest, so adding your categories removes the need to hard‑code mappings elsewhere.

## Troubleshooting

- “No manifest found…” when it exists:
  - Rebuild the CLI before running: `pnpm -r --filter ./apps/cli... run build && pnpm --filter @clearout/cli start analyze-user ...`
  - Or run the convenience chain: `pnpm build && pnpm cli analyze-user ...`
- Running from a different cwd:
  - The CLI resolves relative paths from the monorepo root. Use absolute paths if your data lives elsewhere.
- Missing images:
  - The CLI synthesizes deterministic buffers if a file is missing, so the pipeline still runs.
- OpenAI errors when using `scripts/vlm_cli.mjs`:
  - Ensure `OPENAI_API_KEY` is set (via `.env.local` or environment).
  - If you see parameter errors, update to the latest CLI version and verify your SDK version. The script targets the Responses API with `input_text`/`input_image` parts and top‑level `text.format` for JSON Schema.

## Extending Beyond the Baseline (Optional)

- Enable VLM/CLIP by passing `--enableStages=barcode,ocr,vlm,clip` (provider remains mock by default).
- Add hazards rules and calibration evaluation (scripts/eval.ts) once you have a labeled dataset.
- Provide a CLIP ONNX model in `packages/identify/models` and a small gallery in `packages/identify/test/fixtures/gallery` to enable real visual neighbors.

## Notes

- Node 20 / ESM / TypeScript. Fully offline; no network calls.
- Timeouts per stage ensure responsiveness; partial results are returned when stages time out.
- The UI export in `figma_files/` is not modified by this logic layer.

