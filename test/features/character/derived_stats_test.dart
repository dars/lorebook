import 'package:flutter_test/flutter_test.dart';
import 'package:lorebook/features/character/domain/character.dart';
import 'package:lorebook/features/character/domain/derived_stats.dart';

Character _base({
  String classNameEn = 'Wizard',
  int str = 0,
  int dex = 2,
  int con = 1,
  int wis = 1,
  int prof = 2,
  List<Equipment> equipment = const [],
  bool mageArmor = false,
  List<Spell> spells = const [],
}) {
  return Character(
    id: 't',
    name: 'T',
    classNameEn: classNameEn,
    proficiencyBonus: prof,
    mageArmorActive: mageArmor,
    spells: spells,
    equipment: equipment,
    abilityScores: AbilityScores(
      str: AbilityScore(score: 10 + str * 2, modifier: str),
      dex: AbilityScore(score: 10 + dex * 2, modifier: dex),
      con: AbilityScore(score: 10 + con * 2, modifier: con),
      int_: const AbilityScore(score: 10, modifier: 0),
      wis: AbilityScore(score: 10 + wis * 2, modifier: wis),
      cha: const AbilityScore(score: 10, modifier: 0),
    ),
  );
}

const _shield = Equipment(
  name: '盾牌',
  nameEn: 'Shield',
  itemType: ItemType.armor,
  armorCategory: ArmorCategory.shield,
  acBase: 2,
  equipped: true,
);

void main() {
  group('裝備狀態判定', () {
    test('盾牌不算著甲', () {
      final c = _base(equipment: [_shield]);
      expect(wearingArmor(c), false);
      expect(wieldingShield(c), true);
    });

    test('著甲與著重甲', () {
      final chain = _base(
        equipment: const [
          Equipment(
            name: '鏈甲',
            itemType: ItemType.armor,
            armorCategory: ArmorCategory.heavy,
            acBase: 16,
            equipped: true,
          ),
        ],
      );
      expect(wearingArmor(chain), true);
      expect(wearingHeavyArmor(chain), true);
    });

    test('未 equipped 的護甲不計', () {
      final c = _base(
        equipment: const [
          Equipment(
            name: '皮甲',
            itemType: ItemType.armor,
            armorCategory: ArmorCategory.light,
            acBase: 11,
          ),
        ],
      );
      expect(wearingArmor(c), false);
    });
  });

  group('computeAc', () {
    test('一般無甲 10+Dex', () {
      final r = computeAc(_base(dex: 2));
      expect(r.value, 12);
      expect(r.label, '無甲・敏捷');
    });

    test('野蠻人無甲防禦，持盾仍有效', () {
      final c = _base(
        classNameEn: 'Barbarian',
        dex: 2,
        con: 3,
        equipment: [_shield],
      );
      final r = computeAc(c);
      expect(r.value, 10 + 2 + 3 + 2);
      expect(r.label, '無甲防禦・盾牌');
    });

    test('武僧無甲防禦，持盾即失效', () {
      final noShield = computeAc(_base(classNameEn: 'Monk', dex: 3, wis: 2));
      expect(noShield.value, 15);
      final withShield = computeAc(
        _base(classNameEn: 'Monk', dex: 3, wis: 2, equipment: [_shield]),
      );
      expect(withShield.value, 10 + 3 + 2); // 一般無甲＋盾牌
    });

    test('輕甲 base+Dex、中甲 Dex 上限 2、重甲固定', () {
      Equipment armor(ArmorCategory cat, int base) => Equipment(
        name: 'A',
        itemType: ItemType.armor,
        armorCategory: cat,
        acBase: base,
        equipped: true,
      );
      expect(
        computeAc(
          _base(dex: 3, equipment: [armor(ArmorCategory.light, 12)]),
        ).value,
        15,
      );
      expect(
        computeAc(
          _base(dex: 3, equipment: [armor(ArmorCategory.medium, 14)]),
        ).value,
        16,
      );
      expect(
        computeAc(
          _base(dex: 3, equipment: [armor(ArmorCategory.heavy, 16)]),
        ).value,
        16,
      );
    });

    test('法師護甲 13+Dex 取高；著甲公式優先於無甲候選', () {
      final r = computeAc(_base(dex: 2, mageArmor: true));
      expect(r.value, 15);
      expect(r.label, '法師護甲');
    });

    test('野蠻人有法師護甲時取較高者', () {
      // 無甲防禦 10+2+1=13 vs 法師護甲 13+2=15
      final r = computeAc(
        _base(classNameEn: 'Barbarian', dex: 2, con: 1, mageArmor: true),
      );
      expect(r.value, 15);
      expect(r.label, '法師護甲');
    });

    test('mock 角色回歸：野蠻人 15', () {
      expect(computeAc(Character.mockBarbarian()).value, 15);
    });
  });

  group('attackEntries', () {
    test('裝備中武器＋徒手攻擊；未裝備武器不列', () {
      final c = _base(
        str: 3,
        dex: 1,
        prof: 3,
        equipment: const [
          Equipment(
            name: '巨斧',
            itemType: ItemType.weapon,
            equipped: true,
            damage: '1d12',
            damageType: 'slashing',
          ),
          Equipment(name: '長劍', itemType: ItemType.weapon, damage: '1d8'),
        ],
      );
      final list = attackEntries(c);
      expect(list.length, 2); // 巨斧 + 徒手
      expect(list[0].name, '巨斧');
      expect(list[0].hitBonus, 6);
      expect(list[0].damage, '1d12+3');
      expect(list[1].unarmed, true);
      expect(list[1].hitBonus, 6);
      expect(list[1].damage, '4'); // 1 + 力調 3
    });

    test('finesse 取力/敏較高', () {
      final c = _base(
        str: 1,
        dex: 3,
        prof: 2,
        equipment: const [
          Equipment(
            name: '匕首',
            itemType: ItemType.weapon,
            equipped: true,
            damage: '1d4',
            finesse: true,
          ),
        ],
      );
      expect(attackEntries(c)[0].hitBonus, 5);
      expect(attackEntries(c)[0].damage, '1d4+3');
    });

    test('自訂武器缺傷害資料只顯示名稱', () {
      final c = _base(
        equipment: const [
          Equipment(name: '神祕之刃', itemType: ItemType.weapon, equipped: true),
        ],
      );
      final e = attackEntries(c)[0];
      expect(e.hitBonus, null);
      expect(e.damage, null);
    });

    test('徒手攻擊恆在（無任何裝備）', () {
      final list = attackEntries(_base());
      expect(list.length, 1);
      expect(list[0].nameEn, 'Unarmed Strike');
    });
  });

  group('featureArmorViolation', () {
    const unarmoredDefense = CharacterFeature(
      name: '無甲防禦',
      nameEn: 'Unarmored Defense',
    );
    const martialArts = CharacterFeature(name: '武術', nameEn: 'Martial Arts');
    const fastMovement = CharacterFeature(name: '迅捷', nameEn: 'Fast Movement');

    const lightArmor = Equipment(
      name: '皮甲',
      itemType: ItemType.armor,
      armorCategory: ArmorCategory.light,
      acBase: 11,
      equipped: true,
    );
    const heavyArmor = Equipment(
      name: '鏈甲',
      itemType: ItemType.armor,
      armorCategory: ArmorCategory.heavy,
      acBase: 16,
      equipped: true,
    );

    test('野蠻人無甲防禦：著甲失效、持盾不失效', () {
      final b = _base(classNameEn: 'Barbarian');
      expect(featureArmorViolation(b, unarmoredDefense), null);
      expect(
        featureArmorViolation(
          _base(classNameEn: 'Barbarian', equipment: [_shield]),
          unarmoredDefense,
        ),
        null,
      );
      expect(
        featureArmorViolation(
          _base(classNameEn: 'Barbarian', equipment: [lightArmor]),
          unarmoredDefense,
        ),
        isNotNull,
      );
    });

    test('武僧武術：著甲或持盾皆失效', () {
      expect(
        featureArmorViolation(_base(classNameEn: 'Monk'), martialArts),
        null,
      );
      expect(
        featureArmorViolation(
          _base(classNameEn: 'Monk', equipment: [_shield]),
          martialArts,
        ),
        isNotNull,
      );
    });

    test('快速移動：僅重甲失效', () {
      expect(
        featureArmorViolation(
          _base(classNameEn: 'Barbarian', equipment: [lightArmor]),
          fastMovement,
        ),
        null,
      );
      expect(
        featureArmorViolation(
          _base(classNameEn: 'Barbarian', equipment: [heavyArmor]),
          fastMovement,
        ),
        isNotNull,
      );
    });
  });

  group('migrateLegacyWeapons', () {
    test('舊 weapons 轉 equipment 武器條目（×N 拆數量、傷害去尾綴）', () {
      final legacy = _base().copyWith(
        weapons: const [
          Weapon(
            name: '匕首 ×2',
            nameEn: 'Dagger ×2',
            attackBonus: 3,
            damage: '1d4+1',
            damageType: 'piercing',
            properties: ['finesse', 'light'],
          ),
        ],
      );
      final m = migrateLegacyWeapons(legacy);
      expect(m.weapons, isEmpty);
      final w = m.equipment.first;
      expect(w.name, '匕首');
      expect(w.quantity, 2);
      expect(w.itemType, ItemType.weapon);
      expect(w.equipped, true);
      expect(w.damage, '1d4');
      expect(w.finesse, true);
    });

    test('已有武器條目時只清空 weapons 不重複轉換', () {
      final c =
          _base(
            equipment: const [
              Equipment(name: '巨斧', itemType: ItemType.weapon, equipped: true),
            ],
          ).copyWith(
            weapons: const [Weapon(name: '巨斧', attackBonus: 6, damage: '1d12')],
          );
      final m = migrateLegacyWeapons(c);
      expect(m.weapons, isEmpty);
      expect(m.equipment.length, 1);
    });
  });

  group('Equipment JSON 向後相容', () {
    test('舊格式（無新欄位）反序列化帶預設值', () {
      final e = Equipment.fromJson(const {
        'name': '火把',
        'nameEn': 'Torch',
        'type': 'gear',
        'description': '',
        'equipped': false,
      });
      expect(e.itemType, ItemType.gear);
      expect(e.source, ItemSource.custom);
      expect(e.quantity, 1);
      expect(e.quest, false);
      expect(e.priceCp, 0);
    });
  });
}
