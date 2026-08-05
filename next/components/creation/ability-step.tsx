'use client';

import { useState } from 'react';

import {
  POINT_BUY_BUDGET,
  POINT_BUY_COST,
  STANDARD_ARRAY,
  pointsSpent,
} from '@/lib/creation/build';
import { ABILITY_ORDER } from '@/lib/creation/data';

export type Method = 'array' | 'buy' | 'roll';

const LABEL: Record<string, string> = {
  STR: '力量', DEX: '敏捷', CON: '體質',
  INT: '智力', WIS: '感知', CHA: '魅力',
};

/**
 * 三種取值方式的說明：一行摘要常駐，詳解點開才展開。
 *
 * 標準陣列／購點／擲骰對沒跑過團的人是空詞，只給 tab 名稱等於要他先去查
 * 規則書。摘要回答「是什麼」，展開後回答「怎麼操作」與「適合誰」——後者
 * 才是新手真正卡住的問題。文案與 Flutter 端一致。
 */
const EXPLAIN: Record<
  Method,
  { summary: string; steps: string[]; fitFor: string }
> = {
  array: {
    summary: '六個固定數值，你決定誰拿哪個',
    steps: [
      '點能力右邊的下拉，從還沒用的值裡挑一個。',
      '挑到已被別的能力用走的值，兩者會自動對調——不會卡住。',
    ],
    fitFor: '適合：第一次建角、想快點開始跑。所有人起點一樣，不會有人特別強或特別弱。',
  },
  buy: {
    summary: `六項都從 8 起跳，用 ${POINT_BUY_BUDGET} 點買高`,
    steps: [
      '用能力右邊的 ＋／− 加減，上方進度條顯示還剩幾點。',
      '上限 15；種族與背景加值是之後才加，不受這個上限限制。',
      '數值可以重複，點數也不必花完。',
    ],
    fitFor: '適合：想自己精算取捨的人。可以刻意壓低用不到的能力，換兩項特別突出。',
  },
  roll: {
    summary: '擲 4d6，去掉最低的一顆，重複六次',
    steps: [
      'App 不代擲——用實體骰或你習慣的擲骰工具擲完，再填進欄位。',
      '哪個結果放哪個能力由你決定，填完就是最終的基礎值。',
      '理論範圍 3–18，但六項全高或全低都可能發生。',
    ],
    fitFor: '適合：接受運氣、想要角色有意外性的人。三種裡唯一可能大好大壞，開團前先問過 DM。',
  },
};

export function AbilityStep({
  method,
  onMethod,
  base,
  onBase,
  bonus,
}: {
  method: Method;
  onMethod: (m: Method) => void;
  base: Record<string, number | null>;
  onBase: (v: Record<string, number | null>) => void;
  /** 背景加值，僅供顯示最終值。 */
  bonus: Record<string, number>;
}) {
  const [detail, setDetail] = useState(false);
  const spent = pointsSpent(
    Object.fromEntries(
      Object.entries(base).filter(([, v]) => v !== null) as [string, number][],
    ),
  );
  const remaining = POINT_BUY_BUDGET - spent;
  const used = Object.values(base).filter((v) => v !== null) as number[];
  const pool = STANDARD_ARRAY.filter(
    (v) => used.filter((u) => u === v).length < STANDARD_ARRAY.filter((x) => x === v).length,
  );

  const setOne = (code: string, v: number | null) => {
    if (method === 'array' && v !== null) {
      // 挑到已被別的能力用走的值 → 兩者對調，不會卡住。
      const owner = Object.entries(base).find(([k, x]) => x === v && k !== code);
      const next = { ...base, [code]: v };
      if (owner) next[owner[0]] = base[code];
      onBase(next);
      return;
    }
    onBase({ ...base, [code]: v });
  };

  return (
    <div>
      <div className="flex gap-1.5">
        {(['array', 'buy', 'roll'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onMethod(m)}
            className={`min-h-11 flex-1 rounded-lg border text-[13px] ${
              method === m
                ? 'border-gold bg-gold font-bold text-[#1A1206]'
                : 'border-border-2 bg-surface-1 text-text-secondary'
            }`}
          >
            {{ array: '標準陣列', buy: '購點', roll: '擲骰' }[m]}
          </button>
        ))}
      </div>

      <div className="mt-3 rounded-[10px] border border-border-2 bg-surface-1">
        <button
          type="button"
          onClick={() => setDetail((v) => !v)}
          className="flex w-full items-center gap-2 px-3 py-3 text-left"
        >
          <span className="flex-1 text-[11px] text-text-light">
            {EXPLAIN[method].summary}
          </span>
          <span className="text-[11px] text-gold">怎麼用</span>
          <span className="text-[11px] text-gold">{detail ? '▲' : '▼'}</span>
        </button>
        {detail && (
          <div className="border-t border-border-2 p-3">
            <ol className="flex flex-col gap-1.5">
              {EXPLAIN[method].steps.map((s, i) => (
                <li key={i} className="flex gap-2 text-[12px] text-text-light">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-gold text-[10px] text-gold">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{s}</span>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-[12px] leading-relaxed text-text-secondary">
              {EXPLAIN[method].fitFor}
            </p>
          </div>
        )}
      </div>

      {method === 'buy' && (
        <div className="mt-3">
          <div className="flex items-baseline justify-between text-[12px]">
            <span className="text-text-secondary">剩餘點數</span>
            <span className={remaining < 0 ? 'text-danger' : 'text-gold'}>
              {remaining} / {POINT_BUY_BUDGET}
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div
              className={`h-full ${remaining < 0 ? 'bg-danger' : 'bg-gold'}`}
              style={{ width: `${Math.min(100, (spent / POINT_BUY_BUDGET) * 100)}%` }}
            />
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-col gap-2">
        {ABILITY_ORDER.map((code) => {
          const b = base[code];
          const final = b === null ? null : Math.min(20, b + (bonus[code] ?? 0));
          return (
            <div
              key={code}
              className="flex items-center gap-3 rounded-card border border-border bg-surface-1 px-3 py-2"
            >
              <span className="w-14 shrink-0 text-[13px] text-text-primary">
                {LABEL[code]}
              </span>

              {method === 'array' && (
                <select
                  value={b ?? ''}
                  onChange={(e) =>
                    setOne(code, e.target.value === '' ? null : Number(e.target.value))
                  }
                  className="min-h-11 rounded-chip border border-border bg-surface-2 px-2 text-[14px] text-text-primary"
                >
                  <option value="">—</option>
                  {[...new Set([...(b !== null ? [b] : []), ...pool])]
                    .sort((x, y) => y - x)
                    .map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                </select>
              )}

              {method === 'buy' && (
                <span className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label={`${LABEL[code]} 減 1`}
                    onClick={() => setOne(code, Math.max(8, (b ?? 8) - 1))}
                    className="size-9 rounded-full border border-border text-text-primary"
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-[15px] text-text-primary">
                    {b ?? 8}
                  </span>
                  <button
                    type="button"
                    aria-label={`${LABEL[code]} 加 1`}
                    disabled={
                      (b ?? 8) >= 15 ||
                      remaining < (POINT_BUY_COST[(b ?? 8) + 1] - POINT_BUY_COST[b ?? 8])
                    }
                    onClick={() => setOne(code, Math.min(15, (b ?? 8) + 1))}
                    className="size-9 rounded-full border border-border text-text-primary disabled:opacity-40"
                  >
                    ＋
                  </button>
                </span>
              )}

              {method === 'roll' && (
                <input
                  type="number"
                  inputMode="numeric"
                  min={3}
                  max={18}
                  value={b ?? ''}
                  onChange={(e) =>
                    setOne(code, e.target.value === '' ? null : Number(e.target.value))
                  }
                  className="min-h-11 w-16 rounded-chip border border-border bg-surface-2 px-2 text-center text-[14px] text-text-primary"
                />
              )}

              <span className="ml-auto text-[12px] text-text-secondary">
                {bonus[code] > 0 && `＋${bonus[code]} → `}
                <span className="text-[16px] font-bold text-gold">
                  {final ?? '—'}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
