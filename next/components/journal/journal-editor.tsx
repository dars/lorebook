'use client';

import { useRef } from 'react';

/**
 * 日誌編輯器的輸入區：**大字標題 ＋ 內文**。
 *
 * 原本是單一 `<textarea>`、第一行當標題。那個設計的用意是好的（不必先想標題
 * 再想內容），但標題在編輯時完全看不出是標題——`<textarea>` 的字級是整塊
 * 統一的，沒辦法只把第一行放大。
 *
 * 疊一層樣式鏡像（textarea 透明、下面放同步捲動的 div）是常見手法，但那要求
 * 兩層的文字度量**完全一致**；第一行字級一改，游標就對不上了。
 *
 * 所以拆成兩個欄位，再用鍵盤行為把它們縫回一段連續輸入：
 *
 * - 標題按 Enter → 跳到內文，不換行
 * - 內文開頭按 Backspace → 退回標題末端（打錯時的自然修正路徑）
 * - 貼上多行到標題 → 第一行留在標題、其餘進內文
 *
 * 對外仍然是 title / body 兩個值——`JournalEntry` 本來就是這樣存的，
 * 反而比先合併成一段再 `splitJournalText` 拆回來更直接。
 *
 * **不設 autoFocus**：`EditorSheet` 會刻意把焦點停在面板本身，避免一開啟就
 * 彈出手機鍵盤蓋掉半個畫面；這裡再搶一次只會兩邊打架。
 */
export function JournalEditor({
  title,
  body,
  onChange,
}: {
  title: string;
  body: string;
  onChange: (next: { title: string; body: string }) => void;
}) {
  const titleRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div className="rounded-card border border-border bg-surface-2 focus-within:border-gold/60">
      <input
        ref={titleRef}
        aria-label="標題"
        name="title"
        value={title}
        onChange={(e) => onChange({ title: e.target.value, body })}
        onKeyDown={(e) => {
          if (e.key !== 'Enter') return;
          e.preventDefault();
          bodyRef.current?.focus();
          bodyRef.current?.setSelectionRange(0, 0);
        }}
        onPaste={(e) => {
          const text = e.clipboardData.getData('text');
          if (!text.includes('\n')) return; // 單行就照原本的貼上行為
          e.preventDefault();
          const [first, ...rest] = text.split('\n');
          onChange({
            title: title + first,
            body: [rest.join('\n'), body].filter(Boolean).join('\n'),
          });
        }}
        placeholder="標題"
        maxLength={80}
        autoComplete="off"
        className="w-full rounded-t-card bg-transparent px-3 pb-2 pt-3 text-[18px] font-bold text-text-primary placeholder:text-text-secondary/60 focus:outline-none"
      />

      <div className="mx-3 h-px bg-border/40" />

      <textarea
        ref={bodyRef}
        aria-label="內容"
        name="body"
        value={body}
        onChange={(e) => onChange({ title, body: e.target.value })}
        onKeyDown={(e) => {
          // 內文最前面按 Backspace：退回標題末端，而不是無事發生。
          const el = e.currentTarget;
          if (e.key !== 'Backspace') return;
          if (el.selectionStart !== 0 || el.selectionEnd !== 0) return;
          e.preventDefault();
          titleRef.current?.focus();
          titleRef.current?.setSelectionRange(title.length, title.length);
        }}
        rows={11}
        placeholder="今天發生了什麼？"
        className="w-full resize-y rounded-b-card bg-transparent px-3 pb-3 pt-2 text-[14px] leading-relaxed text-text-primary placeholder:text-text-secondary/60 focus:outline-none"
      />
    </div>
  );
}
