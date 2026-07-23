import 'package:flutter_test/flutter_test.dart';
import 'package:lorebook/features/character/domain/character.dart';
import 'package:lorebook/features/character/domain/class_resources.dart';

AbilityScores _scores({int cha = 10}) => AbilityScores(
  str: const AbilityScore(score: 10, modifier: 0),
  dex: const AbilityScore(score: 10, modifier: 0),
  con: const AbilityScore(score: 10, modifier: 0),
  int_: const AbilityScore(score: 10, modifier: 0),
  wis: const AbilityScore(score: 10, modifier: 0),
  cha: AbilityScore(score: cha, modifier: (cha - 10) ~/ 2),
);

ClassResource _one(String classEn, int level, String nameEn, {int cha = 10}) =>
    deriveClassResources(
      classEn,
      level,
      _scores(cha: cha),
    ).firstWhere((r) => r.nameEn == nameEn);

void main() {
  group('deriveClassResources 關鍵級距', () {
    test('野蠻人狂暴：1 級 2 次、3 級 3 次、17 級 6 次、長休', () {
      expect(_one('Barbarian', 1, 'Rage').max, 2);
      expect(_one('Barbarian', 3, 'Rage').max, 3);
      expect(_one('Barbarian', 17, 'Rage').max, 6);
      expect(_one('Barbarian', 1, 'Rage').recovery, ResourceRecovery.long);
    });

    test('吟遊激勵：魅力調整值次、骰面 5/10/15 升級、5 級起短休', () {
      final lv1 = _one('Bard', 1, 'Bardic Inspiration', cha: 16);
      expect(lv1.max, 3);
      expect(lv1.dieFaces, 6);
      expect(lv1.recovery, ResourceRecovery.long);
      final lv5 = _one('Bard', 5, 'Bardic Inspiration', cha: 16);
      expect(lv5.dieFaces, 8);
      expect(lv5.recovery, ResourceRecovery.short);
      expect(_one('Bard', 10, 'Bardic Inspiration').dieFaces, 10);
      expect(_one('Bard', 15, 'Bardic Inspiration').dieFaces, 12);
    });

    test('吟遊激勵：魅力調整值下限 1', () {
      expect(_one('Bard', 1, 'Bardic Inspiration', cha: 8).max, 1);
    });

    test('牧師引導神力：2 級獲得 2 次、6 級 3 次、18 級 4 次', () {
      expect(deriveClassResources('Cleric', 1, _scores()), isEmpty);
      expect(_one('Cleric', 2, 'Channel Divinity').max, 2);
      expect(_one('Cleric', 6, 'Channel Divinity').max, 3);
      expect(_one('Cleric', 18, 'Channel Divinity').max, 4);
    });

    test('德魯伊荒野變身：2@2、3@6、4@17', () {
      expect(_one('Druid', 2, 'Wild Shape').max, 2);
      expect(_one('Druid', 6, 'Wild Shape').max, 3);
      expect(_one('Druid', 17, 'Wild Shape').max, 4);
    });

    test('戰士：第二風 2/3@4/4@10；動作如潮 1@2、2@17', () {
      expect(_one('Fighter', 1, 'Second Wind').max, 2);
      expect(_one('Fighter', 4, 'Second Wind').max, 3);
      expect(_one('Fighter', 10, 'Second Wind').max, 4);
      expect(
        deriveClassResources(
          'Fighter',
          1,
          _scores(),
        ).where((r) => r.nameEn == 'Action Surge'),
        isEmpty,
      );
      expect(_one('Fighter', 2, 'Action Surge').max, 1);
      expect(_one('Fighter', 17, 'Action Surge').max, 2);
    });

    test('武僧專注點：自 2 級、等於等級、短休', () {
      expect(deriveClassResources('Monk', 1, _scores()), isEmpty);
      final r = _one('Monk', 7, 'Focus Points');
      expect(r.max, 7);
      expect(r.recovery, ResourceRecovery.short);
    });

    test('聖騎士：聖療之觸 5×等級 HP 池；引導神力 2@3、3@11', () {
      final loh = _one('Paladin', 4, 'Lay on Hands');
      expect(loh.max, 20);
      expect(loh.display, ResourceDisplay.number);
      expect(loh.unit, 'HP');
      expect(
        deriveClassResources(
          'Paladin',
          2,
          _scores(),
        ).where((r) => r.nameEn == 'Channel Divinity'),
        isEmpty,
      );
      expect(_one('Paladin', 3, 'Channel Divinity').max, 2);
      expect(_one('Paladin', 11, 'Channel Divinity').max, 3);
    });

    test('術士術法點數：自 2 級、等於等級、number', () {
      expect(deriveClassResources('Sorcerer', 1, _scores()), isEmpty);
      final r = _one('Sorcerer', 5, 'Sorcery Points');
      expect(r.max, 5);
      expect(r.display, ResourceDisplay.number);
    });

    test('無合格資源職業：遊俠/賊/法師/契術師為空', () {
      for (final cls in ['Ranger', 'Rogue', 'Wizard', 'Warlock']) {
        expect(deriveClassResources(cls, 20, _scores()), isEmpty);
      }
    });

    test('產出 current = max', () {
      for (final r in deriveClassResources('Fighter', 10, _scores())) {
        expect(r.current, r.max);
      }
    });
  });

  group('syncClassResources', () {
    test('差額入帳：狂暴 1/2 升 3 級後 2/3', () {
      final synced = syncClassResources(
        [const ClassResource(name: '狂暴', nameEn: 'Rage', current: 1, max: 2)],
        'Barbarian',
        3,
        _scores(),
      );
      final rage = synced.firstWhere((r) => r.nameEn == 'Rage');
      expect(rage.current, 2);
      expect(rage.max, 3);
    });

    test('新資源滿額加入：術士 1→2 級獲得術法點數 2/2', () {
      final synced = syncClassResources(const [], 'Sorcerer', 2, _scores());
      final sp = synced.firstWhere((r) => r.nameEn == 'Sorcery Points');
      expect(sp.current, 2);
      expect(sp.max, 2);
    });

    test('骰面與恢復更新：吟遊激勵 4→5 級 d6→d8、轉短休', () {
      final synced = syncClassResources(
        [
          const ClassResource(
            name: '吟遊激勵',
            nameEn: 'Bardic Inspiration',
            current: 1,
            max: 3,
            display: ResourceDisplay.dice,
            dieFaces: 6,
          ),
        ],
        'Bard',
        5,
        _scores(cha: 16),
      );
      final bi = synced.firstWhere((r) => r.nameEn == 'Bardic Inspiration');
      expect(bi.dieFaces, 8);
      expect(bi.recovery, ResourceRecovery.short);
      expect(bi.current, 1); // max 未變（皆魅力 3）→ current 不動
    });

    test('非規則表資源原樣保留', () {
      final synced = syncClassResources(
        [const ClassResource(name: '自訂', nameEn: 'Custom', current: 1, max: 4)],
        'Barbarian',
        3,
        _scores(),
      );
      expect(synced.any((r) => r.nameEn == 'Custom'), isTrue);
      expect(synced.firstWhere((r) => r.nameEn == 'Custom').current, 1);
    });
  });

  group('範例角色一致性', () {
    test('內建範例的職業資源與規則表推導一致', () {
      for (final c in [Character.mock(), Character.mockBarbarian()]) {
        final derived = deriveClassResources(
          c.classNameEn,
          c.level,
          c.abilityScores,
        );
        expect(c.resources.length, derived.length, reason: c.name);
        for (final d in derived) {
          final e = c.resources.firstWhere((r) => r.nameEn == d.nameEn);
          expect(e.max, d.max, reason: '${c.name}:${d.nameEn}');
          expect(e.dieFaces, d.dieFaces, reason: '${c.name}:${d.nameEn}');
          expect(e.recovery, d.recovery, reason: '${c.name}:${d.nameEn}');
        }
      }
    });
  });

  group('backfillClassResources', () {
    test('空 resources 的吟遊詩人 Lv5 補入 3/3 d8', () {
      final c = Character(
        id: 'b1',
        name: '詩人',
        className: '吟遊詩人',
        classNameEn: 'Bard',
        level: 5,
        maxHp: 30,
        currentHp: 30,
        abilityScores: _scores(cha: 16),
      );
      final filled = backfillClassResources(c);
      final bi = filled.resources.firstWhere(
        (r) => r.nameEn == 'Bardic Inspiration',
      );
      expect(bi.current, 3);
      expect(bi.max, 3);
      expect(bi.dieFaces, 8);
    });

    test('既有同名資源不覆寫', () {
      final c = Character(
        id: 'b2',
        name: '野蠻人',
        className: '野蠻人',
        classNameEn: 'Barbarian',
        level: 3,
        maxHp: 30,
        currentHp: 30,
        abilityScores: _scores(),
        resources: const [
          ClassResource(name: '狂暴', nameEn: 'Rage', current: 1, max: 3),
        ],
      );
      final filled = backfillClassResources(c);
      final rage = filled.resources.firstWhere((r) => r.nameEn == 'Rage');
      expect(rage.current, 1);
      expect(filled.resources.length, 1);
    });
  });
}
