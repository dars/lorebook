'use client';

import { useId, useState } from 'react';

import { EditorSheet, FieldLabel } from '@/components/ui/editor-sheet';
import { ALIGNMENTS, alignmentEnFor } from '@/lib/creation/alignments';
import { characterActions, useCharacterStore } from '@/lib/state/character-store';

/**
 * 基本資訊編輯，對照 Flutter 端的 `_showBasicInfoEditor`。
 *
 * **僅開放扮演資訊**（名稱、陣營、信仰）。物種、生物類型、體型、背景是建角
 * 決定的規則資料，改了會與已推導的數值不一致，維持唯讀。
 */

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
  const uid = useId();

  if (!c) return null;

  const save = () => {
    characterActions.setBasicInfo({
      name: name.trim(),
      alignment,
      alignmentEn: alignmentEnFor(alignment),
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
      <FieldLabel htmlFor={`${uid}-name`}>名稱</FieldLabel>
      <input
        id={`${uid}-name`}
        name="characterName"
        // 角色名是虛構專有名詞：拼字檢查只會滿篇紅線，密碼管理器也不該來認領。
        autoComplete="off"
        spellCheck={false}
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

        {/* 陣營參考測驗（外部站，另開分頁）。九陣營對新手是最難選的一欄，
            給一條出路比讓他隨便填好。 */}
        <a
          href="https://alignment-compass.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1.5 inline-flex min-h-9 items-center text-[12px] text-gold"
        >
          <span className="mr-1" aria-hidden>↗</span>
          不確定選哪個？做個陣營羅盤測驗
        </a>

      <div className="mt-4">
        <FieldLabel htmlFor={`${uid}-deity`}>信仰</FieldLabel>
        <input
          id={`${uid}-deity`}
          name="deity"
          autoComplete="off"
          spellCheck={false}
          value={deity}
          onChange={(e) => setDeity(e.target.value)}
          maxLength={20}
          placeholder="無特定信仰可留空"
          className="min-h-11 w-full rounded-chip border border-border bg-surface-2 px-3 text-[14px] text-text-primary"
        />
      </div>

      <p className="mt-4 text-[12px] leading-relaxed text-text-secondary">
        物種、生物類型、體型與背景是建角時決定的規則資料，會影響已推導的數值，
        因此不開放修改。
      </p>
    </EditorSheet>
  );
}
