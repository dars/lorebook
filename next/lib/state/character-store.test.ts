import { beforeEach, describe, expect, it } from 'vitest';

import { type Character, parseCharacter } from '@/lib/domain/character';
import { characterActions, useCharacterStore } from './character-store';

/**
 * 測試用的載入：先 clear 再 load。
 *
 * `load` 會保護「同一張卡且有未推送變更」的本機狀態（切分頁不該還原編輯），
 * 所以測試之間若不先清空，第二次以後的 load 都會被略過、狀態互相污染。
 */
const loadFresh = (c: Character) => {
  const store = useCharacterStore.getState();
  store.clear();
  store.load(c);
};

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
  // 先 clear 再 load：`load` 現在會保護「同一張卡且有未推送變更」的本機狀態，
  // 直接 load 同一個 id 會被略過，測試之間就會互相污染。
  beforeEach(() => loadFresh(base()));

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
    loadFresh({
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

  // 專注會被長休打斷是規則行為（長休包含睡眠）。漏掉的話玩家會帶著一個早該
  // 結束的專注法術繼續跑，而畫面上看起來完全正常——沒有任何徵兆可循。
  it('長休結束專注，短休不動它', () => {
    characterActions.setConcentration('祝福術');
    expect(c().concentrationSpell).toBe('祝福術');

    characterActions.shortRest();
    expect(c().concentrationSpell).toBe('祝福術');

    characterActions.longRest();
    expect(c().concentrationSpell).toBeNull();
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
    loadFresh({ ...base(), level: 2, hitDiceUsed: 2 });
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
    loadFresh({
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

describe('載入不覆蓋未推送的變更', () => {
  it('同一張卡且有未推送變更時，load 保留本機版本', () => {
    // 切分頁會讓 DecisionView / CharacterSheetLive 卸載重掛並再 load 一次
    // initial。沒有這道保護，剛卸下的裝備、剛扣的血會在切分頁時被還原。
    loadFresh(base());
    characterActions.adjustHp(-5);
    const local = useCharacterStore.getState().character!.currentHp;

    useCharacterStore.getState().load(base());
    expect(useCharacterStore.getState().character!.currentHp).toBe(local);
  });

  it('推送成功後（dirty 清掉）就會吃新的伺服器資料', () => {
    loadFresh(base());
    characterActions.adjustHp(-5);
    useCharacterStore.getState().markSynced();

    useCharacterStore.getState().load({ ...base(), currentHp: 17 });
    expect(useCharacterStore.getState().character!.currentHp).toBe(17);
  });

  it('換一張卡一律載入，不受 dirty 影響', () => {
    loadFresh(base());
    characterActions.adjustHp(-5);

    useCharacterStore.getState().load({ ...base(), id: 'c2', name: '另一隻' });
    expect(useCharacterStore.getState().character!.name).toBe('另一隻');
  });
});
