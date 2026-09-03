import { describe, expect, it } from 'vitest';

import { SKILLS } from '@/lib/creation/data';
import {
  CustomSpecies,
  isValid,
  toSpeciesOption,
  validate,
} from './types';

/**
 * 驗證管結構、不管平衡（custom-species D2）。這裡兩件事都要測——擋掉該擋的，
 * 以及**不**擋掉只是強度誇張的東西。
 */

const base: CustomSpecies = CustomSpecies.parse({
  id: 'sp1',
  name: '石裔',
  speedFt: 25,
  sizeMode: 'small',
  darkvisionFt: 60,
  hpPerLevel: 1,
});

describe('CustomSpecies 驗證', () => {
  it('合法的最小內容', () => {
    expect(validate(base)).toBeNull();
  });

  it('名稱只有空白視為未填', () => {
    expect(isValid({ ...base, name: '   ' })).toBe(false);
  });

  it('速度必須是級距內的值', () => {
    expect(isValid({ ...base, speedFt: 33 })).toBe(false);
    expect(isValid({ ...base, speedFt: 60 })).toBe(false);
    expect(isValid({ ...base, speedFt: 40 })).toBe(true);
  });

  it('黑暗視覺、每級額外 HP、技能可選數越界即不合法', () => {
    expect(isValid({ ...base, darkvisionFt: 90 })).toBe(false);
    expect(isValid({ ...base, hpPerLevel: 3 })).toBe(false);
    expect(isValid({ ...base, skillPickCount: 3 })).toBe(false);
  });

  it('可選技能含未知名稱即不合法', () => {
    expect(
      isValid({ ...base, skillPickCount: 1, skillPickFrom: ['運動', '劍術'] }),
    ).toBe(false);
  });

  it('候選數必須比可選數多一個——一樣多就不是選擇', () => {
    expect(
      isValid({ ...base, skillPickCount: 1, skillPickFrom: ['運動'] }),
    ).toBe(false);
    expect(
      isValid({ ...base, skillPickCount: 1, skillPickFrom: ['運動', '求生'] }),
    ).toBe(true);
  });

  it('有限次數能力：名稱必填，次數與回復時機需為合法值', () => {
    expect(
      isValid({
        ...base,
        abilities: [{ name: ' ', uses: 1, recovery: 'long', description: '' }],
      }),
    ).toBe(false);
    expect(
      isValid({
        ...base,
        abilities: [
          { name: '石工直覺', uses: 'proficiency', recovery: 'long', description: '' },
        ],
      }),
    ).toBe(true);
  });

  it('條目數上限：特性 8 條、能力 4 則', () => {
    const trait = { name: 'x', nameEn: '', description: '' };
    expect(isValid({ ...base, traits: Array(9).fill(trait) })).toBe(false);
    const ability = { name: 'x', uses: 1 as const, recovery: 'long' as const, description: '' };
    expect(isValid({ ...base, abilities: Array(5).fill(ability) })).toBe(false);
  });

  it('強度誇張但結構合法——平衡是 DM 的職權，不是 App 的', () => {
    expect(
      isValid({
        ...base,
        speedFt: 40,
        darkvisionFt: 120,
        hpPerLevel: 2,
        skillPickCount: 2,
        skillPickFrom: SKILLS.map((s) => s.name),
        abilities: [
          { name: '無敵', uses: 3, recovery: 'short', description: '' },
        ],
      }),
    ).toBe(true);
  });
});

describe('toSpeciesOption', () => {
  it('固定中型／固定小型：sizeChoices 只有自己那一個，不出現選擇列', () => {
    const medium = toSpeciesOption({ ...base, sizeMode: 'medium' });
    expect(medium.size).toBe('Medium');
    expect(medium.sizeChoices).toEqual(['Medium']);

    const small = toSpeciesOption({ ...base, sizeMode: 'small' });
    expect(small.size).toBe('Small');
    expect(small.sizeChoices).toEqual(['Small']);
  });

  it('可選體型：兩個選項，預設值為中型', () => {
    const o = toSpeciesOption({ ...base, sizeMode: 'choice' });
    expect(o.sizeChoices).toEqual(['Medium', 'Small']);
    expect(o.size).toBe('Medium');
  });

  it('速度轉為建角流程的字串形狀', () => {
    expect(toSpeciesOption(base).speed).toBe('25ft');
  });

  it('英文名留空即空字串——角色快照的 speciesEn 跟著是空的', () => {
    expect(toSpeciesOption(base).en).toBe('');
  });

  it('黑暗視覺推導出特性條目，不必也不該手寫第二份', () => {
    const traits = toSpeciesOption(base).traits;
    expect(traits.map((t) => t.name)).toContain('黑暗視覺 60');
    expect(toSpeciesOption({ ...base, darkvisionFt: 0 }).traits).toEqual([]);
  });

  it('特性原樣映射，名稱空白的條目不寫出', () => {
    const o = toSpeciesOption({
      ...base,
      darkvisionFt: 0,
      traits: [
        { name: '石膚', nameEn: 'Stoneskin', description: '鈍擊抗性' },
        { name: '  ', nameEn: '', description: '填到一半的' },
      ],
    });
    expect(o.traits).toEqual([
      { name: '石膚', nameEn: 'Stoneskin', description: '鈍擊抗性' },
    ]);
  });

  it('一律標記 isCustom——建角清單靠它顯示「（自訂）」', () => {
    expect(toSpeciesOption(base).isCustom).toBe(true);
  });
});
