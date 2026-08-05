'use client';

import { useState, type ReactNode } from 'react';

/**
 * 可收合的頂層區段，對照 Flutter 端的 `CollapsibleSection`。
 *
 * 標題列樣式與 SectionTitle 一致，另加 chevron；收合時可顯示摘要。
 * 點標題切換收合，但 trailing（如編輯鈕）自帶點擊、不觸發收合——
 * 這是 Flutter 端的行為，照搬。
 */
export function CollapsibleSection({
  en,
  cn,
  children,
  summary,
  trailing,
  first = false,
  initiallyExpanded = true,
}: {
  en: string;
  cn?: string;
  children: ReactNode;
  /** 收合時於標題列顯示的摘要。 */
  summary?: string;
  trailing?: ReactNode;
  first?: boolean;
  initiallyExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(initiallyExpanded);

  return (
    <div className="flex flex-col">
      <div className={`flex items-center ${first ? 'pt-0' : 'pt-3'} pb-2`}>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="flex min-h-11 grow items-center text-left"
        >
          <svg
            viewBox="0 0 24 24"
            className="size-[17px] shrink-0 fill-gold"
            aria-hidden
          >
            {expanded ? (
              <path d="M7.4 8.6 12 13.2l4.6-4.6L18 10l-6 6-6-6z" />
            ) : (
              <path d="M8.6 16.6 13.2 12 8.6 7.4 10 6l6 6-6 6z" />
            )}
          </svg>
          <span className="font-label ml-1.5 text-[10px] font-bold tracking-[2px] text-gold">
            {en}
          </span>
          {cn && (
            <span className="ml-1.5 text-[14px] font-bold text-text-primary">
              {cn}
            </span>
          )}
          {!expanded && summary && (
            <span className="ml-2 truncate text-[10px] text-section-label/70">
              {summary}
            </span>
          )}
          <span className="ml-1.5 h-px grow bg-border-2" />
        </button>
        {trailing && <span className="ml-1.5">{trailing}</span>}
      </div>
      {expanded && children}
    </div>
  );
}
