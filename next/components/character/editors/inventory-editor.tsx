'use client';
import { toEquipment } from '@/lib/items/from-catalog';

import { useEffect, useId, useState } from 'react';

import { EditorSheet, FieldLabel } from '@/components/ui/editor-sheet';
import type { CatalogItem } from '@/lib/catalog/types';
import { payFrom, totalCp } from '@/lib/rules/currency';
import { useContainerWidth } from '@/lib/hooks/use-container-width';
import { CoinAmount } from '../coins';
import { ItemDetailPane } from './item-detail-pane';
import { characterActions, useCharacterStore } from '@/lib/state/character-store';

/**
 * 物品取得（購買扣款走 currency_math 的分層扣款）。財富的加減在
 * `currency-calculator.tsx`。
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

/**
 * 成交結果。
 *
 * 成功與失敗**必須長得不一樣**：兩者都印一行同色小字的話，使用者得逐字讀完
 * 才知道錢有沒有出去。這裡用色彩＋圖示分辨，並且一律附上金額明細——
 * 「剩餘多少」才是「我到底有沒有付錢」的直接答案。
 */
type Feedback = {
  kind: 'ok' | 'error';
  title: string;
  note?: string;
  /** [說明, cp] —— 以 CoinAmount 呈現，不用純文字幣別。 */
  rows: [string, number][];
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
  const [category, setCategory] = useState<string | null>(null);
  const [selected, setSelected] = useState<CatalogItem | null>(null);
  // 主從式需要左右都夠寬（左 360 ＋ 右 ≥340）。門檻量的是**面板自己**的寬度，
  // 不是視窗——面板限寬 1100，視窗再寬也不代表這裡有 700。
  const [paneRef, paneWidth] = useContainerWidth();
  const wide = paneWidth >= 700;
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const uid = useId();

  // 成功訊息會自己消失：留著不退場的話，三十秒前那句「已購買」看起來就像是
  // 剛才那一下的結果。每次都是新物件，連買同一件也會重新計時。
  //
  // **失敗不自動消失**——那是一件還沒解決的事（錢不夠，得改數量或改價），
  // 訊息在使用者處理它之前就自己不見，等於逼人重按一次才知道剛剛發生什麼。
  useEffect(() => {
    if (feedback?.kind !== 'ok') return;
    const t = setTimeout(() => setFeedback(null), 8000);
    return () => clearTimeout(t);
  }, [feedback]);

  if (!c) return null;

  const q = query.trim();
  // 清單**永遠顯示**（依類別分頁），搜尋只是再過濾一次——
  // 不打字就看不到任何東西的話，使用者得先知道有什麼才找得到。
  const filtered = catalog
    .filter((i) => (category === null ? true : i.category === category))
    .filter(
      (i) =>
        !q ||
        i.name.includes(q) ||
        (i.eng_name ?? '').toLowerCase().includes(q.toLowerCase()),
    );

  // 「再次取得」：物品欄中來源為目錄的品項，供高頻重複購買（箭矢、藥水、
  // 口糧）快速再購。由物品欄即時推導，不另存記錄。
  //
  // 比對鍵必須跟 `toEquipment` 寫進 catalogRef 的值**同一條式子**——寫的是
  // `eng_name ?? name`、讀的卻拿 `name` 去比，結果是有英文名的品項（幾乎全部）
  // 永遠配不到，這區就一直空著。
  const owned = new Set(
    c.equipment.filter((e) => e.source === 'catalog').map((e) => e.catalogRef),
  );
  const repeat = filtered.filter((i) => owned.has(i.eng_name ?? i.name));

  // 依子分類分組；只有一組時不出標題（一個標題底下全部品項是雜訊）。
  const groups = new Map<string, CatalogItem[]>();
  for (const i of filtered) {
    const key = i.subcategory || CATEGORY_LABEL[i.category] || i.category;
    const list = groups.get(key);
    if (list) list.push(i);
    else groups.set(key, [i]);
  }
  const showHeaders = groups.size > 1;

  // 成交後**不清空選取**：買完東西整個右欄變回「選擇左側條目」，畫面上唯一
  // 變化就是一行小字，看起來跟沒反應一樣；何況連買（三瓶藥水、再來一綑箭）
  // 是常態，留在原地才接得下去。
  const purchase = (item: CatalogItem, qty: number, unitCp: number) => {
    const total = unitCp * qty;
    const r = payFrom(c.currency, total);
    if (!r.ok) {
      setFeedback({
        kind: 'error',
        title: `買不起「${item.name}」×${qty}`,
        rows: [
          ['需要', total],
          ['你有', totalCp(c.currency)],
          ['還差', r.shortfallCp],
        ],
      });
      return;
    }
    characterActions.setCurrency(r.remaining);
    characterActions.addItem({ ...toEquipment(item), quantity: qty, priceCp: unitCp });
    setFeedback({
      kind: 'ok',
      title: `已購買「${item.name}」×${qty}`,
      rows: [
        ['支出', total],
        ['剩餘', totalCp(r.remaining)],
      ],
    });
  };

  // 不扣錢的取得：DM 發獎勵、戰利品、開場配裝。仍記下成交單價，之後賣出或
  // 估值時才知道這件東西值多少。
  const acquire = (item: CatalogItem, qty: number, unitCp: number) => {
    characterActions.addItem({ ...toEquipment(item), quantity: qty, priceCp: unitCp });
    setFeedback({
      kind: 'ok',
      title: `已取得「${item.name}」×${qty}`,
      note: '未扣款',
      rows: [['財富不變', totalCp(c.currency)]],
    });
  };

  // 換一個品項＝上一筆成交的結果已經不是現在在看的東西，留著只會誤導。
  const select = (i: CatalogItem | null) => {
    setFeedback(null);
    setSelected(i);
  };

  const listPane = (
    <>
          {repeat.length > 0 && !q && (
            <>
              <FieldLabel>再次取得</FieldLabel>
              <ItemList items={repeat} onSelect={select} />
              <div className="my-3 h-px bg-border/40" />
            </>
          )}

          <FieldLabel htmlFor={`${uid}-search`}>搜尋</FieldLabel>
          <input
            id={`${uid}-search`}
            type="search"
            name="itemQuery"
            autoComplete="off"
            spellCheck={false}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜尋物品（中／英文名稱）…"
            className="min-h-11 w-full rounded-chip border border-border bg-surface-2 px-3 text-body text-text-primary"
          />

          {/* 類別分段控制，對照 Flutter 的 _CategorySegmented。 */}
          <div className="mt-2 flex gap-0.5 rounded-lg bg-surface-0 p-[3px]">
            {CATEGORY_TABS.map(([key, label]) => (
              <button
                key={label}
                type="button"
                onClick={() => setCategory(key)}
                className={`min-h-9 flex-1 rounded-md text-small ${
                  category === key
                    ? 'bg-surface-2 font-semibold text-gold'
                    : 'text-text-secondary'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-2">
            {filtered.length === 0 ? (
              <p className="py-3 text-small text-text-secondary">
                找不到符合的品項。
              </p>
            ) : (
              [...groups.entries()].map(([label, items]) => (
                <div key={label}>
                  {showHeaders && (
                    <div className="flex items-center gap-2 px-1 pb-1 pt-3">
                      <span className="text-small text-section-label">{label}</span>
                      <span className="h-px grow bg-border-2" />
                      <span className="font-label text-eyebrow text-text-secondary">
                        {items.length}
                      </span>
                    </div>
                  )}
                  <ItemList items={items.slice(0, 60)} onSelect={select} />
                </div>
              ))
            )}
          </div>
    </>
  );

  return (
    <EditorSheet open={open} title="取得物品" onClose={onClose} size="wide">
      <div ref={paneRef}>
      <div className="mb-3 flex items-baseline justify-between">
        <span className="text-small text-text-secondary">目前財富</span>
        <CoinAmount cp={totalCp(c.currency)} coinSize={14} className="text-gold" />
      </div>

      {catalog.length === 0 ? (
        <p className="text-small text-text-secondary">
          內容庫離線不可用，暫時無法自目錄取得物品。
        </p>
      ) : wide ? (
        /* 寬版主從式：左清單固定 360、右詳情。對照 Flutter 的 ≥700 分支。 */
        <div className="flex h-[min(62vh,620px)] items-stretch gap-0">
          <div className="w-[360px] shrink-0 overflow-y-auto pr-3">{listPane}</div>
          <div className="w-px shrink-0 bg-border-2" />
          <div className="min-w-0 flex-1 pl-3">
            {selected === null ? (
              <p className="flex h-full items-center justify-center text-ui text-text-secondary">
                選擇左側條目檢視詳情
              </p>
            ) : (
              <ItemDetailPane
                key={selected.id}
                item={selected}
                onClose={() => select(null)}
                onPurchase={purchase}
                onAcquire={acquire}
              />
            )}
          </div>
        </div>
      ) : selected === null ? (
        listPane
      ) : (
        /* 窄版：詳情**取代**清單，帶返回鍵。 */
        <ItemDetailPane
          key={selected.id}
          item={selected}
          onClose={() => select(null)}
          showBack
          onPurchase={purchase}
          onAcquire={acquire}
        />
      )}

      {/* 結果條貼在內容底部——就在「購買」按鈕下方。放在面板最上面等於把回饋
          擺在使用者沒在看的地方（窄版甚至已經捲出畫面外）。 */}
      {feedback && (
        <FeedbackBar feedback={feedback} onDismiss={() => setFeedback(null)} />
      )}
      </div>
    </EditorSheet>
  );
}

function FeedbackBar({
  feedback,
  onDismiss,
}: {
  feedback: Feedback;
  onDismiss: () => void;
}) {
  const ok = feedback.kind === 'ok';
  return (
    <div
      // 失敗要打斷朗讀（錢沒付出去、東西沒拿到，這件事不能排隊等）；
      // 成功用 polite 即可。
      role="status"
      aria-live={ok ? 'polite' : 'assertive'}
      className={`sticky bottom-0 z-10 mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-card border px-3 py-2.5 ${
        ok
          ? 'border-success bg-success/12 text-success'
          : 'border-danger bg-danger/12 text-danger'
      }`}
    >
      <span className="flex items-center gap-2 text-ui font-bold">
        <span aria-hidden className="text-body leading-none">
          {ok ? '✓' : '✕'}
        </span>
        {feedback.title}
        {feedback.note && (
          <span className="font-normal opacity-80">（{feedback.note}）</span>
        )}
      </span>
      <span className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-1">
        {feedback.rows.map(([label, cp]) => (
          <span key={label} className="flex items-baseline gap-1.5">
            <span className="text-tiny opacity-80">{label}</span>
            <CoinAmount cp={cp} coinSize={14} textClassName="text-ui" />
          </span>
        ))}
      </span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="關閉訊息"
        className="-my-2.5 -mr-3 flex size-11 items-center justify-center text-ui opacity-70 hover:opacity-100"
      >
        ✕
      </button>
    </div>
  );
}

/** 類別分頁，對照 Flutter 的 `_categoryLabels`（null＝全部）。 */
const CATEGORY_TABS: [string | null, string][] = [
  [null, '全部'],
  ['weapon', '武器'],
  ['armor', '護甲'],
  ['gear', '裝備'],
  ['tool', '工具'],
];

function ItemList({
  items,
  onSelect,
}: {
  items: CatalogItem[];
  /** 點選開詳情——直接購買會讓誤觸變成花錢。 */
  onSelect: (i: CatalogItem) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {items.map((i) => (
        <button
          key={i.id}
          type="button"
          onClick={() => onSelect(i)}
          className="flex min-h-11 items-center gap-2 rounded-card border border-border-2 px-3 text-left"
        >
          <span className="min-w-0 flex-1">
            <span className="text-ui text-text-primary">{i.name}</span>
            <span className="font-label ml-1.5 text-tiny text-text-primary/70">
              {i.eng_name}
            </span>
            <span className="ml-1.5 text-small text-section-label">
              {CATEGORY_LABEL[i.category] ?? i.category}
            </span>
          </span>
          <span className="shrink-0 text-small text-gold">
            {i.price_cp === null ? '—' : <CoinAmount cp={i.price_cp} coinSize={14} />}
          </span>
        </button>
      ))}
    </div>
  );
}

/** 目錄品項 → 角色物品。保留 catalogRef 供「再次取得」與詳情回查。 */

/** 財富編輯：直接改各幣別數量。 */
