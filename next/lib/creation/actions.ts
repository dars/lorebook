'use server';

import { redirect } from 'next/navigation';

import type { Character } from '@/lib/domain/character';
import { Character as CharacterSchema } from '@/lib/domain/character';
import { selectCharacter } from '@/lib/characters/current';
import { createClient } from '@/lib/supabase/server';

/**
 * 建立角色並設為當前角色。
 *
 * 走 Server Action：建角是一次性的低頻動作，且寫入後要立刻設定 cookie 並
 * 導向——那些都在伺服器端做比較直接。
 *
 * 傳入的是完整角色而非表單欄位：組裝與推導在 client 端用 buildCharacter
 * 完成，那樣使用者在確認頁看到的數值就是實際會存下的數值，不會出現「預覽
 * 與結果不同」。伺服器端仍以 schema 重新驗證。
 */
export async function createCharacter(
  character: Character,
): Promise<{ error: string | null }> {
  const parsed = CharacterSchema.safeParse(character);
  if (!parsed.success) {
    return { error: '角色資料格式有誤，請重試' };
  }
  const c = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from('user_characters').insert({
    id: c.id,
    name: c.name,
    class_name: c.className,
    level: c.level,
    data: c,
  });

  if (error) return { error: error.message };

  await selectCharacter(c.id); // 內含 redirect('/main/character')
  return { error: null };
}

/** 取消建角：回選角頁。 */
export async function cancelCreate() {
  redirect('/character-select');
}
