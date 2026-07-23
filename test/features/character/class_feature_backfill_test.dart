import 'package:flutter_test/flutter_test.dart';
import 'package:lorebook/features/catalog/domain/catalog_models.dart';
import 'package:lorebook/features/character/domain/character.dart';
import 'package:lorebook/features/character/domain/class_feature_backfill.dart';

const _barbarianFeatures = [
  CatalogClassFeature(
    id: 'f-rage',
    name: '狂暴',
    engName: 'Rage',
    source: 'XPHB',
    level: 1,
    classId: 'c-barbarian',
  ),
  CatalogClassFeature(
    id: 'f-ud',
    name: '無甲防禦',
    engName: 'Unarmored Defense',
    source: 'XPHB',
    level: 1,
    classId: 'c-barbarian',
  ),
  CatalogClassFeature(
    id: 'f-reckless',
    name: '魯莽攻擊',
    engName: 'Reckless Attack',
    source: 'XPHB',
    level: 2,
    classId: 'c-barbarian',
  ),
  CatalogClassFeature(
    id: 'f-brutal',
    name: '狂暴強擊',
    engName: 'Brutal Strike',
    source: 'XPHB',
    level: 9,
    classId: 'c-barbarian',
  ),
  CatalogClassFeature(
    id: 'f-frenzy',
    name: '狂亂',
    engName: 'Frenzy',
    source: 'XPHB',
    level: 3,
    isSubclass: true,
    subclassShortName: 'Berserker',
    classId: 'c-barbarian',
  ),
];

Character _orc({int level = 5, List<CharacterFeature> features = const []}) =>
    Character(
      id: 'toren',
      name: '托倫',
      className: '野蠻人',
      classNameEn: 'Barbarian',
      level: level,
      maxHp: 55,
      currentHp: 55,
      abilityScores: const AbilityScores(
        str: AbilityScore(score: 16, modifier: 3),
        dex: AbilityScore(score: 14, modifier: 2),
        con: AbilityScore(score: 16, modifier: 3),
        int_: AbilityScore(score: 8, modifier: -1),
        wis: AbilityScore(score: 12, modifier: 1),
        cha: AbilityScore(score: 10, modifier: 0),
      ),
      features: features,
    );

void main() {
  test('缺漏的 Lv1～當前等級本職特性補入，來源標 Lv 並依等級排序', () {
    final filled = backfillClassFeatures(_orc(), _barbarianFeatures);
    final names = filled.features.map((f) => f.nameEn).toList();
    expect(
      names,
      containsAll(['Rage', 'Unarmored Defense', 'Reckless Attack']),
    );
    expect(
      filled.features.firstWhere((f) => f.nameEn == 'Unarmored Defense').source,
      '職業：野蠻人 Lv1',
    );
    expect(
      names.indexOf('Rage') < names.indexOf('Reckless Attack'),
      isTrue,
      reason: '依獲得等級排序',
    );
  });

  test('超過當前等級與子職特性不補', () {
    final filled = backfillClassFeatures(_orc(), _barbarianFeatures);
    final names = filled.features.map((f) => f.nameEn);
    expect(names, isNot(contains('Brutal Strike'))); // Lv9 > 5
    expect(names, isNot(contains('Frenzy'))); // 子職
  });

  test('既有特性不重複、不覆寫，原條目保留', () {
    final existing = const CharacterFeature(
      name: '狂暴',
      nameEn: 'Rage',
      source: '職業：野蠻人 Lv3', // 升級流程發過
      description: '玩家自己補過的說明',
    );
    final filled = backfillClassFeatures(
      _orc(
        features: [
          existing,
          const CharacterFeature(name: '警覺', source: '背景：士兵'),
        ],
      ),
      _barbarianFeatures,
    );
    expect(filled.features.where((f) => f.nameEn == 'Rage').length, 1);
    expect(
      filled.features.firstWhere((f) => f.nameEn == 'Rage').description,
      '玩家自己補過的說明',
    );
    expect(filled.features.any((f) => f.name == '警覺'), isTrue);
  });

  test('無缺漏時原物件返回', () {
    final full = backfillClassFeatures(_orc(), _barbarianFeatures);
    final again = backfillClassFeatures(full, _barbarianFeatures);
    expect(identical(full, again), isTrue);
  });
}
