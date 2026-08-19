'use client';

/**
 * 水平分頁列，對照 Flutter 端的 `CharacterTabBar`。
 *
 * 選中者：金色、w700、下方 2px 金色指示條；未選：textSecondary、w500。
 *
 * 兩種版型共用同一份實作——它們是同一個視覺語彙，分岔成兩個元件遲早會只改到
 * 其中一個：
 *
 * - `page`（預設）：角色頁頂端的分頁，靠左、間距 16px、可橫向捲動。
 * - `segment`：卡片內的分頁（行動頁的能力／豁免／技能），等寬平均分佈，
 *   底下有一條貫穿的細線當軌道。
 */
export function CharacterTabBar({
  tabs,
  current,
  onChange,
  variant = 'page',
}: {
  tabs: string[];
  current: number;
  onChange: (i: number) => void;
  variant?: 'page' | 'segment';
}) {
  const segment = variant === 'segment';
  return (
    <div
      className={
        segment
          ? 'flex border-b border-border-2'
          : 'flex gap-4 overflow-x-auto px-4 py-3'
      }
    >
      {tabs.map((label, i) => {
        const selected = i === current;
        return (
          // 分頁文字連指示條只有 36px 高；以偽元素往上下各借 6px（吃掉外層
          // 既有的 py-3 留白）補到 48px，可點區變大而排版不動。
          <button
            key={label}
            type="button"
            onClick={() => onChange(i)}
            aria-current={selected ? 'page' : undefined}
            className={`relative flex flex-col before:absolute before:-inset-x-1 before:-inset-y-1.5 before:content-[''] ${
              segment ? '-mb-px flex-1 items-center' : 'shrink-0'
            }`}
          >
            <span
              className={`px-0.5 py-2 ${segment ? 'text-[13px]' : 'text-[15px]'} ${
                selected
                  ? 'font-bold text-gold'
                  : 'font-medium text-text-secondary hover:text-text-primary'
              }`}
            >
              {label}
            </span>
            <span
              className={`h-0.5 rounded-full ${segment ? 'w-full' : ''} ${
                selected ? 'bg-gold' : 'bg-transparent'
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}
