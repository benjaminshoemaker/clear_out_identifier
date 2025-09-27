export const config = {
  weights: {
    w_code: 0.9,
    w_model: 0.6,
    w_brand: 0.45,
    w_clip: 0.35,
    w_vlm: 0.4,
    w_ocr_text: 0.25,
  },
  thresholds: {
    sell_conf: 0.7,
  },
  timeouts: {
    barcodeMs: 800,
    ocrMs: 2000,
    vlmMs: 800,
    clipMs: 800,
  },
  allowFilenameText: false,
};
