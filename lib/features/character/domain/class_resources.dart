import 'character.dart';

/// 職業資源規則表（SRD 5.2 / D&D 2024）。
///
/// App 內建固定清單（與 kClasses、featureArmorViolation 同哲學，不做
/// 通用規則引擎）。只收「遊玩當下即時消耗」的本職資源；休息才觸發的
/// 機制（奧術回復、生命骰）、子職資源、魔法物品充能不在此處。
/// 契術師魔能位沿用 spellSlots 呈現，不入資源表。
///
/// 恢復時機採簡化（design D5）：規則書「短休回 1／長休全回」一律標
/// 短休；吟遊激勵 5 級（激勵泉湧）起改標短休，細則由玩家自行裁量。
enum ResourceUsesFormula {
  /// 固定次數（param）。
  fixed,

  /// 依等級查表（levelTable，index = 等級 - 1）。
  levelTable,

  /// 能力調整值（abilityCode），下限 1。
  abilityMod,

  /// 等於職業等級。
  equalsLevel,

  /// 等級 × 倍率（param，如聖療之觸 5×等級）。
  levelTimes,
}

class ClassResourceRule {
  final String classEn;
  final String name;
  final String nameEn;

  /// 獲得等級（未達時不產出）。
  final int fromLevel;
  final ResourceUsesFormula formula;
  final int param;
  final List<int>? levelTable;
  final String abilityCode;

  /// dice 顯示的骰面隨等級表（index = 等級 - 1）。
  final List<int>? dieFacesTable;
  final ResourceRecovery recovery;

  /// 自此等級起恢復時機改為短休（如吟遊激勵 5 級激勵泉湧）。
  final int? shortRestFromLevel;
  final ResourceDisplay display;
  final String unit;

  const ClassResourceRule({
    required this.classEn,
    required this.name,
    required this.nameEn,
    this.fromLevel = 1,
    required this.formula,
    this.param = 0,
    this.levelTable,
    this.abilityCode = '',
    this.dieFacesTable,
    this.recovery = ResourceRecovery.long,
    this.shortRestFromLevel,
    this.display = ResourceDisplay.pips,
    this.unit = '',
  });
}

const kClassResourceRules = <ClassResourceRule>[
  // 野蠻人：狂暴（短休回 1 的細則依 D5 簡化為長休）
  ClassResourceRule(
    classEn: 'Barbarian',
    name: '狂暴',
    nameEn: 'Rage',
    formula: ResourceUsesFormula.levelTable,
    levelTable: [2, 2, 3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 6, 6, 6, 6],
  ),
  // 吟遊詩人：吟遊激勵（魅力調整值次；d6→d8@5→d10@10→d12@15；
  // 5 級激勵泉湧起短休可回復）
  ClassResourceRule(
    classEn: 'Bard',
    name: '吟遊激勵',
    nameEn: 'Bardic Inspiration',
    formula: ResourceUsesFormula.abilityMod,
    abilityCode: 'CHA',
    dieFacesTable: [
      6,
      6,
      6,
      6,
      8,
      8,
      8,
      8,
      8,
      10,
      10,
      10,
      10,
      10,
      12,
      12,
      12,
      12,
      12,
      12,
    ],
    shortRestFromLevel: 5,
    display: ResourceDisplay.dice,
  ),
  // 牧師：引導神力（2@2、3@6、4@18；短休回 1 → 簡化標短休）
  ClassResourceRule(
    classEn: 'Cleric',
    name: '引導神力',
    nameEn: 'Channel Divinity',
    fromLevel: 2,
    formula: ResourceUsesFormula.levelTable,
    levelTable: [0, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4],
    recovery: ResourceRecovery.short,
  ),
  // 德魯伊：荒野變身（2@2、3@6、4@17；短休回 1 → 簡化標短休）
  ClassResourceRule(
    classEn: 'Druid',
    name: '荒野變身',
    nameEn: 'Wild Shape',
    fromLevel: 2,
    formula: ResourceUsesFormula.levelTable,
    levelTable: [0, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4],
    recovery: ResourceRecovery.short,
  ),
  // 戰士：第二風（2、3@4、4@10；短休回 1 → 簡化標短休）
  ClassResourceRule(
    classEn: 'Fighter',
    name: '第二風',
    nameEn: 'Second Wind',
    formula: ResourceUsesFormula.levelTable,
    levelTable: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    recovery: ResourceRecovery.short,
  ),
  // 戰士：動作如潮（1@2、2@17）
  ClassResourceRule(
    classEn: 'Fighter',
    name: '動作如潮',
    nameEn: 'Action Surge',
    fromLevel: 2,
    formula: ResourceUsesFormula.levelTable,
    levelTable: [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2],
    recovery: ResourceRecovery.short,
  ),
  // 武僧：專注點（=等級，自 2 級）
  ClassResourceRule(
    classEn: 'Monk',
    name: '專注點',
    nameEn: 'Focus Points',
    fromLevel: 2,
    formula: ResourceUsesFormula.equalsLevel,
    recovery: ResourceRecovery.short,
  ),
  // 聖騎士：聖療之觸（5×等級 HP 池）
  ClassResourceRule(
    classEn: 'Paladin',
    name: '聖療之觸',
    nameEn: 'Lay on Hands',
    formula: ResourceUsesFormula.levelTimes,
    param: 5,
    display: ResourceDisplay.number,
    unit: 'HP',
  ),
  // 聖騎士：引導神力（2@3、3@11；短休回 1 → 簡化標短休）
  ClassResourceRule(
    classEn: 'Paladin',
    name: '引導神力',
    nameEn: 'Channel Divinity',
    fromLevel: 3,
    formula: ResourceUsesFormula.levelTable,
    levelTable: [0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
    recovery: ResourceRecovery.short,
  ),
  // 術士：術法點數（=等級，自 2 級）
  ClassResourceRule(
    classEn: 'Sorcerer',
    name: '術法點數',
    nameEn: 'Sorcery Points',
    fromLevel: 2,
    formula: ResourceUsesFormula.equalsLevel,
    display: ResourceDisplay.number,
    unit: '點',
  ),
  // 遊俠、賊、法師、契術師：無合格的即時消耗型本職資源。
];

int _abilityModifier(AbilityScores scores, String code) => switch (code) {
  'STR' => scores.str.modifier,
  'DEX' => scores.dex.modifier,
  'CON' => scores.con.modifier,
  'INT' => scores.int_.modifier,
  'WIS' => scores.wis.modifier,
  'CHA' => scores.cha.modifier,
  _ => 0,
};

int _maxFor(ClassResourceRule r, int level, AbilityScores scores) {
  final lv = level.clamp(1, 20);
  return switch (r.formula) {
    ResourceUsesFormula.fixed => r.param,
    ResourceUsesFormula.levelTable => r.levelTable![lv - 1],
    ResourceUsesFormula.abilityMod => (_abilityModifier(
      scores,
      r.abilityCode,
    )).clamp(1, 99),
    ResourceUsesFormula.equalsLevel => lv,
    ResourceUsesFormula.levelTimes => r.param * lv,
  };
}

ClassResource _build(ClassResourceRule r, int level, AbilityScores scores) {
  final lv = level.clamp(1, 20);
  final max = _maxFor(r, lv, scores);
  final short =
      r.recovery == ResourceRecovery.short ||
      (r.shortRestFromLevel != null && lv >= r.shortRestFromLevel!);
  return ClassResource(
    name: r.name,
    nameEn: r.nameEn,
    current: max,
    max: max,
    recovery: short ? ResourceRecovery.short : r.recovery,
    display: r.display,
    dieFaces: r.dieFacesTable == null ? 0 : r.dieFacesTable![lv - 1],
    unit: r.unit,
  );
}

/// 該職業於該等級應具備的職業資源（current = max）。
List<ClassResource> deriveClassResources(
  String classEn,
  int level,
  AbilityScores scores,
) => [
  for (final r in kClassResourceRules)
    if (r.classEn == classEn && level >= r.fromLevel) _build(r, level, scores),
];

/// 升級／能力值變動後同步資源：max 與骰面重算、current 差額入帳
/// （升級不視為休息，已消耗的不回復）；規則表新出現的資源以滿額加入。
/// 非規則表管理的既有資源（自訂等）原樣保留。
List<ClassResource> syncClassResources(
  List<ClassResource> existing,
  String classEn,
  int level,
  AbilityScores scores,
) {
  final derived = deriveClassResources(classEn, level, scores);
  final result = <ClassResource>[];
  final matched = <String>{};
  for (final e in existing) {
    ClassResource? d;
    for (final x in derived) {
      if (x.nameEn == e.nameEn) {
        d = x;
        break;
      }
    }
    if (d == null) {
      result.add(e);
      continue;
    }
    matched.add(d.nameEn);
    result.add(
      e.copyWith(
        max: d.max,
        current: (e.current + (d.max - e.max)).clamp(0, d.max),
        dieFaces: d.dieFaces,
        recovery: d.recovery,
      ),
    );
  }
  for (final d in derived) {
    if (!matched.contains(d.nameEn)) result.add(d);
  }
  return result;
}

/// 載入回填：僅補寫缺漏的職業資源（nameEn 比對），不覆寫既有條目。
Character backfillClassResources(Character c) {
  final derived = deriveClassResources(c.classNameEn, c.level, c.abilityScores);
  final missing = [
    for (final d in derived)
      if (!c.resources.any((e) => e.nameEn == d.nameEn)) d,
  ];
  if (missing.isEmpty) return c;
  return c.copyWith(resources: [...c.resources, ...missing]);
}
