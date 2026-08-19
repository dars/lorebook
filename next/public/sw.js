/*
 * Lorebook service worker — 離線唯讀。
 *
 * 手寫而非用 next-pwa / Serwist：範圍很窄（一組快取策略、一個版本、一個清除
 * 入口），手寫百來行就能完全掌握它的行為，也不必為此拉進 workbox 全家桶。
 *
 * ── 讀這個檔之前要知道的四件事 ──────────────────────────
 *
 * 1. **這是全站的請求攔截器。** 寫錯會讓所有人拿到壞掉的內容，而且已安裝的 SW
 *    不會因為伺服器刪檔而消失。因此 `/api/sw-status` 是 kill switch，且
 *    `/api/` 一律不快取——那是唯一能把自己關掉的路。
 *
 * 2. **快取鍵帶 build id。** 換版即整批失效；舊版的 RSC payload 與新版的
 *    client bundle 不相容，留著只會是難查的錯。
 *
 * 3. **頁面快取分公私兩區。** 角色頁含個人資料，登出要清；內容庫與試玩頁是
 *    公開內容，清了只是讓下次登入變慢。混在一起就只能全清或全留。
 *
 * 4. **不自行 skipWaiting。** 新版裝好後靜靜等著，由頁面上的更新提示讓使用者
 *    決定何時套用。跑團中自動重載可能正好落在改 HP 的當下。
 */

const VERSION = new URL(self.location.href).searchParams.get('v') || 'dev';
const STATIC_CACHE = `lorebook-static-${VERSION}`;
const PUBLIC_CACHE = `lorebook-public-${VERSION}`;
const PRIVATE_CACHE = `lorebook-private-${VERSION}`;
const OFFLINE_URL = '/offline';

const CURRENT = [STATIC_CACHE, PUBLIC_CACHE, PRIVATE_CACHE];

/** 本應用擁有的快取；清理時據此避開別人的。 */
const OWNED = (key) => key.startsWith('lorebook-');

/** 記錄快取寫入時間，供畫面顯示「資料多舊」。 */
const CACHED_AT = 'x-lorebook-cached-at';

/** 不含個人資料的路徑——登出時保留。 */
const PUBLIC_PATHS = ['/catalog/', '/demo', '/login', '/offline'];

// ── 安裝與啟用 ────────────────────────────────────────

self.addEventListener('install', (event) => {
  // 只預快取離線說明頁。其餘一律等實際造訪過才存——預先抓一整包資產既拖慢
  // 首次安裝，也會快取到使用者根本用不到的頁面。
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((c) => c.add(OFFLINE_URL))
      .catch(() => {}),
  );
  // 這裡**不呼叫 skipWaiting**：見檔頭第 4 點。首次安裝（沒有既有 controller）
  // 時瀏覽器本來就會直接啟用，不受影響。
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      if (await disabled()) return selfDestruct();

      // 清掉自己的舊版本快取，別人的一律不碰。
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => OWNED(k) && !CURRENT.includes(k)).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

/** 停用旗標。取不到就當作沒停用——網路不通時不該把自己關掉。 */
async function disabled() {
  try {
    const r = await fetch('/api/sw-status', { cache: 'no-store' });
    if (!r.ok) return false;
    const { enabled } = await r.json();
    return enabled === false;
  } catch {
    return false;
  }
}

async function selfDestruct() {
  const keys = await caches.keys();
  await Promise.all(keys.filter(OWNED).map((k) => caches.delete(k)));
  await self.registration.unregister();
  // 讓開著的分頁立刻回到無 SW 的狀態，而不是等下一次導覽。
  const clients = await self.clients.matchAll({ type: 'window' });
  for (const c of clients) c.navigate(c.url).catch(() => {});
}

// ── 請求處理 ──────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // 跨來源（Supabase、字型 CDN…）一律不碰：認證與即時性不該被快取，
  // 而 opaque response 存了也讀不出成敗。
  if (url.origin !== self.location.origin) return;

  // 永不快取：kill switch 與版本查詢必須永遠走網路，否則就關不掉自己；
  // 分享檢視必須是即時活資料（character-share 規格）。
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/v/')) return;

  if (isStatic(url)) {
    event.respondWith(safely(request, () => cacheFirst(event, request)));
    return;
  }

  if (request.mode === 'navigate' || isRsc(request, url)) {
    event.respondWith(
      safely(request, () => networkFirst(event, request, cacheNameFor(url))),
    );
  }
});

/**
 * 最後一道保險：策略本身出任何意外都退回直接連網路。
 *
 * 這是最重要的一段。如果 fetch handler 拋出，`respondWith` 會回一個網路錯誤，
 * 使用者連頁面都打不開——而打不開就跑不到頁面端的 kill switch，等於把自己
 * 鎖在門外，只能請每個人手動清瀏覽器資料。寧可失去離線能力，也不能失去網站。
 */
async function safely(request, run) {
  try {
    return await run();
  } catch {
    try {
      return await fetch(request);
    } catch {
      return Response.error();
    }
  }
}

/** 內容雜湊命名的資產，內容永不改變。 */
function isStatic(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/images/') ||
    url.pathname === '/manifest.webmanifest' ||
    url.pathname === '/apple-icon.png'
  );
}

/** App Router 的分頁切換走 RSC 請求而非整頁導覽。 */
function isRsc(request, url) {
  return request.headers.get('RSC') === '1' || url.searchParams.has('_rsc');
}

function cacheNameFor(url) {
  return PUBLIC_PATHS.some((p) => url.pathname.startsWith(p))
    ? PUBLIC_CACHE
    : PRIVATE_CACHE;
}

async function cacheFirst(event, request) {
  const cache = await caches.open(STATIC_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;

  const res = await fetch(request);
  // waitUntil 讓寫入在回應送出後仍能完成——否則 SW 可能在寫完前被結束。
  if (res.ok) event.waitUntil(put(cache, request, res.clone()));
  return res;
}

/**
 * 網路優先，失敗才回退快取。
 *
 * 唯讀情境下「最後一次成功的整份回應」正是要的語意——它是一致的快照，
 * 不會出現角色是新的、內容庫是舊的那種混搭。
 */
async function networkFirst(event, request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(request);
    // 只存成功且非重導的回應。重導多半是 `/login`——把它存起來，
    // 離線時就會固定看到登入頁，正好是這次要避免的事。
    if (res.ok && !res.redirected) event.waitUntil(put(cache, request, res.clone()));
    notify({ type: 'online' });
    return res;
  } catch {
    const hit = await cache.match(request);
    if (hit) {
      notify({ type: 'offline', cachedAt: hit.headers.get(CACHED_AT) });
      return offlineCopy(hit);
    }
    notify({ type: 'offline', cachedAt: null });
    // 從未造訪過又離線：給自己的說明頁，而不是瀏覽器那張「無法連上網站」。
    if (request.mode === 'navigate') {
      const offline = await caches.open(STATIC_CACHE).then((c) => c.match(OFFLINE_URL));
      if (offline) return offlineCopy(offline);
    }
    return Response.error();
  }
}

/** 寫入時蓋上時間戳。Response 的 headers 不可變，只能重建一份。 */
async function put(cache, request, res) {
  const headers = new Headers(res.headers);
  headers.set(CACHED_AT, new Date().toISOString());
  const body = await res.blob();
  return cache.put(
    request,
    new Response(body, { status: res.status, statusText: res.statusText, headers }),
  );
}

async function offlineCopy(res) {
  const headers = new Headers(res.headers);
  headers.set('x-lorebook-offline', '1');
  const body = await res.blob();
  return new Response(body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
}

/**
 * 告知所有分頁目前是線上還是離線。
 *
 * 導覽回應的標頭讀不到（JS 拿不到 document 回應的 header），RSC 請求也是 Next
 * 的 router 自己發的——所以連線狀態只能由 SW 主動推給頁面。
 *
 * 只在狀態改變時推，否則每一次 RSC 請求都會廣播一則訊息。
 */
let lastState = null;

async function notify(message) {
  if (message.type === lastState && message.type === 'online') return;
  lastState = message.type;
  const clients = await self.clients.matchAll({ type: 'window' });
  for (const c of clients) c.postMessage({ source: 'lorebook-sw', ...message });
}

// ── 來自頁面的指令 ────────────────────────────────────

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || typeof data !== 'object') return;

  // 使用者在更新提示按下「立即更新」才會走到這裡。
  if (data.type === 'skip-waiting') self.skipWaiting();

  // 登出：只清含個人資料的頁面快取。靜態資產與公開頁面（內容庫、試玩）留著，
  // 那是 SRD 公開內容，清了只是讓下次登入變慢。
  if (data.type === 'clear-private') {
    event.waitUntil(caches.delete(PRIVATE_CACHE));
  }
});
