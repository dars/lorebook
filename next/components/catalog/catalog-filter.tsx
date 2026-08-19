'use client';

import { useId, useRef, useState } from 'react';

/**
 * 內容庫目錄的即時過濾。
 *
 * **刻意不重新渲染清單。** 這兩頁的設計前提是「整份一次送到、⌘F 搜得到全部、
 * 沒有 JS 也能瀏覽」（見各頁開頭的說明）。若改成由 React 依查詢字串產生清單，
 * 這三件事會一起失效：沒有 JS 就一片空白，⌘F 也只搜得到當前過濾結果。
 *
 * 因此清單維持伺服器端完整輸出，這裡只在既有的 DOM 上切換 `hidden`——
 * 是漸進增強而不是取代。查詢清空時所有節點都回到可見，⌘F 的行為與過去一致。
 *
 * DOM 契約（由各目錄頁負責標記）：
 * - 每個條目：`[data-search]`，值為已轉小寫的可搜尋字串
 * - 每個區段：`[data-section]`，其值同時是該區段的 id
 * - 導覽連結：`[data-section-link]`，值對應區段 id
 */
export function CatalogFilter({
  placeholder,
  total,
  unit,
  children,
}: {
  placeholder: string;
  /** 條目總數，供「顯示 N / M 條」用。 */
  total: number;
  /** 量詞，如「條」「項」。 */
  unit: string;
  children: React.ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState<number | null>(null);
  const inputId = useId();

  const apply = (raw: string) => {
    const el = root.current;
    if (!el) return;
    const q = raw.trim().toLowerCase();

    if (!q) {
      for (const n of el.querySelectorAll<HTMLElement>('[data-search],[data-section]')) {
        n.hidden = false;
      }
      for (const n of document.querySelectorAll<HTMLElement>('[data-section-link]')) {
        n.hidden = false;
      }
      setShown(null);
      return;
    }

    let count = 0;
    for (const n of el.querySelectorAll<HTMLElement>('[data-search]')) {
      const hit = (n.dataset.search ?? '').includes(q);
      n.hidden = !hit;
      if (hit) count += 1;
    }

    // 整段都沒命中就連標題一起收起來，否則畫面上會留一排空區段標題。
    const empty = new Set<string>();
    for (const s of el.querySelectorAll<HTMLElement>('[data-section]')) {
      const any = s.querySelector<HTMLElement>('[data-search]:not([hidden])');
      s.hidden = !any;
      if (!any && s.dataset.section) empty.add(s.dataset.section);
    }
    for (const link of document.querySelectorAll<HTMLElement>('[data-section-link]')) {
      link.hidden = empty.has(link.dataset.sectionLink ?? '');
    }
    setShown(count);
  };

  return (
    <>
      <div className="mt-4">
        <label htmlFor={inputId} className="sr-only">
          {placeholder}
        </label>
        <input
          id={inputId}
          type="search"
          name="q"
          autoComplete="off"
          spellCheck={false}
          placeholder={placeholder}
          onChange={(e) => apply(e.target.value)}
          className="min-h-11 w-full rounded-chip border border-border bg-surface-2 px-3 text-[14px] text-text-primary"
        />
        <p className="mt-1.5 text-[12px] tabular-nums text-text-secondary" aria-live="polite">
          {shown === null
            ? `共 ${total} ${unit}`
            : shown === 0
              ? '找不到符合的條目'
              : `顯示 ${shown} / ${total} ${unit}`}
        </p>
      </div>
      <div ref={root}>{children}</div>
    </>
  );
}
