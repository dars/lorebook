'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import type { Character } from '@/lib/domain/character';
import { Character as CharacterSchema } from '@/lib/domain/character';
import { createClient } from '@/lib/supabase/server';

/** 覆寫整份角色（升級等一次性大改用）。日常編輯走 client store 的 debounce 推送。 */
export async function updateCharacter(
  character: Character,
): Promise<{ error: string | null }> {
  const parsed = CharacterSchema.safeParse(character);
  if (!parsed.success) return { error: '角色資料格式有誤' };
  const c = parsed.data;

  const supabase = await createClient();
  const {data:{user}} = await supabase.auth.getUser();
  if (!user) return {error:'需要登入'};
  const { error } = await supabase
    .from('user_characters')
    .update({ name: c.name, class_name: c.className, level: c.level, data: c })
    .eq('user_id', user.id)
    .eq('id', c.id);

  if (error) return { error: error.message };
  revalidatePath('/main', 'layout');
  revalidatePath('/character-select');
  revalidatePath('/character-choices');
  redirect('/main/character');
}

/**
 * 刪除角色：雲端軟刪除（`deleted_at`），成功才自清單消失。
 *
 * 軟刪除而非硬刪：多裝置下硬刪會被其他裝置的同步「復活」，tombstone 不會。
 * **一律帶 user_id 條件**——RLS 是最後一道防線，不是唯一一道。
 */
export async function deleteCharacter(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '需要登入' };

  const { error } = await supabase
    .from('user_characters')
    .update({ deleted_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('id', id);

  if (error) return { error: error.message };
  revalidatePath('/character-select');
  return { error: null };
}
