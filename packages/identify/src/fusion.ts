import { config } from './config.js';
import type { IdentifyResult } from './schemas.js';
import { applyCalibration, loadCalibration } from './calibration.js';
import { canonicalCategory, normalizeBrand as normBrandTax } from './taxonomy.js';
import { mapRnToBrand } from './util/rn.js';
import { detectHazards, extractRN, normalizeBrand as normBrandUtil } from './util/text.js';

export interface FusionInputs {
  codes: string[];
  ocrLines: string[];
  ocrIds: string[];
  vlm: { category?: string; brand_guess?: string; model_guess?: string; materials?: string[]; hazards?: string[] };
  clipNeighbors: { id: string; score: number }[];
}

export function fuse(inputs: FusionInputs): IdentifyResult {
  const { weights } = config;
  const evidence = {
    codes: inputs.codes,
    ocr: inputs.ocrLines.slice(0, 10),
    logos: [],
    neighbors: inputs.clipNeighbors,
  };

  // Attributes guesses
  // Brand from multiple sources: VLM guess, RN mapping, OCR hints
  let brand = normBrandTax(inputs.vlm.brand_guess) || normBrandUtil(inputs.vlm.brand_guess);
  const rns = inputs.ocrLines.map((l)=>extractRN(l)).flat();
  for (const rn of rns) {
    const mapped = mapRnToBrand(rn);
    if (mapped) { brand = mapped; break; }
  }
  const model = inputs.vlm.model_guess;
  const category = canonicalCategory(inputs.vlm.category || inputs.ocrLines.join(' '));
  const materials = inputs.vlm.materials || [];

  // Resolution precedence
  let resolution: IdentifyResult['resolution_level'] = 'category_only';
  if (inputs.codes.length) resolution = 'sku';
  else if (brand && model) resolution = 'brand_model';
  else if (brand && category) resolution = 'brand_category';

  // Hazard aggregation
  const hazards = Array.from(new Set([...(inputs.vlm.hazards || []), ...detectHazards(inputs.ocrLines.join('\n'))]));

  // Raw score
  let score = 0;
  if (inputs.codes.length) score += weights.w_code;
  if (model) score += weights.w_model * 0.8;
  if (brand) score += weights.w_brand * 0.7;
  if (inputs.clipNeighbors.length) score += weights.w_clip * Math.max(...inputs.clipNeighbors.map(n => n.score));
  if (inputs.vlm.category) score += weights.w_vlm * 0.6;
  if (inputs.ocrLines.length) score += weights.w_ocr_text * 0.5;
  score = Math.min(1, Math.max(0, score));

  const calibrated = applyCalibration(score, loadCalibration());

  // Next step
  let next: IdentifyResult['next_step'] = 'needs_more_info';
  const sellable = calibrated >= (config.thresholds.sell_conf);
  if (resolution === 'sku' || (resolution === 'brand_model' && sellable)) {
    next = 'sell';
  } else if (hazards.length) {
    next = 'recycle';
  } else if (category === 'books' || category === 'clothing' || category === 'toys') {
    next = 'give';
  } else {
    next = 'needs_more_info';
  }

  if (hazards.includes('battery') || hazards.includes('aerosol')) {
    if (next === 'sell') next = 'recycle';
  }

  return {
    resolution_level: resolution,
    attributes: {
      brand,
      model,
      material: materials[0],
    },
    hazards: hazards as any,
    confidence: calibrated,
    evidence,
    next_step: next,
  };
}
