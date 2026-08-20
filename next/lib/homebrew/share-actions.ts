'use server';

import { revalidatePath } from 'next/cache';

import { generateShareToken } from '@/lib/share/token';
import { createClient } from '@/lib/supabase/server';
import type { HomebrewKind } from './types';

/**
 * 自創內容分享的建立、撤銷與狀態查詢。
 *
 * 與 `lib/share/actions.ts`（角色卡）同一套做法：低頻的一次性動作走 Server
 * Action，token 由伺服器產生，不經過瀏覽器可觀察的路徑。
 *
 * 授權靠 `homebrew_shares` 的 own-row RLS，但寫入與撤銷仍明確帶 owner_id
 * 條件——RLS 是最後一道防線，不是唯一一道。
 */

export type HomebrewShareRow = {
  token: string;
  kind: HomebrewKind;
  homebrewId: string;
  label: string | null;
  createdAt: string;
};

export async function createHomebrewShare(
  kind: HomebrewKind,
  homebrewId: string,
  label?: string,
): Promise<{ token: string | null; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { token: null, error: '需要登入' };

  const token = generateShareToken();
  const { error } = await supabase.from('homebrew_shares').insert({
    token,
    owner_id: user.id,
    kind,
    homebrew_id: homebrewId,
    label: label ?? null,
  });

  if (error) return { token: null, error: error.message };
  revalidatePath('/library');
  return { token, error: null };
}

/**
 * 撤銷分享。
 *
 * 標記 `revoked_at` 而非刪除列：保留紀錄才能在檢視端明確回答「已撤銷」而不是
 * 「找不到」——那兩者對持有連結的人意義完全不同（一個是被收回，一個是連結
 * 有誤）。已經收藏過的副本不受影響，那是複製，與來源脫鉤。
 */
export async function revokeHomebrewShare(
  token: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '需要登入' };

  const { error } = await supabase
    .from('homebrew_shares')
    .update({ revoked_at: new Date().toISOString() })
    .eq('token', token)
    .eq('owner_id', user.id);

  if (error) return { error: error.message };
  revalidatePath('/library');
  return { error: null };
}

/**
 * 自己目前有效的分享，一次全撈。
 *
 * 收藏紀錄頁的每一個項目都要知道「這份分享出去了嗎」。逐項查會是 N 次往返，
 * 而一個人的自創內容本來就是個位數——整批拿回來在記憶體裡分組便宜得多。
 *
 * 已撤銷者不列出：撤銷後它就不該再出現在畫面上。
 */
export async function listHomebrewShares(): Promise<{
  shares: HomebrewShareRow[];
  error: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { shares: [], error: '需要登入' };

  const { data, error } = await supabase
    .from('homebrew_shares')
    .select('token, kind, homebrew_id, label, created_at')
    .eq('owner_id', user.id)
    .is('revoked_at', null)
    .order('created_at', { ascending: false });

  if (error) return { shares: [], error: error.message };

  return {
    shares: (data ?? []).map((r) => ({
      token: r.token as string,
      kind: r.kind as HomebrewKind,
      homebrewId: r.homebrew_id as string,
      label: r.label as string | null,
      createdAt: r.created_at as string,
    })),
    error: null,
  };
}
