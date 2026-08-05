import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { LevelUpView } from '@/components/level-up/level-up-view';
import { fetchClassProgression } from '@/lib/catalog/fetch';
import { fetchCustomSubclasses } from '@/lib/subclasses/actions';
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

  // 子職與職業特性。取到目標等級為止——子職 3 級才選，但它的 1–3 級特性
  // 都要一次補上。
  const [{ subclasses, features, error }, { subclasses: custom }] =
    await Promise.all([
      fetchClassProgression(character.classNameEn, character.level + 1),
      // 只取母職業相符的——一次查全部再過濾只是白拿資料。
      fetchCustomSubclasses(character.classNameEn),
    ]);

  return (
    <LevelUpView
      initial={character}
      subclasses={subclasses}
      customSubclasses={custom}
      classFeatures={features}
      catalogOffline={error !== null || features.length === 0}
    />
  );
}
