'use client';

import { useState } from 'react';

import { EditorSheet, FieldLabel } from '@/components/ui/editor-sheet';
import { characterActions, useCharacterStore } from '@/lib/state/character-store';

/**
 * 基本資訊編輯，對照 Flutter 端的 `_showBasicInfoEditor`。
 *
 * **僅開放扮演資訊**（名稱、陣營、信仰）。物種、生物類型、體型、背景是建角
 * 決定的規則資料，改了會與已推導的數值不一致，維持唯讀。
 *
 * 陣營用九宮選單而非自由填空——「開軌道選單不開自由填空」的原則。
 */
const ALIGNMENTS: [string, string][] = [
  ['守序善良', 'Lawful Good'],
  ['中立善良', 'Neutral Good'],
  ['混亂善良', 'Chaotic Good'],
  ['守序中立', 'Lawful Neutral'],
  ['絕對中立', 'True Neutral'],
  ['混亂中立', 'Chaotic Neutral'],
  ['守序邪惡', 'Lawful Evil'],
  ['中立邪惡', 'Neutral Evil'],
  ['混亂邪惡', 'Chaotic Evil'],
];

export function BasicInfoEditor({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const c = useCharacterStore((s) => s.character);
  const [name, setName] = useState(c?.name ?? '');
  const [alignment, setAlignment] = useState(c?.alignment ?? '');
  const [deity, setDeity] = useState(c?.deity ?? '');

  if (!c) return null;

  const save = () => {
    const found = ALIGNMENTS.find(([cn]) => cn === alignment);
    characterActions.setBasicInfo({
      name: name.trim(),
      alignment,
      alignmentEn: found?.[1] ?? '',
      deity: deity.trim(),
    });
    onClose();
  };

  return (
    <EditorSheet
      open={open}
      title="基本資訊"
      onClose={onClose}
      onSave={save}
      saveEnabled={name.trim().length > 0}
    >
      <FieldLabel>名稱</FieldLabel>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={30}
        className="min-h-11 w-full rounded-chip border border-border bg-surface-2 px-3 text-[14px] text-text-primary"
      />

      <FieldLabel>
        <span className="mt-4 block">陣營</span>
      </FieldLabel>
      <div className="grid grid-cols-3 gap-1.5">
        {ALIGNMENTS.map(([cn]) => (
          <button
            key={cn}
            type="button"
            onClick={() => setAlignment(cn)}
            className={`min-h-11 rounded-chip border text-[12px] ${
              alignment === cn
                ? 'border-gold bg-gold/10 text-gold'
                : 'border-border-2 text-text-secondary'
            }`}
          >
            {cn}
          </button>
        ))}
      </div>

      <div className="mt-4">
        <FieldLabel>信仰</FieldLabel>
        <input
          value={deity}
          onChange={(e) => setDeity(e.target.value)}
          maxLength={20}
          placeholder="無特定信仰可留空"
          className="min-h-11 w-full rounded-chip border border-border bg-surface-2 px-3 text-[14px] text-text-primary"
        />
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-text-secondary">
        物種、生物類型、體型與背景是建角時決定的規則資料，會影響已推導的數值，
        因此不開放修改。
      </p>
    </EditorSheet>
  );
}
