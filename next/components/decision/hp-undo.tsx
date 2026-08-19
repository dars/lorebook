'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { characterActions } from '@/lib/state/character-store';

/**
 * HP 調整的復原。
 *
 * HP ±1 是全 App 最高頻的操作，而且**戰鬥中沒人記得自己按了幾下**——點錯只能
 * 反向再點，還得先算出點錯了幾次。這裡改成事後反悔：跑團當下的高頻小操作
 * 要的是 undo，不是每次都跳確認框擋住流程。
 *
 * 連續調整會併成一筆：一次扣三下顯示「HP −3」，復原就回到那三下之前的狀態，
 * 而不是要按三次復原。
 */
const WINDOW_MS = 5000;

type Snapshot = { currentHp: number; tempHp: number };

export function useHpUndo() {
  // 這一連串調整**開始之前**的狀態。第一次調整時記下，之後沿用同一份，
  // 因此復原一次就退回整段。
  const before = useRef<Snapshot | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pending, setPending] = useState<{ delta: number } | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  /** 包住每一次 HP 調整：先記快照，再累計差額並重開倒數。 */
  const adjust = useCallback((delta: number, snapshot: Snapshot) => {
    if (!before.current) before.current = snapshot;
    characterActions.adjustHp(delta);

    setPending((p) => ({ delta: (p?.delta ?? 0) + delta }));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      before.current = null;
      setPending(null);
    }, WINDOW_MS);
  }, []);

  const undo = useCallback(() => {
    const snap = before.current;
    if (snap) characterActions.setHitPoints(snap.currentHp, snap.tempHp);
    if (timer.current) clearTimeout(timer.current);
    before.current = null;
    setPending(null);
  }, []);

  return { pending, adjust, undo };
}

/**
 * 復原列。浮在底部書籤列上方，不佔版面高度——它會來會走，
 * 若把內容往上推，每次扣血整頁都會跳一下。
 */
export function HpUndoBar({
  delta,
  onUndo,
}: {
  delta: number;
  onUndo: () => void;
}) {
  // 淨變化為 0（扣完又加回來）時沒有東西好復原。
  if (delta === 0) return null;
  const label = `HP ${delta > 0 ? '+' : '−'}${Math.abs(delta)}`;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-30 flex justify-center px-4 medium:bottom-[calc(1.5rem+env(safe-area-inset-bottom))]"
      role="status"
      aria-live="polite"
    >
      <div className="pointer-events-auto flex items-center gap-3 rounded-chip border border-border bg-surface-1/95 py-2 pl-4 pr-2 shadow-[0_4px_16px_rgba(0,0,0,0.5)] backdrop-blur">
        <span className="font-display text-[14px] font-bold tabular-nums text-text-primary">
          {label}
        </span>
        <button
          type="button"
          onClick={onUndo}
          className="min-h-9 rounded-chip border border-gold px-3 text-[12px] font-bold text-gold hover:bg-gold/10"
        >
          復原
        </button>
      </div>
    </div>
  );
}
