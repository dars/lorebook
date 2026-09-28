import { describe, expect, it } from 'vitest';

import { Character as CharacterSchema } from '@/lib/domain/character';
import { applySubclassPick, findSrdSubclass, needsSubclassPick } from './level-up';

const ability = { score: 10, modifier: 0 };
const make = (over: Record<string, unknown>) =>
  CharacterSchema.parse({
    id: 'c1',
    name: '測試',
    className: '法師',
    classNameEn: 'Wizard',
    level: 5,
    abilityScores: {
      str: ability, dex: ability, con: ability,
      int_: ability, wis: ability, cha: ability,
    },
    ...over,
  });

describe('補選子職', () => {
  it('3 級以上沒有子職＝當初被跳過了', () => {
    expect(needsSubclassPick(make({ level: 3, subclass: '' }))).toBe(true);
    expect(needsSubclassPick(make({ level: 20, subclass: '' }))).toBe(true);
  });

  it('已經有子職就不需要補選——這個入口不是換子職的後門', () => {
    expect(needsSubclassPick(make({ level: 5, subclass: '塑能學派' }))).toBe(false);
  });

  it('只有空白字元的子職名視為沒有', () => {
    expect(needsSubclassPick(make({ level: 5, subclass: '  ' }))).toBe(true);
  });

  it('還沒到 3 級不需要補選', () => {
    expect(needsSubclassPick(make({ level: 2, subclass: '' }))).toBe(false);
  });

  it('自訂子職的角色也算已有子職', () => {
    const c = make({
      level: 5,
      subclass: '',
      customSubclass: { id: 's1', name: '我的子職', classEn: 'Wizard', features: [] },
    });
    expect(needsSubclassPick(c)).toBe(false);
  });

  // 補選不是升級——走 applyLevelUp 會把等級也加上去。
  it('寫入子職與特性，等級與數值原封不動', () => {
    const before = make({ level: 5, subclass: '', maxHp: 30, currentHp: 12 });
    const after = applySubclassPick(before, {
      subclass: '塑能學派',
      subclassEn: 'Evoker',
      features: [
        { name: '塑能法術學者', nameEn: '', source: '子職：塑能學派', description: '', isCustom: false },
      ],
    });

    expect(after.subclass).toBe('塑能學派');
    expect(after.subclassEn).toBe('Evoker');
    expect(after.features).toHaveLength(before.features.length + 1);

    expect(after.level).toBe(5);
    expect(after.maxHp).toBe(30);
    expect(after.currentHp).toBe(12);
    expect(after.proficiencyBonus).toBe(before.proficiencyBonus);
    expect(after.spellSlots).toEqual(before.spellSlots);
  });

  it('保留既有特性，只往後追加', () => {
    const before = make({
      level: 3,
      subclass: '',
      features: [{ name: '奧術復甦', nameEn: 'Arcane Recovery' }],
    });
    const after = applySubclassPick(before, {
      subclass: 'X',
      features: [
        { name: 'Y', nameEn: '', source: '', description: '', isCustom: false },
      ],
    });
    expect(after.features.map((f) => f.name)).toEqual(['奧術復甦', 'Y']);
  });
});

describe('已有 SRD 子職對回內容庫', () => {
  const subs = [
    { name: '塑能師', eng_name: 'Evoker', short_name: 'Evoker' },
    { name: '奉獻誓言', eng_name: 'Oath of Devotion', short_name: 'Devotion' },
  ];

  it('以英文名比對', () => {
    expect(findSrdSubclass(subs, make({ subclass: '塑能師', subclassEn: 'Evoker' }))?.short_name).toBe('Evoker');
  });

  it('2014 舊名對照到 2024——示範角色存的是 School of Evocation', () => {
    expect(
      findSrdSubclass(subs, make({ subclass: '塑能學派', subclassEn: 'School of Evocation' }))?.short_name,
    ).toBe('Evoker');
  });

  it('英文名缺漏時以中文名比對', () => {
    expect(findSrdSubclass(subs, make({ subclass: '奉獻誓言', subclassEn: '' }))?.short_name).toBe('Devotion');
  });

  it('對不到（自訂子職、尚未選）回 null', () => {
    expect(findSrdSubclass(subs, make({ subclass: '我的子職', subclassEn: '' }))).toBeNull();
    expect(findSrdSubclass(subs, make({ subclass: '', subclassEn: '' }))).toBeNull();
  });
});
