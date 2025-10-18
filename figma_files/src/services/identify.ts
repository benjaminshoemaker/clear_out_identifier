export type ResolutionLevel = 'sku' | 'brand_model' | 'brand_category' | 'category_only';

export interface IdentifyResponse {
  resolution_level: ResolutionLevel;
  attributes: {
    brand?: string;
    model?: string;
    material?: string;
    size_class?: string;
    power?: 'plug' | 'battery' | 'none';
    hazards?: string[];
    category?: string;
  };
  confidence: number; // 0..1
  evidence: {
    code?: string;
    text?: string[];
    logo?: string;
    visual_match_ids?: string[];
  };
}

function containsAny(haystack: string, needles: string[]): boolean {
  const lower = haystack.toLowerCase();
  return needles.some((n) => lower.includes(n));
}

async function getImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

// Server API mapping types
type ApiIdentifyResult = {
  resolution_level: 'sku'|'brand_model'|'brand_category'|'category_only';
  attributes: { brand?: string; model?: string; material?: string; size_class?: string; power?: 'plug'|'battery'|'none'; hazards?: string[]; category?: string; };
  confidence: number;
  evidence: { codes?: string[]; ocr?: string[]; neighbors?: {id:string;score:number}[] };
  next_step?: 'sell'|'give'|'recycle'|'needs_more_info';
};

const API_BASE = (import.meta as any).env?.VITE_API_URL || '/api';
const VITE_PROVIDER = (import.meta as any).env?.VITE_PROVIDER || 'mock';
const VITE_ENABLE_STAGES = (import.meta as any).env?.VITE_ENABLE_STAGES || 'barcode,ocr';

async function callServer(files: File[]): Promise<IdentifyResponse | null> {
  try {
    const fd = new FormData();
    for (const f of files) fd.append('images', f);
    const qs = new URLSearchParams({
      enableStages: VITE_ENABLE_STAGES,
      provider: VITE_PROVIDER,
      allowFilenameText: 'true',
      timeoutMs: '2000'
    });
    const resp = await fetch(`${API_BASE}/identify?${qs.toString()}`, { method: 'POST', body: fd });
    if (!resp.ok) return null;
    const r: ApiIdentifyResult = await resp.json();
    return {
      resolution_level: r.resolution_level,
      attributes: {
        brand: r.attributes.brand,
        model: r.attributes.model,
        material: r.attributes.material,
        size_class: r.attributes.size_class,
        power: r.attributes.power,
        hazards: r.attributes.hazards || [],
        category: r.attributes.category || 'misc',
      },
      confidence: r.confidence,
      evidence: {
        code: (r.evidence.codes && r.evidence.codes[0]) || undefined,
        text: r.evidence.ocr || [],
        visual_match_ids: (r.evidence.neighbors || []).map(n => n.id),
      },
    };
  } catch { return null; }
}

export const identify = {
  async fromPhotos(files: File[]): Promise<IdentifyResponse> {
    // Try server API first
    const viaApi = await callServer(files);
    if (viaApi) return viaApi;

    // Fallback: existing heuristics below
    const first = files[0];
    const name = first?.name || '';
    const hazards: string[] = [];
    if (containsAny(name, ['battery'])) hazards.push('battery');
    if (containsAny(name, ['aerosol'])) hazards.push('aerosol');
    if (containsAny(name, ['blade'])) hazards.push('blade');

    const textTokens = name.replace(/[_-]+/g, ' ').split(/\s+/).filter(Boolean);

    if (containsAny(name, ['isbn', 'upc', 'ean', 'model'])) {
      return {
        resolution_level: 'brand_model',
        attributes: {
          brand: 'Brand',
          model: textTokens.find((t) => /\d/.test(t)) || 'Model',
          hazards,
          category: 'misc',
        },
        confidence: 0.9,
        evidence: {
          code: 'code-in-filename',
          text: textTokens.slice(0, 5),
          visual_match_ids: ['vm_001'],
        },
      };
    }

    let category = 'clothing';
    let confidence = 0.6;
    const dims = await getImageDimensions(first);
    if (dims && dims.width > dims.height) category = 'kitchenware';

    return {
      resolution_level: 'category_only',
      attributes: { hazards, category },
      confidence,
      evidence: {
        text: textTokens.slice(0, 3),
        visual_match_ids: ['vm_002'],
      },
    };
  },
};
