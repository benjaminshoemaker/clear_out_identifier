export declare const regex: {
    isbn: RegExp;
    fcc: RegExp;
    rn: RegExp;
    ca: RegExp;
    model: RegExp;
};
export declare function extractIds(text: string): string[];
export declare function detectHazards(text: string): string[];
export declare function extractRN(text: string): string[];
export declare function normalizeBrand(text?: string): string | undefined;
