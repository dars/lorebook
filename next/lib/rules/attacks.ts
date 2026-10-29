import type { Character } from '@/lib/domain/character';

/**
 * 攻擊列推導，移植自 Flutter 端 `derived_stats.dart` 的 `attackEntries`。
 * 驗收依據為 golden/attack_entries.json。
 */

export type AttackEntry = {
  name: string;
  nameEn: string;
  /** null = 機制資料不足，僅顯示名稱。 */
  hitBonus: number | null;
  damage: string | null;
  damageType: string;
  quantity: number;
  unarmed: boolean;
  /** 武器屬性標籤（thrown/versatile…），展開卡片時顯示。 */
  properties: string[];
};

/**
 * 攻擊列 ＝ 裝備中的武器 ＋ **固定一列徒手攻擊**。
 *
 * 武器命中＝屬性調整值（finesse 取力／敏較高）＋熟練；傷害＝傷害骰＋同屬性
 * 調整值。徒手（2024 全角色皆有）：命中＝力調＋熟練，傷害＝1＋力調，下限 0。
 */
export function attackEntries(c: Character): AttackEntry[] {
  const str = c.abilityScores.str.modifier;
  const dex = c.abilityScores.dex.modifier;
  const prof = c.proficiencyBonus;

  const entries: AttackEntry[] = [];

  for (const e of c.equipment) {
    if (e.itemType !== 'weapon' || !e.equipped) continue;

    if (e.damage === '') {
      // 缺機制資料：降級為僅顯示名稱，不猜測數值。
      entries.push({
        name: e.name,
        nameEn: e.nameEn,
        hitBonus: null,
        damage: null,
        damageType: '',
        quantity: e.quantity,
        unarmed: false,
        properties: e.properties,
      });
      continue;
    }

    const ranged = ['Dart','Shortbow','Sling','Light Crossbow','Blowgun','Hand Crossbow','Heavy Crossbow','Longbow','Pistol','Musket'].includes(e.nameEn);
    const archery = ranged && c.features.some(f=>!f.isCustom&&f.nameEn==='Archery') ? 2 : 0;
    const mod = e.finesse ? Math.max(str, dex) : ranged ? dex : str;
    const damage =
      mod === 0 ? e.damage : `${e.damage}${mod > 0 ? `+${mod}` : `${mod}`}`;

    entries.push({
      name: e.name,
      nameEn: e.nameEn,
      hitBonus: mod + prof + archery,
      damage,
      damageType: e.damageType,
      quantity: e.quantity,
      unarmed: false,
      properties: e.properties,
    });
  }

  entries.push({
    name: '徒手攻擊',
    nameEn: 'Unarmed Strike',
    hitBonus: str + prof,
    damage: `${Math.max(0, 1 + str)}`,
    damageType: 'bludgeoning',
    quantity: 1,
    unarmed: true,
    properties: [],
  });

  return entries;
}
