import { z } from 'zod';

import { backfillSpeciesHpPerLevel } from '@/lib/characters/backfill';
import { Character, parseCharacter } from '@/lib/domain/character';
import { createAnonClient } from '@/lib/supabase/server';

/**
 * 憑 token 取回分享的角色卡。
 *
 * 走既有的 `get_shared_character` RPC——它是 SECURITY DEFINER，是分享授權的
 * **唯一入口**；`character_shares` 表本身對 anon 不可讀。不得改為直接查表。
 *
 * 用匿名 client 而非帶檢視者 session 的 client：授權完全由 token 決定，
 * 不該受檢視者自身登入狀態影響——包含檢視者本人就是角色擁有者的情況
 * （character-share 規格：「擁有者開啟自己的分享連結」看到的與他人相同）。
 */

const SharedStatus = z.enum(['ok', 'revoked', 'deleted', 'not_found']);
export type SharedStatus = z.infer<typeof SharedStatus>;

export type SharedResult =
  | { status: 'ok'; character: Character; fetchedAt: number }
  | { status: Exclude<SharedStatus, 'ok'> }
  /** 網路或伺服器故障。與「分享已失效」不同——後者是明確答案，此為無答案。 */
  | { status: 'error'; message: string };

export async function fetchSharedCharacter(
  token: string,
): Promise<SharedResult> {
  const supabase = createAnonClient();

  const { data, error } = await supabase.rpc('get_shared_character', {
    p_token: token,
  });

  if (error) {
    return { status: 'error', message: error.message };
  }

  const row = Array.isArray(data) ? data[0] : null;
  const status = SharedStatus.safeParse(row?.status);
  if (!status.success) {
    return { status: 'error', message: '回應格式非預期' };
  }
  if (status.data !== 'ok') return { status: status.data };

  try {
    return {
      status: 'ok',
      // 與主人端走同一支回填：兩邊不一致的話，分享檢視顯示的升級資訊會與
      // 角色主人看到的不同（custom-species tasks 3.4）。
      character: parseCharacter(backfillSpeciesHpPerLevel(row.data)),
      // 規格要求顯示資料時點——檢視者才知道自己看到的是何時的狀態。
      fetchedAt: Date.now(),
    };
  } catch {
    return { status: 'error', message: '角色資料無法解析' };
  }
}
