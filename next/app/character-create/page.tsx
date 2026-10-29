import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { CreateWizard } from '@/components/creation/create-wizard';
import { fetchCustomBackgrounds } from '@/lib/backgrounds/actions';
import { fetchSpells, fetchItems } from '@/lib/catalog/fetch';
import { OfflineNotice } from '@/components/shell/offline-notice';
import { fetchCustomSpecies } from '@/lib/species/actions';
import { toSpeciesOption } from '@/lib/species/types';
import { getAuthState } from '@/lib/supabase/server';

export const metadata: Metadata = { title: '建立角色｜Lorebook' };
export const dynamic = 'force-dynamic';

/**
 * 建角頁。法術選單需要內容庫；取不到時傳空陣列，精靈據此允許跳過該步驟——
 * 擋在那裡等於內容庫一有問題就不能建角。
 */
export default async function CharacterCreatePage() {
  const auth = await getAuthState();
  if (auth.status === 'unauthenticated') redirect('/login');
  if (auth.status === 'unknown') return <OfflineNotice />;

  const [{ rows }, {rows:items}] = await Promise.all([fetchSpells(),fetchItems()]);
  // 只有 0 與 1 環用得到——339 筆全傳會讓 HTML 多出數百 KB。
  const spells = rows.filter((s) => s.level <= 1);

  // 自訂背景與內建並列。轉為 BackgroundOption 的形狀——建角流程不必區分來源，
  // 選取後一律快照進角色卡。`isCustom` 僅供角色卡標示用，不影響任何推導。
  const { backgrounds } = await fetchCustomBackgrounds();
  const custom = backgrounds.map((b) => ({
    cn: b.name,
    en: '',
    abilities: b.abilities,
    skills: b.skills,
    originFeat: b.originFeat,
    toolProficiency: b.toolProficiency,
    originFeatCustom: b.originFeatCustom,
    originFeatDescription: b.originFeatDescription,
    description: b.description,
    isCustom: true,
  }));

  // 自訂種族同理。轉成 SpeciesOption 之後建角流程就不必知道它從哪來——
  // 敘述卡、體型選擇、種族技能全部走與內建同一段程式碼（D4）。
  const { species, error: speciesError } = await fetchCustomSpecies();

  return (
    <CreateWizard
      spells={spells}
      items={items}
      customBackgrounds={custom}
      customSpecies={species.map(toSpeciesOption)}
      // 取不到自訂種族（離線）與「一個都還沒建」是兩件事，種族步驟的提示
      // 不同：前者要說「離線不可用」，後者要指路去建立。
      customSpeciesOffline={speciesError !== null}
    />
  );
}
