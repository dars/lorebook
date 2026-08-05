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
  const { error } = await supabase
    .from('user_backgrounds')
    .upsert({ id: b.id, name: b.name, data: parsed.data });

  if (error) return { error: error.message };
  revalidatePath('/custom-backgrounds');
  return { error: null };
}

/** 軟刪除。既有角色不受影響——背景在建角時已快照進角色卡。 */
export async function deleteCustomBackground(
  id: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('user_backgrounds')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return { error: error.message };
  revalidatePath('/custom-backgrounds');
  return { error: null };
}
