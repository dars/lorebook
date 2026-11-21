import { describe, expect, it } from 'vitest';
import { Character, Equipment, EquipmentEffect, parseCharacter } from '@/lib/domain/character';
import { effectiveAbility, equipmentStats, equipmentAcBonus, equipmentWeaponBonus, equipmentEffectActive, canEquip } from './equipment-effects';
import { attackEntries } from './attacks';
import { computeAc } from './ac';
import { applyLevelUp, planFor } from './level-up';
import { effectiveSpellDc } from './sorcerer';
import { applyChoices } from './progression/engine';
import { syncEquipmentAbilityResources } from './equipment-effects';

const base = () => Character.parse({ id: 'equipment', name: '測試', classNameEn: 'Fighter', level: 4, maxHp: 30, currentHp: 20, proficiencyBonus: 2, initiative: 3, passivePerception: 13,
  abilityScores: Object.fromEntries(['str', 'dex', 'con', 'int_', 'wis', 'cha'].map(key => [key, { score: 14, modifier: 2, proficientSave: true }])),
  skills: [{ name: '運動', nameEn: 'Athletics', abilityType: 'STR', modifier: 6, proficient: true, expertise: true }, { name: '察覺', nameEn: 'Perception', abilityType: 'WIS', modifier: 4, proficient: true }],
});
const gauntlets = (extra = {}) => Equipment.parse({ name: '食人魔力量護手', nameEn: 'Gauntlets of Ogre Power', itemType: 'gear', equipped: true, requiresAttunement: true, attuned: true, effects: [{ kind: 'abilityFloor', ability: 'str', value: 19 }], ...extra });

describe('裝備效果', () => {
  it('舊物品預設無效果；結構驗證拒絕非整數與無效範圍', () => {
    expect(Equipment.parse({ name: '繩索' })).toMatchObject({ effects: [], attuned: false, requiresAttunement: false });
    for (const value of [0, 31, 19.5, NaN]) expect(EquipmentEffect.safeParse({ kind: 'abilityFloor', ability: 'str', value }).success).toBe(false);
  });
  it('力量14變19並保留基值、熟練與技能額外加值', () => {
    const c = base(); c.equipment = [gauntlets()];
    expect(effectiveAbility(c, 'str')).toMatchObject({ score: 19, modifier: 4, proficientSave: true });
    expect(equipmentStats(c).skills[0].modifier).toBe(8);
    expect(effectiveAbility(c, 'str').modifier + c.proficiencyBonus).toBe(6);
    expect(c.abilityScores.str.score).toBe(14);
    expect(c.skills[0].modifier).toBe(6);
    c.equipment[0].equipped = false;
    expect(effectiveAbility(c, 'str').score).toBe(14);
  });
  it('原本力量20不降低；多個下限取高不相加', () => {
    const c = base(); c.equipment = [gauntlets(), Equipment.parse({ name: '力量腰帶', equipped: true, effects: [{ kind: 'abilityFloor', ability: 'str', value: 23 }] })];
    expect(effectiveAbility(c, 'str').score).toBe(23);
    c.equipment.pop(); c.abilityScores.str = { score: 20, modifier: 5, proficientSave: false };
    expect(effectiveAbility(c, 'str').score).toBe(20);
  });
  it('攜帶、未同調、耗盡及消耗品不啟用效果', () => {
    for (const extra of [{ equipped: false }, { attuned: false }, { quantity: 0 }, { itemType: 'consumable' }]) {
      const c = base(); c.equipment = [gauntlets(extra)];
      expect(equipmentEffectActive(c.equipment[0])).toBe(false);
      expect(effectiveAbility(c, 'str').score).toBe(14);
    }
  });
  it('同名副本與數量不乘算效果，不同物品加值相加並依上限決定', () => {
    const c = base();
    const ring = Equipment.parse({ name: '力量戒指', equipped: true, quantity: 5, effects: [{ kind: 'abilityBonus', ability: 'str', value: 2, max: 20 }] });
    c.equipment = [ring, ring, Equipment.parse({ name: '力量披風', equipped: true, effects: [{ kind: 'abilityBonus', ability: 'str', value: 8, max: 18 }] })];
    expect(effectiveAbility(c, 'str').score).toBe(20);
    c.equipment.reverse(); expect(effectiveAbility(c, 'str').score).toBe(20);
    c.equipment.push(gauntlets()); expect(effectiveAbility(c, 'str').score).toBe(20);
  });
  it('力量攻擊與傷害同步，靈巧武器仍取有效力量／敏捷較高者', () => {
    const c = base(); c.equipment = [gauntlets(), Equipment.parse({ name: '長劍', nameEn: 'Longsword', itemType: 'weapon', equipped: true, damage: '1d8' }), Equipment.parse({ name: '匕首', nameEn: 'Dagger', itemType: 'weapon', equipped: true, damage: '1d4', finesse: true })];
    expect(attackEntries(c).map(a => [a.hitBonus, a.damage])).toEqual([[6, '1d8+4'], [6, '1d4+4'], [6, '5']]);
  });
  it('武器加值僅作用本武器，未同調時不加，不影響徒手', () => {
    const c = base(); const weapon = Equipment.parse({ name: '魔劍', nameEn: 'Longsword', itemType: 'weapon', equipped: true, damage: '1d8', effects: [{ kind: 'weaponBonus', attack: 1, damage: 2 }] });
    c.equipment = [weapon, gauntlets()];
    expect(equipmentWeaponBonus(weapon)).toEqual({ attack: 1, damage: 2 });
    expect(attackEntries(c).map(a => [a.hitBonus, a.damage])).toEqual([[7, '1d8+6'], [6, '5']]);
    weapon.requiresAttunement = true;
    expect(equipmentWeaponBonus(weapon)).toEqual({ attack: 0, damage: 0 });
  });
  it('AC 加值疊加於敏捷或護甲公式，來源顯示裝備加值', () => {
    const c = base(); c.equipment = [Equipment.parse({ name: '守護披風', equipped: true, effects: [{ kind: 'acBonus', value: 1 }, { kind: 'abilityFloor', ability: 'dex', value: 19 }] })];
    expect(equipmentAcBonus(c)).toBe(1);
    expect(computeAc(c)).toEqual({ value: 15, label: '無甲・敏捷・裝備 +1' });
    c.equipment.push(Equipment.parse({ name: '板甲', itemType: 'armor', armorCategory: 'heavy', equipped: true, acBase: 18 }));
    expect(computeAc(c).value).toBe(19);
  });
  it('敏捷、感知、體質與施法差額保留既有額外加值', () => {
    const c = base(); c.spellcastingAbility = 'WIS'; c.spellDc = 13; c.spellAttack = 5;
    c.equipment = [Equipment.parse({ name: '自訂裝備', equipped: true, effects: ['dex', 'wis', 'con'].map(ability => ({ kind: 'abilityFloor', ability, value: 19 })) })];
    expect(equipmentStats(c)).toMatchObject({ initiative: 5, passivePerception: 15, maxHp: 38, spellDc: 15, spellAttack: 7 });
    expect(effectiveSpellDc(c)).toBe(15);
  });
  it('重載不重複套用；升級ASI使用基礎力量14並保留護手效果', () => {
    const c = base(); c.level = 3; c.equipment = [gauntlets()];
    const loaded = parseCharacter(JSON.parse(JSON.stringify(c)));
    expect(effectiveAbility(loaded, 'str').score).toBe(19);
    expect(effectiveAbility(parseCharacter(loaded), 'str').score).toBe(19);
    const next = applyLevelUp(loaded, planFor(loaded, 0), { asi: { STR: 2 } });
    expect(next.abilityScores.str.score).toBe(16);
    expect(effectiveAbility(next, 'str').score).toBe(19);
  });
  it('穿戴體質護符升級並加CON時，基值獨立且保留已受傷量', () => {
    const c = base(); c.level = 3; c.currentHp = 32;
    c.equipment = [Equipment.parse({ name: '體質護符', equipped: true, effects: [{ kind: 'abilityFloor', ability: 'con', value: 19 }] })];
    expect(equipmentStats(c).maxHp - c.currentHp).toBe(4);
    const next = applyLevelUp(c, planFor(c, 0), { asi: { CON: 2 } });
    expect(next.abilityScores.con.score).toBe(16);
    expect(effectiveAbility(next, 'con').score).toBe(19);
    expect(equipmentStats(next).maxHp - next.currentHp).toBe(4);
    expect(equipmentStats(parseCharacter(next)).maxHp).toBe(equipmentStats(next).maxHp);
  });
  it('補選永久CON提升不會把護符加值重算到HP，且重套不累積', () => {
    const c = base(); c.currentHp = 34;
    c.equipment = [Equipment.parse({ name: '體質護符', equipped: true, effects: [{ kind: 'abilityFloor', ability: 'con', value: 19 }] })];
    const choices = { 'feat-4': ['ASI'], 'feat-4/ability': ['CON:2'] };
    const catalog = { spells: [], items: [], feats: [] };
    const next = applyChoices(c, choices, catalog, 'backfill', false);
    expect(next.abilityScores.con.score).toBe(16);
    expect(equipmentStats(next).maxHp).toBe(38);
    expect(next.currentHp).toBe(34);
    expect(applyChoices(next, choices, catalog, 'backfill', false).currentHp).toBe(34);
  });
  it('能力相關資源穿脫保留已用次數，重載不會回滿', () => {
    const c = base(); c.classNameEn = 'Bard';
    c.resources = [{ name: '吟遊激勵', nameEn: 'Bardic Inspiration', current: 1, max: 2, recovery: 'long', display: 'pips', dieFaces: 6, unit: '次' }];
    c.equipment = [Equipment.parse({ name: '魅力項鍊', equipped: true, effects: [{ kind: 'abilityFloor', ability: 'cha', value: 19 }] })];
    const next = syncEquipmentAbilityResources(c);
    expect(next.resources[0]).toMatchObject({ max: 4, current: 3 });
    expect(parseCharacter(next).resources[0]).toMatchObject({ max: 4, current: 3 });
    next.equipment[0].equipped = false;
    expect(syncEquipmentAbilityResources(next).resources[0]).toMatchObject({ max: 2, current: 1 });
  });
  it('感知裝備也更新神聖職責加在智力技能上的額外修正', () => {
    const c = base(); c.progression = { selections: { 'divine-order': ['Thaumaturge'] }, restSpent: {}, grantedSkills: [], grantedTools: [], grantedLanguages: [] };
    c.skills = [{ name: '奧秘', nameEn: 'Arcana', abilityType: 'INT', modifier: 4, proficient: false, expertise: false }];
    c.equipment = [Equipment.parse({ name: '感知裝備', equipped: true, effects: [{ kind: 'abilityFloor', ability: 'wis', value: 19 }] })];
    expect(equipmentStats(c).skills[0].modifier).toBe(6);
  });

});


describe('可裝備相容判定', () => {
  it('舊武器護甲、已穿戴或有效果的裝備保持可裝備，其餘普通物品不顯示入口', () => {
    for (const values of [{ itemType: 'weapon' }, { itemType: 'armor' }, { equipped: true }, { effects: [{ kind: 'abilityFloor', ability: 'str', value: 19 }] }]) {
      expect(canEquip(Equipment.parse({ name: '舊物品', ...values }))).toBe(true);
    }
    expect(canEquip(Equipment.parse({ name: '繩索' }))).toBe(false);
    expect(canEquip(Equipment.parse({ name: '自訂護手', equippable: true }))).toBe(true);
    expect(canEquip(Equipment.parse({ name: '藥水', itemType: 'consumable', equippable: true }))).toBe(false);
  });
  it('明確停用可裝備優先於穿戴或效果，且解析會清除穿戴狀態', () => {
    const c = base();
    c.equipment = [gauntlets({ equippable: false })];
    expect(c.equipment[0].equipped).toBe(false);
    expect(canEquip(c.equipment[0])).toBe(false);
    expect(effectiveAbility(c, 'str').score).toBe(14);
    const armor = Equipment.parse({ name: '護甲', itemType: 'armor', armorCategory: 'heavy', acBase: 18, equipped: true });
    c.equipment.push({ ...armor, equippable: false });
    expect(computeAc(c).value).toBe(12);
    c.equipment.push({ ...Equipment.parse({ name: '武器', itemType: 'weapon', equipped: true, damage: '1d8' }), equippable: false });
    expect(attackEntries(c)).toHaveLength(1);
  });
});
