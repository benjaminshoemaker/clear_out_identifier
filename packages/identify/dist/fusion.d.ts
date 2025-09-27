import type { IdentifyResult } from './schemas.js';
export interface FusionInputs {
    codes: string[];
    ocrLines: string[];
    ocrIds: string[];
    vlm: {
        category?: string;
        brand_guess?: string;
        model_guess?: string;
        materials?: string[];
        hazards?: string[];
    };
    clipNeighbors: {
        id: string;
        score: number;
    }[];
}
export declare function fuse(inputs: FusionInputs): IdentifyResult;
