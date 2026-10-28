'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal, flushSync } from 'react-dom';

import type { Character } from '@/lib/domain/character';
import { CharacterPrintSheet } from './character-print-sheet';

export function CharacterPdfExport({ c }: { c: Character }) {
  const hintId = useId();
  const printing = useRef(false);
  const [snapshot, setSnapshot] = useState<Character | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 儲存或取消後都移除快照，之後的原生列印不會誤用上次匯出的舊資料。
    const clear = () => setSnapshot(null);
    window.addEventListener('afterprint', clear);
    return () => window.removeEventListener('afterprint', clear);
  }, []);

  const download = async () => {
    if (printing.current) return;
    printing.current = true;
    setPending(true);
    setError(null);
    const originalTitle = document.title;

    try {
      // 取按下當刻的本機資料，不必等雲端同步；portal 避開外殼的固定高度與捲動裁切。
      flushSync(() => setSnapshot(c));
      await document.fonts.ready;
      const portrait = document.querySelector<HTMLImageElement>('[data-print-portrait]');
      if (portrait && !(await portrait.decode().then(() => true, () => false))) {
        setError('角色圖片無法載入，請確認網路後再試一次。');
        setSnapshot(null);
        return;
      }
      const images = document.querySelectorAll<HTMLImageElement>('[data-character-print] img');
      await Promise.all(Array.from(images, (img) => img.decode().catch(() => undefined)));
      document.title = `${c.name || '角色卡'} - Lorebook`;
      window.print();
    } catch {
      setError('無法開啟列印視窗，請再試一次。');
      setSnapshot(null);
    } finally {
      document.title = originalTitle;
      printing.current = false;
      setPending(false);
    }
  };

  return (
    <>
      <div className="mx-auto flex w-full max-w-[700px] flex-wrap items-center justify-end gap-x-3 px-4 py-2 expanded:max-w-none">
        <p id={hintId} className="sr-only text-small text-text-secondary medium:not-sr-only">
          A4 跑團版 · 在列印視窗選擇「另存為 PDF」
        </p>
        <button
          type="button"
          onClick={() => void download()}
          disabled={pending}
          aria-describedby={hintId}
          className="flex min-h-11 items-center gap-2 rounded-card border border-border px-3 text-ui text-text-primary hover:border-gold hover:text-gold disabled:opacity-60"
        >
          <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden="true">
            <path d="M11 3h2v9l3-3 1.4 1.4L12 15.8l-5.4-5.4L8 9l3 3zM5 16v4h14v-4h2v6H3v-6z" />
          </svg>
          {pending ? '準備 PDF…' : '下載 PDF'}<span className="text-small text-text-secondary medium:hidden"> · A4</span>
        </button>
        {error && <p role="alert" className="w-full text-right text-small text-danger">{error}</p>}
      </div>
      {snapshot && createPortal(<CharacterPrintSheet c={snapshot} />, document.body)}
    </>
  );
}
