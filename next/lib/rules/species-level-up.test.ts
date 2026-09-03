import { describe, expect, it } from 'vitest';

import { buildCharacter } from '@/lib/creation/build';
import { BACKGROUNDS, CLASSES } from '@/lib/creation/data';
import { CustomSpecies, toSpeciesOption } from '@/lib/species/types';
import { applyLevelUp, planFor } from './level-up';

/**
 * 自訂種族的升級行為（custom-species D3／D9）。
 *
 * 兩件事一旦壞掉都不會有錯誤訊息，只有數字悄悄不對：每級額外 HP 消失、
 * 「熟練加值次」的能力停在建角當下的次數。
 */

const stoneborn = toSpeciesOption(
  CustomSpecies.parse({
    id: 'sp1',
    name: '石裔',
    speedFt: 25,
    hpPerLevel: 1,
    abilities: [
      { name: '石工直覺', uses: 'proficiency', recovery: 'long' },
      { name: '石膚', uses: 2, recovery: 'short' },
    ],
  }),
);

const level1 = () =>
  buildCharacter(
    {
      name: '測試者',
      species: stoneborn,
      cls: CLASSES.find((c) => c.cn === '戰士')!,
      background: BACKGROUNDS.find((b) => b.cn === '侍僧')!,
      base: { STR: 15, DEX: 12, CON: 14, INT: 10, WIS: 13, CHA: 8 },
      bonusMode: '2/1' as const,
      plus2: 'STR',
      plus1: 'CON',
      classSkills: ['運動', '威嚇'],
      speciesSkills: [],
    },
    'x',
  );

/** 升到指定等級，全程取平均 HP、不加屬性。 */
const levelTo = (target: number) => {
  let c = level1();
  while (c.level < target) {
    c = applyLevelUp(c, planFor(c, c.speciesHpPerLevel), {});
  }
  return c;
};

describe('自訂種族的每級額外 HP', () => {
  it('升級含該加值——不再以種族名反查 SPECIES', () => {
    const one = level1();
    const two = applyLevelUp(one, planFor(one, one.speciesHpPerLevel), {});
    // d10 平均 6 ＋ 體質 2 ＋ 種族 1
    expect(two.maxHp - one.maxHp).toBe(9);
  });

  it('快照為 0 的角色不會憑空長 HP', () => {
    const one = { ...level1(), speciesHpPerLevel: 0 };
    const two = applyLevelUp(one, planFor(one, one.speciesHpPerLevel), {});
    expect(two.maxHp - one.maxHp).toBe(8);
  });
});

describe('「熟練加值次」的能力隨等級成長', () => {
  it('5 級時上限為 3，而非建角當下的 2', () => {
    const five = levelTo(5);
    expect(five.proficiencyBonus).toBe(3);
    expect(five.resources.find((r) => r.name === '石工直覺')!.max).toBe(3);
  });

  it('固定次數的能力不隨等級變動', () => {
    const five = levelTo(5);
    expect(five.resources.find((r) => r.name === '石膚')!.max).toBe(2);
  });

  it('已消耗的差額入帳而非回滿——升級不是休息', () => {
    const four = levelTo(4);
    const used = {
      ...four,
      resources: four.resources.map((r) =>
        r.name === '石工直覺' ? { ...r, current: 0 } : r,
      ),
    };
    const five = applyLevelUp(used, planFor(used, used.speciesHpPerLevel), {});
    const r = five.resources.find((x) => x.name === '石工直覺')!;
    expect(r.max).toBe(3);
    expect(r.current).toBe(1); // 0 ＋（3 − 2）
  });
});
