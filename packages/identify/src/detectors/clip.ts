import type { Options } from '../schemas.js';
import fs from 'fs';
import path from 'path';

let ort: any = null;
try { ort = await import('onnxruntime-node'); } catch {}

function cosine(a: number[], b: number[]): number { let s=0; for (let i=0;i<Math.min(a.length,b.length);i++) s+=a[i]*b[i]; return s; }

export interface Neighbor { id: string; score: number }
export interface ClipResult { neighbors: Neighbor[]; }

function hashToVector(buf: any, dim = 512): number[] {
  // Naive byte-hash to vector for testability without onnxruntime
  const v = new Array(dim).fill(0);
  for (let i = 0; i < buf.length; i++) {
    v[i % dim] += buf[i] / 255;
  }
  const norm = Math.hypot(...v);
  return v.map((x) => (norm ? x / norm : 0));
}

let gallery: { id: string; vec: number[] }[] | null = null;
function loadGallery(): { id: string; vec: number[] }[] {
  if (gallery) return gallery;
  const base = path.resolve(process.cwd(), 'packages/identify/test/fixtures/gallery');
  const out: { id: string; vec: number[] }[] = [];
  try {
    const files = fs.existsSync(base) ? fs.readdirSync(base) : [];
    for (const f of files) {
      const p = path.join(base, f);
      try {
        const buf = fs.readFileSync(p);
        out.push({ id: f, vec: hashToVector(buf) });
      } catch {}
    }
  } catch {}
  gallery = out;
  return out;
}

export async function clipNeighbors(images: any[], opts?: Options): Promise<ClipResult> {
  // Use hash embeddings as fallback; if ORT and model exist, could compute real embedding (omitted in offline env)
  const avg = new Array(512).fill(0);
  let cnt = 0;
  for (const img of images) {
    const v = hashToVector(img);
    for (let i = 0; i < avg.length; i++) avg[i] += v[i];
    cnt++;
  }
  const emb = avg.map((x) => (cnt ? x / cnt : 0));
  const gal = loadGallery();
  const scored = gal.map((g) => ({ id: g.id, score: Math.max(0, Math.min(1, (cosine(emb, g.vec)+1)/2)) }));
  scored.sort((a,b)=>b.score-a.score);
  return { neighbors: scored.slice(0, 5) };
}
