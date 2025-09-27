import fs from 'fs';
import path from 'path';
import { analyzeItem } from '@clearout/identify';
import ss from 'simple-statistics';

async function run() {
  const manifest = JSON.parse(fs.readFileSync(path.resolve('dataset/manifest.json'), 'utf-8')) as any;
  const results: any[] = [];
  for (const s of manifest.samples) {
    const p = path.resolve(s.path);
    const buf = fs.existsSync(p) ? fs.readFileSync(p) : Buffer.from(`dummy-${s.id}`);
    const res = await analyzeItem([buf], { imageNames: [path.basename(p)], mockId: s.id });
    results.push({ id: s.id, res, gt: s.gt });
    console.log(s.id, res.resolution_level, res.next_step, res.hazards.join(','));
  }
  // Simple metrics
  const top1 = results.filter(r => r.res.attributes && r.gt && r.gt.category).filter(r => true).length; // placeholder
}

run().catch(e => { console.error(e); process.exit(1); });
