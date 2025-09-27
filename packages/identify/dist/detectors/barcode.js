import { config } from '../config.js';
async function withTimeout(p, ms, onTimeout) {
    return new Promise((resolve) => {
        const t = setTimeout(() => resolve(onTimeout()), ms);
        p.then((v) => { clearTimeout(t); resolve(v); }).catch(() => { clearTimeout(t); resolve(onTimeout()); });
    });
}
export async function detectBarcodes(images, opts) {
    if (opts?.enableStages && opts.enableStages.barcode === false)
        return { codes: [] };
    const codes = new Set();
    try {
        const zxing = await import('@zxing/library');
        const sharpMod = await import('sharp');
        const sharp = sharpMod.default || sharpMod;
        const { RGBLuminanceSource, HybridBinarizer, BinaryBitmap, MultiFormatReader, BarcodeFormat, DecodeHintType } = zxing;
        const formats = [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E, BarcodeFormat.CODE_128, BarcodeFormat.QR_CODE];
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);
        const reader = new MultiFormatReader();
        reader.setHints(hints);
        for (const img of images) {
            const attempt = async () => {
                for (const angle of [0, 90, 180, 270]) {
                    const { data, info } = await sharp(img).rotate(angle).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
                    const gray = new Uint8ClampedArray(info.width * info.height);
                    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
                        const r = data[i], g = data[i + 1], b = data[i + 2];
                        gray[j] = (0.299 * r + 0.587 * g + 0.114 * b) | 0;
                    }
                    const source = new RGBLuminanceSource(gray, info.width, info.height);
                    const bitmap = new BinaryBitmap(new HybridBinarizer(source));
                    try {
                        const result = reader.decode(bitmap);
                        if (result?.getText) {
                            const text = result.getText();
                            const format = result.getBarcodeFormat?.() || 'CODE';
                            codes.add(String(format) + ':' + text);
                            break;
                        }
                    }
                    catch {
                        // continue rotating
                    }
                }
            };
            await withTimeout(attempt(), (opts?.timeoutMs ?? config.timeouts.barcodeMs), () => undefined);
        }
    }
    catch {
        // swallow
    }
    // If still empty, optionally extract from filename if explicitly allowed
    if (codes.size === 0 && opts?.allowFilenameText) {
        for (const name of opts?.imageNames || []) {
            const m = name.match(/(97[89]\d{10}|\b\d{12,13}\b|ISBN[\d-]+)/i);
            if (m)
                codes.add('FILENAME:' + m[1]);
        }
    }
    return { codes: Array.from(codes) };
}
export function mapBarcodeToCategory(codeWithFmt) {
    // Accept formats like EAN_13:978..., ISBN..., or raw digits
    const raw = codeWithFmt.split(':').pop() || codeWithFmt;
    if (!raw)
        return undefined;
    const digits = raw.replace(/[^0-9Xx]/g, '');
    // ISBN-13 starts with 978/979; ISBN-10 length 10 ending with digit or X
    if (/^(97[89]\d{10}|\d{9}[\dXx])$/.test(digits)) {
        return 'Media > Books';
    }
    return undefined;
}
//# sourceMappingURL=barcode.js.map