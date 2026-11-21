'use client';

/** 單選的 chip 列。所有數值欄位都走這裡——沒有任何一格能自由輸入。 */
export function Choices<T extends string | number>({
  ariaLabel,
  options,
  selected,
  onSelect,
}: {
  ariaLabel: string;
  options: { key: T; label: string }[];
  selected: T;
  onSelect: (key: T) => void;
}) {
  return (
    <div role="group" aria-label={ariaLabel} className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={String(o.key)}
          type="button"
          aria-pressed={selected === o.key}
          onClick={() => onSelect(o.key)}
          className={`min-h-11 rounded-chip border px-4 text-ui ${
            selected === o.key
              ? 'border-gold bg-gold/10 font-semibold text-gold'
              : 'border-border-2 text-text-secondary'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
