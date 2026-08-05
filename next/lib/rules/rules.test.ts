import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { parseCharacter } from '@/lib/domain/character';
import { proficiencyBonusFor } from './ability';
import { computeAc } from './ac';
import { attackEntries } from './attacks';
import { deriveClassResources } from './class-resources';
import { formatCp, payFrom } from './currency';
import { applyLevelUp, planFor } from './level-up';
import {
  CANTRIPS_KNOWN,
  CLASS_PROGRESSION,
  PREPARED_SPELLS,
  asiLevelsFor,
  maxSpellRingFor,
  newCantripPicksFor,
  newSpellPicksFor,
  spellSlotTotalsFor,
} from './level-tables';

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

describe('attackEntries 對拍', () => {
  type Out = ReturnType<typeof attackEntries>;
  const cases = golden('attack_entries.json') as Case<unknown, Out>[];

  it('案例不為空', () => expect(cases.length).toBeGreaterThan(0));

  it.each(cases.map((c) => [c.desc, c] as const))('%s', (_d, c) => {
    expect(attackEntries(parseCharacter(c.input))).toEqual(c.output);
  });
});

describe('deriveClassResources 對拍（8 職業 × 1–20 級）', () => {
  type In = { classEn: string; level: number; scores: Record<string, number> };
  type Out = ReturnType<typeof deriveClassResources>;
  const cases = golden('derive_class_resources.json') as Case<In, Out>[];

  const scores = (m: Record<string, number>) => {
    const one = (v: number) => ({
      score: v,
      modifier: Math.floor((v - 10) / 2),
      proficientSave: false,
    });
    return {
      str: one(10),
      dex: one(10),
      con: one(m.CON ?? 10),
      int_: one(10),
      wis: one(m.WIS ?? 10),
      cha: one(m.CHA ?? 10),
    };
  };

  it('案例不為空', () => expect(cases.length).toBe(160));

  it.each(
    cases.map((c) => [`${c.input.classEn} Lv${c.input.level}`, c] as const),
  )('%s', (_d, c) => {
    expect(
      deriveClassResources(c.input.classEn, c.input.level, scores(c.input.scores)),
    ).toEqual(c.output);
  });
});

describe('升級規則表對拍（12 職業 × 1–20 級）', () => {
  type In = { classEn: string; level: number };
  type Out = {
    proficiencyBonus: number;
    isAsiLevel: boolean;
    spellSlots: Record<string, number>;
    maxSpellRing: number;
    cantripsKnown: number;
    preparedSpells: number;
    newCantripPicks: number;
    newSpellPicks: number;
  };
  const cases = golden('level_tables.json') as Case<In, Out>[];

  it('案例不為空', () => expect(cases.length).toBe(240));

  it.each(
    cases.map((c) => [`${c.input.classEn} Lv${c.input.level}`, c] as const),
  )('%s', (_d, c) => {
    const { classEn: cls, level: lv } = c.input;
    const prog = CLASS_PROGRESSION[cls] ?? 'none';
    const slots = spellSlotTotalsFor(prog, lv);

    expect({
      proficiencyBonus: proficiencyBonusFor(lv),
      isAsiLevel: asiLevelsFor(cls).has(lv),
      spellSlots: Object.fromEntries(
        Object.entries(slots).map(([k, v]) => [String(k), v]),
      ),
      maxSpellRing: maxSpellRingFor(prog, lv),
      cantripsKnown: CANTRIPS_KNOWN[cls]?.[lv - 1] ?? 0,
      preparedSpells: PREPARED_SPELLS[cls]?.[lv - 1] ?? 0,
      newCantripPicks: newCantripPicksFor(cls, lv),
      newSpellPicks: newSpellPicksFor(cls, lv),
    }).toEqual(c.output);
  });
});

describe('applyLevelUp 對拍', () => {
  type In = {
    character: unknown;
    choices: {
      hpRoll: number | null;
      asi: Record<string, number>;
      subclass: string | null;
      subclassEn: string | null;
    };
  };
  const cases = golden('apply_level_up.json') as Case<In, unknown>[];

  it('案例不為空', () => expect(cases.length).toBeGreaterThan(0));

  it.each(cases.map((c) => [c.desc, c] as const))('%s', (_d, c) => {
    const ch = parseCharacter(c.input.character);
    // 種族每級 HP：golden 的案例只有人類（0）與矮人（1）。
    const speciesHpPerLevel = ch.species === '矮人' ? 1 : 0;
    const plan = planFor(ch, speciesHpPerLevel);
    const result = applyLevelUp(ch, plan, {
      hpRoll: c.input.choices.hpRoll,
      asi: c.input.choices.asi,
      subclass: c.input.choices.subclass ?? undefined,
      subclassEn: c.input.choices.subclassEn ?? undefined,
    });
    expect(parseCharacter(result)).toEqual(parseCharacter(c.output));
  });
});
