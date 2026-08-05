'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';
import { generateShareToken } from './token';

/**
 * 分享的建立與撤銷。
 *
 * 這一段走 Server Action 而非 client store——建立與撤銷是低頻的一次性動作，
 * 沒有即時回饋的壓力（design D12 的界線只把高頻編輯留在 client）。放伺服器
 * 端的好處是 token 由伺服器產生，不經過瀏覽器可觀察的路徑。
 *
 * 授權完全依賴 `character_shares` 的 own-row RLS：owner_id 預設為
 * `auth.uid()`，未登入者連 insert 都不會成立。
 */

export type ShareRow = {
  token: string;
  characterId: string;
  label: string | null;
  createdAt: string;
};

export async function createShare(
  characterId: string,
  label?: string,
): Promise<{ token: string | null; error: string | null }> {
  const supabase = await createClient();
  const token = generateShareToken();

  const { error } = await supabase.from('character_shares').insert({
    token,
    character_id: characterId,
    label: label ?? null,
  });

  if (error) return { token: null, error: error.message };
  revalidatePath(`/characters/${characterId}`);
  return { token, error: null };
}

/**
 * 撤銷分享。
 *
 * 標記 `revoked_at` 而非刪除列：保留紀錄才能在檢視端明確回答「已撤銷」而不是
 * 「找不到」——那兩者對持有連結的人意義完全不同（一個是被收回，一個是連結有
 * 誤）。這也是 `get_shared_character` 會回傳 'revoked' 的前提。
 */
export async function revokeShare(
  token: string,
  characterId: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('character_shares')
    .update({ revoked_at: new Date().toISOString() })
    .eq('token', token);

  if (error) return { error: error.message };
  revalidatePath(`/characters/${characterId}`);
  return { error: null };
}

/** 某角色目前有效的分享。已撤銷者不列出——撤銷後它就不該再出現在畫面上。 */
export async function listShares(
  characterId: string,
): Promise<{ shares: ShareRow[]; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('character_shares')
    .select('token, character_id, label, created_at')
    .eq('character_id', characterId)
    .is('revoked_at', null)
    .order('created_at', { ascending: false });

  if (error) return { shares: [], error: error.message };

  return {
    shares: (data ?? []).map((r) => ({
      token: r.token as string,
      characterId: r.character_id as string,
      label: r.label as string | null,
      createdAt: r.created_at as string,
    })),
    error: null,
  };
}
