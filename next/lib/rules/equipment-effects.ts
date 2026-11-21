import type { Character, Equipment, EquipmentEffect } from '@/lib/domain/character';
import { abilityModifier } from './ability';

export const EQUIPMENT_ABILITIES = [
  ['str', '力量'], ['dex', '敏捷'], ['con', '體質'],
  ['int_', '智力'], ['wis', '感知'], ['cha', '魅力'],
] as const;
export type EquipmentAbilityKey = typeof EQUIPMENT_ABILITIES[number][0];

/** 舊物品保留穿戴與效果；繩索、口糧等普通物品不因此多出裝備按鈕。 */
export const canEquip = (item: Equipment) => item.itemType !== 'consumable' &&
  (item.equippable ?? (item.itemType === 'weapon' || item.itemType === 'armor' || item.equipped || !!item.effects?.length));
export const equipmentEffectActive = (item: Equipment) =>
  canEquip(item) && item.quantity > 0 && item.equipped && (!item.requiresAttunement || item.attuned);

/** 同名物品效果不重複；未啟用的副本不能擋住生效中的那一件。 */
export function activeEffectItems(c: Character): Equipment[] {
  const seen = new Set<string>();
  return c.equipment.filter(item => {
    if (!equipmentEffectActive(item) || !item.effects?.length) return false;
    const key = (item.nameEn.trim() || item.name.trim()).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function effectiveAbility(c: Character, key: EquipmentAbilityKey) {
  const base = c.abilityScores[key];
  const effects = activeEffectItems(c).flatMap(item => item.effects)
    .filter(effect => (effect.kind === 'abilityFloor' || effect.kind === 'abilityBonus') && effect.ability === key);
  if (!effects.length) return base;
  // 同一上限先合計；由低上限往高上限套用，結果不依物品排列順序改變。
  const bonuses = new Map<number, number>();
  let floor = base.score;
  for (const effect of effects) {
    if (effect.kind === 'abilityFloor') floor = Math.max(floor, effect.value);
    if (effect.kind === 'abilityBonus') {
      const cap = effect.max ?? 30;
      bonuses.set(cap, (bonuses.get(cap) ?? 0) + effect.value);
    }
  }
  let score = base.score;
  for (const [cap, bonus] of [...bonuses].sort(([a], [b]) => a - b)) {
    score = Math.max(score, Math.min(cap, score + bonus));
  }
  score = Math.max(base.score, Math.min(30, Math.max(score, floor)));
  return score === base.score ? base : { ...base, score, modifier: abilityModifier(score) };
}

/** 只回傳衍生欄位，不能把暫時的角色快照送進永久成長或同步。 */
export function equipmentStats(c: Character) {
  const abilityScores = { ...c.abilityScores };
  const delta = (key: EquipmentAbilityKey) => abilityScores[key].modifier - c.abilityScores[key].modifier;
  for (const [key] of EQUIPMENT_ABILITIES) abilityScores[key] = effectiveAbility(c, key);
  const abilityKey = (code: string) => (code === 'INT' ? 'int_' : code.toLowerCase()) as EquipmentAbilityKey;
  const selections = c.progression?.selections ?? {};
  const boosted = selections['divine-order']?.includes('Thaumaturge') ? ['Arcana', 'Religion']
    : selections['primal-order']?.includes('Magician') ? ['Arcana', 'Nature'] : [];
  const wisdomBonusDelta = Math.max(1, abilityScores.wis.modifier) - Math.max(1, c.abilityScores.wis.modifier);
  const skills = c.skills.map(skill => {
    const key = abilityKey(skill.abilityType);
    return { ...skill, modifier: skill.modifier + (abilityScores[key] ? delta(key) : 0) + (boosted.includes(skill.nameEn) ? wisdomBonusDelta : 0) };
  });
  const casterKey = abilityKey(c.spellcastingAbility);
  const castingDelta = abilityScores[casterKey] ? delta(casterKey) : 0;
  return {
    abilityScores,
    skills,
    initiative: c.initiative + delta('dex'),
    passivePerception: c.passivePerception + delta('wis'),
    spellAttack: c.spellAttack + castingDelta,
    spellDc: c.spellDc > 0 ? c.spellDc + castingDelta : c.spellDc,
    maxHp: Math.max(1, c.maxHp + delta('con') * c.level),
  };
}

export function equipmentAcBonus(c: Character) {
  return activeEffectItems(c).flatMap(item => item.effects).reduce((sum, effect) => sum + (effect.kind === 'acBonus' ? effect.value : 0), 0);
}

export function equipmentWeaponBonus(item: Equipment) {
  const bonus = { attack: 0, damage: 0 };
  if (!equipmentEffectActive(item)) return bonus;
  for (const effect of item.effects ?? []) if (effect.kind === 'weaponBonus') {
    bonus.attack += effect.attack;
    bonus.damage += effect.damage;
  }
  return bonus;
}

export function abilityEquipmentSources(c: Character, key: EquipmentAbilityKey) {
  return activeEffectItems(c).filter(item => item.effects.some(effect =>
    (effect.kind === 'abilityFloor' || effect.kind === 'abilityBonus') && effect.ability === key,
  )).map(item => item.name);
}

export function equipmentEffectLabel(effect: EquipmentEffect): string {
  const ability = 'ability' in effect ? EQUIPMENT_ABILITIES.find(([key]) => key === effect.ability)?.[1] : '';
  switch (effect.kind) {
    case 'abilityFloor': return `${ability}至少 ${effect.value}`;
    case 'abilityBonus': return `${ability} +${effect.value}${effect.max ? `（上限 ${effect.max}）` : ''}`;
    case 'acBonus': return `AC +${effect.value}`;
    case 'weaponBonus': return `此武器命中 +${effect.attack}／傷害 +${effect.damage}`;
  }
}

/** 變更體質裝備時保持已受傷量；穿戴不會讓 0 HP 的角色復活。 */
export function reconcileEquipmentHp(before: Character, after: Character): Character {
  const delta = (equipmentStats(after).maxHp - after.maxHp) - (equipmentStats(before).maxHp - before.maxHp);
  if (!delta) return after;
  return { ...after, currentHp: after.currentHp <= 0 ? 0 : Math.max(0, Math.min(equipmentStats(after).maxHp, after.currentHp + delta)) };
}

/** 能力相關資源保留已花用差額，避免穿脫或重載回滿。 */
export function syncEquipmentAbilityResources(c: Character): Character {
  const keys: Record<string, [string, EquipmentAbilityKey]> = {
    'Bardic Inspiration': ['Bard', 'cha'], 'Wholeness of Body': ['Monk', 'wis'],
    'Tireless': ['Ranger', 'wis'], 'Nature’s Veil': ['Ranger', 'wis'], "Dark One's Own Luck": ['Warlock', 'cha'],
  };
  return { ...c, resources: c.resources.map(resource => {
    const scaling = keys[resource.nameEn];
    if (!scaling || scaling[0] !== c.classNameEn || resource.subclassFeatureKey) return resource;
    const key = scaling[1];
    const max = Math.max(1, effectiveAbility(c, key).modifier);
    return max === resource.max ? resource : { ...resource, max, current: Math.min(max, Math.max(0, resource.current + max - resource.max)) };
  }) };
}
