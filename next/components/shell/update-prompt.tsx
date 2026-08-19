'use client';

import { useEffect, useState } from 'react';

import { applyUpdate } from '@/components/shell/sw-register';
import { usePwaStore } from '@/lib/state/pwa-store';

/**
 * 新版本提示，對照 Flutter 端的 `AppUpdateGate`。
 *
 * 為什麼還需要它：跑團時角色卡常一開整晚不重整，開著的分頁跑的仍是舊版 JS。
 *
 * **兩個來源、一個介面。** 新版可能由輪詢 `/api/version` 發現，也可能由
 * service worker 的 `updatefound` 發現。兩套各自跳提示會出現「提示了卻沒更新」
 * 或「沒提示就換了版本」，所以這裡是唯一的呈現點，SW 那邊只負責通知。
 *
 * **刻意不自動重載**：重載時機不可控，可能正好落在玩家改 HP 或寫筆記的當下。
 * 提示可以忽略，讓使用者自己挑時機（例如戰鬥結束後）。
 */
const POLL_MS = 10 * 60 * 1000;

export function UpdatePrompt() {
  const [stale, setStale] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const swUpdateReady = usePwaStore((s) => s.updateReady);

  useEffect(() => {
    let current: string | null = null;
    let cancelled = false;

    const check = async () => {
      try {
        const r = await fetch('/api/version', { cache: 'no-store' });
        const { buildId } = (await r.json()) as { buildId: string };
        if (cancelled) return;
        if (current === null) current = buildId;
        else if (buildId !== current) setStale(true);
      } catch {
        // 離線或暫時失敗都不該打擾使用者——下次輪詢再說。
      }
    };

    check();
    const timer = setInterval(check, POLL_MS);
    // 回到分頁時立刻檢查一次：那通常正是使用者要繼續操作的時候。
    const onVisible = () => document.visibilityState === 'visible' && check();
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  if ((!stale && !swUpdateReady) || dismissed) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto max-w-[520px] rounded-card border border-gold bg-surface-1 p-4 shadow-[0_4px_16px_rgba(0,0,0,0.5)]">
        <p className="text-[14px] font-semibold text-text-primary">有新版本</p>
        <p className="mt-1 text-[12px] leading-relaxed text-text-secondary">
          重新載入即可套用。你的角色資料存在雲端，不會因此遺失。
        </p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="min-h-11 flex-1 rounded-chip border border-border text-[13px] text-text-secondary"
          >
            稍後再說
          </button>
          <button
            type="button"
            onClick={() => void applyUpdate()}
            className="min-h-11 flex-1 rounded-chip bg-gold-solid text-[13px] font-bold text-[#1A1206]"
          >
            立即更新
          </button>
        </div>
      </div>
    </div>
  );
}
