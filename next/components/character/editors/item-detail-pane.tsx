'use client';

import { useState } from 'react';

import { CoinAmount, CoinIcon } from '@/components/character/coins';
import { ftFlattenEntries } from '@/lib/catalog/fivetools';
import type { CatalogItem } from '@/lib/catalog/types';
import { CP_PER_GP, CP_PER_SP } from '@/lib/rules/currency';

/**
 * 目錄品項的詳情面板，對照 Flutter 端 `item_catalog_picker.dart` 的 `_DetailPane`。
 *
 * 取得在這裡完成（數量＋成交單價＋總計＋直接取得／購買），不再另開對話框——
 * 跑團當下議價是常態，成交價常常不等於 SRD 標價，所以單價**可改**。
 *
 * 「直接取得」與「購買」是**兩件事**，不能靠單價是不是 0 自動判斷：DM 發獎勵、
 * 撿戰利品、開場配裝都是有標價卻不該扣錢的情境，只留一顆按鈕會逼使用者先把
 * 單價改成 0 才拿得到東西。
 */

/** 武器精通（2024 SRD 5.2）中文名與一句話效果。 */
const MASTERY_INFO: Record<string, [string, string]> = {
  Cleave: ['劈砍', '命中後可對緊鄰原目標的另一生物再攻擊一次（傷害不加屬性調整值）。'],
  Graze: ['擦傷', '攻擊未命中時，仍造成等同屬性調整值的傷害。'],
  Nick: ['迅斬', '雙持的額外攻擊可併入攻擊動作（每回合一次）。'],
  Push: ['推撞', '命中時可將大型或更小的目標推離 10 呎。'],
  Sap: ['弱化', '命中後目標的下一次攻擊檢定具劣勢。'],
  Slow: ['遲滯', '命中後目標速度 −10 呎，直到你的下回合開始。'],
  Topple: ['擊倒', '命中時可迫使目標進行體質豁免，失敗即陷入倒地。'],
  Vex: ['擾亂', '命中後你對該目標的下一次攻擊檢定具優勢。'],
};

const ARMOR_NOTE: Record<string, string> = {
  light: '輕甲＋敏捷',
  medium: '中甲＋敏捷≤2',
  heavy: '重甲固定',
  shield: '盾牌加值',
};

/**
 * 武器屬性標籤的白話解釋（規則卡用）。
 *
 * 資料庫存的是 5etools 的原字串（`versatile (1d10)`、`thrown (range 20/60)`），
 * 括號內是骰子或射程，取出來才能拼成一句人看得懂的話。
 */
function propertyNote(p: string): string | null {
  const paren = /\((.+)\)/.exec(p)?.[1];
  switch (p.split(' ')[0]) {
    case 'finesse':
      return '靈巧：命中與傷害可取力量或敏捷較高者。';
    case 'versatile':
      return `靈活：雙手持用時傷害改為 ${paren ?? '較高骰'}。`;
    case 'thrown':
      return `投擲：可擲出進行遠程攻擊${paren ? `，射程 ${paren}` : ''}。`;
    case 'light':
      return '輕型：適合雙持。';
    case 'heavy':
      return '重型：小型生物使用時攻擊具劣勢。';
    case 'two-handed':
      return '雙手：攻擊時須雙手持用。';
    case 'reach':
      return '觸及：攻擊距離 +5 呎。';
    case 'ammunition':
      return `彈藥：需消耗彈藥${paren ? `，射程 ${paren}` : ''}。`;
    case 'loading':
      return '裝填：每次行動不論攻擊次數僅能射擊一次。';
    case 'special':
      return '特殊：規則見完整說明。';
    default:
      return null;
  }
}

export function ItemDetailPane({
  item,
  onClose,
  showBack = false,
  onPurchase,
  onAcquire,
}: {
  item: CatalogItem;
  onClose: () => void;
  /** 窄版時詳情取代清單，需要返回鍵。 */
  showBack?: boolean;
  /** 走分層扣款。 */
  onPurchase: (item: CatalogItem, qty: number, unitCp: number) => void;
  /** 不扣錢，直接進物品欄（DM 發獎勵、戰利品、開場配裝）。 */
  onAcquire: (item: CatalogItem, qty: number, unitCp: number) => void;
}) {
  const [qty, setQty] = useState(1);
  const [unitCp, setUnitCp] = useState(item.price_cp ?? 0);
  const [editingPrice, setEditingPrice] = useState(false);

  const mastery = item.mastery?.[0];
  // entries 是 5etools 的巢狀結構，扁平化後才是可讀文字。
  const desc = ftFlattenEntries((item.entries as unknown[]) ?? []);
  const m = mastery ? MASTERY_INFO[mastery] : undefined;

  const stats: [string, React.ReactNode, string][] = [];
  if (item.damage_dice) {
    stats.push([
      '傷害 DAMAGE',
      <Big key="d">{item.damage_dice}</Big>,
      item.damage_type ?? '—',
    ]);
  }
  if (item.ac_base) {
    stats.push([
      'AC',
      <Big key="ac">
        {item.armor_category === 'shield' ? `+${item.ac_base}` : `${item.ac_base}`}
      </Big>,
      ARMOR_NOTE[item.armor_category ?? ''] ?? '',
    ]);
  }
  if (item.weight) {
    stats.push(['重量 WEIGHT', <Big key="w">{`${item.weight} lb`}</Big>, '—']);
  }
  if ((item.price_cp ?? 0) > 0) {
    stats.push([
      '標價 PRICE',
      <CoinAmount key="p" cp={item.price_cp ?? 0} coinSize={16} />,
      'SRD 定價',
    ]);
  }
  if (m && mastery) {
    stats.push(['精通 MASTERY', <Big key="m">{m[0]}</Big>, mastery]);
  }

  const rules: string[] = [];
  if (m && mastery) rules.push(`精通——${m[0]} ${mastery}：${m[1]}`);
  for (const p of item.properties ?? []) {
    const note = propertyNote(p);
    if (note) rules.push(note);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-baseline gap-2 px-4 pb-2 pt-3">
        {showBack && (
          <button
            type="button"
            onClick={onClose}
            aria-label="返回清單"
            className="min-h-9 shrink-0 text-ui text-gold"
          >
            ‹ 返回
          </button>
        )}
        <h3 className="min-w-0 truncate text-[20px] font-semibold text-text-primary">
          {item.name}
        </h3>
        {item.eng_name && (
          <span className="font-label min-w-0 shrink truncate text-ui uppercase text-text-secondary">
            {item.eng_name}
          </span>
        )}
      </div>

      {(item.subcategory || (item.properties?.length ?? 0) > 0 || mastery) && (
        <div className="flex flex-wrap gap-1.5 px-4 pb-1">
          {item.subcategory && <Badge gold>{item.subcategory}</Badge>}
          {(item.properties ?? []).map((p) => (
            <Badge key={p}>{p}</Badge>
          ))}
          {(item.mastery ?? []).map((k) => (
            <Badge key={k}>{`mastery: ${MASTERY_INFO[k]?.[0] ?? k}`}</Badge>
          ))}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3 pt-2">
        {stats.length > 0 && (
          <div className="flex flex-wrap gap-2.5">
            {stats.map(([label, value, note]) => (
              <div
                key={label}
                className="w-32 rounded-card border border-border-2 bg-surface-1 px-2 py-3 text-center"
              >
                <span className="font-label block text-eyebrow tracking-[1.2px] text-section-label">
                  {label}
                </span>
                <span className="mt-1 block text-gold">{value}</span>
                <span className="mt-1 block text-eyebrow leading-snug text-text-secondary">
                  {note || '—'}
                </span>
              </div>
            ))}
          </div>
        )}

        {(rules.length > 0 || desc) && (
          <div className="mt-3 rounded-card border border-border-2 bg-surface-1 p-4">
            <span className="font-label block text-eyebrow tracking-[1.2px] text-section-label">
              規則 RULES
            </span>
            {rules.map((line) => (
              <p key={line} className="mt-2 text-ui leading-relaxed text-text-light">
                {line}
              </p>
            ))}
            {desc && (
              <p className="mt-2 whitespace-pre-wrap text-ui leading-relaxed text-text-light">
                {desc}
              </p>
            )}
          </div>
        )}
      </div>

      {/* 取得面板：數量、成交單價（可改）、總計、直接取得／購買。 */}
      <div className="px-4 pb-4">
        <div className="rounded-card border border-border-2 bg-surface-1 p-4">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <span className="flex items-center gap-1.5">
              <span className="text-ui text-text-secondary">數量</span>
              <Round label="數量減 1" disabled={qty <= 1} onClick={() => setQty(qty - 1)}>
                −
              </Round>
              <span className="font-display w-6 text-center text-[17px] font-bold text-text-primary">
                {qty}
              </span>
              <Round label="數量加 1" disabled={qty >= 99} onClick={() => setQty(qty + 1)}>
                ＋
              </Round>
            </span>

            <span className="flex items-center gap-2">
              <span className="text-ui text-text-secondary">成交單價</span>
              <button
                type="button"
                onClick={() => setEditingPrice((v) => !v)}
                aria-expanded={editingPrice}
                aria-label="修改成交單價"
                className="flex min-h-9 items-center gap-1.5 rounded-lg border border-border bg-surface-0 px-3"
              >
                {unitCp > 0 ? (
                  <CoinAmount cp={unitCp} coinSize={15} />
                ) : (
                  <span className="text-ui text-text-secondary">未定價</span>
                )}
                <span className="text-small text-text-secondary" aria-hidden>
                  ✎
                </span>
              </button>
            </span>
          </div>

          {editingPrice && (
            <PriceEditor
              cp={unitCp}
              onDone={(v) => {
                setUnitCp(v);
                setEditingPrice(false);
              }}
            />
          )}

          <div className="my-3 h-px bg-border-2" />

          <div className="flex items-center">
            <span className="text-ui text-text-secondary">總計</span>
            <CoinAmount
              cp={unitCp * qty}
              coinSize={18}
              className="ml-auto text-gold"
              textClassName="text-[20px]"
            />
          </div>

          <div className="mt-3 flex gap-3">
            <button
              type="button"
              onClick={() => onAcquire(item, qty, unitCp)}
              className="min-h-11 flex-1 rounded-chip border border-border text-body text-text-primary"
            >
              直接取得
            </button>
            <button
              type="button"
              onClick={() => onPurchase(item, qty, unitCp)}
              className="min-h-11 flex-1 rounded-chip bg-gold-solid text-body font-bold text-[#1A1206]"
            >
              購買
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 單價編輯：數字 ＋ 幣別。
 *
 * 內部一律以 cp 儲存，但**輸入不能只收 cp**——目錄裡多數東西標價是 gp，
 * 要人把 15gp 心算成 1500 才打得進去。開啟時挑能整除的最大單位帶入。
 */
function PriceEditor({ cp, onDone }: { cp: number; onDone: (cp: number) => void }) {
  const initial: ['cp' | 'sp' | 'gp', number] =
    cp > 0 && cp % CP_PER_GP === 0
      ? ['gp', cp / CP_PER_GP]
      : cp > 0 && cp % CP_PER_SP === 0
        ? ['sp', cp / CP_PER_SP]
        : ['cp', cp];
  const [unit, setUnit] = useState(initial[0]);
  const [draft, setDraft] = useState(initial[1] > 0 ? `${initial[1]}` : '');

  const per = unit === 'gp' ? CP_PER_GP : unit === 'sp' ? CP_PER_SP : 1;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface-0 p-2">
      <input
        aria-label="成交單價金額"
        autoComplete="off"
        inputMode="numeric"
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="金額…"
        className="min-h-9 w-24 rounded-lg border border-border bg-surface-1 px-2 text-body text-text-primary"
      />
      <span className="flex gap-1">
        {(['cp', 'sp', 'gp'] as const).map((u) => (
          <button
            key={u}
            type="button"
            onClick={() => setUnit(u)}
            aria-pressed={unit === u}
            className={`flex min-h-9 items-center gap-1 rounded-lg border px-2.5 text-ui ${
              unit === u
                ? 'border-gold text-gold'
                : 'border-border text-text-secondary'
            }`}
          >
            <CoinIcon code={u} size={15} />
            {u}
          </button>
        ))}
      </span>
      <button
        type="button"
        onClick={() => onDone(Math.max(0, (Number.parseInt(draft, 10) || 0) * per))}
        className="ml-auto min-h-9 rounded-lg border border-gold px-3 text-ui text-gold"
      >
        完成
      </button>
    </div>
  );
}

function Badge({ children, gold = false }: { children: string; gold?: boolean }) {
  return (
    <span
      className={`rounded px-2.5 py-1 text-tiny ${
        gold ? 'border border-gold text-gold' : 'border border-border text-text-light'
      }`}
    >
      {children}
    </span>
  );
}

function Big({ children }: { children: React.ReactNode }) {
  return <span className="font-display text-[18px] font-bold">{children}</span>;
}

function Round({
  label,
  onClick,
  disabled = false,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex size-8 items-center justify-center rounded-full border border-border text-ui text-text-primary disabled:opacity-40"
    >
      {children}
    </button>
  );
}
