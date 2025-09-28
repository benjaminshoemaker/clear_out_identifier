#!/usr/bin/env node
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import fg from 'fast-glob';
import OpenAI from 'openai';

const DEFAULT_USER_DIR = 'packages/identify/test/user_fixtures';

const OUTPUT_SCHEMA = {
  name: 'ClearOutItem',
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      brand: { type: 'string' },
      model: { type: ['string', 'null'] },
      category: { type: 'string', enum: ['health_beauty','vehicles_parts','arts_entertainment','electronics'] },
      hazards: { type: 'array', items: { type: 'string', enum: ['blade','battery'] } },
      resolution_level: { type: 'string', enum: ['brand_model','brand_category','unknown'] },
      evidence: {
        type: 'object',
        additionalProperties: false,
        properties: {
          from_text: { type: 'array', items: { type: 'string' } },
          from_logo: { type: 'array', items: { type: 'string' } },
          from_barcode: { type: 'array', items: { type: 'string' } },
        },
        required: ['from_text','from_logo','from_barcode']
      }
    },
    required: ['brand','model','category','hazards','resolution_level','evidence']
  },
  strict: true
};

function readJsonSafe(p, fallback = null) {
  try { return JSON.parse(fs.readFileSync(p, 'utf-8')); } catch { return fallback; }
}

function toCsvRow(fields) {
  return fields.map((v)=>{
    if (v === null || v === undefined) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }).join(',');
}

function estimateCost(usage, pricing) {
  if (!usage) return { est: 'N/A', input: null, output: null };
  const inTok = usage.input_tokens ?? null;
  const outTok = usage.output_tokens ?? null;
  return { est: null, input: inTok, output: outTok };
}

function computeCostUSD(modelKey, inputTokens, outputTokens, pricing) {
  const pr = pricing?.[modelKey];
  if (!pr) return 'N/A';
  const inRatePer1m = typeof pr.input_per_1m === 'number' ? pr.input_per_1m : undefined;
  const outRatePer1m = typeof pr.output_per_1m === 'number' ? pr.output_per_1m : undefined;
  const inRatePer1k = typeof pr.input_per_1k === 'number' ? pr.input_per_1k : undefined;
  const outRatePer1k = typeof pr.output_per_1k === 'number' ? pr.output_per_1k : undefined;
  if (typeof inputTokens !== 'number' || typeof outputTokens !== 'number') return 'N/A';
  let est = NaN;
  if (inRatePer1m !== undefined && outRatePer1m !== undefined) {
    est = (inputTokens/1_000_000 * inRatePer1m) + (outputTokens/1_000_000 * outRatePer1m);
  } else if (inRatePer1k !== undefined && outRatePer1k !== undefined) {
    est = (inputTokens/1000 * inRatePer1k) + (outputTokens/1000 * outRatePer1k);
  }
  if (!isFinite(est)) return 'N/A';
  return est.toFixed(4);
}

function chunksOf(arr, n) {
  const out = [];
  for (let i=0;i<arr.length;i+=n) out.push(arr.slice(i,i+n));
  return out;
}

function guessMime(p) {
  const ext = path.extname(p).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.bmp') return 'image/bmp';
  if (ext === '.tiff' || ext === '.tif') return 'image/tiff';
  if (ext === '.heic') return 'image/heic';
  return 'image/jpeg';
}

async function fileToImagePart(p) {
  const buf = await fsp.readFile(p);
  const b64 = buf.toString('base64');
  const mime = guessMime(p);
  const dataUrl = `data:${mime};base64,${b64}`;
  return { type: 'input_image', image_url: dataUrl };
}

function buildSystemPrompt() {
  return [
    'You are a meticulous product identification assistant.',
    'Task: Examine provided photos and return ONLY a JSON object conforming to the required JSON Schema.',
    'Extract fields strictly from what is visible in the images; do not hallucinate.',
    'If uncertain: set resolution_level to "unknown", model to null, and hazards to an empty array.',
  ].join(' ');
}

function buildUserPrompt(item) {
  return [
    `Item context: ${item.id || item.item_id || 'unknown id'}.`,
    'Allowed labels:',
    '  - category: one of [health_beauty, vehicles_parts, arts_entertainment, electronics].',
    '  - hazards: any of [blade, battery]. Use only if clearly visible or strongly implied by packaging text/icons.',
    '  - resolution_level: brand_model, brand_category, or unknown.',
    'Rules:',
    '  - Extract values only if visible in the photos. Do not use outside knowledge.',
    '  - If you see brand/model text, set them. Model can be null if not visible.',
    '  - evidence.from_text must cite short quoted snippets visible in the photos (e.g., "Levi\'s", "RN12345").',
    '  - evidence.from_logo may list known brand logo names you recognize from the images.',
    '  - evidence.from_barcode may include any barcodes/ISBN seen as text.',
    'Return only a single JSON object matching the schema.',
  ].join('\n');
}

async function callModelOnce({ client, model, imageParts, id, timeoutMs }) {
  const sys = buildSystemPrompt();
  const user = buildUserPrompt({ id });
  const payload = {
    model,
    temperature: 0,
    input: [
      { role: 'system', content: [{ type: 'input_text', text: sys }] },
      { role: 'user', content: [{ type: 'input_text', text: user }, ...imageParts] },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: OUTPUT_SCHEMA.name,
        schema: OUTPUT_SCHEMA.schema,
        strict: OUTPUT_SCHEMA.strict,
      }
    },
  };

  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await client.responses.create(payload, { signal: controller.signal });
    const outputText = res.output_text ?? (res.output?.[0]?.content?.[0]?.text?.value ?? '');
    return { raw: res, text: outputText };
  } finally {
    clearTimeout(to);
  }
}

async function callWithRetry(args) {
  try {
    return await callModelOnce(args);
  } catch (e) {
    // One retry on failure
    return await callModelOnce(args);
  }
}

async function main() {
  // Load .env.local for OPENAI_API_KEY if present
  try {
    const scriptDir = path.dirname(new URL(import.meta.url).pathname);
    const candidates = [
      path.resolve(process.cwd(), '.env.local'),
      path.resolve(scriptDir, '..', '.env.local'),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        const txt = fs.readFileSync(p, 'utf-8');
        for (const line of txt.split(/\r?\n/)) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const eq = trimmed.indexOf('=');
          if (eq === -1) continue;
          const key = trimmed.slice(0, eq).trim();
          let val = trimmed.slice(eq + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) process.env[key] = val;
        }
        break;
      }
    }
  } catch {}

  const argv = await yargs(hideBin(process.argv))
    .option('userDir', { type: 'string', default: DEFAULT_USER_DIR })
    .option('manifest', { type: 'string', default: '' })
    .option('model', { type: 'string', default: 'gpt-5-mini', choices: ['gpt-5','gpt-5-mini','gpt-4o','gpt-4.1','gpt-4o-mini'] })
    .option('maxImagesPerItem', { type: 'number', default: 4 })
    .option('outJson', { type: 'string', default: 'eval_vlm_results.json' })
    .option('outCsv', { type: 'string', default: 'eval_vlm_results.csv' })
    .option('printJson', { type: 'boolean', default: false })
    .option('dryRun', { type: 'boolean', default: false })
    .option('images', { type: 'string', default: '' })
    .help()
    .argv;

  const userDir = path.resolve(argv.userDir);
  const manifestPath = path.resolve(argv.manifest || path.join(userDir, 'user_manifest.json'));
  const maxPer = Math.max(1, Number(argv.maxImagesPerItem || 4));
  const model = String(argv.model);

  // Pricing
  const pricingPath = path.resolve(path.dirname(new URL(import.meta.url).pathname), 'pricing.json');
  const pricing = readJsonSafe(pricingPath, {});

  // Compose items
  let items = [];
  if (argv.images) {
    const patterns = String(argv.images).split(',').map(s=>s.trim()).filter(Boolean);
    const files = (await fg(patterns, { dot: false, absolute: true })).slice(0, maxPer);
    if (!files.length) {
      console.error('No files matched for --images');
      process.exit(1);
    }
    items = [{ id: 'adhoc', images: files.map(f=>path.resolve(f)) }];
  } else {
    const m = readJsonSafe(manifestPath, null);
    if (!m) { console.error(`Manifest not found or invalid: ${manifestPath}`); process.exit(1); }
    const arr = Array.isArray(m) ? m : (m.items || []);
    items = arr.map((it) => ({ id: it.id || it.item_id || it.name || 'unknown', images: (it.images||[]).map((p)=>path.resolve(userDir, p)) }));
  }

  if (argv.dryRun) {
    console.log('Dry run. Items and image paths:');
    console.table(items.map(i=>({ id: i.id, images: i.images.slice(0, maxPer).join(' | ') })));
    process.exit(0);
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('OPENAI_API_KEY is not set.');
    process.exit(1);
  }
  const client = new OpenAI({ apiKey });

  // Concurrency runner (limit 2)
  const limit = 2;
  const queue = items.map((it, idx) => ({ it, idx }));
  const results = new Array(items.length);
  let inFlight = 0; let cursor = 0;

  async function runOne(index) {
    const { it } = queue[index];
    const imgs = (it.images || []).slice(0, maxPer).filter((p) => fs.existsSync(p));
    const imageParts = await Promise.all(imgs.map(fileToImagePart));
    const timeoutMs = 60_000;
    let callRes;
    try {
      callRes = await callWithRetry({ client, model, imageParts, id: it.id, timeoutMs });
    } catch (e) {
      results[index] = { item_id: it.id, model, error: String(e?.message || e), output: null, usage: null, est_cost: 'N/A' };
      console.error(`Item ${it.id}: ERROR ${String(e?.message || e)}`);
      return;
    }

    // Parse JSON; if parse fails, retry once, then record error
    let parsed = null;
    try { parsed = JSON.parse(callRes.text || ''); }
    catch (e) {
      try {
        const retry = await callModelOnce({ client, model, imageParts, id: it.id, timeoutMs });
        parsed = JSON.parse(retry.text || '');
        callRes = retry; // use retry usage for cost
      } catch (e2) {
        results[index] = { item_id: it.id, model, error: 'ParseError', output: null, usage: callRes.raw?.usage || null, est_cost: 'N/A' };
        console.error(`Item ${it.id}: PARSE ERROR`);
        return;
      }
    }

    const usage = callRes.raw?.usage || null;
    const inTok = usage?.input_tokens ?? null;
    const outTok = usage?.output_tokens ?? null;
    const estCost = computeCostUSD(model, inTok, outTok, pricing);

    // Extra context: anything not mapped to the CSV table
    const knownKeys = new Set(['brand','model','category','hazards','resolution_level']);
    const extra = Object.fromEntries(Object.entries(parsed || {}).filter(([k]) => !knownKeys.has(k)));
    if (!extra.evidence && parsed?.evidence) extra.evidence = parsed.evidence;

    results[index] = { item_id: it.id, model, output: parsed, usage, est_cost: estCost, extra };
    console.log(`Item ${it.id} | model=${model} | in=${inTok ?? 'N/A'} out=${outTok ?? 'N/A'} | est_cost=$${estCost}`);
  }

  async function pump() {
    const promises = [];
    while (inFlight < limit && cursor < queue.length) {
      const idx = cursor++;
      inFlight++;
      promises.push(runOne(idx).finally(()=>{ inFlight--; }));
    }
    if (promises.length) {
      await Promise.all(promises);
      if (cursor < queue.length) await pump();
    }
  }

  await pump();

  // Write outputs
  const outJsonPath = path.resolve(argv.outJson);
  await fsp.writeFile(outJsonPath, JSON.stringify(results, null, 2));

  const headers = ['item_id','model','brand','model_name','category','hazards','resolution_level','input_tokens','output_tokens','est_cost_usd'];
  const rows = [headers.join(',')];
  for (const r of results) {
    const o = r?.output || {};
    const usage = r?.usage || {};
    const brand = o.brand ?? '';
    const modelName = (o.model === null ? '' : (o.model ?? ''));
    const category = o.category ?? '';
    const hazards = Array.isArray(o.hazards) ? o.hazards.join(';') : '';
    const resLevel = o.resolution_level ?? '';
    const inTok = usage?.input_tokens ?? '';
    const outTok = usage?.output_tokens ?? '';
    const cost = r?.est_cost ?? 'N/A';
    rows.push(toCsvRow([r.item_id, r.model, brand, modelName, category, hazards, resLevel, inTok, outTok, cost]));
  }
  const outCsvPath = path.resolve(argv.outCsv);
  await fsp.writeFile(outCsvPath, rows.join('\n'));

  // Console table
  const table = results.map(r => ({
    item_id: r.item_id,
    model: r.model,
    brand: r?.output?.brand ?? '-',
    model_name: r?.output?.model ?? '-',
    category: r?.output?.category ?? '-',
    hazards: Array.isArray(r?.output?.hazards) ? r.output.hazards.join(';') : '-',
    res: r?.output?.resolution_level ?? '-',
    in_tokens: r?.usage?.input_tokens ?? '-',
    out_tokens: r?.usage?.output_tokens ?? '-',
    est_cost_usd: r?.est_cost ?? 'N/A'
  }));
  console.table(table);

  // Aggregates
  const validCosts = results.map(r => (typeof r.est_cost === 'string' ? Number(r.est_cost) : NaN)).filter(n => !isNaN(n));
  const totalCost = validCosts.reduce((a,b)=>a+b, 0);
  const totalIn = results.map(r => r?.usage?.input_tokens ?? 0).reduce((a,b)=>a+(Number(b)||0), 0);
  const totalOut = results.map(r => r?.usage?.output_tokens ?? 0).reduce((a,b)=>a+(Number(b)||0), 0);
  const meanCost = validCosts.length ? (totalCost / validCosts.length) : 0;
  console.log(`Totals: input_tokens=${totalIn} output_tokens=${totalOut} total_cost=$${totalCost.toFixed(4)} mean_cost=$${meanCost.toFixed(4)}`);

  if (argv.printJson) {
    // Emit the full results JSON to stdout in addition to file outputs
    console.log(JSON.stringify(results, null, 2));
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
