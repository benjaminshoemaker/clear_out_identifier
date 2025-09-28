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

class OpenAIVision implements VisionAdapter {
  private model: string;
  constructor(model?: string) { this.model = model || 'gpt-4o'; }
  async describe(images: any[], systemPrompt: string, userPrompt: string, opts?: Options): Promise<VlmJson> {
    const key = process.env.OPENAI_API_KEY;
    if (!key) return {};
    const imgParts = images.map((buf) => {
      try {
        const b64 = Buffer.isBuffer(buf) ? buf.toString('base64') : Buffer.from(buf).toString('base64');
        const url = `data:image/png;base64,${b64}`;
        return { type: 'input_image', image_url: url } as any;
      } catch { return null; }
    }).filter(Boolean) as any[];

    const schema = {
      type: 'json_schema',
      name: 'ClearOutVisionSchema',
      strict: true,
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          brand_guess: { type: 'string' },
          model_guess: { type: ['string','null'] },
          category: { type: 'string' },
          hazards: { type: 'array', items: { type: 'string' } },
        },
        required: ['brand_guess','model_guess','category','hazards']
      }
    };

    const payload = {
      model: this.model,
      temperature: 0,
      input: [
        { role: 'system', content: [{ type: 'input_text', text: systemPrompt }] },
        { role: 'user', content: [{ type: 'input_text', text: userPrompt }, ...imgParts] },
      ],
      text: { format: schema }
    } as any;

    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), (opts?.timeoutMs ?? 800));
    try {
      const res = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (!res.ok) return {};
      const json: any = await res.json();
      const text = json.output_text || (json.output?.[0]?.content?.[0]?.text?.value ?? '');
      if (!text) return {};
      try { return VlmJsonSchema.parse(JSON.parse(text)); } catch { return {}; }
    } catch {
      return {};
    } finally {
      clearTimeout(t);
    }
  }
}

export function getVisionAdapter(opts?: Options): VisionAdapter {
  if (opts?.vlmProvider === 'openai') return new OpenAIVision();
  return new MockVision();
}
