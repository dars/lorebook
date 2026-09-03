'use server';

import { revalidatePath } from 'next/cache';

import { CustomSpecies } from './types';
import { createClient } from '@/lib/supabase/server';

/**
 * 自訂種族的讀寫，比照 `lib/backgrounds/actions.ts`。
 *
 * 文件模式（`data jsonb` ＋ 提升的 `name` 欄位）與角色相同；own-row RLS 是
 * 授權邊界，因此查詢不必再帶 user_id。
 */

export async function fetchCustomSpecies(): Promise<{
  species: CustomSpecies[];
  error: string | null;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('user_species')
    .select('data')
    .is('deleted_at', null)
    .order('created_at');

  if (error) return { species: [], error: error.message };

  const species: CustomSpecies[] = [];
  for (const row of data ?? []) {
    const parsed = CustomSpecies.safeParse((row as { data: unknown }).data);
    // 單筆失敗跳過而非整份失敗——一個壞掉的種族不該讓其他的消失。
    if (parsed.success) species.push(parsed.data);
  }
  return { species, error: null };
}

export async function upsertCustomSpecies(
  s: CustomSpecies,
): Promise<{ error: string | null }> {
  const parsed = CustomSpecies.safeParse(s);
  if (!parsed.success) return { error: '種族資料格式有誤' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '需要登入' };

  // **只送這三個欄位**——source_token / source_updated_at / source_note 不在
  // payload 裡，因此收藏而來的那份被編輯時，它的來源標記不會被這次寫入抹掉
  // （upsert 的 DO UPDATE 只設 payload 中的欄位）。
  const { error } = await supabase
    .from('user_species')
    .upsert({ id: s.id, user_id: user.id, name: s.name, data: parsed.data });

  if (error) return { error: error.message };
  revalidatePath('/library');
  return { error: null };
}

/** 軟刪除。既有角色不受影響——種族在建角時已快照進角色卡。 */
export async function deleteCustomSpecies(
  id: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '需要登入' };

  const { error } = await supabase
    .from('user_species')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return { error: error.message };
  revalidatePath('/library');
  return { error: null };
}
