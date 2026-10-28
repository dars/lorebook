'use client';

import { usePwaStore } from '@/lib/state/pwa-store';
import { useCharacterStore } from '@/lib/state/character-store';
import { fmtJournalRelativeDate } from '@/lib/journal/format';

/**
 * 離線標示。掛在角色情境的頁首下方，compact 與 expanded 都看得到。
 *
 * 兩件事必須同時說清楚：
 *
 * 1. **這是離線的舊資料，而且多舊。** 只說「離線」而不說時點，使用者無從判斷
 *    眼前的 HP 還可不可信。
 * 2. **離線期間的變更沒有存下來。** 本階段不做離線寫入，但離線可讀必然誘發
 *    離線編輯——看得到角色卡就會去扣血。那些變更只活在記憶體，重整就沒了。
 *    不明說等同誤導，這比不能離線讀更糟。
 */
export function OfflineBanner() {
  const offline = usePwaStore((s) => s.offline);
  const cachedAt = usePwaStore((s) => s.cachedAt);
  const dirty = useCharacterStore((s) => s.dirty);

  if (!offline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="border-y border-gold/40 bg-gold/10 px-5 py-2"
    >
      <p className="text-small leading-relaxed text-text-primary">
        <span className="font-semibold">目前離線</span>
        {cachedAt && (
          <span className="text-text-secondary">
            ・顯示 {fmtJournalRelativeDate(new Date(cachedAt))}同步的內容
          </span>
        )}
      </p>
      {dirty && (
        <p className="mt-0.5 text-small leading-relaxed text-danger">
          這次的變更<strong>尚未存下</strong>，重新整理會遺失。恢復連線後會自動同步。
        </p>
      )}
    </div>
  );
}
