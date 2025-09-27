import fs from 'fs';
import path from 'path';
let compiled = null;
function loadRules() {
    if (compiled)
        return compiled;
    const here = path.dirname(new URL(import.meta.url).pathname);
    const p = path.resolve(here, '../../data/keyword_rules.json');
    const raw = JSON.parse(fs.readFileSync(p, 'utf-8'));
    compiled = raw.map((r) => ({ re: new RegExp(r.pattern, 'ig'), category: r.category, brand: r.brand }));
    return compiled;
}
export function classifyFromText(text, allowedCategories) {
    const rules = loadRules();
    let best = { signals: [] };
    for (const r of rules) {
        if (allowedCategories.length && !allowedCategories.includes(r.category))
            continue;
        const signals = [];
        let m;
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
//# sourceMappingURL=classify.js.map