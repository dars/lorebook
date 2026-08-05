import { redirect } from 'next/navigation';

import { BookmarkTabBar, NavRail } from '@/components/shell/nav';
import { CharacterHeader } from '@/components/shell/character-header';
import { fetchMyCharacter, fetchMyCharacters } from '@/lib/characters/fetch';
import { getCurrentCharacterId } from '@/lib/characters/current';
import { createClient } from '@/lib/supabase/server';

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const id = await getCurrentCharacterId();
  if (!id) redirect('/character-select');

  const { character } = await fetchMyCharacter(id);
  if (!character) {
    // cookie 指向的角色已刪除或不屬於此帳號——回選角頁重選。
    const { characters } = await fetchMyCharacters();
    redirect(characters.length > 0 ? '/character-select' : '/character-select');
  }

  return (
    <div className="flex min-h-full flex-1">
      <NavRail />
      <div className="flex min-w-0 flex-1 flex-col">
        <CharacterHeader c={character} />
        <div className="flex-1 pb-24">{children}</div>
      </div>
      <BookmarkTabBar />
    </div>
  );
}
