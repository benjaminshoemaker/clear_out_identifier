import type { Options } from '../schemas.js';
import { extractIds, extractRN, detectHazards, normalizeBrand } from '../util/text.js';
import { config } from '../config.js';

async function withTimeout<T>(p: Promise<T>, ms: number, onTimeout: () => T): Promise<T> {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(onTimeout()), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }).catch(() => { clearTimeout(t); resolve(onTimeout()); });
  });
}

export interface OcrResult {
  lines: string[];
  ids: string[];
  hazards: string[];
  brandHints: string[];
}

export async function runOcr(images: any[], opts?: Options): Promise<OcrResult> {
  const allLines: string[] = [];
  const runOne = async (img: any) => {
    try {
      const sharpMod = await import('sharp');
      const sharp: any = (sharpMod as any).default || (sharpMod as any);
      const tesseract = await import('tesseract.js');
      const recognize = (tesseract as any).recognize as (i: any, lang: string, config?: any) => Promise<any>;
      const base = sharp(img);
      const { data: fullBuf } = await base.clone().resize({ width: 1600, height: 1600, fit: 'inside' }).toBuffer({ resolveWithObject: false });
      const meta = await base.metadata();
      // Heuristic crops: bottom strip and center tag
      const width = meta.width || 800; const height = meta.height || 800;
      const crops: any[] = [];
      crops.push(await base.clone().extract({ left: 0, top: Math.max(0, Math.floor(height*0.7)), width, height: Math.floor(height*0.3) }).grayscale().toBuffer());
      const tagW = Math.floor(width*0.5), tagH = Math.floor(height*0.5);
      crops.push(await base.clone().extract({ left: Math.floor((width-tagW)/2), top: Math.floor((height-tagH)/2), width: tagW, height: tagH }).grayscale().toBuffer());

      const texts: string[] = [];
      for (const c of crops) {
        try { const res = await recognize(c, 'eng'); texts.push(res?.data?.text || ''); } catch {}
      }
      // Full frame fallback
      try { const res = await recognize(fullBuf, 'eng'); texts.push(res?.data?.text || ''); } catch {}
      return texts.filter(Boolean);
    } catch {
      return [] as string[];
    }
  };

  const promises = images.map((img) => withTimeout(runOne(img), opts?.timeoutMs ?? config.timeouts.ocrMs, () => [] as string[]));
  const perImageTexts = await Promise.all(promises);
  for (const arr of perImageTexts) allLines.push(...arr);

  // Filename tokens only if explicitly allowed
  if ((opts as any)?.allowFilenameText) {
    for (const name of opts?.imageNames || []) allLines.push(name.replace(/[_.-]/g, ' '));
  }

  const allText = allLines.join('\n');
  const ids = extractIds(allText);
  const hazards = detectHazards(allText);
  const brandHintsRaw = (allText.match(/[A-Z][A-Za-z\-']{2,}/g) || []).slice(0, 10);
  const brandHints = Array.from(new Set(brandHintsRaw.map((b) => normalizeBrand(b)).filter(Boolean) as string[]));
  return { lines: allLines.slice(0, 50), ids, hazards, brandHints };
}
