import { z } from 'zod';
import fs from 'fs';
import path from 'path';
export const VlmJsonSchema = z.object({
    category: z.string().optional(),
    brand_guess: z.string().optional(),
    model_guess: z.string().optional(),
    materials: z.array(z.string()).optional(),
    hazards: z.array(z.string()).optional(),
});
class MockVision {
    async describe(_images, _systemPrompt, _userPrompt, opts) {
        const id = opts?.mockId || (opts?.imageNames?.[0] ? path.basename(opts.imageNames[0]).split('.')[0] : 'default');
        const here = path.dirname(new URL(import.meta.url).pathname);
        const p = path.resolve(here, '../../test/fixtures/mocks', `${id}.json`);
        try {
            const raw = fs.readFileSync(p, 'utf-8');
            const obj = JSON.parse(raw);
            return VlmJsonSchema.parse(obj);
        }
        catch {
            return { category: 'misc', materials: [], hazards: [] };
        }
    }
}
export const vision = new MockVision();
//# sourceMappingURL=vision.js.map