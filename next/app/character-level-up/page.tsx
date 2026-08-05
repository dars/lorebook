import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { LevelUpView } from '@/components/level-up/level-up-view';
import { getCurrentCharacterId } from '@/lib/characters/current';
import { fetchMyCharacter } from '@/lib/characters/fetch';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: '升級｜Lorebook' };
export const dynamic = 'force-dynamic';

export default async function LevelUpPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const id = await getCurrentCharacterId();
  if (!id) redirect('/character-select');
  const { character } = await fetchMyCharacter(id);
  if (!character) redirect('/character-select');

  // 20 級為上限，沒有可升的等級時直接回角色頁。
  if (character.level >= 20) redirect('/main/character');

  return <LevelUpView initial={character} />;
}
