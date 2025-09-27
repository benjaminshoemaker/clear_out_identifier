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

export const identify = {
  async fromPhotos(files: File[]): Promise<IdentifyResponse> {
    const first = files[0];
    const name = first?.name || '';

    const hazards: string[] = [];
    if (containsAny(name, ['battery'])) hazards.push('battery');
    if (containsAny(name, ['aerosol'])) hazards.push('aerosol');
    if (containsAny(name, ['blade'])) hazards.push('blade');

    // Simple OCR/text evidence from filename
    const textTokens = name
      .replace(/[_-]+/g, ' ')
      .split(/\s+/)
      .filter(Boolean);

    // Heuristic 1: code-like in filename
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

    // Heuristic 2: aspect ratio to infer category
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

