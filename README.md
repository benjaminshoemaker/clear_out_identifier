# ClearOut Identification Monorepo (Logic + CLI)

This repository contains a production‑ready, UI‑agnostic logic module for image→item identification and a CLI harness for local evaluation. It runs fully offline with graceful fallbacks and timeouts. No UI changes are required or made.

## Packages

- packages/identify — TypeScript module `@clearout/identify`
  - API: `analyzeItem(images: Buffer[], opts?: Options): Promise<IdentifyResult>`
  - Stages (toggleable): barcode (ZXing), OCR (Tesseract). VLM/CLIP are present but OFF by default.
  - Rule‑based baseline classifier using local keyword rules restricted to your manifest’s categories.
- apps/cli — CLI for ad‑hoc analysis and running against user fixtures.

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

## Extending Beyond the Baseline (Optional)

- Enable VLM/CLIP by passing `--enableStages=barcode,ocr,vlm,clip` (provider remains mock by default).
- Add hazards rules and calibration evaluation (scripts/eval.ts) once you have a labeled dataset.
- Provide a CLIP ONNX model in `packages/identify/models` and a small gallery in `packages/identify/test/fixtures/gallery` to enable real visual neighbors.

## Notes

- Node 20 / ESM / TypeScript. Fully offline; no network calls.
- Timeouts per stage ensure responsiveness; partial results are returned when stages time out.
- The UI export in `figma_files/` is not modified by this logic layer.

