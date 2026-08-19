'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

/**
 * 多步驟表單的草稿保全（建角精靈、升級流程）。
 *
 * 這兩個流程都要填好幾步才送出，中途離開等於全部重來。日誌編輯器早就有
 * 「尚未儲存」的攔截，這兩個更長的流程反而沒有。
 *
 * 兩層保護，缺一不可：
 *
 * 1. **草稿存 sessionStorage** —— 主要防線。App Router 內的返回鍵是 client
 *    導覽，`beforeunload` 根本不會觸發；只有把值留下來，使用者走回來時才救得回。
 * 2. **beforeunload** —— 補重新整理與關分頁這兩種瀏覽器層級的離開。
 *
 * 用 sessionStorage 而非 localStorage：草稿屬於「這次開著的分頁」，關掉瀏覽器
 * 之後還跳出三天前的半成品只會讓人困惑。
 *
 * **回來時是問一句、不是自動填回去。** 自動套用 15 個欄位而畫面上沒有交代，
 * 會讓人搞不清眼前的選擇是自己剛做的還是上次留下的；而且「我想重新來過」
 * 沒有出口。改成顯示一列「要繼續上次的草稿嗎」，套用發生在點擊當下。
 */

/** 草稿只在抵達時讀一次，之後不再跟著 sessionStorage 變動——見 useArrivalDraft。 */
const noopSubscribe = () => () => {};

/**
 * 抵達這一頁時 sessionStorage 裡的草稿原文。
 *
 * 用 `useSyncExternalStore` 而不是「effect 裡讀完再 setState」：後者是為了
 * 繞開 SSR（伺服器讀不到 sessionStorage）而製造的一次額外渲染，React 也明確
 * 不建議。這個 hook 本來就是設計給「伺服器與瀏覽器看到的值不同」的外部來源，
 * `getServerSnapshot` 回 null，hydration 之後才換成真值。
 *
 * 值用 ref 凍住：保存用的 effect 每次改動都會寫回 sessionStorage，若不凍住，
 * 快照會一路跟著使用者輸入變動，那列提示就永遠不會消失。
 */
function useArrivalDraft(key: string): string | null {
  const frozen = useRef<string | null | undefined>(undefined);
  return useSyncExternalStore(
    noopSubscribe,
    () => {
      if (frozen.current === undefined) {
        try {
          frozen.current = sessionStorage.getItem(key);
        } catch {
          // 無痕模式可能連讀取都拋錯。
          frozen.current = null;
        }
      }
      return frozen.current;
    },
    () => null,
  );
}

export function useFormDraft<T>({
  key,
  value,
  active,
}: {
  /** sessionStorage 的鍵。同一流程的不同入口要用不同鍵。 */
  key: string;
  /** 目前的表單值，變動時自動寫回草稿。 */
  value: T;
  /** false 時停止保存並解除攔截（例如已送出、或使用者根本還沒開始填）。 */
  active: boolean;
}) {
  const raw = useArrivalDraft(key);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!active) return;
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      // 無痕模式或配額已滿。草稿是加分項，存不進去就算了。
    }
  }, [key, value, active]);

  useEffect(() => {
    if (!active) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [active]);

  const clear = () => {
    try {
      sessionStorage.removeItem(key);
    } catch {
      // 同上，清不掉不影響流程。
    }
  };

  let pending: T | null = null;
  if (raw && !dismissed && !active) {
    try {
      pending = JSON.parse(raw) as T;
    } catch {
      // 草稿格式過期或壞掉：當作沒有草稿。
      pending = null;
    }
  }

  return {
    /**
     * 待採用的草稿；null＝沒有草稿、已處理過，或使用者已經開始填新的。
     * （已經開始填就不該再跳出來問——那會蓋掉他正在做的事。）
     */
    pending,
    /** 使用者選擇繼續：由呼叫端把值套回各個 state，然後收起提示。 */
    accept: () => setDismissed(true),
    /** 使用者選擇重新開始。 */
    discard: () => {
      clear();
      setDismissed(true);
    },
    clear,
  };
}
