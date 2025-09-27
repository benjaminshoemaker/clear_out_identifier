import type { Options } from '../schemas.js';
export interface Neighbor {
    id: string;
    score: number;
}
export interface ClipResult {
    neighbors: Neighbor[];
}
export declare function clipNeighbors(images: any[], opts?: Options): Promise<ClipResult>;
