import 'package:flutter_test/flutter_test.dart';
import 'package:lorebook/features/character/domain/character_creation_data.dart';

ClassOption _cls(String cn) => kClasses.firstWhere((c) => c.cn == cn);
SpeciesOption _sp(String cn) => kSpecies.firstWhere((s) => s.cn == cn);

void main() {
  // 敏 14(+2)、體 16(+3)、感 15(+2)
  final mods = {'STR': 0, 'DEX': 2, 'CON': 3, 'INT': 0, 'WIS': 2, 'CHA': 0};

  group('level1UnarmoredAc（2024 無甲防禦）', () {
    test('野蠻人 = 10 + 敏 + 體', () {
      expect(level1UnarmoredAc(_cls('野蠻人'), mods), 15);
    });

    test('武僧 = 10 + 敏 + 感', () {
      expect(level1UnarmoredAc(_cls('武僧'), mods), 14);
    });

    test('其他職業 = 10 + 敏', () {
      expect(level1UnarmoredAc(_cls('法師'), mods), 12);
      expect(level1UnarmoredAc(_cls('戰士'), mods), 12);
    });
  });

  group('level1MaxHp', () {
    test('一般種族 = 骰面 + 體質', () {
      expect(level1MaxHp(_cls('法師'), _sp('人類'), mods), 6 + 3);
      expect(level1MaxHp(_cls('野蠻人'), _sp('獸人'), mods), 12 + 3);
    });

    test('矮人堅韌每級 +1', () {
      expect(level1MaxHp(_cls('戰士'), _sp('矮人'), mods), 10 + 3 + 1);
    });

    test('負體質下限 1', () {
      final low = {...mods, 'CON': -6};
      expect(level1MaxHp(_cls('法師'), _sp('人類'), low), 1);
    });
  });

  group('種族特性資料（2024）', () {
    test('人類：任選 1 技能、體型可選中/小型', () {
      final human = _sp('人類');
      expect(human.skillPickCount, 1);
      expect(human.skillPickFrom, hasLength(18));
      expect(human.effectiveSizeChoices, ['Medium', 'Small']);
    });

    test('精靈：敏銳感官自洞察/感知/求生擇一', () {
      final elf = _sp('精靈');
      expect(elf.skillPickCount, 1);
      expect(elf.skillPickFrom, ['洞察', '感知', '求生']);
    });

    test('半身人含天生隱匿；單一體型種族 effectiveSizeChoices 為固定值', () {
      expect(_sp('半身人').traits, contains('天生隱匿'));
      expect(_sp('半身人').effectiveSizeChoices, ['Small']);
      expect(_sp('矮人').effectiveSizeChoices, ['Medium']);
    });
  });

  test('盜賊技能清單為 2024 版（10 項、無表演）', () {
    final rogue = _cls('盜賊');
    expect(rogue.skillChoices, hasLength(10));
    expect(rogue.skillChoices, isNot(contains('表演')));
  });

  group('XPHB 全清單（2024）', () {
    test('種族 10 個、職業 12 個、背景 16 個', () {
      expect(kSpecies, hasLength(10));
      expect(kClasses, hasLength(12));
      expect(kBackgrounds, hasLength(16));
    });

    test('新增背景抽查：農夫（力/體/感、馴獸+自然、堅韌）', () {
      final farmer = kBackgrounds.firstWhere((b) => b.cn == '農夫');
      expect(farmer.abilities, ['STR', 'CON', 'WIS']);
      expect(farmer.skills, ['馴獸', '自然']);
      expect(farmer.originFeat, '堅韌');
    });
  });
}
