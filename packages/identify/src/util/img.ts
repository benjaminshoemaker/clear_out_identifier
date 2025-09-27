// Lightweight wrappers; fall back when sharp not available
export interface PreprocessedImage {
  original: any;
  ocrGray: any;
}

async function trySharp(buffer: any): Promise<PreprocessedImage | null> {
  try {
    const sharp = (await import('sharp')).default as any;
    const img = sharp(buffer, { failOn: 'none' });
    const rotated = await img.rotate().toBuffer();
    const resized = await sharp(rotated).resize({ width: 1600, height: 1600, fit: 'inside' }).toBuffer();
    const gray = await sharp(resized).grayscale().normalise?.().toBuffer?.() ?? resized;
    return { original: resized, ocrGray: gray };
  } catch {
    return null;
  }
}

export async function preprocessImages(buffers: any[]): Promise<PreprocessedImage[]> {
  const out: PreprocessedImage[] = [];
  for (const b of buffers) {
    const pp = await trySharp(b);
    out.push(pp ?? { original: b, ocrGray: b });
  }
  return out;
}
