import type { ReactNode } from 'react';

/** 唯讀角色卡的共用排版元件。刻意不含任何互動——分享頁為純唯讀。 */

export function Section({
  id,
  title,
  titleEn,
  children,
}: {
  id: string;
  title: string;
  titleEn?: string;
  children: ReactNode;
}) {
  return (
    // data-section 供內容庫的過濾器辨識區段（整段沒命中就收起來）。
    // 其他用途只是多一個不影響任何事的屬性。
    <section id={id} data-section={id} className="scroll-mt-16 py-5">
      <h2 className="mb-3 flex items-baseline gap-2 border-b border-border-2 pb-2">
        {titleEn && (
          <span className="font-display text-tiny tracking-widest text-section-label">
            {titleEn}
          </span>
        )}
        <span className="text-heading font-bold text-gold">{title}</span>
      </h2>
      {children}
    </section>
  );
}

/** 數值方塊（AC、被動察覺這類單一數字）。 */
export function StatBox({
  label,
  value,
  sub,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
}) {
  return (
    <div className="rounded-card border border-border-2 bg-surface-1 px-3 py-2 text-center">
      <div className="font-display text-display leading-none text-gold">
        {value}
      </div>
      <div className="mt-1 text-tiny text-text-secondary">{label}</div>
      {sub && <div className="text-tiny text-text-secondary">{sub}</div>}
    </div>
  );
}

export function Chip({
  children,
  tone = 'default',
}: {
  children: ReactNode;
  tone?: 'default' | 'gold' | 'danger' | 'temp';
}) {
  const toneClass = {
    default: 'border-border-2 text-text-secondary',
    gold: 'border-gold text-gold',
    danger: 'border-danger text-danger',
    temp: 'border-temp-hp text-temp-hp',
  }[tone];
  return (
    <span
      className={`inline-block rounded-chip border px-2 py-1 text-small ${toneClass}`}
    >
      {children}
    </span>
  );
}

/** 標籤—值的一列。值為空時整列不渲染，避免滿版的空欄位。 */
export function Row({ label, value }: { label: string; value: ReactNode }) {
  if (value === '' || value === null || value === undefined) return null;
  return (
    <div className="flex gap-3 py-1 text-body">
      <span className="w-24 shrink-0 text-small text-text-secondary">
        {label}
      </span>
      <span className="text-text-primary">{value}</span>
    </div>
  );
}

export function EmptyHint({ text }: { text: string }) {
  return <p className="py-3 text-small text-text-secondary">{text}</p>;
}
