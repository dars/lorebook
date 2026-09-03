import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { AppLink } from '@/components/ui/app-link';
import { CharacterList } from '@/components/character/character-list';
import { SectionTitle } from '@/components/ui/decorations';
import { fetchMyCharacters } from '@/lib/characters/fetch';
import { OfflineNotice } from '@/components/shell/offline-notice';
import { getAuthState } from '@/lib/supabase/server';

export const metadata: Metadata = { title: '選擇角色｜Lorebook' };
export const dynamic = 'force-dynamic';

/** 選角頁，對照 Flutter 端的 `/character-select`。選定後寫入 cookie 並進主畫面。 */
export default async function CharacterSelectPage() {
  const auth = await getAuthState();
  if (auth.status === 'unauthenticated') redirect('/login');
  if (auth.status === 'unknown') return <OfflineNotice />;

  const { characters, error } = await fetchMyCharacters();

  return (
    <main id="main-content" className="mx-auto w-full max-w-[700px] flex-1 px-4 pb-10">
      <h1 className="font-display pt-6 text-[28px] font-bold text-gold">
        Lorebook
      </h1>
      <SectionTitle en="CHARACTERS" cn="選擇角色" />

      {error && (
        <p className="py-3 text-[13px] text-danger">無法載入角色（{error}）</p>
      )}
      <CharacterList initial={characters} />

      <AppLink
        href="/character-create"
        className="mt-4 flex min-h-12 items-center justify-center rounded-card border border-gold bg-gold/10 text-[14px] font-bold text-gold"
      >
        ＋ 建立新角色
      </AppLink>
    </main>
  );
}
