import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { LevelUpView } from '@/components/level-up/level-up-view';
import { fetchClassProgression, fetchFeats, fetchSpells, fetchItems } from '@/lib/catalog/fetch';
import { fetchCustomSubclasses } from '@/lib/subclasses/actions';
import { getCurrentCharacterId } from '@/lib/characters/current';
import { fetchMyCharacter } from '@/lib/characters/fetch';
import { OfflineNotice } from '@/components/shell/offline-notice';
import { needsSubclassPick, planFor } from '@/lib/rules/level-up';
import { getAuthState } from '@/lib/supabase/server';

export const metadata: Metadata = { title: '升級｜Lorebook' };
export const dynamic = 'force-dynamic';

export default async function LevelUpPage({
  searchParams,
}: PageProps<'/character-level-up'>) {
  const auth = await getAuthState();
  if (auth.status === 'unauthenticated') redirect('/login');
  if (auth.status === 'unknown') return <OfflineNotice />;

  const id = await getCurrentCharacterId();
  if (!id) redirect('/character-select');
  const { character } = await fetchMyCharacter(id);
  if (!character) redirect('/character-select');

  // 補選子職：升級時內容庫離線而跳過子職的角色，唯一的回頭路。
  const subclassOnly = (await searchParams).mode === 'subclass';

  if (subclassOnly) {
    // 已經有子職就沒什麼好補的——這個網址不該成為改子職的後門。
    if (!needsSubclassPick(character)) redirect('/main/character');
  } else if (character.level >= 20) {
    // 20 級為上限，沒有可升的等級時直接回角色頁。
    // 注意這條**不適用**補選模式：20 級角色一樣可能欠一個子職。
    redirect('/main/character');
  }

  // 子職與職業特性。取到目標等級為止——子職 3 級才選，但它的 1–3 級特性
  // 都要一次補上。補選模式取到角色的**現有**等級，把這一路累積的子職特性
  // 一次補齊。
  const throughLevel = subclassOnly ? character.level : character.level + 1;
  // 專長只在 ASI 等級用得到；補選子職不升級，也用不到。
  const needsFeats =
    !subclassOnly && planFor(character, character.speciesHpPerLevel).hasAsi;
  const [{ subclasses, features, error }, { subclasses: custom }, feats, spells, items] =
    await Promise.all([
      fetchClassProgression(character.classNameEn, throughLevel),
      // 只取母職業相符的——一次查全部再過濾只是白拿資料。
      fetchCustomSubclasses(character.classNameEn),
      fetchFeats(),
      fetchSpells(), fetchItems(),
    ]);

  return (
    <LevelUpView
      initial={character}
      choiceCatalog={{spells:spells.rows,items:items.rows,feats:feats.rows}}
      mode={subclassOnly ? 'subclass' : 'level-up'}
      subclasses={subclasses}
      customSubclasses={custom}
      classFeatures={features}
      catalogOffline={error !== null || features.length === 0}
      feats={feats.rows}
      featsOffline={needsFeats && (feats.error !== null || feats.rows.length === 0)}
    />
  );
}
