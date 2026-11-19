import type { MetadataRoute } from 'next';

// 換圖也換網址，讓瀏覽器與已安裝 PWA 不再沿用舊圖示快取。
const iconVersion = '927eacc30d79';

/**
 * PWA manifest，對照 Flutter 端 web/manifest.json。
 *
 * `display: standalone` 是「加到主畫面」後全螢幕開啟的前提；沒有它
 * A2HS 的引導會做白工（iOS 仍會加書籤，但開起來是一般 Safari 分頁）。
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Lorebook',
    short_name: 'Lorebook',
    description: 'D&D 2024 角色卡與世界觀筆記',
    start_url: '/',
    display: 'standalone',
    background_color: '#19232d',
    theme_color: '#19232d',
    /*
     * 一般圖示保留定稿比例；maskable 使用獨立輸出，多留裁切邊距，讓書角、
     * 星芒與書籤都位於中央直徑 80% 的安全圓內，適應圓形或水滴形遮罩。
     * 母圖及重製指令見 designs/app-icons/export-production.sh。
     *
     * apple-touch-icon 不在這裡：iOS 不讀 manifest 的 icons，
     * 走的是 app/apple-icon.png 這個檔案慣例（Next 會自動產生 link 標籤）。
     */
    icons: [
      { src: `/images/app-icon-192.png?v=${iconVersion}`, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: `/images/app-icon.png?v=${iconVersion}`, sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: `/images/app-icon-maskable.png?v=${iconVersion}`,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
