'use client';

export function LibrarySectionHeader({ title, subtitle, count, onCreate }: {
  title: string;
  subtitle: string;
  count: number;
  onCreate: () => void;
}) {
  return (
    <header className="mb-5 flex flex-wrap items-start justify-between gap-4 border-b border-border-2 pb-5">
      <div className="min-w-0 flex-1">
        <h2 className="font-display text-[24px] font-bold text-text-primary">{title}</h2>
        <p className="mt-1 text-ui leading-6 text-text-secondary">{subtitle}</p>
        <p className="mt-2 text-small tabular-nums text-text-secondary" aria-live="polite">{count} 份內容</p>
      </div>
      <button type="button" onClick={onCreate} className="min-h-11 shrink-0 rounded-card border border-gold bg-gold/10 px-4 text-ui font-bold text-gold transition-colors hover:bg-gold/20">
        ＋ 新增{title}
      </button>
    </header>
  );
}

export function LibraryNoResults() {
  return <p role="status" className="rounded-card border border-dashed border-border px-4 py-10 text-center text-ui leading-6 text-text-secondary">此分類找不到符合的名稱。試試其他關鍵字，或清除搜尋。</p>;
}
