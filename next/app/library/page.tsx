import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { BackgroundManager } from '@/components/backgrounds/background-manager';
import { SubclassManager } from '@/components/subclasses/subclass-manager';
import { SectionTitle } from '@/components/ui/decorations';
import { fetchCustomBackgrounds } from '@/lib/backgrounds/actions';
import { fetchCustomSubclasses } from '@/lib/subclasses/actions';
import { OfflineNotice } from '@/components/shell/offline-notice';
import { getAuthState } from '@/lib/supabase/server';

export const metadata: Metadata = { title: '收藏紀錄｜Lorebook' };
export const dynamic = 'force-dynamic';

/**
 * 收藏紀錄——自創與收藏來的內容集中在一頁，型別是其中的區塊。
 *
 * 不做「索引頁＋各型別子頁」的兩層結構：一個玩家的自創內容通常是個位數，
 * 為了三個背景兩個子職多跳一層純粹是稅（見 openspec homebrew-share D9）。
 * 型別多到單頁過長時，區塊改為可摺疊即可，不需要改資訊架構。
 */
export default async function LibraryPage() {
  const auth = await getAuthState();
  if (auth.status === 'unauthenticated') redirect('/login');
  if (auth.status === 'unknown') return <OfflineNotice />;

  const [{ backgrounds }, { subclasses }] = await Promise.all([
    fetchCustomBackgrounds(),
    fetchCustomSubclasses(),
  ]);

  const empty = backgrounds.length === 0 && subclasses.length === 0;

  return (
    <main id="main-content" className="mx-auto w-full max-w-[700px] flex-1 px-4 pb-10">
      <SectionTitle en="MY LIBRARY" cn="收藏紀錄" first />
      <p className="mb-4 text-[12px] leading-relaxed text-text-secondary">
        自己建立的自創內容都收在這裡，建角與升級時會與 SRD 選項並列。
        {empty && '目前還沒有任何內容——從下面各區塊新增一個。'}
      </p>

      <BackgroundManager initial={backgrounds} embedded />
      <SubclassManager initial={subclasses} embedded />
    </main>
  );
}
