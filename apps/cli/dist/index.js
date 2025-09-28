#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { analyzeItem } from '@clearout/identify';
// Pull a few internals from built outputs to aid verbose explanations
// These paths exist in this monorepo and are safe to import from dist
import { classifyFromText } from '@clearout/identify/dist/rules/classify.js';
import { mapBarcodeToCategory } from '@clearout/identify/dist/detectors/barcode.js';
import { extractIds } from '@clearout/identify/dist/util/text.js';
async function main() {
    const argv = await yargs(hideBin(process.argv))
        .scriptName('cli')
        .command('analyze <images...>', 'Analyze household item from images', (y) => y
        .positional('images', { describe: 'Image file paths', type: 'string' })
        .option('provider', { type: 'string', default: 'mock' })
        .option('timeoutMs', { type: 'number', default: 2000 })
        .option('enableStages', { type: 'string', default: 'barcode,ocr,vlm,clip' })
        .option('allowFilenameText', { type: 'boolean', default: false })
        .option('saveDebug', { type: 'string', default: '' })
        .option('verbose', { type: 'boolean', default: false })
        .option('maxOcrLines', { type: 'number', default: 6 }), async (args) => {
        const files = args.images.map((p) => path.resolve(String(p)));
        const bufs = files.map((f) => {
            try {
                return fs.readFileSync(f);
            }
            catch {
                return Buffer.from(`dummy-${path.basename(f)}`);
            }
        });
        const enableStages = String(args.enableStages).split(',').reduce((acc, k) => { acc[k.trim()] = true; return acc; }, {});
        const res = await analyzeItem(bufs, {
            imageNames: files.map((f) => path.basename(f)),
            vlmProvider: args.provider || 'mock',
            timeoutMs: Number(args.timeoutMs) || 2000,
            enableStages,
            allowFilenameText: !!args.allowFilenameText,
            debugDir: args.saveDebug ? String(args.saveDebug) : undefined,
        });
        if (args.verbose) {
            const text = res.evidence?.ocr?.join('\n') || '';
            const rule = classifyFromText(text, []);
            const codes = res.evidence?.codes || [];
            const mapped = codes.map((c) => ({ code: c, category: mapBarcodeToCategory(c) || null }));
            const ids = extractIds(text);
            // Human friendly section
            const title = `Item: ${files.map(f => path.basename(f)).join(', ')}`;
            console.log('\n' + title);
            console.log('-'.repeat(title.length));
            console.log(`Resolution: ${res.resolution_level}    Confidence: ${res.confidence.toFixed(2)}    Next: ${res.next_step}`);
            console.log(`Pred (rules/barcode): ${rule.category || mapped.find(m => m.category)?.category || '-'}`);
            console.log(`Brand: ${res.attributes.brand || rule.brand || '-'}`);
            console.log(`Model: ${res.attributes.model || rule.model || '-'}`);
            console.log(`Barcodes: ${mapped.length ? mapped.map(m => `${m.code}${m.category ? ` -> ${m.category}` : ''}`).join('; ') : '-'}`);
            console.log(`IDs: ${ids.length ? ids.join(', ') : '-'}`);
            const lines = (res.evidence?.ocr || []).slice(0, Number(args.maxOcrLines));
            if (lines.length) {
                console.log('OCR lines:');
                for (const l of lines)
                    console.log(`  • ${l.replace(/\s+/g, ' ').trim()}`);
            }
            if (rule.signals?.length)
                console.log(`Rule signals: ${rule.signals.join(' | ')}`);
        }
        else {
            console.log(JSON.stringify(res, null, 2));
        }
    })
        .command('analyze-user', 'Analyze user fixtures from manifest', (y) => y
        .option('enableStages', { type: 'string', default: 'barcode,ocr' })
        .option('userDir', { type: 'string', default: 'packages/identify/test/user_fixtures' })
        .option('userManifest', { type: 'string', default: '' })
        .option('pretty', { type: 'boolean', default: false })
        .option('verbose', { type: 'boolean', default: true })
        .option('maxOcrLines', { type: 'number', default: 6 })
        .option('timeoutMs', { type: 'number', default: 2000 }), async (args) => {
        // Resolve paths relative to repo root (not CLI cwd) when given as relative
        const here = path.dirname(new URL(import.meta.url).pathname);
        const repoRoot = path.resolve(here, '../../..');
        const userDirArg = String(args.userDir);
        const userDir = path.isAbsolute(userDirArg) ? userDirArg : path.resolve(repoRoot, userDirArg);
        const manifestArg = args.userManifest ? String(args.userManifest) : path.join(userDir, 'user_manifest.json');
        const manifestPath = path.isAbsolute(manifestArg) ? manifestArg : path.resolve(repoRoot, manifestArg);
        let m;
        try {
            m = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        }
        catch {
            console.log(`No manifest found at ${manifestPath}. Nothing to do.`);
            return;
        }
        const items = Array.isArray(m) ? m : (m.items || []);
        // Map alternate field names if top-level array provided
        const normItems = items.map((it) => ({
            id: it.id || it.item_id || it.name || '',
            images: it.images || [],
            category: it.category || it.ground_truth?.category || '',
        }));
        const allowedCategories = Array.from(new Set(items.map(i => i.category || i.ground_truth?.category).filter(Boolean)));
        let correct = 0;
        let total = 0;
        for (let idx = 0; idx < normItems.length; idx++) {
            const it = normItems[idx];
            const raw = items[idx] || {};
            const gt = raw.ground_truth || raw || {};
            const imgs = (it.images || []).map((p) => path.resolve(userDir, p));
            const bufs = imgs.map((f) => { try {
                return fs.readFileSync(f);
            }
            catch {
                return Buffer.from(`dummy-${f}`);
            } });
            const enableStages = String(args.enableStages).split(',').reduce((acc, k) => { acc[k.trim()] = true; return acc; }, {});
            const res = await analyzeItem(bufs, {
                imageNames: imgs.map((f) => path.basename(f)),
                timeoutMs: Number(args.timeoutMs) || 2000,
                enableStages,
                userAllowedCategories: allowedCategories,
            });
            const text = res.evidence?.ocr?.join('\n') || '';
            const rule = classifyFromText(text, allowedCategories);
            const predCat = rule.category || res.attributes?.category || res.category || '';
            const gtCat = it.category || '';
            const brand = res.attributes.brand || rule.brand || '';
            if (args.verbose) {
                const title = `Item ${it.id}`;
                console.log('\n' + title);
                console.log('-'.repeat(title.length));
                // Manifest section
                console.log('Manifest');
                console.log('--------');
                console.log(`ID: ${it.id}`);
                console.log(`Category: ${gtCat || '-'}`);
                console.log(`Brand: ${gt.brand || '-'}`);
                console.log(`Model: ${gt.model || '-'}`);
                const hazGT = Array.isArray(gt.hazards) ? gt.hazards : [];
                console.log(`Hazards: ${hazGT.length ? hazGT.join(', ') : '-'}`);
                if (Array.isArray(it.images) && it.images.length) {
                    console.log(`Images: ${it.images.join(', ')}`);
                }
                console.log('');
                // Analysis section
                console.log('Analysis');
                console.log('--------');
                console.log(`Pred Category: ${predCat || '-'}`);
                console.log(`Resolution: ${res.resolution_level}    Confidence: ${res.confidence.toFixed(2)}    Next: ${res.next_step}`);
                console.log(`Brand: ${brand || '-'}`);
                console.log(`Model: ${res.attributes.model || rule.model || '-'}`);
                // Barcodes + mappings
                const codes = res.evidence?.codes || [];
                const mapped = codes.map((c) => ({ code: c, category: mapBarcodeToCategory(c) || null }));
                console.log(`Barcodes: ${mapped.length ? mapped.map(m => `${m.code}${m.category ? ` -> ${m.category}` : ''}`).join('; ') : '-'}`);
                // IDs extracted from OCR
                const ids = extractIds(text);
                console.log(`IDs: ${ids.length ? ids.join(', ') : '-'}`);
                // OCR lines (top N)
                const lines = (res.evidence?.ocr || []).slice(0, Number(args.maxOcrLines));
                if (lines.length) {
                    console.log('OCR lines:');
                    for (const l of lines)
                        console.log(`  • ${l.replace(/\s+/g, ' ').trim()}`);
                }
                if (rule.signals?.length)
                    console.log(`Rule signals: ${rule.signals.join(' | ')}`);
                // Visual neighbors if any
                const neigh = res.evidence?.neighbors || [];
                if (neigh.length) {
                    console.log('Neighbors:');
                    for (const n of neigh.slice(0, 5))
                        console.log(`  • ${n.id} (${n.score.toFixed(2)})`);
                }
            }
            else {
                const line = `${it.id} | ${predCat} | ${gtCat} | ${res.resolution_level} | ${res.confidence.toFixed(2)} | ${brand}`;
                console.log(line);
            }
            if (predCat && gtCat && predCat === gtCat)
                correct++;
            total++;
            if (args.pretty)
                console.log(JSON.stringify(res, null, 2));
        }
        const acc = total ? (correct / total).toFixed(2) : '0.00';
        console.log(`Accuracy: ${acc} (${correct}/${total})`);
    })
        .demandCommand(1)
        .help().argv;
    void argv;
}
main().catch((e) => {
    console.error(e);
    process.exit(1);
});
//# sourceMappingURL=index.js.map