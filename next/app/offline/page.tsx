import type { Metadata } from 'next';

import { AppLink } from '@/components/ui/app-link';

export const metadata: Metadata = { title: '目前離線｜Lorebook' };

/**
 * Service worker 在「離線且這一頁從未造訪過」時供應的頁面。
 *
 * 必須是靜態的：它會在 SW install 時被預先抓下來，那個時間點還沒有 session，
 * 也不該有任何需要伺服器的內容。
 *
 * 語氣上刻意不像錯誤頁——離線在跑團現場是常態（地下室、桌遊店），不是故障。
 */
export default function OfflinePage() {
  return (
    <main
      id="main-content"
      className="mx-auto flex w-full max-w-[520px] flex-1 flex-col justify-center px-4 py-10"
    >
      <div className="rounded-card border border-border bg-surface-1 p-5">
        <h1 className="font-display text-[20px] font-bold text-gold">目前離線</h1>
        <p className="mt-2 text-ui leading-relaxed text-text-light">
          這一頁還沒有在有網路的時候開過，所以這台裝置上沒有它的內容。
          <span className="mt-1 block text-text-secondary">
            開過的頁面離線時仍然看得到。恢復連線後重新整理即可。
          </span>
        </p>

        <div className="mt-4 flex flex-col gap-2">
          <AppLink
            href="/main/character"
            className="flex min-h-11 items-center justify-center rounded-card border border-gold bg-gold/10 text-ui font-bold text-gold"
          >
            回到角色卡
          </AppLink>
          <AppLink
            href="/demo"
            className="flex min-h-11 items-center justify-center rounded-card border border-border text-ui text-text-secondary"
          >
            先看看試玩角色
          </AppLink>
        </div>
      </div>
    </main>
  );
}
