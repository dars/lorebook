'use client';

import { useState } from 'react';

import { AbilityHexChart } from '@/components/character/ability-hex-chart';
import {
  POINT_BUY_BUDGET,
  POINT_BUY_COST,
  STANDARD_ARRAY,
  finalScore,
  pointsSpent,
  recommendArray,
} from '@/lib/creation/build';
import {
  ABILITY_LABEL,
  ABILITY_ORDER,
  type ClassOption,
} from '@/lib/creation/data';

export type Method = 'array' | 'buy' | 'roll';

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
      '「套用建議」依你選的職業自動排好，排完仍可自己改。',
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

const METHOD_LABEL: Record<Method, string> = {
  array: '標準陣列',
  buy: '購點',
  roll: '擲骰',
};

export function AbilityStep({
  cls,
  method,
  onMethod,
  base,
  onBase,
  bonus,
}: {
  /** 「套用建議」要依職業的主屬性排序。 */
  cls: ClassOption;
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
  // 標準陣列六個值互異，用 includes 判斷是否已被指派即可。
  const pool = STANDARD_ARRAY.filter((v) => !used.includes(v));

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

  const finals = Object.fromEntries(
    ABILITY_ORDER.map((code) => [
      code,
      base[code] === null ? null : finalScore(base[code]!, bonus[code] ?? 0),
    ]),
  );

  return (
    // 寬螢幕分兩欄：左邊是「怎麼配」的說明與圖，右邊是實際在配的六列。
    // 單欄時說明會把配點區推到摺線以下，等於要一邊捲一邊對照。
    <div className="grid gap-x-8 gap-y-4 expanded:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
      <div>
        <div className="flex justify-center">
          <AbilityHexChart scores={finals} size={260} />
        </div>

        <div className="mt-3 flex gap-1.5">
          {(['array', 'buy', 'roll'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onMethod(m)}
              className={`min-h-11 flex-1 rounded-lg border text-[13px] ${
                method === m
                  ? 'border-gold bg-gold-solid font-bold text-[#1A1206]'
                  : 'border-border-2 bg-surface-1 text-text-secondary'
              }`}
            >
              {METHOD_LABEL[m]}
            </button>
          ))}
        </div>

        <div className="mt-3 rounded-[10px] border border-border-2 bg-surface-1">
          <button
            type="button"
            onClick={() => setDetail((v) => !v)}
            aria-expanded={detail}
            className="flex w-full items-center gap-2 px-3 py-3 text-left"
          >
            <span className="flex-1 text-[12px] text-text-light">
              {EXPLAIN[method].summary}
            </span>
            <span className="text-[12px] text-gold">怎麼用</span>
            <span aria-hidden className="text-[12px] text-gold">
              {detail ? '▲' : '▼'}
            </span>
          </button>
          {detail && (
            <div className="border-t border-border-2 p-3">
              {/* 圖解擺在文字步驟之前：「14 之後每分要 2 點」用看的比用讀的快。 */}
              {method === 'array' && <ArrayVisual pool={pool} />}
              {method === 'buy' && <PointCostTable />}
              {method === 'roll' && <RollDemo />}

              <ol className="mt-3 flex flex-col gap-1.5">
                {EXPLAIN[method].steps.map((s, i) => (
                  <li key={i} className="flex gap-2 text-[12px] text-text-light">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-gold text-[12px] text-gold">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed">{s}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-3 rounded-md bg-gold/8 px-2.5 py-2 text-[12px] leading-relaxed text-text-light">
                {EXPLAIN[method].fitFor}
              </p>
            </div>
          )}
        </div>
      </div>

      <div>
        {method === 'array' && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex-1 text-[12px] text-text-secondary">
              剩餘可分配 {pool.length}／6
            </span>
            <PillButton onClick={() => onBase(recommendArray(cls))}>
              套用建議
            </PillButton>
            <PillButton
              onClick={() =>
                onBase(Object.fromEntries(ABILITY_ORDER.map((a) => [a, null])))
              }
            >
              清空
            </PillButton>
          </div>
        )}

        {method === 'buy' && (
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-[12px] text-text-secondary">剩餘點數</span>
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
              <span
                className={`block h-full ${remaining < 0 ? 'bg-danger' : 'bg-gold-solid'}`}
                style={{
                  width: `${Math.min(100, (spent / POINT_BUY_BUDGET) * 100)}%`,
                }}
              />
            </span>
            <span
              className={`shrink-0 text-[13px] font-bold ${remaining < 0 ? 'text-danger' : 'text-gold'}`}
            >
              {remaining} / {POINT_BUY_BUDGET}
            </span>
            <PillButton
              onClick={() =>
                onBase(Object.fromEntries(ABILITY_ORDER.map((a) => [a, 8])))
              }
            >
              重置
            </PillButton>
          </div>
        )}

        <div className="mt-3 flex flex-col gap-2">
          {ABILITY_ORDER.map((code) => {
            const b = base[code];
            const add = bonus[code] ?? 0;
            const final = finals[code];
            const mod = final === null ? null : Math.floor((final - 10) / 2);
            return (
              <div
                key={code}
                className="flex items-center gap-2 rounded-card border border-border bg-surface-1 px-3 py-2"
              >
                <span className="w-12 shrink-0 text-[14px] font-semibold text-text-primary">
                  {ABILITY_LABEL[code]}
                </span>

                <span className="ml-auto flex items-center gap-2">
                  {add > 0 && (
                    <span className="text-[12px] font-bold text-gold-dim">＋{add}</span>
                  )}

                  {method === 'array' && (
                    <select
                      aria-label={`${ABILITY_LABEL[code]} 分數`}
                      value={b ?? ''}
                      onChange={(e) =>
                        setOne(code, e.target.value === '' ? null : Number(e.target.value))
                      }
                      className="min-h-11 w-[104px] rounded-chip border border-border bg-surface-2 px-2 text-[14px] text-text-primary"
                    >
                      <option value="">—</option>
                      {STANDARD_ARRAY.map((v) => {
                        // 被別人佔走的值也列出來（選了會對調），但要講清楚是誰佔著，
                        // 不然使用者不知道選下去會動到哪一項。
                        const owner = ABILITY_ORDER.find(
                          (k) => k !== code && base[k] === v,
                        );
                        return (
                          <option key={v} value={v}>
                            {owner ? `${v} · ${ABILITY_LABEL[owner]}` : v}
                          </option>
                        );
                      })}
                    </select>
                  )}

                  {method === 'buy' && (
                    <span className="flex items-center gap-1.5">
                      <StepButton
                        label={`${ABILITY_LABEL[code]} 減 1`}
                        disabled={(b ?? 8) <= 8}
                        onClick={() => setOne(code, Math.max(8, (b ?? 8) - 1))}
                      >
                        −
                      </StepButton>
                      <span className="w-7 text-center text-[15px] font-bold text-text-primary">
                        {b ?? 8}
                      </span>
                      <StepButton
                        label={`${ABILITY_LABEL[code]} 加 1`}
                        disabled={
                          (b ?? 8) >= 15 ||
                          remaining <
                            POINT_BUY_COST[(b ?? 8) + 1] - POINT_BUY_COST[b ?? 8]
                        }
                        onClick={() => setOne(code, Math.min(15, (b ?? 8) + 1))}
                      >
                        ＋
                      </StepButton>
                    </span>
                  )}

                  {method === 'roll' && (
                    <input
                      type="number"
                      inputMode="numeric"
                      aria-label={`${ABILITY_LABEL[code]} 擲骰結果`}
                      min={3}
                      max={18}
                      value={b ?? ''}
                      onChange={(e) =>
                        setOne(code, e.target.value === '' ? null : Number(e.target.value))
                      }
                      className="min-h-11 w-16 rounded-chip border border-border bg-surface-2 px-2 text-center text-[14px] text-text-primary"
                    />
                  )}

                  <span aria-hidden className="text-[12px] text-section-label">
                    →
                  </span>
                  <span className="w-16 text-right text-[15px] font-bold text-gold">
                    {final === null
                      ? '—'
                      : `${final} (${mod! >= 0 ? '+' : ''}${mod})`}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** 只有金邊、透明底的小動作鈕。 */
function PillButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-9 shrink-0 rounded-chip border border-gold px-3 text-[12px] text-gold hover:bg-gold/10"
    >
      {children}
    </button>
  );
}

function StepButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="relative size-9 rounded-full border border-border text-text-primary before:absolute before:-inset-1 before:content-[''] disabled:opacity-40"
    >
      {children}
    </button>
  );
}

/** 標準陣列的六個值，即時反映哪些已被指派。 */
function ArrayVisual({ pool }: { pool: number[] }) {
  return (
    <div>
      <div className="flex gap-1.5">
        {STANDARD_ARRAY.map((v) => {
          const free = pool.includes(v);
          return (
            <span
              key={v}
              className={`flex h-8 flex-1 items-center justify-center rounded-md border text-[15px] font-bold ${
                free
                  ? 'border-gold bg-gold/12 text-gold'
                  : 'border-border-2 bg-surface-2 text-text-secondary'
              }`}
            >
              {v}
            </span>
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-3.5">
        <Legend className="border-gold bg-gold/12">還沒用</Legend>
        <Legend className="border-border-2 bg-surface-2">已指派</Legend>
      </div>
    </div>
  );
}

function Legend({
  className,
  children,
}: {
  className: string;
  children: React.ReactNode;
}) {
  return (
    <span className="flex items-center gap-1.5 text-[10px] text-text-secondary">
      <span className={`size-2.5 rounded-[2px] border ${className}`} />
      {children}
    </span>
  );
}

/**
 * 購點成本表。沒有它，使用者按 ＋ 到 14 時會突然掉 2 點卻不知道為什麼——
 * 表格把「哪裡開始變貴」直接畫出來。
 */
function PointCostTable() {
  const scores = Object.keys(POINT_BUY_COST)
    .map(Number)
    .sort((a, b) => a - b);
  const pricey = (s: number) => POINT_BUY_COST[s] - POINT_BUY_COST[s - 1] > 1;

  return (
    <div>
      <div className="overflow-hidden rounded-md border border-border-2">
        <table className="w-full table-fixed border-collapse text-center">
          <tbody>
            <tr className="bg-surface-2">
              <th
                scope="row"
                className="w-14 px-2 py-1.5 text-left text-[10px] font-normal text-section-label"
              >
                分數
              </th>
              {scores.map((s) => (
                <td
                  key={s}
                  className={`py-1.5 text-[12px] font-bold ${
                    pricey(s) ? 'bg-gold/8 text-gold' : 'text-text-light'
                  }`}
                >
                  {s}
                </td>
              ))}
            </tr>
            <tr className="border-t border-border-2">
              <th
                scope="row"
                className="px-2 py-1.5 text-left text-[10px] font-normal text-section-label"
              >
                累計花費
              </th>
              {scores.map((s) => (
                <td
                  key={s}
                  className={`py-1.5 text-[12px] font-bold ${
                    pricey(s) ? 'bg-gold/8 text-gold' : 'text-text-secondary'
                  }`}
                >
                  {POINT_BUY_COST[s]}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-1.5 text-[10px] leading-relaxed text-text-secondary">
        金色兩格＝變貴的地方：14 與 15 每加 1 分要 2 點，其餘每分 1 點。
      </p>
    </div>
  );
}

/** 擲骰的一次示範：4 顆骰、劃掉最低的那顆、加總。 */
function RollDemo() {
  return (
    <div className="rounded-md bg-surface-2 p-3">
      <div className="text-[10px] text-section-label">一次的樣子</div>
      <div className="mt-1.5 flex items-center gap-1.5">
        {[6, 4, 3, 2].map((v) => {
          const dropped = v === 2;
          return (
            <span
              key={v}
              className={`flex size-8 items-center justify-center rounded-[7px] border text-[15px] font-bold ${
                dropped
                  ? 'border-border-2 bg-surface-2 text-text-secondary line-through'
                  : 'border-gold bg-gold/12 text-gold'
              }`}
            >
              {v}
            </span>
          );
        })}
        <span aria-hidden className="text-[13px] text-text-secondary">
          →
        </span>
        <span className="rounded-[7px] border border-gold bg-gold/20 px-3 py-1.5 text-[17px] font-bold text-gold">
          13
        </span>
      </div>
      <p className="mt-1.5 text-[10px] leading-relaxed text-text-secondary">
        擲出 6、4、3、2 → 去掉最低的 2 → 6＋4＋3 ＝ 13。這樣做六次，得到六個值。
      </p>
    </div>
  );
}
