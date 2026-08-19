import type { MetadataRoute } from 'next';

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
    background_color: '#1c1610',
    theme_color: '#1c1610',
    /*
     * `any` 與 `maskable` 必須是**兩張不同的圖**，不能同一張掛兩個用途。
     *
     * maskable 的圖會被平台裁進中央約 80% 的安全區（Android 的自適應圖示會
     * 依廠商裁成圓形、方形或水滴形）。原圖那圈裝飾方框正好貼著邊緣，直接標成
     * maskable 會被切掉四角；-maskable 那張是同一份設計縮到安全區內、四周補滿
     * 同色底而來。反過來，把留了大片邊距的 maskable 圖拿來當 `any` 用，
     * 在不裁切的場合（桌面捷徑、分頁圖示）又會顯得縮水。
     *
     * apple-touch-icon 不在這裡：iOS 不讀 manifest 的 icons，
     * 走的是 app/apple-icon.png 這個檔案慣例（Next 會自動產生 link 標籤）。
     */
    icons: [
      { src: '/images/app-icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/images/app-icon.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: '/images/app-icon-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
