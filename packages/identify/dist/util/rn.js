import fs from 'fs';
import path from 'path';
let cache = null;
function loadMap() {
    if (cache)
        return cache;
    try {
        const here = path.dirname(new URL(import.meta.url).pathname);
        const p = path.resolve(here, '../../data/rn_map.json');
        const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
        cache = data;
        return data;
    }
    catch {
        cache = {};
        return cache;
    }
}
export function mapRnToBrand(rn) {
    const key = rn.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const m = loadMap();
    return m[key];
}
//# sourceMappingURL=rn.js.map