/**
 * 辨識 Flutter 版遺留的 service worker 與快取。
 *
 * 抽成純函式是為了能測——判斷邏輯若寫在元件裡，就只能靠瀏覽器手動驗證，
 * 而這段的失敗模式（誤殺自己的 SW）不會有任何錯誤訊息，只會表現為
 * 「離線功能莫名其妙不生效」。
 */

/** Flutter build 產生的 service worker 檔名。 */
const FLUTTER_SW_SCRIPT = 'flutter_service_worker.js';

/** Flutter 的 CacheStorage 鍵；`flutter-` 前綴涵蓋各版本的變體。 */
const FLUTTER_CACHE_PREFIX = 'flutter-';

/** 本應用自己的快取一律用這個前綴，清理時據此避開。 */
export const CACHE_PREFIX = 'lorebook-';

/**
 * 這個 registration 是不是 Flutter 留下的。
 *
 * 以 script URL 判斷而非 scope：Flutter 與本應用的 scope 都是 `/`，
 * 用 scope 分不出來——那正是原本會誤殺自己的原因。
 */
export function isLegacyRegistration(scriptUrl: string | null | undefined): boolean {
  if (!scriptUrl) return false;
  return scriptUrl.includes(FLUTTER_SW_SCRIPT);
}

/**
 * 這個 cache key 是不是 Flutter 留下的。
 *
 * 只認 `flutter-` 前綴。**不認識的 key 一律保留**——寧可留下一點別人的垃圾，
 * 也不要把自己的快取清掉；後者的代價是離線功能整個失效。
 */
export function isLegacyCacheKey(key: string): boolean {
  return key.startsWith(FLUTTER_CACHE_PREFIX);
}
