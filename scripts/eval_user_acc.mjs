import fs from 'fs';
import path from 'path';
import { analyzeItem } from '@clearout/identify';
import { classifyFromText } from '@clearout/identify/dist/rules/classify.js';
import { mapBarcodeToCategory } from '@clearout/identify/dist/detectors/barcode.js';

const userDir = 'packages/identify/test/user_fixtures';
const manifest = JSON.parse(fs.readFileSync(path.join(userDir,'user_manifest.json'),'utf-8'));

const rows = [];
for (const it of manifest.items) {
  const imgs = it.images.map(n => path.join(userDir, n));
  const bufs = imgs.map(f => fs.readFileSync(f));
  const res = await analyzeItem(bufs, {
    imageNames: it.images,
    enableStages: { barcode:true, ocr:true, vlm:false, clip:false },
    allowFilenameText: true
  });

  const text = (res.evidence?.ocr || []).join('\n');
  const rule = classifyFromText(text, []); // no allow-list filter
  const predCat = rule.category || (res.evidence?.codes || []).map(mapBarcodeToCategory).find(Boolean) || null;

  const gt = it.ground_truth || {};
  const brandOK = gt.brand ? String(res.attributes?.brand||'').toLowerCase() === String(gt.brand||'').toLowerCase() : null;
  const modelOK = gt.model ? String(res.attributes?.model||'').toLowerCase().includes(String(gt.model||'').toLowerCase()) : null;
  const resOK   = gt.resolution_level ? res.resolution_level === gt.resolution_level : null;

  const haz = res.hazards || [];
  const hazGT = gt.hazards || [];
  const tp = haz.filter(h => hazGT.includes(h)).length;
  const hazP = haz.length ? tp / haz.length : null;
  const hazR = hazGT.length ? tp / hazGT.length : null;

  rows.push({ id: it.item_id, predCat, gtCat: gt.category||null,
              brand: res.attributes?.brand||null, brandOK,
              model: res.attributes?.model||null, modelOK,
              resolution: res.resolution_level, resOK,
              haz, hazGT, hazP, hazR, confidence: res.confidence });
}
fs.writeFileSync('eval_user_results.json', JSON.stringify(rows, null, 2));
console.table(rows.map(r => ({
  id:r.id, predCat:r.predCat, gtCat:r.gtCat,
  brandOK:r.brandOK, modelOK:r.modelOK, resOK:r.resOK,
  hazP:r.hazP, hazR:r.hazR, conf:r.confidence?.toFixed?.(2)
})));

