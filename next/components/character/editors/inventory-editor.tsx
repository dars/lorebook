'use client';

import { useState } from 'react';

import { EditorSheet, FieldLabel } from '@/components/ui/editor-sheet';
import type { CatalogItem } from '@/lib/catalog/types';
import type { Character, Equipment } from '@/lib/domain/character';
import { formatCp, payFrom, totalCp } from '@/lib/rules/currency';
import { characterActions, useCharacterStore } from '@/lib/state/character-store';

/**
 * 物品取得與財富編輯。
 *
 * 購買走 `payFrom` 的分層扣款——與 Flutter 同一套規則，也是 golden 對照過的
 * 那一套。付不起時**不扣款也不加物品**，並明確顯示還差多少。
 */
const CATEGORY_LABEL: Record<string, string> = {
  weapon: '武器',
  armor: '護甲',
  gear: '冒險裝備',
  tool: '工具',
};

export function InventoryEditor({
  open,
  onClose,
  catalog,
}: {
  open: boolean;
  onClose: () => void;
  catalog: CatalogItem[];
}) {
  const c = useCharacterStore((s) => s.character);
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  if (!c) return null;

  // 「再次取得」：物品欄中來源為目錄的品項，供高頻重複購買（箭矢、藥水、
  // 口糧）快速再購。由物品欄即時推導，不另存記錄。
  const repeat = catalog.filter((i) =>
    c.equipment.some((e) => e.source === 'catalog' && e.catalogRef === i.name),
  );

  const q = query.trim();
  const matched = q
    ? catalog.filter(
        (i) =>
          i.name.includes(q) ||
          (i.eng_name ?? '').toLowerCase().includes(q.toLowerCase()),
      )
    : [];

  const buy = (item: CatalogItem) => {
    const price = item.price_cp ?? 0;
    const r = payFrom(c.currency, price);
    if (!r.ok) {
      setMessage(`財富不足，還差 ${formatCp(r.shortfallCp)}`);
      return;
    }
    characterActions.setCurrency(r.remaining);
    characterActions.addItem(toEquipment(item));
    setMessage(`已取得 ${item.name}${price > 0 ? `（-${formatCp(price)}）` : ''}`);
  };

  return (
    <EditorSheet open={open} title="取得物品" onClose={onClose}>
      <div className="mb-3 flex items-baseline justify-between">
        <span className="text-[12px] text-text-secondary">目前財富</span>
        <span className="text-[14px] text-gold">{formatCp(totalCp(c.currency))}</span>
      </div>

      {message && (
        <p className="mb-3 rounded-chip border border-border-2 px-3 py-2 text-[12px] text-text-light">
          {message}
        </p>
      )}

      {catalog.length === 0 ? (
        <p className="text-[12px] text-text-secondary">
          內容庫離線不可用，暫時無法自目錄取得物品。
        </p>
      ) : (
        <>
          {repeat.length > 0 && !q && (
            <>
              <FieldLabel>再次取得</FieldLabel>
              <ItemList items={repeat} onBuy={buy} />
              <div className="my-3 h-px bg-border/40" />
            </>
          )}

          <FieldLabel>搜尋</FieldLabel>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="中文或英文名稱"
            className="min-h-11 w-full rounded-chip border border-border bg-surface-2 px-3 text-[14px] text-text-primary"
          />
          {q && (
            <div className="mt-2">
              {matched.length === 0 ? (
                <p className="text-[12px] text-text-secondary">找不到符合的品項。</p>
              ) : (
                <ItemList items={matched.slice(0, 40)} onBuy={buy} />
              )}
            </div>
          )}
        </>
      )}
    </EditorSheet>
  );
}

function ItemList({
  items,
  onBuy,
}: {
  items: CatalogItem[];
  onBuy: (i: CatalogItem) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {items.map((i) => (
        <button
          key={i.id}
          type="button"
          onClick={() => onBuy(i)}
          className="flex min-h-11 items-center gap-2 rounded-card border border-border-2 px-3 text-left"
        >
          <span className="min-w-0 flex-1">
            <span className="text-[13px] text-text-primary">{i.name}</span>
            <span className="font-label ml-1.5 text-[11px] text-text-primary/40">
              {i.eng_name}
            </span>
            <span className="ml-1.5 text-[11px] text-section-label">
              {CATEGORY_LABEL[i.category] ?? i.category}
            </span>
          </span>
          <span className="shrink-0 text-[12px] text-gold">
            {i.price_cp === null ? '—' : formatCp(i.price_cp)}
          </span>
        </button>
      ))}
    </div>
  );
}

/** 目錄品項 → 角色物品。保留 catalogRef 供「再次取得」與詳情回查。 */
function toEquipment(i: CatalogItem): Equipment {
  return {
    name: i.name,
    nameEn: i.eng_name ?? '',
    type: '',
    description: '',
    equipped: false,
    itemType:
      i.category === 'weapon'
        ? 'weapon'
        : i.category === 'armor'
          ? 'armor'
          : 'gear',
    source: 'catalog',
    quantity: 1,
    quest: false,
    priceCp: i.price_cp ?? 0,
    catalogRef: i.name,
    damage: i.damage_dice ?? '',
    damageType: i.damage_type ?? '',
    finesse: i.properties.some((p) => p.toLowerCase().includes('finesse')),
    properties: i.properties,
    armorCategory:
      i.armor_category === 'light' ||
      i.armor_category === 'medium' ||
      i.armor_category === 'heavy' ||
      i.armor_category === 'shield'
        ? i.armor_category
        : 'none',
    acBase: i.ac_base ?? 0,
  };
}

/** 財富編輯：直接改各幣別數量。 */
export function CurrencyEditor({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const c = useCharacterStore((s) => s.character);
  const [v, setV] = useState<Character['currency'] | null>(null);
  const cur = v ?? c?.currency ?? { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 };

  if (!c) return null;

  return (
    <EditorSheet
      open={open}
      title="財富"
      onClose={() => {
        setV(null);
        onClose();
      }}
      onSave={() => {
        characterActions.setCurrency(cur);
        setV(null);
        onClose();
      }}
    >
      <div className="flex flex-col gap-2">
        {(['pp', 'gp', 'ep', 'sp', 'cp'] as const).map((k) => (
          <div key={k} className="flex items-center gap-3">
            <span className="font-label w-8 text-[12px] text-section-label">
              {k}
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={cur[k]}
              onChange={(e) =>
                setV({ ...cur, [k]: Math.max(0, Number(e.target.value) || 0) })
              }
              className="min-h-11 flex-1 rounded-chip border border-border bg-surface-2 px-3 text-[14px] text-text-primary"
            />
          </div>
        ))}
      </div>
      <p className="mt-3 text-[12px] text-text-secondary">
        合計 {formatCp(totalCp(cur))}
      </p>
    </EditorSheet>
  );
}
