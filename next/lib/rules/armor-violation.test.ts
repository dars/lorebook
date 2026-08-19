import { describe, expect, it } from 'vitest';

import { Character as CharacterSchema } from '@/lib/domain/character';
import { featureArmorViolation, knowsMageArmor } from './ac';

const ability = { score: 10, modifier: 0 };
const make = (over: Record<string, unknown>) =>
  CharacterSchema.parse({
    id: 'c1',
    name: '測試',
    level: 5,
    abilityScores: {
      str: ability, dex: ability, con: ability,
      int_: ability, wis: ability, cha: ability,
    },
    ...over,
  });

const armor = (category: string) => ({
  name: '測試護甲',
  itemType: 'armor',
  armorCategory: category,
  equipped: true,
});

describe('著甲條件特性', () => {
  const unarmoredDefense = { nameEn: 'Unarmored Defense' };

  it('武僧著甲或持盾都失效', () => {
    const monk = (equipment: unknown[]) =>
      make({ classNameEn: 'Monk', equipment });
    expect(featureArmorViolation(monk([]), unarmoredDefense)).toBeNull();
    expect(featureArmorViolation(monk([armor('medium')]), unarmoredDefense)).toBe(
      '著甲中失效',
    );
    expect(featureArmorViolation(monk([armor('shield')]), unarmoredDefense)).toBe(
      '持盾中失效',
    );
  });

  // 兩者的差別是移植時最容易漏的一條。
  it('野蠻人持盾仍有效，只有著甲才失效', () => {
    const barb = (equipment: unknown[]) =>
      make({ classNameEn: 'Barbarian', equipment });
    expect(featureArmorViolation(barb([armor('shield')]), unarmoredDefense)).toBeNull();
    expect(featureArmorViolation(barb([armor('heavy')]), unarmoredDefense)).toBe(
      '著甲中失效',
    );
  });

  it('武術與無甲移動：著甲或持盾都失效', () => {
    const c = make({ classNameEn: 'Monk', equipment: [armor('shield')] });
    expect(featureArmorViolation(c, { nameEn: 'Martial Arts' })).toBe('持盾中失效');
    expect(featureArmorViolation(c, { nameEn: 'Unarmored Movement' })).toBe(
      '持盾中失效',
    );
  });

  it('疾行只有重甲才失效', () => {
    const barb = (equipment: unknown[]) =>
      make({ classNameEn: 'Barbarian', equipment });
    const fast = { nameEn: 'Fast Movement' };
    expect(featureArmorViolation(barb([armor('medium')]), fast)).toBeNull();
    expect(featureArmorViolation(barb([armor('heavy')]), fast)).toBe('著重甲中失效');
  });

  it('未裝備的護甲不算數', () => {
    const c = make({
      classNameEn: 'Barbarian',
      equipment: [{ ...armor('heavy'), equipped: false }],
    });
    expect(featureArmorViolation(c, unarmoredDefense)).toBeNull();
  });

  it('清單外的特性一律不標', () => {
    const c = make({ classNameEn: 'Monk', equipment: [armor('heavy')] });
    expect(featureArmorViolation(c, { nameEn: 'Rage' })).toBeNull();
    expect(featureArmorViolation(c, { nameEn: '' })).toBeNull();
  });
});

describe('是否會法師護甲', () => {
  it('法術清單含 Mage Armor 才算', () => {
    expect(knowsMageArmor(make({}))).toBe(false);
    expect(
      knowsMageArmor(
        make({ spells: [{ name: '法師護甲', nameEn: 'Mage Armor', level: 1 }] }),
      ),
    ).toBe(true);
  });

  it('會別的法術不算——戰士不該看到那顆開關', () => {
    const c = make({
      classNameEn: 'Fighter',
      spells: [{ name: '護盾術', nameEn: 'Shield', level: 1 }],
    });
    expect(knowsMageArmor(c)).toBe(false);
  });
});
