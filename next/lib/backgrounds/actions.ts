'use server';

import { revalidatePath } from 'next/cache';

import { CustomBackground } from './types';
import { createClient } from '@/lib/supabase/server';

/**
 * 自訂背景的讀寫。
 *
 * 文件模式（`data jsonb` ＋ 提升的 `name` 欄位）與角色相同；own-row RLS 是
 * 授權邊界，因此查詢不必再帶 user_id。
 */

export async function fetchCustomBackgrounds(): Promise<{
  backgrounds: CustomBackground[];
  error: string | null;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('user_backgrounds')
    .select('data')
    .is('deleted_at', null)
    .order('created_at');

  if (error) return { backgrounds: [], error: error.message };

  const backgrounds: CustomBackground[] = [];
  for (const row of data ?? []) {
    const parsed = CustomBackground.safeParse((row as { data: unknown }).data);
    // 單筆失敗跳過而非整份失敗——一個壞掉的背景不該讓其他的消失。
    if (parsed.success) backgrounds.push(parsed.data);
  }
  return { backgrounds, error: null };
}

export async function upsertCustomBackground(
  b: CustomBackground,
): Promise<{ error: string | null }> {
  const parsed = CustomBackground.safeParse(b);
  if (!parsed.success) return { error: '背景資料格式有誤' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '需要登入' };

  // **只送這三個欄位**——source_token / source_updated_at / source_note 不在
  // payload 裡，因此收藏而來的那份被編輯時，它的來源標記不會被這次寫入抹掉
  // （upsert 的 DO UPDATE 只設 payload 中的欄位）。
  //
  // user_id 明確帶上：主鍵是 (user_id, id)，靠 default auth.uid() 也會對，
  // 但寫出來的意圖比較清楚，也少一個「RLS 是唯一防線」的地方。
  const { error } = await supabase
    .from('user_backgrounds')
    .upsert({ id: b.id, user_id: user.id, name: b.name, data: parsed.data });

  if (error) return { error: error.message };
  revalidatePath('/library');
  return { error: null };
}

/** 軟刪除。既有角色不受影響——背景在建角時已快照進角色卡。 */
export async function deleteCustomBackground(
  id: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '需要登入' };

  const { error } = await supabase
    .from('user_backgrounds')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return { error: error.message };
  revalidatePath('/library');
  return { error: null };
}
