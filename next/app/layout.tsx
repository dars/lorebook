import type { Metadata, Viewport } from 'next';
import { Cinzel, Inter, Source_Sans_3 } from 'next/font/google';
import { LegacySwCleanup } from '@/components/legacy-sw-cleanup';
import { InstallPrompt } from '@/components/shell/install-prompt';
import { SwRegister } from '@/components/shell/sw-register';
import { UpdatePrompt } from '@/components/shell/update-prompt';
import './globals.css';

/*
 * 字型策略——這是重寫最大的效能槓桿，也是唯一一個實測推翻了原本規劃的項目。
 *
 * Flutter 版把整份 NotoSerifTC-Variable.ttf 打進 bundle：brotli 後 4.09 MB，
 * 佔首次載入的 52%，比整個 app 程式碼還大四倍。
 *
 * **原規劃是走 next/font/google 的 unicode-range 切片，實測證明不可行**：
 * Google 的 Noto Serif TC 依字碼區段而非使用頻率切片，任何一段中文都會散落
 * 在十幾片上。實測（2026-08-05，以真實角色資料）：
 *
 *   整張角色卡 366 個相異字 → 44 片 → 3,375 KB
 *   只有角色名＋種族＋職業 11 個字 → 16 片 → 1,397 KB
 *
 * 11 個字就要 1.4 MB，等於白搬。
 *
 * 因此中文改用**系統字型堆疊**（0 bytes）：每台裝置都內建中文字型，不下載
 * 任何東西。代價是失去 Noto Serif 的特定字面——但為了那個字面付 1.4 MB，
 * 等於放棄整個重寫的效能理由。
 *
 * 拉丁字型（Cinzel 標題、Source Sans 內文）維持自我託管：切片少、體積小，
 * 而古書感主要來自 Cinzel 與金／暗色調，那部分完整保留。
 */

const cinzel = Cinzel({
  variable: '--font-display-src',
  subsets: ['latin'],
  display: 'swap',
});

const sourceSans = Source_Sans_3({
  variable: '--font-body-src',
  subsets: ['latin'],
  display: 'swap',
});

// Inter：區段標題與欄位標籤的英文小標（Flutter 端同樣用它）。
const inter = Inter({
  variable: '--font-label-src',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Lorebook',
  description: 'D&D 2024 跑團角色卡與世界觀筆記',
};

/**
 * `viewportFit: 'cover'` 是 `env(safe-area-inset-*)` 會回傳非零值的前提——
 * 少了它，底部書籤列在 iPhone 的 standalone 模式會被 home indicator 蓋住。
 *
 * themeColor 只是**初始值**：使用者可在設定頁把主題釘成與系統相反的一邊，
 * media query 版本追不上，因此下方的主題腳本會在套用 data-theme 時一併改寫
 * 這個 meta。兩者搭配才不會出現「深色 App、淺色狀態列」。
 */
export const viewport: Viewport = {
  themeColor: '#1c1610',
  viewportFit: 'cover',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="zh-Hant"
      className={`${cinzel.variable} ${sourceSans.variable} ${inter.variable} h-full antialiased`}
      // 下方的主題腳本會在 hydration 之前就把 data-theme 寫到這個元素上，
      // 伺服器輸出必然沒有它，React 一定會回報屬性不符。這正是
      // suppressHydrationWarning 的用途——只抑制**這個元素自身**的屬性比對，
      // 不影響子樹。
      suppressHydrationWarning
    >
      <head>
        {/* 主題在畫面繪製前先套用，避免深色使用者看到一閃的淺色。
            同時改寫 theme-color，讓瀏覽器列／狀態列跟著主題走。

            **必須放在 `<head>` 裡。** 原本擺在 `<html>` 與 `<body>` 之間，
            那個位置在 HTML 規格上不合法：瀏覽器解析時會把它移進 body，
            React 因此在 hydration 時對不上樹狀結構（實際會噴三個 console
            error：script 位置、script 不能是 html 的子節點、屬性不符）。 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=localStorage.getItem('lorebook-theme')||'system';var d=m==='dark'||(m==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';var t=document.querySelector('meta[name="theme-color"]');if(t)t.setAttribute('content',d?'#1c1610':'#faf7f2');}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col font-reading">
        <a href="#main-content" className="skip-link">
          跳至主要內容
        </a>
        {/* 順序有意義：先清掉 Flutter 遺留的 SW，再註冊自己的。 */}
        <LegacySwCleanup />
        <SwRegister />
        <UpdatePrompt />
        <InstallPrompt />
        {children}
      </body>
    </html>
  );
}
