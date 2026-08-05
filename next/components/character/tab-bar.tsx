'use client';

/**
 * 角色頁的水平分頁列，對照 Flutter 端的 `CharacterTabBar`。
 *
 * 選中者：金色、w700、下方 2px 金色指示條；未選：textSecondary、w500。
 * 分頁間距 16px，整列可橫向捲動（窄螢幕放得下五個分頁）。
 */
export function CharacterTabBar({
  tabs,
  current,
  onChange,
}: {
  tabs: string[];
  current: number;
  onChange: (i: number) => void;
}) {
  return (
    <div className="flex gap-4 overflow-x-auto px-4 py-3">
      {tabs.map((label, i) => {
        const selected = i === current;
        return (
          <button
            key={label}
            type="button"
            onClick={() => onChange(i)}
            aria-current={selected ? 'page' : undefined}
            className="flex shrink-0 flex-col"
          >
            <span
              className={`px-0.5 py-2 text-[15px] ${
                selected
                  ? 'font-bold text-gold'
                  : 'font-medium text-text-secondary'
              }`}
            >
              {label}
            </span>
            <span
              className={`h-0.5 rounded-full ${selected ? 'bg-gold' : 'bg-transparent'}`}
            />
          </button>
        );
      })}
    </div>
  );
}
