import { z } from 'zod';
import type { Options } from '../schemas.js';
export declare const VlmJsonSchema: z.ZodObject<{
    category: z.ZodOptional<z.ZodString>;
    brand_guess: z.ZodOptional<z.ZodString>;
    model_guess: z.ZodOptional<z.ZodString>;
    materials: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    hazards: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    hazards?: string[] | undefined;
    category?: string | undefined;
    brand_guess?: string | undefined;
    model_guess?: string | undefined;
    materials?: string[] | undefined;
}, {
    hazards?: string[] | undefined;
    category?: string | undefined;
    brand_guess?: string | undefined;
    model_guess?: string | undefined;
    materials?: string[] | undefined;
}>;
export type VlmJson = z.infer<typeof VlmJsonSchema>;
export interface VisionAdapter {
    describe(images: any[], systemPrompt: string, userPrompt: string, opts?: Options): Promise<VlmJson>;
}
export declare const vision: VisionAdapter;
