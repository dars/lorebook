'use client';

import { useEffect, type ReactNode } from 'react';

/**
 * 編輯用的底部彈出面板，對照 Flutter 端的 `EditorSheetScaffold`。
 *
 * 桌面版限寬 560px 置中；行動版貼底全寬。取消／儲存並排於底部。
 * 用原生 <dialog> 而非自製 overlay——焦點鎖定、Esc 關閉、背景 inert 都由
 * 瀏覽器處理，自己實作只會漏掉其中幾項。
 */
export function EditorSheet({
  open,
  title,
  onClose,
  onSave,
  saveEnabled = true,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  onSave?: () => void;
  saveEnabled?: boolean;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 medium:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-[560px] overflow-y-auto rounded-t-[16px] border border-border bg-surface-1 p-5 medium:rounded-card"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-[16px] font-bold text-text-primary">{title}</h2>
        <div className="mt-4">{children}</div>

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 flex-1 rounded-card border border-border text-[13px] text-text-secondary"
          >
            取消
          </button>
          {onSave && (
            <button
              type="button"
              onClick={onSave}
              disabled={!saveEnabled}
              className="min-h-11 flex-1 rounded-card border border-gold bg-gold/10 text-[13px] font-bold text-gold disabled:opacity-40"
            >
              儲存
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <div className="font-label mb-1.5 text-[10px] tracking-[1.5px] text-section-label">
      {children}
    </div>
  );
}

/** 區段標題右端的編輯鈕。觸控目標 ≥44px。 */
export function EditIcon({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex size-11 items-center justify-center"
    >
      <svg viewBox="0 0 24 24" className="size-4 fill-text-secondary" aria-hidden>
        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z" />
      </svg>
    </button>
  );
}
