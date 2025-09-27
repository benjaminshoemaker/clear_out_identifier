import type { Options } from '../schemas.js';
export interface BarcodeResult {
    codes: string[];
}
export declare function detectBarcodes(images: any[], opts?: Options): Promise<BarcodeResult>;
export declare function mapBarcodeToCategory(codeWithFmt: string): string | undefined;
