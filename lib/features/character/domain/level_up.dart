/// 升級流程的規則計算與套用（D&D 2024，單職業、一次一級）。
///
/// 流程中所有選擇存於 [LevelUpChoices]，點「完成升級」才以 [applyLevelUp]
/// 組出新 [Character] 一次性寫回；中途離開不留任何變更。
library;

import 'character.dart';
import 'character_creation_data.dart';
import 'character_math.dart';

/// 基本 ASI 等級（2024：4／8／12／16；19 為史詩恩賜，可改選 ASI 專長，
/// 本 app 一律視為 ASI 事件）。
const kAsiLevels = {4, 8, 12, 16, 19};

/// 各職業的 ASI 等級（2024：戰士另有 6／14、盜賊另有 10）。
Set<int> asiLevelsFor(String classEn) => switch (classEn) {
  'Fighter' => const {4, 6, 8, 12, 14, 16, 19},
  'Rogue' => const {4, 8, 10, 12, 16, 19},
  _ => kAsiLevels,
};

/// 需玩家做選擇的特性（英文名關鍵字；v1 僅加註提示，不提供選擇 UI）。
const _choiceFeatureKeywords = [
  'Expertise',
  'Metamagic',
  'Invocation',
  'Maneuver',
  'Fighting Style',
  'Weapon Mastery',
];

/// 是否為「選項型特性」（專精、超魔法、魔能祈喚、戰技…）。
bool isChoiceFeature(String nameEn) =>
    _choiceFeatureKeywords.any(nameEn.contains);

/// 進入升級流程時，依角色現況算出「本級會發生什麼」。
class LevelUpPlan {
  final int targetLevel;

  /// 生命骰骰面與取平均值的固定值。
  final int hitDieFaces;
  final int averageHp;

  /// 種族每級額外 HP（矮人堅韌）。
  final int speciesHpPerLevel;

  /// 目標等級是否選子職（2024 固定 Lv3）。
  final bool pickSubclass;

  /// 目標等級是否有 ASI。
  final bool hasAsi;

  /// 施法進程與本級各環法術位上限（非施法為空）。
  final CasterProgression progression;
  final Map<int, int> newSlotTotals;

  /// 本級可新選的戲法數／法術數與可選的最高環數。
  final int cantripPicks;
  final int spellPicks;
  final int maxRing;

  LevelUpPlan._({
    required this.targetLevel,
    required this.hitDieFaces,
    required this.averageHp,
    required this.speciesHpPerLevel,
    required this.pickSubclass,
    required this.hasAsi,
    required this.progression,
    required this.newSlotTotals,
    required this.cantripPicks,
    required this.spellPicks,
    required this.maxRing,
  });

  factory LevelUpPlan.forCharacter(Character c) {
    assert(c.level < 20, '已達等級上限');
    final target = c.level + 1;
    final progression =
        kClassProgression[c.classNameEn] ?? CasterProgression.none;
    final species = kSpecies.where((s) => s.cn == c.species).toList();
    return LevelUpPlan._(
      targetLevel: target,
      hitDieFaces: c.hitDieFaces,
      averageHp: averageHitDieValue(c.hitDieFaces),
      speciesHpPerLevel: species.isEmpty ? 0 : species.first.hpPerLevel,
      pickSubclass: target == 3,
      hasAsi: asiLevelsFor(c.classNameEn).contains(target),
      progression: progression,
      newSlotTotals: spellSlotTotalsFor(progression, target),
      cantripPicks: newCantripPicksFor(c.classNameEn, target),
      spellPicks: newSpellPicksFor(c.classNameEn, target),
      maxRing: maxSpellRingFor(progression, target),
    );
  }

  bool get isCaster => progression != CasterProgression.none;
}

/// 流程中累積的使用者選擇。
class LevelUpChoices {
  /// HP 骰值：null = 取平均值。
  final int? hpRoll;

  /// 子職（Lv3；離線跳過為 null）。
  final String? subclass;
  final String? subclassEn;

  /// ASI 指派：能力代碼 → 加值（{'INT': 2} 或 {'INT': 1, 'WIS': 1}）。
  final Map<String, int> asi;

  /// 本級新特性（自內容庫轉換；離線跳過為空）。
  final List<CharacterFeature> features;

  /// 新選的戲法與法術（離線跳過為空）。
  final List<Spell> cantrips;
  final List<Spell> spells;

  const LevelUpChoices({
    this.hpRoll,
    this.subclass,
    this.subclassEn,
    this.asi = const {},
    this.features = const [],
    this.cantrips = const [],
    this.spells = const [],
  });
}

/// 套用升級：組出新 [Character]（等級、HP、熟練加值、能力值、特性、
/// 法術、法術位與全部衍生數值）。純函式，不觸碰 I/O。
Character applyLevelUp(Character c, LevelUpPlan plan, LevelUpChoices choices) {
  final target = plan.targetLevel;
  final pb = proficiencyBonusFor(target);

  // 能力值 + ASI（上限 20），並重建各能力的調整值。
  final oldScores = {
    'STR': c.abilityScores.str,
    'DEX': c.abilityScores.dex,
    'CON': c.abilityScores.con,
    'INT': c.abilityScores.int_,
    'WIS': c.abilityScores.wis,
    'CHA': c.abilityScores.cha,
  };
  AbilityScore bump(String code) {
    final old = oldScores[code]!;
    final score = (old.score + (choices.asi[code] ?? 0)).clamp(1, 20);
    return old.copyWith(score: score, modifier: abilityModifier(score));
  }

  final scores = {for (final code in oldScores.keys) code: bump(code)};
  final conModOld = oldScores['CON']!.modifier;
  final conModNew = scores['CON']!.modifier;

  // 本級 HP 增量（用新 CON）；CON 修正提升時回溯既有等級 Δmod × level。
  final roll = choices.hpRoll ?? plan.averageHp;
  final hpDelta =
      levelHpGain(roll, conModNew, speciesHpPerLevel: plan.speciesHpPerLevel) +
      (conModNew - conModOld) * c.level;

  // 技能加值隨能力/熟練加值重算。
  final skills = [
    for (final s in c.skills)
      s.copyWith(
        modifier: proficientBonus(
          scores[s.abilityType]!.modifier,
          s.proficient,
          pb,
        ),
      ),
  ];
  final perception = skills.where((s) => s.name == '感知').toList();
  final perceptionProficient =
      perception.isNotEmpty && perception.first.proficient;

  // 法術位：上限依新表，已用數保留並夾至新上限（升級不視為休息）。
  final oldUsed = {for (final s in c.spellSlots) s.level: s.used};
  final spellSlots = [
    for (final e in plan.newSlotTotals.entries)
      SpellSlots(
        level: e.key,
        total: e.value,
        used: (oldUsed[e.key] ?? 0).clamp(0, e.value),
      ),
  ];

  final caster = c.spellcastingAbility.isNotEmpty;
  final spellMod = caster ? scores[c.spellcastingAbility]!.modifier : 0;

  return c.copyWith(
    level: target,
    proficiencyBonus: pb,
    maxHp: c.maxHp + hpDelta,
    currentHp: c.currentHp + hpDelta,
    abilityScores: AbilityScores(
      str: scores['STR']!,
      dex: scores['DEX']!,
      con: scores['CON']!,
      int_: scores['INT']!,
      wis: scores['WIS']!,
      cha: scores['CHA']!,
    ),
    skills: skills,
    initiative: scores['DEX']!.modifier,
    passivePerception: passivePerceptionFor(
      scores['WIS']!.modifier,
      perceptionProficient,
      pb,
    ),
    spellDc: caster ? spellSaveDcFor(pb, spellMod) : 0,
    spellAttack: caster ? spellAttackFor(pb, spellMod) : 0,
    spellSlots: caster ? spellSlots : c.spellSlots,
    subclass: choices.subclass ?? c.subclass,
    subclassEn: choices.subclassEn ?? c.subclassEn,
    features: [...c.features, ...choices.features],
    cantrips: [...c.cantrips, ...choices.cantrips],
    spells: [...c.spells, ...choices.spells],
  );
}
