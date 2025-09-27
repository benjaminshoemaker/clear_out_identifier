import fs from 'fs';
import path from 'path';

type Rule = { pattern: string; category: string; brand: string | null };

let compiled: { re: RegExp; category: string; brand: string | null }[] | null = null;

function loadRules() {
  if (compiled) return compiled;
  const here = path.dirname(new URL(import.meta.url).pathname);
  const p = path.resolve(here, '../../data/keyword_rules.json');
  const raw = JSON.parse(fs.readFileSync(p, 'utf-8')) as Rule[];
  compiled = raw.map((r) => ({ re: new RegExp(r.pattern, 'ig'), category: r.category, brand: r.brand }));
  return compiled!;
}

export function classifyFromText(text: string, allowedCategories: string[]): { category?: string; brand?: string; model?: string; signals: string[] } {
  const rules = loadRules();
  let best: { category?: string; brand?: string; model?: string; signals: string[] } = { signals: [] };
  for (const r of rules) {
    if (allowedCategories.length && !allowedCategories.includes(r.category)) continue;
    const signals: string[] = [];
    let m: RegExpExecArray | null;
    r.re.lastIndex = 0;
    while ((m = r.re.exec(text)) !== null) {
      signals.push(m[0]);
    }
    if (signals.length > (best.signals.length || 0)) {
      const model = (text.match(/\bA\d{4}\b/i) || [])[0] || undefined;
      best = { category: r.category, brand: r.brand || undefined, model, signals };
    }
  }
  return best;
}

