import type { Metadata } from 'next';
import { Cinzel, Inter, Source_Sans_3 } from 'next/font/google';
import { LegacySwCleanup } from '@/components/legacy-sw-cleanup';
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

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="zh-Hant"
      className={`${cinzel.variable} ${sourceSans.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-cjk">
        <LegacySwCleanup />
        {children}
      </body>
    </html>
  );
}
