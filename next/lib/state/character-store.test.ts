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

describe('休息', () => {
  beforeEach(() => {
    useCharacterStore.getState().load({
      ...base(),
      level: 6,
      currentHp: 5,
      tempHp: 7,
      hitDiceUsed: 5,
      exhaustionLevel: 3,
      spellSlots: [{ level: 1, total: 3, used: 3 }],
      resources: [
        { name: '短休資源', nameEn: '', current: 0, max: 2, recovery: 'short', display: 'pips', dieFaces: 0, unit: '' },
        { name: '長休資源', nameEn: '', current: 0, max: 4, recovery: 'long', display: 'pips', dieFaces: 0, unit: '' },
      ],
    });
  });

  const c = () => useCharacterStore.getState().character!;

  it('短休只回短休資源，不動 HP 也不動長休資源', () => {
    characterActions.shortRest();
    expect(c().resources[0].current).toBe(2);
    expect(c().resources[1].current).toBe(0);
    expect(c().currentHp).toBe(5);
  });

  it('長休全回、清臨時 HP、力竭 −1、回一半生命骰', () => {
    characterActions.longRest();
    expect(c().currentHp).toBe(20);
    expect(c().tempHp).toBe(0);
    expect(c().spellSlots[0].used).toBe(0);
    expect(c().resources.every((r) => r.current === r.max)).toBe(true);
    expect(c().exhaustionLevel).toBe(2);
    expect(c().hitDiceUsed).toBe(2); // 6 級回 3 顆：5 - 3
  });

  it('生命骰用完就不再減——不擲骰、不自動改 HP', () => {
    useCharacterStore.getState().load({ ...base(), level: 2, hitDiceUsed: 2 });
    const hp = c().currentHp;
    characterActions.useHitDie();
    expect(c().hitDiceUsed).toBe(2);
    expect(c().currentHp).toBe(hp);
  });
});

describe('裝備', () => {
  const armor = {
    name: '鏈甲', nameEn: '', type: '', description: '', equipped: false,
    itemType: 'armor' as const, source: 'catalog' as const, quantity: 1,
    quest: false, priceCp: 0, catalogRef: '', damage: '', damageType: '',
    finesse: false, properties: [], armorCategory: 'medium' as const, acBase: 13,
  };

  beforeEach(() => {
    useCharacterStore.getState().load({
      ...base(),
      mageArmorActive: true,
      equipment: [
        armor,
        { ...armor, name: '盾牌', armorCategory: 'shield', acBase: 0 },
        { ...armor, name: '治療藥水', itemType: 'consumable', armorCategory: 'none', quantity: 2 },
        { ...armor, name: '任務信物', itemType: 'gear', armorCategory: 'none', quantity: 1, quest: true },
      ],
    });
  });

  const c = () => useCharacterStore.getState().character!;

  it('穿上非盾牌護甲時法師護甲自動關閉', () => {
    characterActions.toggleEquipped(0);
    expect(c().equipment[0].equipped).toBe(true);
    expect(c().mageArmorActive).toBe(false);
  });

  it('拿盾牌不影響法師護甲——盾牌不算著甲', () => {
    characterActions.toggleEquipped(1);
    expect(c().mageArmorActive).toBe(true);
  });

  it('卸甲不自動恢復法師護甲——那需要重新施法', () => {
    characterActions.toggleEquipped(0);
    characterActions.toggleEquipped(0);
    expect(c().equipment[0].equipped).toBe(false);
    expect(c().mageArmorActive).toBe(false);
  });

  it('消耗品用完自清單移除', () => {
    characterActions.useConsumable(2);
    expect(c().equipment[2].quantity).toBe(1);
    characterActions.useConsumable(2);
    expect(c().equipment.some((e) => e.name === '治療藥水')).toBe(false);
  });

  it('任務物品歸零仍保留——可能還有劇情用途', () => {
    const i = c().equipment.findIndex((e) => e.name === '任務信物');
    characterActions.useConsumable(i);
    const item = c().equipment.find((e) => e.name === '任務信物');
    expect(item?.quantity).toBe(0);
  });
});
