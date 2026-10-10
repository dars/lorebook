'use client';

import { useState } from 'react';

/**
 * 可重複使用的條目卡，對照 Flutter 端的 `EntryCard`（designs.pen 的 AbilityCard）。
 *
 * 單一卡片內分三段：標題列（徽章／中英名稱／右側 meta 與數值／展開指示）、
 * 分隔線、描述面板（較深底色的凹陷區）。法術、戲法、武器、通用動作共用。
 *
 * 沒有 description 與 footnote 時不可展開——沒有內容的展開箭頭是騙人的。
 */
export function EntryCard({
  badge,
  title,
  subtitle = '',
  meta,
  metaArrow = false,
  value,
  valueClass = 'text-gold-dim',
  description,
  footnote,
  emphasizeBadge = false,
  borderless = false,
}: {
  badge: string;
  title: string;
  subtitle?: string;
  /** 右上資訊（射程、命中…）。 */
  meta?: string | null;
  /** meta 前是否顯示箭頭（表示射程／方向）。 */
  metaArrow?: boolean;
  /** 右下主要數值（傷害、命中…）。 */
  value?: string | null;
  valueClass?: string;
  description?: string | null;
  /** 展開後的補充說明（升級效應、特性…）。 */
  footnote?: string | null;
  /** 徽章金色強調（已備法術、武器）。 */
  emphasizeBadge?: boolean;
  /** 已在外層卡片中時，避免重複框線。 */
  borderless?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const expandable = Boolean(description || footnote);

  const header = (
    <div className="flex items-center px-3.5 py-3">
      <span
        className={`flex size-[34px] shrink-0 items-center justify-center rounded-md border text-[13px] font-semibold ${
          emphasizeBadge
            ? 'border-gold-dim bg-gold-dim/[0.09] text-gold-dim'
            : 'border-border text-text-primary/70'
        }`}
      >
        {badge}
      </span>

      <span className="ml-3 min-w-0 flex-1">
        <span className="block truncate text-[16px] font-semibold text-text-primary">
          {title}
        </span>
        {subtitle && (
          <span className="font-label block truncate text-[11px] text-text-primary/70">
            {subtitle}
          </span>
        )}
      </span>

      {(meta || value) && (
        <span className="ml-3 flex shrink-0 flex-col items-end">
          {meta && (
            <span className="flex items-center text-[12px] text-text-primary/70">
              {metaArrow && <span className="mr-0.5 text-[12px]">→</span>}
              {meta}
            </span>
          )}
          {value && (
            <span className={`font-display mt-0.5 text-[18px] font-bold ${valueClass}`}>
              {value}
            </span>
          )}
        </span>
      )}

      {expandable && (
        <span
          className={`ml-2 shrink-0 text-text-primary/70 transition-transform ${
            expanded ? 'rotate-180' : ''
          }`}
          aria-hidden
        >
          ▾
        </span>
      )}
    </div>
  );

  return (
    <div className={borderless ? 'min-w-0 overflow-hidden' : 'overflow-hidden rounded-[10px] border border-border'}>
      {expandable ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="block w-full bg-surface-1 text-left"
        >
          {header}
        </button>
      ) : (
        <div className="bg-surface-1">{header}</div>
      )}

      {expanded && (
        <div className="border-t border-border bg-surface-0 px-4 pb-4 pt-3.5">
          {description && (
            <p className="whitespace-pre-wrap text-[14px] leading-[1.75] text-text-primary/85">
              {description}
            </p>
          )}
          {footnote && (
            <p className="mt-3 whitespace-pre-wrap text-[13px] leading-[1.6] text-gold-dim">
              {footnote}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * 傷害類型 → 顏色 class，對照 Flutter `DndColors.damage()`。
 * 中英雙軌：內容庫的中文譯名與 SRD 英文名都要能對上。
 */
const DAMAGE_CLASS: Record<string, string> = {
  fire: 'text-damage-fire', 火: 'text-damage-fire', 火焰: 'text-damage-fire',
  cold: 'text-damage-cold', 冰: 'text-damage-cold', 寒冰: 'text-damage-cold', 冰霜: 'text-damage-cold',
  lightning: 'text-damage-lightning', 閃電: 'text-damage-lightning', 電: 'text-damage-lightning',
  thunder: 'text-damage-thunder', 雷鳴: 'text-damage-thunder', 轟雷: 'text-damage-thunder',
  acid: 'text-damage-acid', 強酸: 'text-damage-acid', 酸: 'text-damage-acid',
  poison: 'text-damage-poison', 毒素: 'text-damage-poison', 毒: 'text-damage-poison',
  necrotic: 'text-damage-necrotic', 黯蝕: 'text-damage-necrotic', 死靈: 'text-damage-necrotic',
  radiant: 'text-damage-radiant', 光耀: 'text-damage-radiant', 神聖: 'text-damage-radiant',
  psychic: 'text-damage-psychic', 心靈: 'text-damage-psychic', 精神: 'text-damage-psychic',
  force: 'text-damage-force', 力場: 'text-damage-force',
  bludgeoning: 'text-damage-physical', piercing: 'text-damage-physical', slashing: 'text-damage-physical',
  鈍擊: 'text-damage-physical', 穿刺: 'text-damage-physical', 揮砍: 'text-damage-physical',
  劈砍: 'text-damage-physical',
};

export const damageClass = (type: string) =>
  DAMAGE_CLASS[type.toLowerCase().trim()] ?? 'text-gold-dim';
