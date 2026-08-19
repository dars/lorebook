import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { CreateWizard } from '@/components/creation/create-wizard';
import { fetchCustomBackgrounds } from '@/lib/backgrounds/actions';
import { fetchSpells } from '@/lib/catalog/fetch';
import { OfflineNotice } from '@/components/shell/offline-notice';
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

  const { rows } = await fetchSpells();
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

  return <CreateWizard spells={spells} customBackgrounds={custom} />;
}
