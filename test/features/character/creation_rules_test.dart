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
      expect(level1MaxHp(_cls('野蠻人'), _sp('半獸人'), mods), 12 + 3);
    });

    test('矮人堅韌每級 +1', () {
      expect(level1MaxHp(_cls('戰士'), _sp('矮人'), mods), 10 + 3 + 1);
    });

    test('負體質下限 1', () {
      final low = {...mods, 'CON': -6};
      expect(level1MaxHp(_cls('法師'), _sp('人類'), low), 1);
    });
  });

  test('盜賊技能清單為 2024 版（10 項、無表演）', () {
    final rogue = _cls('盜賊');
    expect(rogue.skillChoices, hasLength(10));
    expect(rogue.skillChoices, isNot(contains('表演')));
  });
}
