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

export const wearingHeavyArmor = (c: Character) =>
  c.equipment.some(
    (e) => e.equipped && e.itemType === 'armor' && e.armorCategory === 'heavy',
  );

/** 角色是否已知法師護甲——決定行動頁的開關要不要出現。 */
export const knowsMageArmor = (c: Character) =>
  [...c.spells,...(c.spellbook??[])].some((s) => !s.homebrewId && (s.nameEn === 'Mage Armor'||s.name==='法師護甲'));

/**
 * SRD 5.2 中帶「無甲／非重甲」條件的職業特性對照，移植自 Flutter 端的
 * `featureArmorViolation`。條件不滿足時回傳提示文字，滿足回傳 null。
 *
 * 刻意是**固定清單**而非通用條件引擎：SRD 範圍內就這幾條，寫成引擎要先發明
 * 一套條件語法，而那套語法沒有第二個使用者。
 *
 * 沒有這個提示的後果不是「少個標示」——武僧穿上鎧甲後清單仍原樣列著
 * 「無甲防禦」，使用者會照著它算 AC。
 */
export function featureArmorViolation(
  c: Character,
  f: { nameEn: string },
): string | null {
  const armored = wearingArmor(c);
  const shield = wieldingShield(c);
  switch (f.nameEn) {
    case 'Unarmored Defense':
      // 野蠻人持盾仍有效，武僧不行——兩者的差別是這裡最容易漏掉的一條。
      if (c.classNameEn === 'Monk') {
        if (armored || shield) return armored ? '著甲中失效' : '持盾中失效';
      } else if (armored) {
        return '著甲中失效';
      }
      return null;
    case 'Martial Arts':
    case 'Unarmored Movement':
      if (armored || shield) return armored ? '著甲中失效' : '持盾中失效';
      return null;
    case 'Fast Movement':
      return wearingHeavyArmor(c) ? '著重甲中失效' : null;
    default:
      return null;
  }
}

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

  const defense = wearingArmor(c) && c.features.some(f=>!f.isCustom&&f.nameEn==='Defense') ? 1 : 0;
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
    return { value: base + shieldBonus + defense, label: `${armor.name}${shieldSuffix}${defense ? '・防禦風格' : ''}` };
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
