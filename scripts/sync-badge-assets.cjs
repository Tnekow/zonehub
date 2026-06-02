/**
 * 将 badges.json 中的 image_local 条目同步到 public/badges/assets/（内置静态资源）。
 * 默认从 badgesimg.steamzone.site 拉取；可用 BADGE_CDN_BASE 覆盖。
 *
 * 用法: node ./scripts/sync-badge-assets.cjs
 * 选项: --force  覆盖已存在文件
 *       --dry-run  仅打印统计，不下载
 */

const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');

const ROOT = path.resolve(__dirname, '..');
const BADGES_JSON = path.join(ROOT, 'src', 'data', 'badges.json');
const OUT_ROOT = path.join(ROOT, 'public', 'badges', 'assets');
const CDN_BASE = (process.env.BADGE_CDN_BASE || 'https://badgesimg.steamzone.site').replace(/\/$/, '');
const CONCURRENCY = Math.max(1, Number(process.env.BADGE_SYNC_CONCURRENCY || 12));
const FORCE = process.argv.includes('--force');
const DRY_RUN = process.argv.includes('--dry-run');

function collectLocalPaths() {
  const catalog = JSON.parse(fs.readFileSync(BADGES_JSON, 'utf8'));
  const paths = new Set();
  for (const group of catalog.colors || []) {
    for (const badge of group.badges || []) {
      for (const level of badge.levels || []) {
        const raw = level?.image_local;
        if (typeof raw !== 'string' || !raw.trim()) continue;
        const normalized = raw.trim().replace(/^data\/assets\//, '');
        if (!normalized || normalized.includes('..')) continue;
        paths.add(normalized);
      }
    }
  }
  return [...paths].sort();
}

function downloadFile(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'zonehub-badge-sync/1.0' } }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        downloadFile(res.headers.location).then(resolve, reject);
        return;
      }
      if (res.statusCode !== 200) {
        res.resume();
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(30_000, () => {
      req.destroy(new Error(`Timeout: ${url}`));
    });
  });
}

async function runPool(items, worker) {
  let index = 0;
  async function next() {
    while (index < items.length) {
      const i = index++;
      await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, () => next()));
}

async function main() {
  const relPaths = collectLocalPaths();
  console.log(`[badges:sync] Found ${relPaths.length} unique assets`);
  console.log(`[badges:sync] Output: ${OUT_ROOT}`);
  console.log(`[badges:sync] CDN: ${CDN_BASE}`);

  if (DRY_RUN) {
    console.log('[badges:sync] Dry run — no files written.');
    return;
  }

  fs.mkdirSync(OUT_ROOT, { recursive: true });

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;
  const failures = [];

  await runPool(relPaths, async (rel) => {
    const dest = path.join(OUT_ROOT, rel);
    if (!FORCE && fs.existsSync(dest)) {
      skipped += 1;
      return;
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const url = `${CDN_BASE}/assets/${rel.replace(/\\/g, '/')}`;
    try {
      const buf = await downloadFile(url);
      fs.writeFileSync(dest, buf);
      downloaded += 1;
      if ((downloaded + skipped + failed) % 200 === 0) {
        console.log(`[badges:sync] progress ${downloaded + skipped + failed}/${relPaths.length}`);
      }
    } catch (err) {
      failed += 1;
      if (failures.length < 20) {
        failures.push({ rel, url, error: err instanceof Error ? err.message : String(err) });
      }
    }
  });

  console.log(`[badges:sync] done — downloaded=${downloaded} skipped=${skipped} failed=${failed}`);
  if (failures.length) {
    console.error('[badges:sync] sample failures:');
    for (const f of failures) console.error(`  - ${f.rel}: ${f.error}`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('[badges:sync] fatal:', err);
  process.exit(1);
});
