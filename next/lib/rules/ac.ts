import type { Character, Equipment } from '@/lib/domain/character';

/**
 * AC 推導，移植自 Flutter 端 `derived_stats.dart` 的 `computeAc`。
 * 驗收依據為 golden/compute_ac.json（15 個案例涵蓋全部分支）。
 */

export type AcResult = {
  value: number;
  /** 推導依據註記（如「無甲・敏捷」「鏈甲・盾牌」「法師護甲」）。 */
  label: string;
};

export const wearingArmor = (c: Character) =>
  c.equipment.some(
    (e) =>
      e.equipped &&
      e.itemType === 'armor' &&
      e.armorCategory !== 'shield' &&
      e.armorCategory !== 'none',
  );

export const wieldingShield = (c: Character) =>
  c.equipment.some(
    (e) => e.equipped && e.itemType === 'armor' && e.armorCategory === 'shield',
  );

/** 已裝備的身體護甲（不含盾牌）。 */
export function equippedBodyArmor(c: Character): Equipment | undefined {
  return c.equipment.find(
    (e) => e.equipped && e.itemType === 'armor' && e.armorCategory !== 'shield',
  );
}

export function computeAc(c: Character): AcResult {
  const dex = c.abilityScores.dex.modifier;
  const shield = wieldingShield(c);
  const shieldBonus = shield ? 2 : 0;
  const shieldSuffix = shield ? '・盾牌' : '';

  const armor = equippedBodyArmor(c);
  if (armor) {
    let base: number;
    switch (armor.armorCategory) {
      case 'light':
        base = armor.acBase + dex;
        break;
      case 'medium':
        // 中甲的敏捷上限 +2。敏捷 +1 時全額計入，不補到 2。
        base = armor.acBase + Math.min(dex, 2);
        break;
      case 'heavy':
        base = armor.acBase;
        break;
      default:
        if (armor.acBase <= 0) {
          // 自訂護甲缺推導資料：回退舊的靜態 ac 欄位。
          return { value: c.ac + shieldBonus, label: `${armor.name}${shieldSuffix}` };
        }
        base = armor.acBase;
    }
    return { value: base + shieldBonus, label: `${armor.name}${shieldSuffix}` };
  }

  // 未著甲：候選公式**取最高**，不是後者覆蓋前者。
  let value = 10 + dex;
  let label = '無甲・敏捷';

  if (c.classNameEn === 'Barbarian') {
    // 野蠻人的無甲防禦持盾仍有效。
    const v = 10 + dex + c.abilityScores.con.modifier;
    if (v > value) {
      value = v;
      label = '無甲防禦';
    }
  }
  if (c.classNameEn === 'Monk' && !shield) {
    // 武僧持盾則無甲防禦失效——與野蠻人的差別，重寫時最容易漏掉的一條。
    const v = 10 + dex + c.abilityScores.wis.modifier;
    if (v > value) {
      value = v;
      label = '無甲防禦';
    }
  }
  if (c.mageArmorActive) {
    const v = 13 + dex;
    if (v > value) {
      value = v;
      label = '法師護甲';
    }
  }

  return { value: value + shieldBonus, label: `${label}${shieldSuffix}` };
}
