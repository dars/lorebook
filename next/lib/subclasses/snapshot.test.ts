import { describe, expect, it } from 'vitest';

import { parseCharacter } from '@/lib/domain/character';

/**
 * 快照語意的驗收：**後續等級不回查來源表**。
 *
 * 這裡守的是「刪掉自訂子職不會讓角色升不上去」——那個失效模式不會報錯，
 * 只會讓玩家在 6 級時發現特性沒進來。
 */
const base = {
  id: 'c',
  name: '測試',
  abilityScores: Object.fromEntries(
    ['str', 'dex', 'con', 'int_', 'wis', 'cha'].map((k) => [
      k,
      { score: 10, modifier: 0 },
    ]),
  ),
};

const snapshot = {
  id: 'sub-1',
  name: '烈焰學派',
  nameEn: 'Pyromancy',
  classEn: 'Wizard',
  levels: [3, 6, 10, 14],
  features: [
    { level: 3, name: '烈焰親和', description: '對火焰有親和力。' },
    { level: 3, name: '餘燼', description: '' },
    { level: 6, name: '烈焰之軀', description: '' },
    { level: 10, name: '焚盡', description: '' },
  ],
};

describe('自訂子職快照', () => {
  it('整份定義存進角色卡，含所有等級的特性', () => {
    const c = parseCharacter({ ...base, customSubclass: snapshot });
    expect(c.customSubclass?.features).toHaveLength(4);
    // 只存當級就會漏掉 6/10 級——那正是要避免的。
    expect(c.customSubclass?.features.map((f) => f.level)).toEqual([3, 3, 6, 10]);
  });

  it('SRD 子職時為 null', () => {
    const c = parseCharacter({ ...base, subclass: '塑能師' });
    expect(c.customSubclass).toBeNull();
  });

  it('舊角色沒有這個欄位也能解析', () => {
    expect(parseCharacter(base).customSubclass).toBeNull();
  });

  it('可自快照取出指定等級的特性——不需要來源表', () => {
    const c = parseCharacter({ ...base, customSubclass: snapshot });
    const atSix = c.customSubclass!.features.filter((f) => f.level === 6);
    expect(atSix.map((f) => f.name)).toEqual(['烈焰之軀']);
  });

  it('3 級時取 ≤ 目標等級，一次補齊', () => {
    const c = parseCharacter({ ...base, customSubclass: snapshot });
    const upToThree = c.customSubclass!.features.filter((f) => f.level <= 3);
    expect(upToThree).toHaveLength(2);
  });
});
