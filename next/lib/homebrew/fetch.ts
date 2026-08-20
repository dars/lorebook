import { z } from 'zod';

import { createAnonClient } from '@/lib/supabase/server';
import { type HomebrewContent, parseHomebrew } from './types';

/**
 * 憑 token 取回分享的自創內容。
 *
 * 走 `get_shared_homebrew` RPC——它是 SECURITY DEFINER，是授權的**唯一入口**；
 * `homebrew_shares` 與兩張來源表對 anon 都不可讀。不得改為直接查表。
 *
 * 用匿名 client 而非帶檢視者 session 的 client：授權完全由 token 決定，不受
 * 檢視者自身登入狀態影響——作者開自己的連結，看到的應與他人相同。
 *
 * 與 `lib/share/fetch.ts`（角色卡分享）是同一套心智模型與同一組狀態，兩邊
 * 刻意維持對稱。差別只在多回一個 `sourceUpdatedAt`：收藏時要把它存進副本的
 * `source_updated_at`，日後才判斷得出「來源更新了沒」。
 */

const SharedStatus = z.enum(['ok', 'revoked', 'deleted', 'not_found']);
export type SharedStatus = z.infer<typeof SharedStatus>;

export type SharedHomebrewResult =
  | {
      status: 'ok';
      content: HomebrewContent;
      /** 來源當下的 updated_at（ISO 字串），原樣傳給收藏流程。 */
      sourceUpdatedAt: string | null;
      fetchedAt: number;
    }
  | { status: Exclude<SharedStatus, 'ok'> }
  /** 網路或伺服器故障。與「分享已失效」不同——後者是明確答案，此為無答案。 */
  | { status: 'error'; message: string };

export async function fetchSharedHomebrew(
  token: string,
): Promise<SharedHomebrewResult> {
  const supabase = createAnonClient();

  const { data, error } = await supabase.rpc('get_shared_homebrew', {
    p_token: token,
  });

  if (error) return { status: 'error', message: error.message };

  const row = Array.isArray(data) ? data[0] : null;
  const status = SharedStatus.safeParse(row?.status);
  if (!status.success) return { status: 'error', message: '回應格式非預期' };
  if (status.data !== 'ok') return { status: status.data };

  const content = parseHomebrew(row.kind, row.data);
  // 內容存在但驗不過：作者那邊也編輯不了這筆資料，不是檢視者能解決的問題。
  if (!content) return { status: 'error', message: '內容格式無法解析' };

  return {
    status: 'ok',
    content,
    sourceUpdatedAt: (row.source_updated_at as string | null) ?? null,
    fetchedAt: Date.now(),
  };
}
