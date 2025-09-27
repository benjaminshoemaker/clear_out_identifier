import { z } from 'zod';
import type { Options } from '../schemas.js';
import fs from 'fs';
import path from 'path';

export const VlmJsonSchema = z.object({
  category: z.string().optional(),
  brand_guess: z.string().optional(),
  model_guess: z.string().optional(),
  materials: z.array(z.string()).optional(),
  hazards: z.array(z.string()).optional(),
});
export type VlmJson = z.infer<typeof VlmJsonSchema>;

export interface VisionAdapter {
  describe(images: any[], systemPrompt: string, userPrompt: string, opts?: Options): Promise<VlmJson>;
}

class MockVision implements VisionAdapter {
  async describe(_images: any[], _systemPrompt: string, _userPrompt: string, opts?: Options): Promise<VlmJson> {
    const id = opts?.mockId || (opts?.imageNames?.[0] ? path.basename(opts.imageNames[0]).split('.')[0] : 'default');
    const here = path.dirname(new URL(import.meta.url).pathname);
    const p = path.resolve(here, '../../test/fixtures/mocks', `${id}.json`);
    try {
      const raw = fs.readFileSync(p, 'utf-8');
      const obj = JSON.parse(raw);
      return VlmJsonSchema.parse(obj);
    } catch {
      return { category: 'misc', materials: [], hazards: [] };
    }
  }
}

export const vision: VisionAdapter = new MockVision();
