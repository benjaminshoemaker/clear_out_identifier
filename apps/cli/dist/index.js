#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { analyzeItem } from '@clearout/identify';
async function main() {
    const argv = await yargs(hideBin(process.argv))
        .scriptName('cli')
        .command('analyze <images...>', 'Analyze household item from images', (y) => y
        .positional('images', { describe: 'Image file paths', type: 'string' })
        .option('provider', { type: 'string', default: 'mock' })
        .option('timeoutMs', { type: 'number', default: 2000 })
        .option('enableStages', { type: 'string', default: 'barcode,ocr,vlm,clip' })
        .option('allowFilenameText', { type: 'boolean', default: false })
        .option('saveDebug', { type: 'string', default: '' }), async (args) => {
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
        console.log(JSON.stringify(res, null, 2));
    })
        .command('analyze-user', 'Analyze user fixtures from manifest', (y) => y
        .option('enableStages', { type: 'string', default: 'barcode,ocr' })
        .option('userDir', { type: 'string', default: 'packages/identify/test/user_fixtures' })
        .option('userManifest', { type: 'string', default: '' })
        .option('pretty', { type: 'boolean', default: false })
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
        for (const it of normItems) {
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
            const predCat = res.attributes?.category || res.category || '';
            const gtCat = it.category || '';
            const brand = res.attributes.brand || '';
            const line = `${it.id} | ${predCat} | ${gtCat} | ${res.resolution_level} | ${res.confidence.toFixed(2)} | ${brand}`;
            console.log(line);
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