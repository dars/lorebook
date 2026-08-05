'use server';

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
  const { error } = await supabase
    .from('user_characters')
    .update({ name: c.name, class_name: c.className, level: c.level, data: c })
    .eq('id', c.id);

  if (error) return { error: error.message };
  redirect('/main/character');
}
