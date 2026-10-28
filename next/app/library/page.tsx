import type { Metadata } from 'next';
import { LibraryBrowser } from '@/components/homebrew/library-browser';
import { redirect } from 'next/navigation';

import { HomebrewItemMeta } from '@/components/homebrew/item-meta';
import { OfflineNotice } from '@/components/shell/offline-notice';
import { BackButton } from '@/components/ui/back-button';
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

  const [{ items, error }, { shares }] = await Promise.all([
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

  return (
    <main id="main-content" className="mx-auto w-full max-w-[1100px] flex-1 px-4 pb-12 medium:px-6">
      <header className="pb-7 pt-5">
        <BackButton fallback="/main/system" />
        <div className="mt-3 flex items-center gap-5 border-b border-border pb-6">
          <svg aria-hidden="true" viewBox="0 0 48 56" className="hidden h-14 w-12 shrink-0 fill-none stroke-gold medium:block" strokeWidth="1.2">
            <path d="M9 4h29v44H13a5 5 0 0 1-5-5V9a5 5 0 0 1 5-5M13 4v37m-5 2h30M19 15h13M19 20h9" />
            <path d="m25 26 5 5-5 5-5-5zM34 48v5l-4-3-4 3v-5" />
          </svg>
          <div>
            <p className="font-label text-eyebrow tracking-[3px] text-section-label">PERSONAL ARCHIVE</p>
            <h1 className="mt-1 font-display text-[30px] font-bold text-gold medium:text-[36px]">收藏紀錄</h1>
            <p className="mt-2 max-w-[580px] text-ui leading-6 text-text-secondary">你的法術、血脈與故事。自創與收藏的內容，都在這本典藏冊裡。</p>
          </div>
        </div>
      </header>
      {error ? (
        <div role="alert" className="rounded-card border border-danger/50 bg-surface-1 p-6 text-body leading-7 text-text-primary">
          收藏暫時無法載入。請重新整理頁面再試；這不代表你的收藏已被刪除。
        </div>
      ) : (
        <LibraryBrowser
          spells={items.flatMap(i => i.content.kind === 'spell' ? [i.content.data] : [])}
          species={items.flatMap(i => i.content.kind === 'species' ? [i.content.data] : [])}
          backgrounds={items.flatMap(i => i.content.kind === 'background' ? [i.content.data] : [])}
          subclasses={items.flatMap(i => i.content.kind === 'subclass' ? [i.content.data] : [])}
          extras={extras}
        />
      )}
    </main>
  );
}
