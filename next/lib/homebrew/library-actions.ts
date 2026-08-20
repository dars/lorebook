'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';
import { collectHomebrew } from './collect-actions';
import { HOMEBREW_KIND, type HomebrewKind } from './types';

/**
 * 收藏紀錄裡「這一份」的維護動作：改備註、跟上來源。
 */

/**
 * 改備註。
 *
 * 備註那一行**就是**來源標記（design D7）——檢視 RPC 刻意不回傳作者資訊，
 * 所以「這份是誰的」只能由收藏者自己記。因此它必須隨時可改：收的當下常常
 * 還不知道要怎麼稱呼它。
 */
export async function updateSourceNote(
  kind: HomebrewKind,
  id: string,
  note: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '需要登入' };

  const { error } = await supabase
    .from(HOMEBREW_KIND[kind].table)
    // 只動 source_note——這不是對內容的編輯，不該讓 updated_at 以外的東西
    // 改變。（updated_at 仍會前進，因此改過備註的副本會被算成「我改過」，
    // 見下方 refreshCopy 的說明。）
    .update({ source_note: note.trim() || null })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return { error: error.message };
  revalidatePath('/library');
  return { error: null };
}

/**
 * 更新副本＝刪除後重收。
 *
 * 沒有第二種做法，這正是「收藏不回連來源」換來的簡單：副本與來源之間沒有
 * 任何需要協調的狀態，所以「跟上來源」就是丟掉舊的、重拿一份。這裡只是把
 * 那兩步包成一個動作。
 *
 * **備註要留著**（tasks 7.5）——它是收藏者自己寫的，與來源內容無關，重收
 * 一次就消失等於懲罰使用者做了正確的事。
 *
 * 呼叫端必須先確認過本地修改會被丟棄（`edited` 為真時 SHALL 先警告）。
 * 這裡不重複判斷：判斷點在畫面上，那裡才知道使用者按下的是「我知道」。
 */
export async function refreshCopy(
  kind: HomebrewKind,
  id: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '需要登入' };

  const table = HOMEBREW_KIND[kind].table;

  const { data: row, error: readError } = await supabase
    .from(table)
    .select('source_token, source_note')
    .eq('id', id)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .maybeSingle();

  if (readError) return { error: readError.message };
  if (!row) return { error: '找不到這一份內容' };

  const token = (row as { source_token: string | null }).source_token;
  if (!token) return { error: '這一份是自建的，沒有來源可以更新' };

  // 先收再刪：反過來的話，重收失敗（來源剛好被撤銷）就會兩頭落空。
  const collected = await collectHomebrew(
    token,
    (row as { source_note: string | null }).source_note ?? undefined,
  );
  if (collected.error) return { error: collected.error };

  const { error } = await supabase
    .from(table)
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return { error: error.message };
  revalidatePath('/library');
  return { error: null };
}
