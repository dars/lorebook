import { beforeEach, describe, expect, it } from 'vitest';

import { parseCharacter } from '@/lib/domain/character';
import { characterActions, useCharacterStore } from './character-store';

const base = () =>
  parseCharacter({
    id: 'c1',
    name: '測試',
    maxHp: 20,
    currentHp: 20,
    tempHp: 0,
    spellSlots: [{ level: 1, total: 3, used: 0 }],
    resources: [{ name: '狂暴', current: 2, max: 2 }],
    abilityScores: Object.fromEntries(
      ['str', 'dex', 'con', 'int_', 'wis', 'cha'].map((k) => [
        k,
        { score: 10, modifier: 0 },
      ]),
    ),
  });

describe('角色編輯動作', () => {
  beforeEach(() => useCharacterStore.getState().load(base()));

  const c = () => useCharacterStore.getState().character!;

  it('受傷先扣臨時 HP，扣完才進本體', () => {
    characterActions.setTempHp(5);
    characterActions.adjustHp(-8);
    expect(c().tempHp).toBe(0);
    expect(c().currentHp).toBe(17); // 20 - (8 - 5)
  });

  it('臨時 HP 足以吸收時本體不減', () => {
    characterActions.setTempHp(10);
    characterActions.adjustHp(-4);
    expect(c().tempHp).toBe(6);
    expect(c().currentHp).toBe(20);
  });

  it('治療不補臨時 HP，且不超過最大值', () => {
    characterActions.adjustHp(-10);
    characterActions.adjustHp(100);
    expect(c().currentHp).toBe(20);
    expect(c().tempHp).toBe(0);
  });

  it('HP 下限為 0，不會變負', () => {
    characterActions.adjustHp(-999);
    expect(c().currentHp).toBe(0);
  });

  it('法術位消耗不超過總量、回復不低於 0', () => {
    characterActions.adjustSpellSlot(1, -5);
    expect(c().spellSlots[0].used).toBe(3);
    characterActions.adjustSpellSlot(1, 99);
    expect(c().spellSlots[0].used).toBe(0);
  });

  it('職業資源夾在 0 與上限之間', () => {
    characterActions.adjustResource('狂暴', -99);
    expect(c().resources[0].current).toBe(0);
    characterActions.adjustResource('狂暴', 99);
    expect(c().resources[0].current).toBe(2);
  });

  it('狀態異常可切換且不重複', () => {
    characterActions.toggleCondition('中毒');
    characterActions.toggleCondition('中毒');
    characterActions.toggleCondition('目盲');
    expect(c().conditions).toEqual(['目盲']);
  });

  it('任何編輯都標記為待推送；載入則清除', () => {
    expect(useCharacterStore.getState().dirty).toBe(false);
    characterActions.adjustHp(-1);
    expect(useCharacterStore.getState().dirty).toBe(true);
    useCharacterStore.getState().markSynced();
    expect(useCharacterStore.getState().dirty).toBe(false);
  });
});
