'use client';

import { useEffect, useRef, useState } from 'react';

import {
  ASCENDING_CODES,
  CoinIcon,
  type CoinCode,
  coinRank,
} from '@/components/character/coins';
import { characterActions, useCharacterStore } from '@/lib/state/character-store';

/**
 * 資產計算機，對照 Flutter 端 `inventory_tab.dart` 的 `_CurrencyCalculatorSheet`。
 *
 * 不是「五個數字輸入框」——那要使用者自己算「花掉 3 金 5 銀之後還剩多少」。
 * 這裡是收支計算機：按 +/- 選符號、輸入金額、點幣別完成一筆，可連續輸入
 * 多筆（「+1 金 10 銅」），確定後一次套用差額。
 *
 * 幣別**須由大到小依序點選**：完成一筆之後，只剩比它小的幣別可點。這擋掉
 * 「3 銀 1 金」這種反向輸入，也讓連續輸入的語意固定。
 */
type Term = { sign: '+' | '-'; amount: number; code: CoinCode };

export function CurrencyCalculator({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const c = useCharacterStore((s) => s.character);
  const [terms, setTerms] = useState<Term[]>([]);
  const [sign, setSign] = useState<'+' | '-'>('+');
  const [digits, setDigits] = useState('');
  const ref = useRef<HTMLDialogElement>(null);

  // 與 EditorSheet 同一套：showModal() 才有焦點鎖定、背景 inert 與 Esc。
  useEffect(() => {
    const el = ref.current;
    if (open && el && !el.open) el.showModal();
  }, [open]);

  if (!open || !c) return null;

  const reset = () => {
    setTerms([]);
    setSign('+');
    setDigits('');
  };

  const close = () => {
    reset();
    onClose();
  };

  // 目前允許點選的最大幣別序位（undefined＝尚未選過，全部可點）；
  // 由最後一筆已完成的紀錄推得，刪除紀錄後會自動放寬。
  const maxAllowedRank =
    terms.length === 0 ? undefined : coinRank(terms[terms.length - 1].code);

  const currencyEnabled = (code: CoinCode) =>
    digits.length > 0 &&
    (maxAllowedRank === undefined || coinRank(code) < maxAllowedRank);

  const tapDigit = (d: string) => {
    if (digits.length >= 6) return;
    setDigits(digits + d);
  };

  // 輸入中：切換當前輸入的符號；無輸入中數字：直接翻轉最後一筆已完成項目的
  // 正負（點完幣別後仍可隨時改加／減）。
  const tapSign = (s: '+' | '-') => {
    if (digits.length === 0 && terms.length > 0) {
      setTerms(terms.map((t, i) => (i === terms.length - 1 ? { ...t, sign: s } : t)));
    }
    setSign(s);
  };

  const tapBackspace = () => {
    if (digits.length > 0) setDigits(digits.slice(0, -1));
    else if (terms.length > 0) setTerms(terms.slice(0, -1));
  };

  const tapCurrency = (code: CoinCode) => {
    if (!currencyEnabled(code)) return;
    const amount = Number.parseInt(digits, 10);
    if (amount !== 0) setTerms([...terms, { sign, amount, code }]);
    // 數字歸零、符號沿用，讓「1 金 10 銅」這種連續輸入不必重按 +/-。
    setDigits('');
  };

  const confirm = () => {
    if (terms.length > 0) {
      const next = { ...c.currency };
      for (const t of terms) {
        next[t.code] += t.sign === '-' ? -t.amount : t.amount;
      }
      characterActions.setCurrency(next);
    }
    close();
  };

  // 符號只在最前面或跟上一筆不同時才顯示，同號的連續筆數不重複標符號
  // ——「+10 金 3 銀」而非「+10 金 +3 銀」。
  const showSignAt = (i: number) => i === 0 || terms[i].sign !== terms[i - 1].sign;

  const pending = digits.length === 0 ? '' : `${sign}${digits}`;

  return (
    <dialog
      ref={ref}
      aria-label="資產計算機"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      // hidden open:flex 的理由同 EditorSheet：避免 showModal() 前閃現。
      className="fixed inset-0 z-50 m-0 hidden h-auto max-h-none w-auto max-w-none items-end justify-center bg-transparent p-0 backdrop:bg-black/60 open:flex"
    >
      <div
        autoFocus
        tabIndex={-1}
        className="max-h-[95dvh] w-full max-w-[520px] overflow-y-auto overscroll-contain rounded-t-card border border-border bg-surface-1 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1 focus:outline-none"
      >
        <h2 className="pt-2 text-[16px] font-bold text-text-primary">資產計算機</h2>
        <p className="mt-0.5 text-[12px] leading-relaxed text-text-secondary">
          按 +/- 選符號、輸入金額，點幣別完成一筆後可直接接著輸入下一筆；
          幣別需由大到小依序點選。
        </p>

        {/* 顯示幕：已完成的筆數與正在輸入的數字留在同一行，確定後才一次收掉。 */}
        <div className="mt-3 w-full rounded-[10px] border border-border-2 bg-surface-0 p-3">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            {terms.map((t, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setTerms(terms.filter((_, j) => j !== i))}
                aria-label={`移除 ${t.sign}${t.amount}`}
                className="flex items-center"
              >
                <span
                  className={`font-display text-[28px] font-bold ${
                    t.sign === '-' ? 'text-danger' : 'text-success'
                  }`}
                >
                  {showSignAt(i) ? t.sign : ''}
                  {t.amount}
                </span>
                <CoinIcon code={t.code} size={18} />
              </button>
            ))}
            {pending ? (
              <span
                className={`font-display text-[28px] font-bold ${
                  sign === '-' ? 'text-danger' : 'text-success'
                }`}
              >
                {pending}
              </span>
            ) : (
              terms.length === 0 && (
                <span className="font-display text-[28px] font-bold text-text-secondary">
                  0
                </span>
              )
            )}
          </div>
        </div>

        {/* 幣別列由小到大（銅→鉑）：完成目前輸入的這一筆。 */}
        <div className="mt-3 flex gap-1">
          {ASCENDING_CODES.map((code) => {
            const on = currencyEnabled(code);
            return (
              <button
                key={code}
                type="button"
                disabled={!on}
                onClick={() => tapCurrency(code)}
                className={`flex min-h-11 flex-1 items-center justify-center rounded-chip border ${
                  on ? 'border-gold bg-gold/10' : 'border-border-2 opacity-40'
                }`}
              >
                <CoinIcon code={code} size={20} />
              </button>
            );
          })}
        </div>

        {/* 鍵盤：數字 ＋ 僅保留 +/-（無其他科學符號）。 */}
        <div className="mt-3 flex flex-col gap-2">
          {[
            ['1', '2', '3', '+'],
            ['4', '5', '6', '-'],
            ['7', '8', '9', '⌫'],
          ].map((row, ri) => (
            <div key={ri} className="flex gap-2">
              {row.map((k) => (
                <Key
                  key={k}
                  label={k}
                  tone={k === '+' ? 'success' : k === '-' ? 'danger' : undefined}
                  onClick={() =>
                    k === '+' || k === '-'
                      ? tapSign(k)
                      : k === '⌫'
                        ? tapBackspace()
                        : tapDigit(k)
                  }
                />
              ))}
            </div>
          ))}
          <div className="flex gap-2">
            <Key label="C" flex={2} onClick={reset} />
            <Key label="0" flex={2} onClick={() => tapDigit('0')} />
          </div>
        </div>

        <div className="mt-3 flex gap-3">
          <button
            type="button"
            onClick={close}
            className="min-h-11 flex-1 rounded-chip border border-border text-[14px] text-text-secondary"
          >
            取消
          </button>
          <button
            type="button"
            onClick={confirm}
            className="min-h-11 flex-1 rounded-chip bg-gold-solid text-[14px] font-bold text-[#1A1206]"
          >
            {terms.length === 0 ? '關閉' : '確定套用'}
          </button>
        </div>
      </div>
    </dialog>
  );
}

function Key({
  label,
  onClick,
  tone,
  flex = 1,
}: {
  label: string;
  onClick: () => void;
  tone?: 'success' | 'danger';
  flex?: number;
}) {
  const color =
    tone === 'success'
      ? 'text-success'
      : tone === 'danger'
        ? 'text-danger'
        : 'text-text-primary';
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ flexGrow: flex }}
      className={`h-[52px] flex-1 rounded-lg border border-border-2 bg-surface-2 text-[18px] font-bold ${color}`}
    >
      {label}
    </button>
  );
}
