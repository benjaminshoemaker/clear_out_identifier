import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { analyzeItem, type Options } from '@clearout/identify';
import { classifyFromText } from '@clearout/identify/dist/rules/classify.js';
import { mapBarcodeToCategory } from '@clearout/identify/dist/detectors/barcode.js';

const app = express();
app.use(cors());
const upload = multer({ storage: multer.memoryStorage(), limits: { files: 6, fileSize: 10 * 1024 * 1024 } });

app.get('/health', (_req, res) => res.json({ ok: true }));

app.post('/api/identify', upload.array('images', 6), async (req, res) => {
  try {
    const files = (req.files as Express.Multer.File[]) || [];
    if (!files.length) return res.status(400).json({ error: 'no files' });

    const enableStagesParam = String(req.query.enableStages ?? 'barcode,ocr');
    const enableStages = enableStagesParam.split(',').reduce((acc, k) => {
      const key = k.trim(); if (key) (acc as any)[key] = true; return acc;
    }, {} as NonNullable<Options['enableStages']>);
    const provider = String(req.query.provider ?? 'mock');
    const allowFilenameText = String(req.query.allowFilenameText ?? 'true') === 'true';
    const timeoutMs = Number(req.query.timeoutMs ?? 2000) || 2000;

    const bufs = files.map(f => f.buffer);
    const result = await analyzeItem(bufs, {
      imageNames: files.map(f => f.originalname),
      enableStages,
      vlmProvider: provider as any,
      allowFilenameText,
      timeoutMs,
    });

    // Derive a category for UI compatibility (rules first, then barcode)
    const text = (result as any)?.evidence?.ocr?.join('\n') || '';
    const rule = classifyFromText(text, []);
    const mapped = ((result as any)?.evidence?.codes || []).map((c: string) => mapBarcodeToCategory(c)).find(Boolean);
    const category = rule.category || mapped || 'misc';

    // Shape massage for UI: put hazards/category into attributes as well
    const hazards = Array.isArray((result as any)?.hazards) ? (result as any).hazards : [];
    const out = {
      ...result,
      attributes: {
        ...(result as any).attributes,
        category,
        hazards,
      },
    };

    res.json(out);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'internal_error' });
  }
});

const port = Number(process.env.PORT || 8787);
app.listen(port, () => {
  console.log(`identify server on :${port}`);
});

