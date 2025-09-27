export const regex = {
  isbn: /\b(?:ISBN(?:-1[03])?:?\s*)?((?:97[89][ -]?)?[0-9][0-9 -]{8,}[0-9X])\b/i,
  fcc: /\bFCC\s*ID\s*[:#]?\s*([A-Z0-9-]{5,})\b/i,
  rn: /\bRN\s*[:#]?\s*(\d{5,})\b/i,
  ca: /\bCA\s*[:#]?\s*(\d{5,})\b/i,
  model: /\b(?:model|type|p\/?n|m\/?n|part|no\.)\s*[:#]?\s*([A-Z0-9-]{2,})\b/i,
};

export function extractIds(text: string): string[] {
  const out: string[] = [];
  for (const r of [regex.isbn, regex.fcc, regex.rn, regex.ca, regex.model]) {
    const m = text.match(r);
    if (m && m[1]) out.push(m[1]);
  }
  return Array.from(new Set(out));
}

export function detectHazards(text: string): string[] {
  const hazards: string[] = [];
  const lower = text.toLowerCase();
  if (/(lithium|li-ion|nimh|battery)/i.test(lower)) hazards.push('battery');
  if (/(aerosol|propane|butane|co2|pressur)/i.test(lower)) hazards.push('aerosol');
  if (/(flammable|corrosive|acid|alkali|chemical)/i.test(lower)) hazards.push('chemical');
  if (/(blade|knife|razor|cutter)/i.test(lower)) hazards.push('blade');
  if (/(pressur|compressed)/i.test(lower)) hazards.push('pressurized');
  return Array.from(new Set(hazards));
}

export function extractRN(text: string): string[] {
  const out: string[] = [];
  let m: RegExpExecArray | null;
  const r = /\bRN\s*[:#]?\s*(\d{5,})\b/gi;
  while ((m = r.exec(text)) !== null) out.push(`RN${m[1]}`);
  return Array.from(new Set(out));
}

// Lightweight normalizeBrand to avoid circular deps
const brandMap: Record<string,string> = {
  'levis': "Levi's",
  'levi': "Levi's",
  'levi\'s': "Levi's",
  'lodge': 'Lodge',
  'ikea': 'IKEA',
  'dewalt': 'DeWalt',
  'bosch': 'Bosch',
  'sony': 'Sony',
  'samsung': 'Samsung',
  'apple': 'Apple',
  'kitchenaid': 'KitchenAid',
  'cuisinart': 'Cuisinart'
};
export function normalizeBrand(text?: string): string | undefined {
  if (!text) return undefined;
  const key = text.toLowerCase().replace(/[^a-z0-9]/g, '');
  return brandMap[key] || text;
}
