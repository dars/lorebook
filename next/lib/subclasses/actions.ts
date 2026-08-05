'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';
import { CustomSubclass } from './types';

/**
 * 自訂子職的讀寫。文件模式與 own-row RLS 比照 `user_backgrounds`。
 */

export async function fetchCustomSubclasses(
  classEn?: string,
): Promise<{ subclasses: CustomSubclass[]; error: string | null }> {
  const supabase = await createClient();
  let q = supabase
    .from('user_subclasses')
    .select('data')
    .is('deleted_at', null)
    .order('created_at');

  // 升級時只需要該職業的——一次查全部再過濾只是白拿資料。
  if (classEn) q = q.eq('class_en', classEn);

  const { data, error } = await q;
  if (error) return { subclasses: [], error: error.message };

  const subclasses: CustomSubclass[] = [];
  for (const row of data ?? []) {
    const parsed = CustomSubclass.safeParse((row as { data: unknown }).data);
    // 單筆失敗跳過而非整份失敗——一個壞掉的子職不該讓其他的消失。
    if (parsed.success) subclasses.push(parsed.data);
  }
  return { subclasses, error: null };
}

export async function upsertCustomSubclass(
  s: CustomSubclass,
): Promise<{ error: string | null }> {
  const parsed = CustomSubclass.safeParse(s);
  if (!parsed.success) return { error: '子職資料格式有誤' };

  const supabase = await createClient();
  const { error } = await supabase.from('user_subclasses').upsert({
    id: s.id,
    name: s.name,
    class_en: s.classEn,
    data: parsed.data,
  });

  if (error) return { error: error.message };
  revalidatePath('/custom-subclasses');
  return { error: null };
}

/**
 * 軟刪除。
 *
 * 已選用的角色不受影響——子職在選用時已**整份**快照進角色卡，後續等級也自
 * 快照取用，不回查本表。
 */
export async function deleteCustomSubclass(
  id: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('user_subclasses')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return { error: error.message };
  revalidatePath('/custom-subclasses');
  return { error: null };
}
