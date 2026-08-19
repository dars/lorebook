'use client';

import type { ReactNode } from 'react';

/**
 * 編輯用的互動元件。
 *
 * 觸控目標一律 ≥44px：跑團時常是單手拿手機、另一手擲骰，小按鈕會誤觸，
 * 而誤觸的後果是角色卡上的數字被改錯。
 */

export function StepperButton({
  onClick,
  children,
  label,
}: {
  onClick: () => void;
  children: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="min-h-11 min-w-11 rounded-chip border border-border bg-surface-2 px-3 text-body text-text-primary active:border-gold"
    >
      {children}
    </button>
  );
}

/** 可切換的標籤（狀態異常、專注）。 */
export function ToggleChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-11 rounded-chip border px-3 text-small ${
        active
          ? 'border-danger bg-surface-2 text-danger'
          : 'border-border-2 text-text-secondary'
      }`}
    >
      {children}
    </button>
  );
}

