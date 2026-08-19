'use client';

import { useId, useState } from 'react';

import { EditorSheet, FieldLabel } from '@/components/ui/editor-sheet';
import type { Equipment } from '@/lib/domain/character';

/**
 * 自訂物品編輯，對照 Flutter 端的 `item_editor_sheet.dart`。
 *
 * 機制欄位依 itemType 顯示：武器出傷害骰／傷害類型／靈巧，護甲出 AC 基值與
 * 種類。**缺值時不參與推導**——填一半的護甲不會讓 AC 變成 NaN，只是不算它。
 *
 * 任務物品（quest）是一個旗標而非型別：刪除需確認、用罄保留、不可販售。
 */
/** 值存英文碼（與內容庫一致），顯示用規則書中文譯名。 */
const DAMAGE_TYPES: [string, string][] = [
  ['bludgeoning', '鈍擊'], ['piercing', '穿刺'], ['slashing', '劈砍'],
  ['fire', '火焰'], ['cold', '寒冰'], ['lightning', '閃電'], ['thunder', '轟雷'],
  ['acid', '強酸'], ['poison', '毒素'], ['necrotic', '黯蝕'],
  ['radiant', '光耀'], ['psychic', '心靈'], ['force', '力場'],
];

const ITEM_TYPES: { v: Equipment['itemType']; label: string }[] = [
  { v: 'weapon', label: '武器' },
  { v: 'armor', label: '護甲' },
  { v: 'gear', label: '裝備' },
  { v: 'consumable', label: '消耗品' },
];

const ARMOR_CATEGORIES: { v: Equipment['armorCategory']; label: string }[] = [
  { v: 'light', label: '輕甲' },
  { v: 'medium', label: '中甲' },
  { v: 'heavy', label: '重甲' },
  { v: 'shield', label: '盾牌' },
];

export const emptyItem = (): Equipment => ({
  name: '', nameEn: '', type: '', description: '', equipped: false,
  itemType: 'gear', source: 'custom', quantity: 1, quest: false,
  priceCp: 0, catalogRef: '', damage: '', damageType: '', finesse: false,
  properties: [], armorCategory: 'none', acBase: 0,
});

export function ItemEditor({
  open,
  initial,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean;
  /** null＝新增。 */
  initial: Equipment | null;
  onClose: () => void;
  onSave: (item: Equipment) => void;
  /** 省略＝新增模式，不顯示刪除入口。 */
  onDelete?: () => void;
}) {
  const [v, setV] = useState<Equipment | null>(null);
  const item = v ?? initial ?? emptyItem();
  const set = <K extends keyof Equipment>(k: K, val: Equipment[K]) =>
    setV({ ...item, [k]: val });

  const uid = useId();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const problem = !item.name.trim() ? '名稱必填' : null;

  const close = () => {
    setV(null);
    onClose();
  };

  return (
    <EditorSheet
      open={open}
      title={initial ? '編輯物品' : '自訂物品'}
      onClose={close}
      onSave={() => {
        if (problem) return;
        onSave({ ...item, name: item.name.trim() });
        setV(null);
      }}
      saveEnabled={problem === null}
    >
      <FieldLabel htmlFor={`${uid}-name`}>名稱（必填）</FieldLabel>
      <input
        id={`${uid}-name`}
        name="itemName"
        autoComplete="off"
        spellCheck={false}
        value={item.name}
        onChange={(e) => set('name', e.target.value)}
        maxLength={40}
        className="min-h-11 w-full rounded-chip border border-border bg-surface-2 px-3 text-[14px] text-text-primary"
      />

      <div className="mt-3">
        <FieldLabel htmlFor={`${uid}-name-en`}>英文名（可留空）</FieldLabel>
        <input
          id={`${uid}-name-en`}
          name="itemNameEn"
          autoComplete="off"
          spellCheck={false}
          value={item.nameEn}
          onChange={(e) => set('nameEn', e.target.value)}
          placeholder="Item name（可留空）"
          maxLength={40}
          className="min-h-11 w-full rounded-chip border border-border bg-surface-2 px-3 text-[14px] text-text-primary"
        />
      </div>

      <div className="mt-4">
        <FieldLabel>類型</FieldLabel>
        <div className="grid grid-cols-4 gap-1.5">
          {ITEM_TYPES.map((t) => (
            <button
              key={t.v}
              type="button"
              onClick={() => set('itemType', t.v)}
              className={`min-h-11 rounded-chip border text-[12px] ${
                item.itemType === t.v
                  ? 'border-gold bg-gold/10 text-gold'
                  : 'border-border-2 text-text-secondary'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <FieldLabel>數量</FieldLabel>
        <span className="ml-auto flex items-center gap-3">
          <Step label="數量減 1" onClick={() => set('quantity', Math.max(1, item.quantity - 1))}>
            −
          </Step>
          <span className="font-display w-6 text-center text-[16px] font-bold text-gold">
            {item.quantity}
          </span>
          <Step label="數量加 1" onClick={() => set('quantity', item.quantity + 1)}>
            ＋
          </Step>
        </span>
      </div>

      {item.itemType === 'weapon' && (
        <div className="mt-4">
          <FieldLabel htmlFor={`${uid}-damage`}>武器機制</FieldLabel>
          <input
            id={`${uid}-damage`}
            name="damage"
            autoComplete="off"
            spellCheck={false}
            value={item.damage}
            onChange={(e) => set('damage', e.target.value)}
            placeholder="傷害骰（選填，如 1d8）"
            className="min-h-11 w-full rounded-chip border border-border bg-surface-2 px-3 text-[14px] text-text-primary"
          />
          <div className="mt-2">
            <span className="mb-1 block text-[12px] text-text-secondary">傷害類型</span>
            <div className="flex flex-wrap gap-1.5">
              {DAMAGE_TYPES.map(([code, label]) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => set('damageType', item.damageType === code ? '' : code)}
                  className={`min-h-9 rounded-chip border px-2.5 text-[12px] ${
                    item.damageType === code
                      ? 'border-gold bg-gold/10 text-gold'
                      : 'border-border-2 text-text-secondary'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <label className="mt-3 flex cursor-pointer items-start gap-2">
            <input
              type="checkbox"
              checked={item.finesse}
              onChange={(e) => set('finesse', e.target.checked)}
              className="mt-1 size-4 accent-[#c9a84c]"
            />
            <span className="text-[12px] leading-relaxed text-text-light">
              靈巧（finesse）：命中/傷害取力量或敏捷較高者
            </span>
          </label>
        </div>
      )}

      {item.itemType === 'armor' && (
        <div className="mt-4">
          <FieldLabel>護甲機制</FieldLabel>
          <div className="grid grid-cols-4 gap-1.5">
            {ARMOR_CATEGORIES.map((a) => (
              <button
                key={a.v}
                type="button"
                onClick={() => set('armorCategory', a.v)}
                className={`min-h-11 rounded-chip border text-[12px] ${
                  item.armorCategory === a.v
                    ? 'border-gold bg-gold/10 text-gold'
                    : 'border-border-2 text-text-secondary'
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
          <input
            type="number"
            inputMode="numeric"
            name="acBase"
            // 這欄的小標是整組「護甲機制」的標題，不專屬於它，因此自帶名稱。
            aria-label={item.armorCategory === 'shield' ? 'AC 加值' : 'AC 基值'}
            value={item.acBase || ''}
            onChange={(e) => set('acBase', Number(e.target.value) || 0)}
            placeholder={
              item.armorCategory === 'shield'
                ? '加值（盾牌通常 2）'
                : 'AC 基值（如輕甲 11、重甲 16）'
            }
            className="mt-2 min-h-11 w-full rounded-chip border border-border bg-surface-2 px-3 text-[14px] text-text-primary"
          />
          <p className="mt-1 text-[12px] text-text-secondary">缺值時不參與 AC 推導。</p>
        </div>
      )}

      <div className="mt-4">
        <FieldLabel htmlFor={`${uid}-desc`}>敘述（選填）</FieldLabel>
        <textarea
          id={`${uid}-desc`}
          name="description"
          value={item.description}
          onChange={(e) => set('description', e.target.value)}
          rows={3}
          maxLength={300}
          className="w-full rounded-card border border-border bg-surface-2 p-2 text-[13px] text-text-primary"
        />
      </div>

      <label className="mt-4 flex cursor-pointer items-start gap-2">
        <input
          type="checkbox"
          checked={item.quest}
          onChange={(e) => set('quest', e.target.checked)}
          className="mt-1 size-4 accent-[#c9a84c]"
        />
        <span className="text-[12px] leading-relaxed text-text-light">
          任務物品
          <span className="block text-[12px] text-text-secondary">
            刪除需確認、用罄保留、不可販售
          </span>
        </span>
      </label>

      {problem && (
        <p role="alert" className="mt-3 text-[12px] text-danger">
          {problem}
        </p>
      )}

      {/* 刪除放在這裡而不是物品列上：列上一次只該有一個當下相關的控制項，
          而最不可逆的動作不該在那裡待命。進得來這個面板，代表使用者已經
          明確選了這一件。 */}
      {onDelete && (
        <div className="mt-6 border-t border-border/40 pt-4">
          {confirmingDelete ? (
            <div className="rounded-card border border-danger p-3">
              <p className="text-[12px] leading-relaxed text-text-light">
                {item.quest
                  ? `「${item.name}」是任務物品，可能還有劇情用途。`
                  : `「${item.name}」將自物品欄移除。`}
                <span className="block text-text-secondary">此操作無法復原。</span>
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  className="min-h-11 flex-1 rounded-chip border border-border text-[13px] text-text-secondary"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDelete();
                    setConfirmingDelete(false);
                  }}
                  className="min-h-11 flex-1 rounded-chip border border-danger bg-danger/10 text-[13px] font-bold text-danger"
                >
                  確定刪除
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="min-h-11 w-full rounded-chip border border-border-2 text-[13px] text-danger hover:border-danger"
            >
              刪除這件物品
            </button>
          )}
        </div>
      )}
    </EditorSheet>
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
