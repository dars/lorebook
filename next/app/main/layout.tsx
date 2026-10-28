import { redirect } from 'next/navigation';

import { BookmarkTabBar, NavRail } from '@/components/shell/nav';
import { CharacterHeader } from '@/components/shell/character-header';
import { OfflineBanner } from '@/components/shell/offline-banner';
import { fetchMyCharacter } from '@/lib/characters/fetch';
import { getCurrentCharacterId } from '@/lib/characters/current';
import { OfflineNotice } from '@/components/shell/offline-notice';
import { getAuthState } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * 主畫面外殼，對照 Flutter 端的 `AppScaffold`。
 *
 * compact：情境式頁首 ＋ 內容 ＋ 底部浮動書籤列（內容延伸至列下方，
 * 由列的漸層自然淡出）。≥600dp：側邊 Rail ＋ 內容。
 *
 * 當前角色由 cookie 決定；沒有選過或該角色已不存在時導回選角頁——
 * 這與 Flutter 的 auth guard 行為一致。
 */
export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 登入狀態與當前角色 id 互不相依，一起等即可——串成兩段只是多花一趟的時間。
  const [auth, id] = await Promise.all([getAuthState(), getCurrentCharacterId()]);

  // 只有「確定未登入」才導向登入頁。問不到認證服務（離線）時導過去，
  // 使用者會以為自己被登出，而那頁在離線時也登不進去。
  if (auth.status === 'unauthenticated') redirect('/login');
  if (auth.status === 'unknown') return <OfflineNotice />;
  if (!id) redirect('/character-select');

  const { character } = await fetchMyCharacter(id);
  // cookie 指向的角色已刪除或不屬於此帳號——回選角頁重選。
  // （原本會先撈一次完整角色清單才決定去向，但兩個分支都是同一個目的地。）
  if (!character) redirect('/character-select');

  return (
    <div className="flex min-h-full flex-1">
      <NavRail />
      <div className="flex min-w-0 flex-1 flex-col">
        <CharacterHeader c={character} />
        <OfflineBanner />
        {/* 內容底部留白要蓋過浮動書籤列（60px 膠囊＋上下留白），
            有 home indicator 的機型再往上讓一段，否則最後一列會被壓住。 */}
        <main
          id="main-content"
          className="flex-1 pb-[calc(6rem+env(safe-area-inset-bottom))] medium:pb-[env(safe-area-inset-bottom)]"
        >
          {children}
        </main>
      </div>
      <BookmarkTabBar />
    </div>
  );
}
