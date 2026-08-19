'use client';

import { useState } from 'react';

import { EditorSheet, FieldLabel } from '@/components/ui/editor-sheet';
import type { CatalogItem } from '@/lib/catalog/types';
import { characterActions, useCharacterStore } from '@/lib/state/character-store';

/**
 * 熟練編輯（語言與工具），對照 Flutter 端的 `showProficiencyEditor`。
 *
 * 語言候選為 App 內建常數（16 種，永遠可用）；工具候選來自內容庫並依
 * subcategory 分組——38 項平鋪會變成難以檢索的 chip 牆。
 *
 * 兩者都保留自由填寫：DM 可能發明戰役專屬的語言或工具，擋掉沒有好處。
 * 內容庫取不到時工具段顯示提示但**不阻擋語言段**，且自由填寫仍可用——
 * 離線時那是唯一的新增途徑。
 */
const LANGUAGES = [
  '通用語', '矮人語', '精靈語', '巨人語', '侏儒語', '地精語', '半身人語',
  '獸人語', '深淵語', '天界語', '深潛語', '龍語', '煉獄語', '原初語',
  '精類語', '地底通用語',
];

const ENTRY_MAX = 20;

export function ProficiencyEditor({
  open,
  onClose,
  tools,
}: {
  open: boolean;
  onClose: () => void;
  /** 內容庫的工具清單；空陣列＝離線。 */
  tools: CatalogItem[];
}) {
  const c = useCharacterStore((s) => s.character);
  const [customLang, setCustomLang] = useState('');
  const [customTool, setCustomTool] = useState('');

  if (!c) return null;

  const grouped = new Map<string, CatalogItem[]>();
  for (const t of tools) {
    const list = grouped.get(t.subcategory) ?? [];
    list.push(t);
    grouped.set(t.subcategory, list);
  }

  return (
    <EditorSheet open={open} title="熟練" onClose={onClose}>
      <FieldLabel>語言</FieldLabel>
      <Selected
        items={c.languages}
        onRemove={(x) => characterActions.removeLanguage(x)}
      />
      <Candidates
        items={LANGUAGES.filter((l) => !c.languages.includes(l))}
        onAdd={(x) => characterActions.addLanguage(x)}
      />
      <FreeText
        value={customLang}
        onChange={setCustomLang}
        placeholder="清單沒有的語言，自行填寫"
        onAdd={() => {
          characterActions.addLanguage(customLang);
          setCustomLang('');
        }}
      />

      <div className="mt-6">
        <FieldLabel>工具</FieldLabel>
        <Selected
          items={c.toolProficiencies}
          onRemove={(x) => characterActions.removeToolProficiency(x)}
        />
        {grouped.size === 0 ? (
          <p className="py-2 text-[12px] text-text-secondary">
            工具清單離線不可用，可用下方欄位自行填寫。
          </p>
        ) : (
          [...grouped.entries()].map(([sub, items]) => (
            <div key={sub}>
              <div className="mb-1 mt-1.5 text-[12px] text-gold-dim">{sub}</div>
              <Candidates
                items={items
                  .map((i) => i.name)
                  .filter((n) => !c.toolProficiencies.includes(n))}
                onAdd={(x) => characterActions.addToolProficiency(x)}
              />
            </div>
          ))
        )}
        <FreeText
          value={customTool}
          onChange={setCustomTool}
          placeholder="清單沒有的工具，自行填寫"
          onAdd={() => {
            characterActions.addToolProficiency(customTool);
            setCustomTool('');
          }}
        />
      </div>
    </EditorSheet>
  );
}

function Selected({
  items,
  onRemove,
}: {
  items: string[];
  onRemove: (x: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="mb-2 flex flex-wrap gap-1.5">
      {items.map((x) => (
        <span
          key={x}
          className="flex items-center rounded-chip border border-gold bg-gold/10 pl-2.5 text-[12px] text-gold"
        >
          {x}
          <button
            type="button"
            onClick={() => onRemove(x)}
            aria-label={`移除 ${x}`}
            className="flex size-9 items-center justify-center"
          >
            ×
          </button>
        </span>
      ))}
    </div>
  );
}

function Candidates({
  items,
  onAdd,
}: {
  items: string[];
  onAdd: (x: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((x) => (
        <button
          key={x}
          type="button"
          onClick={() => onAdd(x)}
          className="min-h-9 rounded-chip border border-border-2 bg-surface-2 px-2.5 text-[12px] text-text-secondary"
        >
          {x}
        </button>
      ))}
    </div>
  );
}

function FreeText({
  value,
  onChange,
  placeholder,
  onAdd,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  onAdd: () => void;
}) {
  return (
    <div className="mt-2 flex gap-2">
      <input
        aria-label={placeholder}
        autoComplete="off"
        spellCheck={false}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onAdd();
          }
        }}
        maxLength={ENTRY_MAX}
        placeholder={placeholder}
        className="min-h-11 flex-1 rounded-chip border border-border bg-surface-2 px-3 text-[13px] text-text-primary"
      />
      <button
        type="button"
        onClick={onAdd}
        aria-label="加入"
        className="min-h-11 min-w-11 rounded-chip border border-border text-gold"
      >
        ＋
      </button>
    </div>
  );
}
