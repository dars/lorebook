import { Character, parseCharacter } from '@/lib/domain/character';
import { createClient } from '@/lib/supabase/server';

/**
 * 讀取登入者自己的角色。
 *
 * 用帶 session 的 client——RLS 的 own-row policy 是授權邊界，查詢本身不必
 * 再帶 user_id 條件。（直接對資料庫下 SQL 時就必須帶，那條路徑會繞過 RLS。）
 *
 * 已刪除的角色以 `deleted_at` 標記（軟刪），一律排除。
 */

export type ListResult = { characters: Character[]; error: string | null };

export async function fetchMyCharacters(): Promise<ListResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('user_characters')
    .select('data')
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });

  if (error) return { characters: [], error: error.message };

  const characters: Character[] = [];
  for (const row of data ?? []) {
    try {
      characters.push(parseCharacter((row as { data: unknown }).data));
    } catch {
      // 單一角色解析失敗不該讓整份清單消失——跳過並繼續。
      // 這在資料形狀演進期特別重要：一張壞卡不等於全部不能用。
    }
  }
  return { characters, error: null };
}

export async function fetchMyCharacter(
  id: string,
): Promise<{ character: Character | null; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('user_characters')
    .select('data')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) return { character: null, error: error.message };
  if (!data) return { character: null, error: null };

  try {
    return { character: parseCharacter((data as { data: unknown }).data), error: null };
  } catch {
    return { character: null, error: '這張角色卡的資料無法解析' };
  }
}
