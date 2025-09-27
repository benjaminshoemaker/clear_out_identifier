export declare const config: {
    weights: {
        w_code: number;
        w_model: number;
        w_brand: number;
        w_clip: number;
        w_vlm: number;
        w_ocr_text: number;
    };
    thresholds: {
        sell_conf: number;
    };
    timeouts: {
        barcodeMs: number;
        ocrMs: number;
        vlmMs: number;
        clipMs: number;
    };
    allowFilenameText: boolean;
};
