export const dynamic = 'force-dynamic';

/**
 * Service worker 的停用開關（kill switch）。
 *
 * SW 是全站的請求攔截器：寫壞了會讓所有人拿到壞掉的快取，而且**已安裝在使用者
 * 瀏覽器裡的 SW 不會因為伺服器上刪掉檔案就消失**。沒有停用路徑的 SW 是不可回退
 * 的部署——Flutter 版那次「網站看起來完全沒變、也沒有任何錯誤」就是這個故障
 * 模式（見 `components/legacy-sw-cleanup.tsx`）。
 *
 * 刻意與 `/api/version` 分開：那支是 `force-static`，值跟著部署烘焙進去；
 * 這支必須 `force-dynamic` ＋ `no-store`，才能在不重建的情況下改變回應，
 * 而且**絕不可被 SW 自己快取**（SW 的 fetch handler 已排除整個 `/api/`）。
 *
 * 停用方式：把環境變數 `SW_DISABLED` 設為 `1`。
 * 之後每個開著的分頁在下次檢查時會自行註銷 SW 並清掉快取。
 */
export function GET() {
  return Response.json(
    { enabled: process.env.SW_DISABLED !== '1' },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
