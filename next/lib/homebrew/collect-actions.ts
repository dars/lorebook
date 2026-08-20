'use server';

import { revalidatePath } from 'next/cache';

import { randomId } from '@/lib/creation/id';
import { createClient } from '@/lib/supabase/server';
import { collectRow } from './collect';
import { fetchSharedHomebrew } from './fetch';
import { HOMEBREW_KIND, type HomebrewKind } from './types';

/**
 * 收藏：把他人分享的內容複製一份到自己的資料表。
 *
 * **收藏是快照，而且刻意不留回連來源的線**（openspec homebrew-share D2）。
 * 複製完成的那一刻起，作者怎麼改都不影響這一份。要跟上來源就是刪掉重收，
 * 因此不需要任何同步或版本協調機制。
 *
 * source_token 不是外鍵，只有兩個用途：判斷「來源更新了沒」、提示「這份你
 * 已經收過了」。來源被刪除或撤銷都不影響副本。
 *
 * 收藏不看角色狀態——各型別的採用時機差異極大（背景只在建角、子職要 3 級
 * 且母職業相符），若統一在收藏時擋，多數時候按鈕都是灰的且沒人看得懂為
 * 什麼。規則過濾放在**使用時**（D5）。
 */

export async function collectHomebrew(
  token: string,
  note?: string,
): Promise<{ kind: HomebrewKind | null; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { kind: null, error: '需要登入才能收藏' };

  // 重新取一次而不是信任前端傳來的內容：按下按鈕的人可以送出任何東西，
  // 而這裡是要寫進資料庫的。順帶讓「按下去的瞬間作者剛好改了」拿到新版。
  const shared = await fetchSharedHomebrew(token);
  if (shared.status === 'error') {
    return { kind: null, error: `無法取得內容：${shared.message}` };
  }
  if (shared.status !== 'ok') {
    return { kind: null, error: MESSAGES[shared.status] };
  }

  const { kind } = shared.content;

  // 新 id 是硬性要求（D2）；那一列的組法見 ./collect.ts。
  const row = collectRow(shared.content, {
    id: randomId(),
    userId: user.id,
    token,
    sourceUpdatedAt: shared.sourceUpdatedAt,
    note,
  });

  const { error } = await supabase.from(HOMEBREW_KIND[kind].table).insert(row);
  if (error) return { kind: null, error: error.message };

  revalidatePath('/library');
  return { kind, error: null };
}

/**
 * 這個 token 我收過幾份了。
 *
 * **不擋重複收藏，只提示**：DM 的用法是「核准時自己收一份」當存證，作者
 * 之後改過再收一份，兩份並存正是他要的（tasks 5.5 的 Open Question）。
 * 擋掉會讓「留一份舊版本」變成做不到的事。
 */
export async function countCollected(token: string): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  let total = 0;
  for (const def of Object.values(HOMEBREW_KIND)) {
    const { count } = await supabase
      .from(def.table)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('source_token', token)
      .is('deleted_at', null);
    total += count ?? 0;
  }
  return total;
}

const MESSAGES: Record<string, string> = {
  revoked: '這份分享已被撤銷，無法收藏。',
  deleted: '這份內容已被刪除，無法收藏。',
  not_found: '找不到這份分享，請確認連結是否完整。',
};
