'use client';

import { useState, type ReactNode } from 'react';

import { EditorSheet } from '@/components/ui/editor-sheet';
import { ParchmentCard } from '@/components/ui/decorations';

/**
 * 建角的選項呈現：**一排會換行的 chip ＋ 選中後的說明卡**，對照 Flutter。
 *
 * 原本每個選項是一張整寬卡片，12 個職業就是 12 列——桌機上要捲三個畫面才看得
 * 完，而且看完最後一個時已經忘記第一個是什麼。改成 chip 後所有選項同時在視野
 * 內，可以左右比較；細節交給下方的說明卡，只在選中時佔版面。
 */

export function OptionChips({
  options,
  selected,
  onSelect,
  ariaLabel,
}: {
  options: { key: string; label: string; suffix?: string }[];
  selected: string | null;
  onSelect: (key: string) => void;
  ariaLabel: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = selected === o.key;
        return (
          <button
            key={o.key}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onSelect(o.key)}
            className={`min-h-11 rounded-chip border px-4 text-[14px] transition-colors ${
              on
                ? 'border-gold bg-gold/15 font-semibold text-gold'
                : 'border-border-2 bg-surface-1 text-text-primary hover:border-gold/50'
            }`}
          >
            {o.label}
            {o.suffix && (
              <span className="font-label ml-1.5 text-[11px] text-text-secondary">
                {o.suffix}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** 說明卡的資料 chip（生命骰 d6、豁免 智力/感知…）。純顯示，不可點。 */
export function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-chip border border-border-2 bg-surface-2 px-2 py-1 text-[11px] text-text-secondary">
      {label}{' '}
      <span className="font-semibold text-text-light">{value}</span>
    </span>
  );
}

/**
 * 可點開的特性 chip。點擊開說明對話框——特性名稱（「黑暗視覺」）對新手是
 * 空詞，把說明藏在選完之後才看得到，等於選的時候只能猜。
 */
export function TraitChip({
  name,
  nameEn,
  description,
}: {
  name: string;
  nameEn?: string;
  description: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-8 rounded-chip border border-gold/40 bg-gold/5 px-2 py-1 text-[11px] text-gold hover:bg-gold/15"
      >
        {name}
        <span aria-hidden className="ml-1 opacity-60">
          ⓘ
        </span>
      </button>
      <EditorSheet
        open={open}
        title={name}
        closeLabel="關閉"
        onClose={() => setOpen(false)}
      >
        {nameEn && (
          <p className="font-label -mt-2 mb-2 text-[11px] text-text-secondary">
            {nameEn}
          </p>
        )}
        <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-text-light">
          {description || '這項特性沒有說明文字。'}
        </p>
      </EditorSheet>
    </>
  );
}

/**
 * 選中項目的說明卡：中英標題 ＋ 描述本文 ＋ 一排資料 chip ＋ （選用）特性 chip。
 */
export function DescCard({
  title,
  titleEn,
  description,
  chips,
  traits,
}: {
  title: string;
  titleEn?: string;
  description?: string;
  chips?: ReactNode;
  traits?: ReactNode;
}) {
  return (
    <ParchmentCard className="mt-3 px-4 py-3">
      <div className="flex items-baseline gap-2">
        <span className="font-display text-[17px] font-bold text-gold">{title}</span>
        {titleEn && (
          <span className="font-label text-[12px] text-text-primary/70">{titleEn}</span>
        )}
      </div>
      {description && (
        <p className="mt-1.5 text-[13px] leading-relaxed text-text-secondary">
          {description}
        </p>
      )}
      {chips && <div className="mt-2.5 flex flex-wrap gap-1.5">{chips}</div>}
      {traits && (
        <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-border/40 pt-2.5">
          {traits}
        </div>
      )}
    </ParchmentCard>
  );
}
