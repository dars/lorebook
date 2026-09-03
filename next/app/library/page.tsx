import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { BackgroundManager } from '@/components/backgrounds/background-manager';
import { HomebrewItemMeta } from '@/components/homebrew/item-meta';
import { OfflineNotice } from '@/components/shell/offline-notice';
import { BackButton } from '@/components/ui/back-button';
import { SubclassManager } from '@/components/subclasses/subclass-manager';
import { fetchLibrary, findOutdated } from '@/lib/homebrew/library';
import { listHomebrewShares } from '@/lib/homebrew/share-actions';
import { getAuthState } from '@/lib/supabase/server';

export const metadata: Metadata = { title: '收藏紀錄｜Lorebook' };
export const dynamic = 'force-dynamic';

/**
 * 收藏紀錄——自創與收藏來的內容集中在一頁，型別是其中的區塊。
 *
 * 不做「索引頁＋各型別子頁」的兩層結構：一個玩家的自創內容通常是個位數，
 * 為了三個背景兩個子職多跳一層純粹是稅（見 openspec homebrew-share D9）。
 * 型別多到單頁過長時，區塊改為可摺疊即可，不需要改資訊架構。
 *
 * 自建與收藏來的**不分兩區**：對使用者來說那是同一件事——我手上有哪些東西。
 * 差別由每一項下方的備註行表達（D7），不另做徽章。
 */
export default async function LibraryPage() {
  const auth = await getAuthState();
  if (auth.status === 'unauthenticated') redirect('/login');
  if (auth.status === 'unknown') return <OfflineNotice />;

  const [{ items }, { shares }] = await Promise.all([
    fetchLibrary(),
    listHomebrewShares(),
  ]);

  // 「來源更新了沒」要逐份問分享 RPC（來源在別人的表裡，我們讀不到），
  // 因此排在清單之後——沒有清單就沒有要問的東西。
  const outdated = await findOutdated(items);
  const shareOf = new Map(shares.map((s) => [`${s.kind}:${s.homebrewId}`, s.token]));

  const extras = Object.fromEntries(
    items.map((i) => [
      i.id,
      <HomebrewItemMeta
        key={i.id}
        kind={i.content.kind}
        id={i.id}
        sourceToken={i.sourceToken}
        sourceNote={i.sourceNote}
        edited={i.edited}
        outdated={outdated.has(i.id)}
        shareToken={shareOf.get(`${i.content.kind}:${i.id}`) ?? null}
      />,
    ]),
  );

  // flatMap 而非 filter().map()：filter 的回傳型別不會收窄判別聯集，
  // 兩種型別的文件會混成一個聯集陣列而過不了型別檢查。
  const backgrounds = items.flatMap((i) =>
    i.content.kind === 'background' ? [i.content.data] : [],
  );
  const subclasses = items.flatMap((i) =>
    i.content.kind === 'subclass' ? [i.content.data] : [],
  );

  const empty = items.length === 0;

  return (
    <main
      id="main-content"
      className="mx-auto w-full max-w-[1100px] flex-1 px-4 pb-12"
    >
      <header className="pb-6 pt-5">
        <div className="flex items-center justify-between gap-4">
          {/* 收藏紀錄有多個入口（設定頁、分享頁收藏後），返回目的地不能寫死。 */}
          <BackButton fallback="/main/system" />
          <span className="font-label text-[9px] tracking-[2px] text-section-label">
            PERSONAL ARCHIVE
          </span>
        </div>

        <div className="mt-2 border-y border-border-2 py-5 expanded:flex expanded:items-end expanded:justify-between expanded:gap-10">
          <div>
            <p className="font-label text-[10px] font-bold tracking-[2px] text-section-label">
              MY LIBRARY
            </p>
            <h1 className="mt-1 font-display text-[30px] font-bold text-gold expanded:text-[36px]">
              收藏紀錄
            </h1>
          </div>
          <p className="mt-3 max-w-[570px] text-[13px] leading-6 text-text-secondary expanded:mt-0">
            收藏你建立或從分享取得的自創內容。建構角色與升級時，它們會與 SRD
            選項並列，但始終保留自己的來源與版本。
          </p>
        </div>

        {empty && (
          <p className="mt-4 border-l-2 border-gold/60 pl-3 text-[12px] leading-relaxed text-text-light">
            典藏冊目前是空的。從下方建立第一份內容，或開啟其他玩家提供的分享連結收藏。
          </p>
        )}
      </header>

      <div className="grid items-start gap-7 expanded:grid-cols-2">
        <BackgroundManager initial={backgrounds} embedded extras={extras} />
        <SubclassManager initial={subclasses} embedded extras={extras} />
      </div>
    </main>
  );
}
