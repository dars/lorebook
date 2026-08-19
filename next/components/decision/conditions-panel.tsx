'use client';

import { useState } from 'react';

import { EditorSheet } from '@/components/ui/editor-sheet';
import type { Character } from '@/lib/domain/character';
import { CONDITIONS, conditionByName } from '@/lib/rules/conditions';
import { characterActions } from '@/lib/state/character-store';

/**
 * 狀態異常區，對照 Flutter 端 `status_section.dart` 的異常狀態區塊與選單。
 *
 * 區塊本身可點開選單；chip 自身的移除與「看說明」不觸發選單。
 * 力竭是唯一的累進狀態（0–6），因此在選單裡走 −/＋ 而非勾選。
 */
export function ConditionsPanel({ c, readOnly = false }: { c: Character; readOnly?: boolean }) {
  const [picker, setPicker] = useState(false);
  const [detail, setDetail] = useState<string | null>(null);

  const hasAny = c.conditions.length > 0 || c.exhaustionLevel > 0;
  const info = detail ? conditionByName(detail) : null;

  return (
    <>
      <div className="py-0.5">
        <button
          type="button"
          onClick={() => !readOnly && setPicker(true)}
          disabled={readOnly}
          className="flex w-full items-center text-left"
        >
          <span className="text-[12px] text-section-label" aria-hidden>
            ⚠
          </span>
          <span className="ml-1.5 text-[12px] text-gold-dim">狀態異常・CONDITIONS</span>
        </button>

        {!hasAny ? (
          <p className="mt-1.5 text-[12px] text-text-secondary">
            目前無異常狀態{readOnly ? '' : '，點這裡新增'}
          </p>
        ) : (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {c.conditions.map((name) => (
              <Chip
                key={name}
                label={name}
                onTap={() => setDetail(name)}
                onRemove={readOnly ? undefined : () => characterActions.toggleCondition(name)}
              />
            ))}
            {c.exhaustionLevel > 0 && (
              <Chip
                label={`力竭 ${c.exhaustionLevel}`}
                onTap={() => setDetail('力竭')}
                onRemove={readOnly ? undefined : () => characterActions.setExhaustion(0)}
              />
            )}
          </div>
        )}
      </div>

      <EditorSheet
        open={picker}
        title="異常狀態"
        onClose={() => setPicker(false)}
        onSave={() => setPicker(false)}
      >
        <div className="flex flex-col">
          {CONDITIONS.map((cond) =>
            cond.leveled ? (
              <div
                key={cond.nameEn}
                className="flex items-center gap-3 border-b border-border/40 py-2.5"
              >
                <span className="min-w-0 flex-1">
                  <span className="text-[14px] text-text-primary">
                    {cond.name}　{cond.nameEn}
                  </span>
                  <span className="block text-[12px] leading-relaxed text-text-secondary">
                    {cond.effect}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <Step label="力竭減 1" onClick={() => characterActions.setExhaustion(c.exhaustionLevel - 1)}>
                    −
                  </Step>
                  <span className="font-display w-4 text-center text-[15px] font-bold text-gold">
                    {c.exhaustionLevel}
                  </span>
                  <Step label="力竭加 1" onClick={() => characterActions.setExhaustion(c.exhaustionLevel + 1)}>
                    ＋
                  </Step>
                </span>
              </div>
            ) : (
              <label
                key={cond.nameEn}
                className="flex cursor-pointer items-start gap-3 border-b border-border/40 py-2.5"
              >
                <input
                  type="checkbox"
                  checked={c.conditions.includes(cond.name)}
                  onChange={() => characterActions.toggleCondition(cond.name)}
                  className="mt-1 size-4 shrink-0 accent-[#c9a84c]"
                />
                <span className="min-w-0">
                  <span className="text-[14px] text-text-primary">
                    {cond.name}　{cond.nameEn}
                  </span>
                  <span className="block text-[12px] leading-relaxed text-text-secondary">
                    {cond.effect}
                  </span>
                </span>
              </label>
            ),
          )}
        </div>
      </EditorSheet>

      <EditorSheet
        open={info !== null}
        title={info ? `${info.name}　${info.nameEn}` : ''}
        onClose={() => setDetail(null)}
        onSave={() => setDetail(null)}
      >
        <p className="text-[14px] leading-relaxed text-text-light">{info?.effect}</p>
      </EditorSheet>
    </>
  );
}

function Chip({
  label,
  onTap,
  onRemove,
}: {
  label: string;
  onTap: () => void;
  /** undefined＝唯讀：不渲染移除鈕（狀態仍可點開看說明）。 */
  onRemove?: () => void;
}) {
  return (
    <span className="inline-flex items-center rounded-chip border border-border-2 bg-surface-2 pl-2.5">
      <button type="button" onClick={onTap} className="py-1 text-[12px] text-text-primary">
        {label}
      </button>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`移除 ${label}`}
          className="px-2 py-1 text-[12px] text-text-secondary"
        >
          ×
        </button>
      )}
    </span>
  );
}

function Step({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex size-8 items-center justify-center rounded-full border border-border text-[13px] text-text-primary"
    >
      {children}
    </button>
  );
}
