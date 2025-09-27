export interface CategoryEntry {
    id: string;
    synonyms: string[];
}
export declare const taxonomy: CategoryEntry[];
export declare const brandLexicon: Record<string, string>;
export declare function normalizeBrand(text: string | undefined): string | undefined;
export declare function canonicalCategory(hint?: string): string;
