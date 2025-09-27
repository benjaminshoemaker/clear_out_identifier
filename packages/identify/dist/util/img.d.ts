export interface PreprocessedImage {
    original: any;
    ocrGray: any;
}
export declare function preprocessImages(buffers: any[]): Promise<PreprocessedImage[]>;
