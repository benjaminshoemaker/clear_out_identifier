import { z } from 'zod';
export declare const Resolution: z.ZodEnum<["sku", "brand_model", "brand_category", "category_only"]>;
export type Resolution = z.infer<typeof Resolution>;
export declare const IdentifyResultSchema: z.ZodObject<{
    resolution_level: z.ZodEnum<["sku", "brand_model", "brand_category", "category_only"]>;
    attributes: z.ZodObject<{
        brand: z.ZodOptional<z.ZodString>;
        model: z.ZodOptional<z.ZodString>;
        material: z.ZodOptional<z.ZodString>;
        size_class: z.ZodOptional<z.ZodEnum<["small", "medium", "large"]>>;
        power: z.ZodOptional<z.ZodEnum<["plug", "battery", "none"]>>;
    }, "strip", z.ZodTypeAny, {
        brand?: string | undefined;
        model?: string | undefined;
        material?: string | undefined;
        size_class?: "small" | "medium" | "large" | undefined;
        power?: "plug" | "battery" | "none" | undefined;
    }, {
        brand?: string | undefined;
        model?: string | undefined;
        material?: string | undefined;
        size_class?: "small" | "medium" | "large" | undefined;
        power?: "plug" | "battery" | "none" | undefined;
    }>;
    hazards: z.ZodArray<z.ZodEnum<["battery", "aerosol", "blade", "chemical", "pressurized"]>, "many">;
    confidence: z.ZodNumber;
    evidence: z.ZodObject<{
        codes: z.ZodArray<z.ZodString, "many">;
        ocr: z.ZodArray<z.ZodString, "many">;
        logos: z.ZodArray<z.ZodString, "many">;
        neighbors: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            score: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            id: string;
            score: number;
        }, {
            id: string;
            score: number;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        codes: string[];
        ocr: string[];
        logos: string[];
        neighbors: {
            id: string;
            score: number;
        }[];
    }, {
        codes: string[];
        ocr: string[];
        logos: string[];
        neighbors: {
            id: string;
            score: number;
        }[];
    }>;
    next_step: z.ZodEnum<["sell", "give", "recycle", "needs_more_info"]>;
}, "strip", z.ZodTypeAny, {
    resolution_level: "sku" | "brand_model" | "brand_category" | "category_only";
    attributes: {
        brand?: string | undefined;
        model?: string | undefined;
        material?: string | undefined;
        size_class?: "small" | "medium" | "large" | undefined;
        power?: "plug" | "battery" | "none" | undefined;
    };
    hazards: ("battery" | "aerosol" | "blade" | "chemical" | "pressurized")[];
    confidence: number;
    evidence: {
        codes: string[];
        ocr: string[];
        logos: string[];
        neighbors: {
            id: string;
            score: number;
        }[];
    };
    next_step: "sell" | "give" | "recycle" | "needs_more_info";
}, {
    resolution_level: "sku" | "brand_model" | "brand_category" | "category_only";
    attributes: {
        brand?: string | undefined;
        model?: string | undefined;
        material?: string | undefined;
        size_class?: "small" | "medium" | "large" | undefined;
        power?: "plug" | "battery" | "none" | undefined;
    };
    hazards: ("battery" | "aerosol" | "blade" | "chemical" | "pressurized")[];
    confidence: number;
    evidence: {
        codes: string[];
        ocr: string[];
        logos: string[];
        neighbors: {
            id: string;
            score: number;
        }[];
    };
    next_step: "sell" | "give" | "recycle" | "needs_more_info";
}>;
export type IdentifyResult = z.infer<typeof IdentifyResultSchema>;
export declare const OptionsSchema: z.ZodObject<{
    timeoutMs: z.ZodOptional<z.ZodNumber>;
    enableStages: z.ZodOptional<z.ZodObject<{
        barcode: z.ZodOptional<z.ZodBoolean>;
        ocr: z.ZodOptional<z.ZodBoolean>;
        vlm: z.ZodOptional<z.ZodBoolean>;
        clip: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        ocr?: boolean | undefined;
        barcode?: boolean | undefined;
        vlm?: boolean | undefined;
        clip?: boolean | undefined;
    }, {
        ocr?: boolean | undefined;
        barcode?: boolean | undefined;
        vlm?: boolean | undefined;
        clip?: boolean | undefined;
    }>>;
    imageNames: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    vlmProvider: z.ZodOptional<z.ZodEnum<["mock", "openai"]>>;
    mockId: z.ZodOptional<z.ZodString>;
    allowFilenameText: z.ZodOptional<z.ZodBoolean>;
    debugDir: z.ZodOptional<z.ZodString>;
    userAllowedCategories: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    timeoutMs?: number | undefined;
    enableStages?: {
        ocr?: boolean | undefined;
        barcode?: boolean | undefined;
        vlm?: boolean | undefined;
        clip?: boolean | undefined;
    } | undefined;
    imageNames?: string[] | undefined;
    vlmProvider?: "mock" | "openai" | undefined;
    mockId?: string | undefined;
    allowFilenameText?: boolean | undefined;
    debugDir?: string | undefined;
    userAllowedCategories?: string[] | undefined;
}, {
    timeoutMs?: number | undefined;
    enableStages?: {
        ocr?: boolean | undefined;
        barcode?: boolean | undefined;
        vlm?: boolean | undefined;
        clip?: boolean | undefined;
    } | undefined;
    imageNames?: string[] | undefined;
    vlmProvider?: "mock" | "openai" | undefined;
    mockId?: string | undefined;
    allowFilenameText?: boolean | undefined;
    debugDir?: string | undefined;
    userAllowedCategories?: string[] | undefined;
}>;
export type Options = z.infer<typeof OptionsSchema>;
