import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const origin = 'https://lorebook.party';
const expectedBuildId = '18fa933-icon-927eacc30d79';
const hash = (buffer) => createHash('sha256').update(buffer).digest('hex');
const checks = [];

async function get(path) {
  const response = await fetch(new URL(path, origin), {
    headers: { 'Cache-Control': 'no-cache' },
    signal: AbortSignal.timeout(30_000),
  });
  assert.equal(response.status, 200, path);
  return response;
}

async function verifyImage(path, localPath, contentType, sizes) {
  const response = await get(path);
  const actualType = response.headers.get('content-type')?.split(';')[0];
  // Cloudflare 靜態資產使用 IANA 的 ICO MIME；Next.js metadata 使用 x-icon。
  const acceptedTypes = contentType === 'image/x-icon'
    ? ['image/x-icon', 'image/vnd.microsoft.icon']
    : [contentType];
  assert.ok(acceptedTypes.includes(actualType), `${path}: unexpected content type ${actualType}`);
  const remote = Buffer.from(await response.arrayBuffer());
  const local = await readFile(new URL(`../../next/${localPath}`, import.meta.url));
  const digest = hash(local);
  assert.equal(hash(remote), digest, `${path}: 線上檔案與本機輸出不一致`);
  if (sizes) {
    assert.equal(`${remote.readUInt32BE(16)}x${remote.readUInt32BE(20)}`, sizes);
  }
  const result = { path, status: 200, sha256: digest, ...(sizes ? { sizes } : {}) };
  checks.push(result);
  console.log(`PASS ${path}: matches local SHA-256${sizes ? `, ${sizes}` : ''}`);
}

const version = await (await get('/api/version')).json();
assert.equal(version.buildId, expectedBuildId);
console.log(`PASS live build: ${version.buildId}`);

const manifest = await (await get('/manifest.webmanifest')).json();
assert.equal(manifest.icons.length, 3);
assert.deepEqual(manifest.icons.map(({ sizes, purpose }) => [sizes, purpose]), [
  ['192x192', 'any'], ['512x512', 'any'], ['512x512', 'maskable'],
]);
for (const icon of manifest.icons) {
  assert.match(icon.src, /\?v=927eacc30d79$/);
  const { pathname } = new URL(icon.src, origin);
  await verifyImage(icon.src, `public${pathname}`, 'image/png', icon.sizes);
  // 舊頁面或其他既有引用仍可能使用沒有版本參數的網址。
  await verifyImage(pathname, `public${pathname}`, 'image/png', icon.sizes);
}

const iconLinks = {};
for (const page of ['/privacy', '/login']) {
  const html = await (await get(page)).text();
  const links = [...html.matchAll(/<link\b[^>]*>/g)].map(([tag]) => tag);
  assert.ok(links.some((tag) => tag.includes('rel="manifest"') && tag.includes('/manifest.webmanifest')));
  for (const [rel, localPath, type, sizes] of [
    ['icon', 'app/favicon.ico', 'image/x-icon', undefined],
    ['apple-touch-icon', 'app/apple-icon.png', 'image/png', '180x180'],
  ]) {
    const tag = links.find((tag) => tag.includes(`rel="${rel}"`));
    assert.ok(tag, `${page}: missing ${rel}`);
    const href = tag.match(/href="([^"]+)"/)?.[1].replaceAll('&amp;', '&');
    assert.ok(href);
    if (iconLinks[rel]) assert.equal(href, iconLinks[rel]);
    else {
      iconLinks[rel] = href;
      await verifyImage(href, localPath, type, sizes);
    }
  }
  console.log(`PASS page icon links: ${page}`);
}
await verifyImage('/favicon.ico', 'app/favicon.ico', 'image/x-icon');
await verifyImage('/apple-icon.png', 'app/apple-icon.png', 'image/png', '180x180');

console.log(JSON.stringify({
  checkedAt: new Date().toISOString(), origin, buildId: version.buildId, iconLinks, checks,
}, null, 2));
