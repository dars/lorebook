'use client';

import { useEffect, useRef } from 'react';

import type { Character } from '@/lib/domain/character';
import { createClient } from '@/lib/supabase/client';
import { useCharacterStore } from './character-store';

/**
 * 角色雲端同步，對應 Flutter 端的 `characterSyncControllerProvider`。
 *
 * 行為刻意保持一致：任何變更 → **debounce 3 秒**推送整份文件；離開頁面前
 * flush。3 秒是那邊實際使用驗證過的值——夠短不會遺失太多，夠長不會讓戰鬥中
 * 的連續操作變成數十次寫入。
 *
 * 推送整份文件而非欄位差異：後端是 `data jsonb` 的文件模式，本來就以整份為
 * 單位；算差異只會多一層會出錯的東西。
 */

const DEBOUNCE_MS = 3000;

async function push(c: Character): Promise<string | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if(!user)return '登入狀態已失效，請重新登入。';
  // 提升欄位（name/class_name/level）與 data 一起寫，供清單查詢用；
  // 主鍵是複合的 (user_id, id)，明確綁定目前登入者。
  const { error } = await supabase.from('user_characters').upsert({
    user_id: user.id,
    id: c.id,
    name: c.name,
    class_name: c.className,
    level: c.level,
    data: c,
  });
  return error?.message ?? null;
}

// 同一張卡的推送串行化，避免較舊的 debounce 回應覆蓋成長流程的保存。
let pendingPush: Promise<string | null> | null = null;
export async function flushCharacterChanges(): Promise<string | null> {
  while (useCharacterStore.getState().dirty) {
    if (pendingPush) { const error = await pendingPush; if(error) return error; continue; }
    const snapshot = useCharacterStore.getState().character;
    if (!snapshot) return null;
    pendingPush = push(snapshot).then(error => {
      const store=useCharacterStore.getState();
      if(error)store.setSyncError(error);
      else if(store.character===snapshot)store.markSynced();
      return error;
    }).catch(()=>{const error='連線失敗，變更仍保留在本機。';useCharacterStore.getState().setSyncError(error);return error;}).finally(()=>{pendingPush=null;});
    const error=await pendingPush;if(error)return error;
  }
  return null;
}

/**
 * 掛在角色編輯頁的根元件。
 *
 * 回傳 void——同步是背景行為，元件不該因為它而重繪。狀態要顯示時直接讀
 * store 的 dirty / syncError。
 */
export function useCharacterSync(enabled = true) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // 試玩模式不推雲端：訪客沒有帳號，寫入也會被 RLS 擋下。
    // 以參數而非在呼叫端條件呼叫——hook 不能有條件地執行。
    if (!enabled) return;

    const flush = () => flushCharacterChanges();

    const unsub = useCharacterStore.subscribe((s) => {
      if (!s.dirty) return;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, DEBOUNCE_MS);
    });

    // 離開或切到背景時立刻推送——否則最後 3 秒內的變更會遺失。
    // visibilitychange 比 beforeunload 可靠：行動瀏覽器常不觸發後者。
    const onHidden = () => {
      if (document.visibilityState === 'hidden') void flush();
    };
    document.addEventListener('visibilitychange', onHidden);

    return () => {
      unsub();
      document.removeEventListener('visibilitychange', onHidden);
      if (timer.current) clearTimeout(timer.current);
      void flush();
    };
  }, [enabled]);
}
