import { notFound, redirect } from 'next/navigation';

import { CharacterEditor } from '@/components/character/editor/character-editor';
import { EmptyHint } from '@/components/character/primitives';
import { fetchMyCharacter } from '@/lib/characters/fetch';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * 角色卡編輯頁。
 *
 * 伺服器端取資料、client 端編輯（design D12）：這一層只負責取得與授權，
 * 拿到的角色交給 client component 灌進 store。RLS 保證這裡只讀得到自己的
 * 角色，因此不必再做擁有者比對。
 */
export default async function CharacterPage({
  params,
}: PageProps<'/characters/[id]'>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { id } = await params;
  const { character, error } = await fetchMyCharacter(id);

  if (error) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-lg py-2xl">
        <EmptyHint text={`無法載入這張角色卡（${error}）。`} />
      </main>
    );
  }
  if (!character) notFound();

  return <CharacterEditor initial={character} />;
}
