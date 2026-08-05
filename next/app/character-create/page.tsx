import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { CreateWizard } from '@/components/creation/create-wizard';
import { fetchSpells } from '@/lib/catalog/fetch';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: '建立角色｜Lorebook' };
export const dynamic = 'force-dynamic';

/**
 * 建角頁。法術選單需要內容庫；取不到時傳空陣列，精靈據此允許跳過該步驟——
 * 擋在那裡等於內容庫一有問題就不能建角。
 */
export default async function CharacterCreatePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { rows } = await fetchSpells();
  // 只有 0 與 1 環用得到——339 筆全傳會讓 HTML 多出數百 KB。
  const spells = rows.filter((s) => s.level <= 1);

  return <CreateWizard spells={spells} />;
}
