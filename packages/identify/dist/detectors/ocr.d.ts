import type { Options } from '../schemas.js';
export interface OcrResult {
    lines: string[];
    ids: string[];
    hazards: string[];
    brandHints: string[];
}
export declare function runOcr(images: any[], opts?: Options): Promise<OcrResult>;
