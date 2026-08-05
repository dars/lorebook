import { describe, expect, it } from 'vitest';

import {
  BACKGROUNDS,
  CLASSES,
  LANGUAGES,
  SKILLS,
  SPECIES,
  isCaster,
} from './data';

describe('建角選項資料', () => {
  it('數量與 Flutter 端一致', () => {
    expect(SPECIES).toHaveLength(9);
    expect(CLASSES).toHaveLength(12);
    expect(BACKGROUNDS).toHaveLength(4);
    expect(SKILLS).toHaveLength(18);
    expect(LANGUAGES).toHaveLength(16);
  });

  it('職業的可選技能都在技能表內——對不上代表資料有錯', () => {
    const names = new Set(SKILLS.map((s) => s.name));
    for (const c of CLASSES) {
      for (const s of c.skillChoices) {
        expect(names.has(s), `${c.cn} 的「${s}」不在技能表`).toBe(true);
      }
    }
  });

  it('背景的固定技能都在技能表內', () => {
    const names = new Set(SKILLS.map((s) => s.name));
    for (const b of BACKGROUNDS) {
      for (const s of b.skills) {
        expect(names.has(s), `${b.cn} 的「${s}」不在技能表`).toBe(true);
      }
    }
  });

  it('施法職業有戲法或可備法術，非施法職業都是 0', () => {
    for (const c of CLASSES) {
      if (isCaster(c)) {
        expect(c.cantripsKnown + c.preparedSpells).toBeGreaterThan(0);
      } else {
        expect(c.cantripsKnown).toBe(0);
        expect(c.preparedSpells).toBe(0);
        expect(c.level1Slots).toBe(0);
      }
    }
  });

  it('矮人有每級額外 HP，其餘種族為 0（堅毅是矮人專屬）', () => {
    const dwarf = SPECIES.find((s) => s.cn === '矮人')!;
    expect(dwarf.hpPerLevel).toBe(1);
    expect(
      SPECIES.filter((s) => s.cn !== '矮人').every((s) => s.hpPerLevel === 0),
    ).toBe(true);
  });
});
