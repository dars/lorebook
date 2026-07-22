import 'dart:math' as math;

import 'character.dart';

// ─────────────────────────────────────────── 裝備狀態判定（純函式）

/// 著甲中：任一非盾牌護甲裝備中。
bool wearingArmor(Character c) => c.equipment.any(
  (e) =>
      e.itemType == ItemType.armor &&
      e.equipped &&
      e.armorCategory != ArmorCategory.shield,
);

/// 著重甲中。
bool wearingHeavyArmor(Character c) => c.equipment.any(
  (e) =>
      e.itemType == ItemType.armor &&
      e.equipped &&
      e.armorCategory == ArmorCategory.heavy,
);

/// 持盾中。
bool wieldingShield(Character c) => c.equipment.any(
  (e) =>
      e.itemType == ItemType.armor &&
      e.equipped &&
      e.armorCategory == ArmorCategory.shield,
);

/// 裝備中的（第一件）非盾牌護甲；null = 未著甲。
Equipment? equippedBodyArmor(Character c) {
  for (final e in c.equipment) {
    if (e.itemType == ItemType.armor &&
        e.equipped &&
        e.armorCategory != ArmorCategory.shield) {
      return e;
    }
  }
  return null;
}

// ─────────────────────────────────────────── AC 推導

class AcResult {
  final int value;

  /// 推導依據註記（如「無甲・敏捷」「鏈甲・盾牌」「法師護甲」）。
  final String label;

  const AcResult(this.value, this.label);
}

/// AC 推導（equipment-effects 規格）：
/// - 著甲：依護甲 AC 公式（輕 base+Dex／中 base+Dex≤2／重 base）
/// - 未著甲：一般無甲 10+Dex、無甲防禦（野蠻人 10+Dex+Con 持盾有效；
///   武僧 10+Dex+Wis 持盾失效）、法師護甲 13+Dex——候選取最高
/// - 盾牌 +2 疊加於當前有效公式
/// - 自訂護甲缺 AC 參數（acBase=0 且無類別）時回退舊 `ac` 欄位顯示
AcResult computeAc(Character c) {
  final dex = c.abilityScores.dex.modifier;
  final shield = wieldingShield(c);
  final shieldBonus = shield ? 2 : 0;
  final shieldSuffix = shield ? '・盾牌' : '';

  final armor = equippedBodyArmor(c);
  if (armor != null) {
    final int base;
    switch (armor.armorCategory) {
      case ArmorCategory.light:
        base = armor.acBase + dex;
      case ArmorCategory.medium:
        base = armor.acBase + math.min(dex, 2);
      case ArmorCategory.heavy:
        base = armor.acBase;
      case ArmorCategory.none:
      case ArmorCategory.shield:
        if (armor.acBase <= 0) {
          // 自訂護甲缺推導資料：回退舊靜態欄位。
          return AcResult(c.ac + shieldBonus, '${armor.name}$shieldSuffix');
        }
        base = armor.acBase;
    }
    return AcResult(base + shieldBonus, '${armor.name}$shieldSuffix');
  }

  // 未著甲：候選公式取最高。
  var value = 10 + dex;
  var label = '無甲・敏捷';
  if (c.classNameEn == 'Barbarian') {
    final v = 10 + dex + c.abilityScores.con.modifier;
    if (v > value) {
      value = v;
      label = '無甲防禦';
    }
  }
  if (c.classNameEn == 'Monk' && !shield) {
    final v = 10 + dex + c.abilityScores.wis.modifier;
    if (v > value) {
      value = v;
      label = '無甲防禦';
    }
  }
  if (c.mageArmorActive) {
    final v = 13 + dex;
    if (v > value) {
      value = v;
      label = '法師護甲';
    }
  }
  return AcResult(value + shieldBonus, '$label$shieldSuffix');
}

// ─────────────────────────────────────────── 攻擊列推導

class AttackEntry {
  final String name;
  final String nameEn;

  /// null = 機制資料不足，僅顯示名稱。
  final int? hitBonus;
  final String? damage;
  final String damageType;
  final int quantity;
  final bool unarmed;

  /// 武器屬性標籤（thrown/versatile…），展開卡片時顯示。
  final List<String> properties;

  const AttackEntry({
    required this.name,
    required this.nameEn,
    this.hitBonus,
    this.damage,
    this.damageType = '',
    this.quantity = 1,
    this.unarmed = false,
    this.properties = const [],
  });
}

/// 攻擊列（equipment-effects 規格）＝裝備中武器＋固定一列徒手攻擊。
/// 武器命中＝屬性調整值（finesse 取力/敏較高）＋熟練；傷害＝傷害骰＋同屬性
/// 調整值。徒手（2024 全角色）：命中＝力調＋熟練；傷害＝1＋力調 鈍擊。
List<AttackEntry> attackEntries(Character c) {
  final str = c.abilityScores.str.modifier;
  final dex = c.abilityScores.dex.modifier;
  final prof = c.proficiencyBonus;

  final entries = <AttackEntry>[];
  for (final e in c.equipment) {
    if (e.itemType != ItemType.weapon || !e.equipped) continue;
    if (e.damage.isEmpty) {
      entries.add(
        AttackEntry(
          name: e.name,
          nameEn: e.nameEn,
          quantity: e.quantity,
          properties: e.properties,
        ),
      );
      continue;
    }
    final mod = e.finesse ? math.max(str, dex) : str;
    final dmg = mod == 0
        ? e.damage
        : '${e.damage}${mod > 0 ? '+$mod' : '$mod'}';
    entries.add(
      AttackEntry(
        name: e.name,
        nameEn: e.nameEn,
        hitBonus: mod + prof,
        damage: dmg,
        damageType: e.damageType,
        quantity: e.quantity,
        properties: e.properties,
      ),
    );
  }

  entries.add(
    AttackEntry(
      name: '徒手攻擊',
      nameEn: 'Unarmed Strike',
      hitBonus: str + prof,
      damage: '${math.max(0, 1 + str)}',
      damageType: 'bludgeoning',
      unarmed: true,
    ),
  );
  return entries;
}

// ─────────────────────────────────────────── 著甲條件特性提示

/// SRD 5.2 明定「無甲/非重甲」條件的職業特性對照（App 內建固定清單，
/// 不做通用條件引擎）。條件不滿足時回傳提示文字，滿足回傳 null。
String? featureArmorViolation(Character c, CharacterFeature f) {
  final armored = wearingArmor(c);
  final shield = wieldingShield(c);
  switch (f.nameEn) {
    case 'Unarmored Defense':
      if (c.classNameEn == 'Monk') {
        if (armored || shield) return armored ? '著甲中失效' : '持盾中失效';
      } else if (armored) {
        return '著甲中失效'; // 野蠻人：持盾仍有效
      }
      return null;
    case 'Martial Arts':
    case 'Unarmored Movement':
      if (armored || shield) return armored ? '著甲中失效' : '持盾中失效';
      return null;
    case 'Fast Movement':
      if (wearingHeavyArmor(c)) return '著重甲中失效';
      return null;
  }
  return null;
}

/// 角色是否已知法師護甲（法術清單含 Mage Armor）——決定開關是否顯示。
bool knowsMageArmor(Character c) =>
    c.spells.any((s) => s.nameEn == 'Mage Armor');
