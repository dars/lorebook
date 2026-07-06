import 'package:flutter_test/flutter_test.dart';
import 'package:lorebook/features/character/domain/character_math.dart';

void main() {
  group('abilityModifier', () {
    test('標準值', () {
      expect(abilityModifier(10), 0);
      expect(abilityModifier(11), 0);
      expect(abilityModifier(12), 1);
      expect(abilityModifier(20), 5);
      expect(abilityModifier(8), -1);
      expect(abilityModifier(9), -1);
      expect(abilityModifier(1), -5);
    });
  });

  group('proficiencyBonusFor', () {
    test('Lv5/9/13/17 提升', () {
      expect(proficiencyBonusFor(1), 2);
      expect(proficiencyBonusFor(4), 2);
      expect(proficiencyBonusFor(5), 3);
      expect(proficiencyBonusFor(8), 3);
      expect(proficiencyBonusFor(9), 4);
      expect(proficiencyBonusFor(12), 4);
      expect(proficiencyBonusFor(13), 5);
      expect(proficiencyBonusFor(16), 5);
      expect(proficiencyBonusFor(17), 6);
      expect(proficiencyBonusFor(20), 6);
    });
  });

  group('衍生加值', () {
    test('豁免/技能/被動察覺/施法', () {
      expect(proficientBonus(3, false, 2), 3);
      expect(proficientBonus(3, true, 2), 5);
      expect(passivePerceptionFor(1, false, 2), 11);
      expect(passivePerceptionFor(1, true, 3), 14);
      expect(spellSaveDcFor(2, 3), 13);
      expect(spellAttackFor(2, 3), 5);
    });
  });

  group('levelHpGain', () {
    test('平均值與下限', () {
      expect(averageHitDieValue(6), 4);
      expect(averageHitDieValue(8), 5);
      expect(averageHitDieValue(10), 6);
      expect(averageHitDieValue(12), 7);
      expect(levelHpGain(4, 2), 6);
      expect(levelHpGain(1, -3), 1, reason: '骰值+CON ≤ 0 時最低 1');
      expect(levelHpGain(1, -3, speciesHpPerLevel: 1), 2, reason: '矮人堅韌加在下限之後');
    });
  });

  group('casterProgressionFromString', () {
    test('值域對應與 fallback', () {
      expect(casterProgressionFromString('full'), CasterProgression.full);
      expect(casterProgressionFromString('1/2'), CasterProgression.half);
      expect(casterProgressionFromString('half'), CasterProgression.half);
      expect(casterProgressionFromString('artificer'), CasterProgression.half);
      expect(casterProgressionFromString('pact'), CasterProgression.pact);
      expect(casterProgressionFromString(null), CasterProgression.none);
      expect(casterProgressionFromString('unknown'), CasterProgression.none);
    });
  });

  group('spellSlotTotalsFor · full', () {
    test('Lv1–20 抽查', () {
      expect(spellSlotTotalsFor(CasterProgression.full, 1), {1: 2});
      expect(spellSlotTotalsFor(CasterProgression.full, 2), {1: 3});
      expect(spellSlotTotalsFor(CasterProgression.full, 3), {1: 4, 2: 2});
      expect(spellSlotTotalsFor(CasterProgression.full, 5), {1: 4, 2: 3, 3: 2});
      expect(spellSlotTotalsFor(CasterProgression.full, 9), {
        1: 4,
        2: 3,
        3: 3,
        4: 3,
        5: 1,
      });
      expect(spellSlotTotalsFor(CasterProgression.full, 17), {
        1: 4,
        2: 3,
        3: 3,
        4: 3,
        5: 2,
        6: 1,
        7: 1,
        8: 1,
        9: 1,
      });
      expect(spellSlotTotalsFor(CasterProgression.full, 20), {
        1: 4,
        2: 3,
        3: 3,
        4: 3,
        5: 3,
        6: 2,
        7: 2,
        8: 1,
        9: 1,
      });
    });
  });

  group('spellSlotTotalsFor · half', () {
    test('Lv1 起有位（2024）與抽查', () {
      expect(spellSlotTotalsFor(CasterProgression.half, 1), {1: 2});
      expect(spellSlotTotalsFor(CasterProgression.half, 5), {1: 4, 2: 2});
      expect(spellSlotTotalsFor(CasterProgression.half, 13), {
        1: 4,
        2: 3,
        3: 3,
        4: 1,
      });
      expect(spellSlotTotalsFor(CasterProgression.half, 20), {
        1: 4,
        2: 3,
        3: 3,
        4: 3,
        5: 2,
      });
    });
  });

  group('spellSlotTotalsFor · pact', () {
    test('契約法術位（單一位階）', () {
      expect(spellSlotTotalsFor(CasterProgression.pact, 1), {1: 1});
      expect(spellSlotTotalsFor(CasterProgression.pact, 2), {1: 2});
      expect(spellSlotTotalsFor(CasterProgression.pact, 3), {2: 2});
      expect(spellSlotTotalsFor(CasterProgression.pact, 5), {3: 2});
      expect(spellSlotTotalsFor(CasterProgression.pact, 11), {5: 3});
      expect(spellSlotTotalsFor(CasterProgression.pact, 17), {5: 4});
      expect(spellSlotTotalsFor(CasterProgression.pact, 20), {5: 4});
    });
  });

  group('maxSpellRingFor', () {
    test('最高環數', () {
      expect(maxSpellRingFor(CasterProgression.full, 3), 2);
      expect(maxSpellRingFor(CasterProgression.full, 17), 9);
      expect(maxSpellRingFor(CasterProgression.half, 4), 1);
      expect(maxSpellRingFor(CasterProgression.pact, 5), 3);
      expect(maxSpellRingFor(CasterProgression.none, 5), 0);
    });
  });

  group('新戲法/新法術差額', () {
    test('法師：每級固定 2（法書）', () {
      for (var lv = 2; lv <= 20; lv++) {
        expect(newSpellPicksFor('Wizard', lv), 2, reason: 'Lv$lv');
      }
    });

    test('戲法差額：Lv4/10 +1', () {
      expect(newCantripPicksFor('Wizard', 4), 1);
      expect(newCantripPicksFor('Wizard', 10), 1);
      expect(newCantripPicksFor('Wizard', 5), 0);
      expect(newCantripPicksFor('Paladin', 4), 0, reason: '無戲法職業');
    });

    test('準備制差額', () {
      expect(newSpellPicksFor('Cleric', 2), 1);
      expect(newSpellPicksFor('Cleric', 5), 2);
      expect(newSpellPicksFor('Bard', 12), 0, reason: '差額 0 的等級');
      expect(newSpellPicksFor('Warlock', 3), 1);
      expect(newSpellPicksFor('Paladin', 2), 1);
      expect(newSpellPicksFor('Fighter', 5), 0, reason: '非施法職業');
    });

    test('等級界外', () {
      expect(newSpellPicksFor('Wizard', 1), 0);
      expect(newSpellPicksFor('Wizard', 21), 0);
      expect(newCantripPicksFor('Wizard', 1), 0);
    });
  });

  group('kClassProgression', () {
    test('與 ClassOption level1Slots 一致性抽查', () {
      expect(spellSlotTotalsFor(kClassProgression['Wizard']!, 1), {1: 2});
      expect(spellSlotTotalsFor(kClassProgression['Warlock']!, 1), {1: 1});
      expect(spellSlotTotalsFor(kClassProgression['Paladin']!, 1), {1: 2});
      expect(kClassProgression['Fighter'], isNull);
    });
  });
}
