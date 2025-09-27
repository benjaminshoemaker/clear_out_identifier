import fs from 'fs';
import path from 'path';
export function loadAllowedCategories(userManifestPath) {
    try {
        const p = path.resolve(userManifestPath);
        const raw = JSON.parse(fs.readFileSync(p, 'utf-8'));
        const cats = new Set();
        for (const item of raw.items || []) {
            if (item.category)
                cats.add(item.category);
            if (item.ground_truth?.category)
                cats.add(item.ground_truth.category);
        }
        return Array.from(cats);
    }
    catch {
        return [];
    }
}
//# sourceMappingURL=userManifest.js.map