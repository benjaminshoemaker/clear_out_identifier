import fs from 'fs';
import path from 'path';

export interface CalibrationMap {
  xs: number[];
  ys: number[];
}

export function loadCalibration(): CalibrationMap | null {
  try {
    const p = path.resolve(process.cwd(), 'packages/identify/src/calibration.json');
    const data = JSON.parse(fs.readFileSync(p, 'utf-8')) as CalibrationMap;
    if (Array.isArray(data.xs) && Array.isArray(data.ys) && data.xs.length === data.ys.length && data.xs.length > 1) {
      return data;
    }
  } catch {}
  return null;
}

export function applyCalibration(conf: number, cal?: CalibrationMap | null): number {
  if (!cal) return conf;
  const { xs, ys } = cal;
  // piecewise linear interpolation
  if (conf <= xs[0]) return ys[0];
  if (conf >= xs[xs.length - 1]) return ys[ys.length - 1];
  for (let i = 0; i < xs.length - 1; i++) {
    if (conf >= xs[i] && conf <= xs[i + 1]) {
      const t = (conf - xs[i]) / (xs[i + 1] - xs[i]);
      return ys[i] + t * (ys[i + 1] - ys[i]);
    }
  }
  return conf;
}

// Simple isotonic regression fit (pool-adjacent violators) on pairs (score, label)
export function fitIsotonic(pairs: Array<{ score: number; label: 0|1 }>): CalibrationMap {
  // Sort by score
  const sorted = pairs.slice().sort((a, b) => a.score - b.score);
  const xs = sorted.map(p => p.score);
  let ys: number[] = sorted.map(p => p.label);
  // PAV
  let i = 0;
  while (i < ys.length - 1) {
    if (ys[i] <= ys[i + 1]) {
      i++;
      continue;
    }
    let j = i;
    const k = i + 1;
    let sum = ys[i] + ys[i + 1];
    let count = 2;
    while (j > 0 && sum / count < ys[j - 1]) {
      j--;
      sum += ys[j];
      count++;
    }
    const avg = sum / count;
    for (let t = j; t <= k; t++) ys[t] = avg;
    i = k;
  }
  // Thin points to unique xs
  const uniqXs: number[] = [];
  const uniqYs: number[] = [];
  for (let idx = 0; idx < xs.length; idx++) {
    if (idx === 0 || xs[idx] !== xs[idx - 1]) {
      uniqXs.push(xs[idx]);
      uniqYs.push(ys[idx]);
    } else {
      uniqYs[uniqYs.length - 1] = (uniqYs[uniqYs.length - 1] + ys[idx]) / 2;
    }
  }
  return { xs: uniqXs, ys: uniqYs };
}
