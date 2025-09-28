import { preprocessImages } from './util/img.js';
import { detectBarcodes, mapBarcodeToCategory } from './detectors/barcode.js';
import { runOcr } from './detectors/ocr.js';
import { getVisionAdapter } from './detectors/vision.js';
import { clipNeighbors } from './detectors/clip.js';
import { fuse } from './fusion.js';
import { IdentifyResult, Options, OptionsSchema } from './schemas.js';
import { config as defaultConfig } from './config.js';
import { classifyFromText } from './rules/classify.js';

const SYSTEM_PROMPT = `Reply ONLY with JSON keys: category, brand_guess, model_guess, materials, hazards. 
Category must be from taxonomy.json categories. Hazards can include: battery, aerosol, blade, chemical, pressurized.`;

export async function analyzeItem(images: any[], opts?: Options): Promise<IdentifyResult> {
  const options = OptionsSchema.parse(opts ?? {});
  const pre = await preprocessImages(images);

  const doStage = (name: keyof NonNullable<Options['enableStages']>) => options.enableStages?.[name] !== false;

  const barcodeP = doStage('barcode') ? detectBarcodes(pre.map(p => p.original), options) : Promise.resolve({ codes: [] });
  const ocrP = doStage('ocr') ? runOcr(pre.map(p => p.ocrGray), options) : Promise.resolve({ lines: [], ids: [], hazards: [], brandHints: [] });
  const vlmP = doStage('vlm') ? getVisionAdapter(options).describe(pre.map(p => p.original), SYSTEM_PROMPT, 'Describe item', options) : Promise.resolve({});
  const clipP = doStage('clip') ? clipNeighbors(pre.map(p => p.original), options) : Promise.resolve({ neighbors: [] });

  const [barcode, ocr, vlm, clip] = await Promise.all([barcodeP, ocrP, vlmP, clipP]);

  // Baseline rule-based classification (VLM/CLIP are off by default)
  const text = (ocr.lines || []).join('\n');
  const allowed = options.userAllowedCategories || [];
  const rule = classifyFromText(text, allowed);
  let category = rule.category || (barcode.codes.map(mapBarcodeToCategory).find(Boolean) as string | undefined);
  let brand = rule.brand || undefined;
  let model = rule.model || undefined;

  // Confidence heuristic
  let confidence = 0.3;
  const isbnHit = barcode.codes.some((c) => (mapBarcodeToCategory(c) || '').includes('Books'));
  if (isbnHit) confidence = 0.9;
  else if ((rule.signals?.length || 0) >= 2) confidence = 0.75;
  else if ((rule.signals?.length || 0) >= 1) confidence = 0.6;

  // Resolution level
  let resolution: IdentifyResult['resolution_level'] = 'category_only';
  if (brand && model) resolution = 'brand_model';
  else if (brand && category) resolution = 'brand_category';
  else if (category) resolution = 'category_only';
  if (isbnHit || (barcode.codes && barcode.codes.length)) resolution = 'sku';

  // Next step simple rule
  let next: IdentifyResult['next_step'] = 'needs_more_info';
  if (category) {
    if (category.includes('Books') || category.includes('Adapters') || category.includes('Jackets') || category.includes('Outerwear') || category.includes('Clothing')) next = 'sell';
  }

  // Merge VLM hints into baseline where available
  const vlmBrand = (vlm as any)?.brand_guess as string | undefined;
  const vlmModel = (vlm as any)?.model_guess as string | undefined;
  const vlmHaz = Array.isArray((vlm as any)?.hazards) ? (vlm as any).hazards as string[] : [];

  const result: IdentifyResult = {
    resolution_level: resolution,
    attributes: { brand: brand || vlmBrand, model: model || vlmModel || undefined },
    hazards: vlmHaz as any,
    confidence,
    evidence: { codes: barcode.codes, ocr: ocr.lines || [], logos: [], neighbors: [] },
    next_step: next,
  } as any;
  // Populate category into attributes via taxonomy in UI; here we just return evidence/result
  // For full pipeline including VLM/CLIP, call fuse() instead (kept for future enablement)
  if (!category && (vlm as any)?.category) {
    // optional
  }
  return result;
}

export type { IdentifyResult, Options } from './schemas.js';
