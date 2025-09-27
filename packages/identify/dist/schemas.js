import { z } from 'zod';
export const Resolution = z.enum(['sku', 'brand_model', 'brand_category', 'category_only']);
export const IdentifyResultSchema = z.object({
    resolution_level: Resolution,
    attributes: z.object({
        brand: z.string().optional(),
        model: z.string().optional(),
        material: z.string().optional(),
        size_class: z.enum(['small', 'medium', 'large']).optional(),
        power: z.enum(['plug', 'battery', 'none']).optional(),
    }),
    hazards: z.array(z.enum(['battery', 'aerosol', 'blade', 'chemical', 'pressurized'])),
    confidence: z.number().min(0).max(1),
    evidence: z.object({
        codes: z.array(z.string()),
        ocr: z.array(z.string()),
        logos: z.array(z.string()),
        neighbors: z.array(z.object({ id: z.string(), score: z.number() })),
    }),
    next_step: z.enum(['sell', 'give', 'recycle', 'needs_more_info']),
});
export const OptionsSchema = z.object({
    timeoutMs: z.number().optional(),
    enableStages: z.object({
        barcode: z.boolean().optional(),
        ocr: z.boolean().optional(),
        vlm: z.boolean().optional(),
        clip: z.boolean().optional(),
    }).optional(),
    imageNames: z.array(z.string()).optional(),
    vlmProvider: z.enum(['mock', 'openai']).optional(),
    mockId: z.string().optional(),
    allowFilenameText: z.boolean().optional(),
    debugDir: z.string().optional(),
    userAllowedCategories: z.array(z.string()).optional(),
});
//# sourceMappingURL=schemas.js.map