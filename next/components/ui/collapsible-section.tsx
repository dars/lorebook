'use client';

import { useState, type ReactNode } from 'react';

/**
 * 可收合的頂層區段，對照 Flutter 端的 `CollapsibleSection`。
 *
 * 標題列樣式與 SectionTitle 一致，另加 chevron；收合時可顯示摘要。
 * 點標題切換收合，但 trailing（如編輯鈕）自帶點擊、不觸發收合——
 * 這是 Flutter 端的行為，照搬。
 */

/**
 * 這次瀏覽期間的收合狀態，以區段的英文標題為鍵。
 *
 * 切分頁會讓整棵子樹重新掛載，原本每次回來都全部展開——非施法者得反覆收起
 * 資源區。記在模組層的 Map 就夠：切分頁是 client 導覽，元件重新掛載時直接
 * 讀得到。
 *
 * **刻意不用 localStorage。** 那會需要在 render 期間讀瀏覽器 API，與伺服器
 * 端的輸出對不起來；改用 effect 補救則會先展開再收起，每次載入閃一下。
 * 模組層 Map 在初次載入時是空的，等於預設值，與 SSR 天然一致。
 * 代價是重新整理後回到預設——真要跨重整保留，得走 cookie 或 layout 的
 * 預繪腳本（與主題同一套路），那是另一件事。
 */
const sessionExpanded = new Map<string, boolean>();
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
  const [expanded, setExpanded] = useState(
    () => sessionExpanded.get(en) ?? initiallyExpanded,
  );

  const toggle = () =>
    setExpanded((v) => {
      sessionExpanded.set(en, !v);
      return !v;
    });

  return (
    <div className="flex flex-col">
      <div className={`flex items-center ${first ? 'pt-0' : 'pt-3'} pb-2`}>
        <button
          type="button"
          onClick={toggle}
          aria-expanded={expanded}
          className="group flex min-h-11 grow items-center text-left"
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
          <span className="font-label ml-1.5 text-eyebrow font-bold tracking-[2px] text-gold">
            {en}
          </span>
          {cn && (
            <span className="font-cjk ml-1.5 text-body font-bold text-text-primary">
              {cn}
            </span>
          )}
          {!expanded && summary && (
            <span className="ml-2 truncate text-small text-section-label">
              {summary}
            </span>
          )}
          <span className="ml-1.5 h-px grow bg-border-2 group-hover:bg-gold/40" />
        </button>
        {trailing && <span className="ml-1.5">{trailing}</span>}
      </div>
      {expanded && children}
    </div>
  );
}
