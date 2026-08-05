import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { parseCharacter } from '@/lib/domain/character';
import { computeAc } from './ac';
import { formatCp, payFrom } from './currency';

/**
 * 對拍 Flutter 端匯出的 golden。
 *
 * **新實作對不上時不得重跑 golden 讓它「通過」**——golden 的價值來自它凍結了
 * 一個已驗證的狀態，重跑等於讓這道防線消失（golden/README.md）。
 */
const golden = (name: string) =>
  JSON.parse(
    readFileSync(path.resolve(__dirname, '../../../golden', name), 'utf-8'),
  );

type Case<I, O> = { desc: string; input: I; output: O };

describe('computeAc 對拍', () => {
  const cases = golden('compute_ac.json') as Case<unknown, AcOut>[];
  type AcOut = { value: number; label: string };

  it('案例不為空', () => expect(cases.length).toBeGreaterThan(0));

  it.each(cases.map((c) => [c.desc, c] as const))('%s', (_d, c) => {
    expect(computeAc(parseCharacter(c.input))).toEqual(c.output);
  });
});

describe('payFrom 對拍', () => {
  type PayIn = { currency: Record<string, number>; priceCp: number };
  type PayOut = { ok: boolean; remaining: Record<string, number>; shortfallCp: number };
  const cases = golden('pay_from.json') as Case<PayIn, PayOut>[];

  it('案例不為空', () => expect(cases.length).toBeGreaterThan(0));

  it.each(cases.map((c) => [c.desc, c] as const))('%s', (_d, c) => {
    const r = payFrom(c.input.currency as never, c.input.priceCp);
    expect(r.ok).toBe(c.output.ok);
    expect(r.shortfallCp).toBe(c.output.shortfallCp);
    expect(r.remaining).toEqual(c.output.remaining);
  });
});

describe('formatCp 對拍', () => {
  const cases = golden('format_cp.json') as Case<{ cp: number }, { text: string }>[];

  it.each(cases.map((c) => [String(c.input.cp), c] as const))('%s cp', (_d, c) => {
    expect(formatCp(c.input.cp)).toBe(c.output.text);
  });
});
