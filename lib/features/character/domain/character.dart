import 'package:freezed_annotation/freezed_annotation.dart';

part 'character.freezed.dart';
part 'character.g.dart';

@freezed
abstract class AbilityScore with _$AbilityScore {
  const factory AbilityScore({
    required int score,
    required int modifier,
    @Default(false) bool proficientSave,
  }) = _AbilityScore;

  factory AbilityScore.fromJson(Map<String, dynamic> json) =>
      _$AbilityScoreFromJson(json);
}

@freezed
abstract class AbilityScores with _$AbilityScores {
  const factory AbilityScores({
    required AbilityScore str,
    required AbilityScore dex,
    required AbilityScore con,
    required AbilityScore int_,
    required AbilityScore wis,
    required AbilityScore cha,
  }) = _AbilityScores;

  factory AbilityScores.fromJson(Map<String, dynamic> json) =>
      _$AbilityScoresFromJson(json);
}

@freezed
abstract class Skill with _$Skill {
  const factory Skill({
    required String name,
    @Default('') String nameEn,
    required String abilityType,
    required int modifier,
    @Default(false) bool proficient,
  }) = _Skill;

  factory Skill.fromJson(Map<String, dynamic> json) => _$SkillFromJson(json);
}

@freezed
abstract class Spell with _$Spell {
  const factory Spell({
    required String name,
    @Default('') String nameEn,
    required int level,
    @Default('') String description,

    /// 升級 / 高階施法效應（戲法升級、法術升環…）。
    @Default('') String upgrade,
    @Default('') String damage,
    @Default('') String damageType,
    @Default('') String range,
    @Default('1 action') String castingTime,
    @Default(true) bool prepared,

    /// 是否需要專注（Concentration）。
    @Default(false) bool concentration,
  }) = _Spell;

  factory Spell.fromJson(Map<String, dynamic> json) => _$SpellFromJson(json);
}

@freezed
abstract class SpellSlots with _$SpellSlots {
  const factory SpellSlots({
    required int level,
    required int total,
    @Default(0) int used,
  }) = _SpellSlots;

  factory SpellSlots.fromJson(Map<String, dynamic> json) =>
      _$SpellSlotsFromJson(json);
}

@freezed
abstract class Weapon with _$Weapon {
  const factory Weapon({
    required String name,
    @Default('') String nameEn,
    required int attackBonus,
    required String damage,
    @Default('') String damageType,
    @Default(<String>[]) List<String> properties,
  }) = _Weapon;

  factory Weapon.fromJson(Map<String, dynamic> json) => _$WeaponFromJson(json);
}

@freezed
abstract class Equipment with _$Equipment {
  const factory Equipment({
    required String name,
    @Default('') String nameEn,
    @Default('') String type,
    @Default('') String description,
    @Default(false) bool equipped,
  }) = _Equipment;

  factory Equipment.fromJson(Map<String, dynamic> json) =>
      _$EquipmentFromJson(json);
}

@freezed
abstract class Currency with _$Currency {
  const factory Currency({
    @Default(0) int pp,
    @Default(0) int gp,
    @Default(0) int ep,
    @Default(0) int sp,
    @Default(0) int cp,
  }) = _Currency;

  factory Currency.fromJson(Map<String, dynamic> json) =>
      _$CurrencyFromJson(json);
}

@freezed
abstract class Personality with _$Personality {
  const factory Personality({
    @Default('') String traits,
    @Default('') String ideals,
    @Default('') String bonds,
    @Default('') String flaws,
  }) = _Personality;

  factory Personality.fromJson(Map<String, dynamic> json) =>
      _$PersonalityFromJson(json);
}

@freezed
abstract class CharacterFeature with _$CharacterFeature {
  const factory CharacterFeature({
    required String name,
    @Default('') String nameEn,
    @Default('') String source,
    @Default('') String description,
  }) = _CharacterFeature;

  factory CharacterFeature.fromJson(Map<String, dynamic> json) =>
      _$CharacterFeatureFromJson(json);
}

/// 職業資源的回復時機。
enum ResourceRecovery { short, long, none }

/// 職業資源的顯示型態：次數點 / 數字池 / 骰子。
enum ResourceDisplay { pips, number, dice }

/// 通用職業資源（狂暴、氣、法術點數、契約位、戰技骰…）。
///
/// 只收「遊玩當下會即時消耗」的資源；休息才用（奧術恢復、生命骰）與
/// 1/天施放（祕法奧義）不放此處。
@freezed
abstract class ClassResource with _$ClassResource {
  const factory ClassResource({
    required String name,
    @Default('') String nameEn,
    @Default(0) int current,
    @Default(0) int max,
    @Default(ResourceRecovery.long) ResourceRecovery recovery,
    @Default(ResourceDisplay.pips) ResourceDisplay display,

    /// display == dice 時的骰面（如吟遊激勵 d8 → 8）。
    @Default(0) int dieFaces,

    /// display == number 時的單位（如「HP」「點」；可空）。
    @Default('') String unit,
  }) = _ClassResource;

  factory ClassResource.fromJson(Map<String, dynamic> json) =>
      _$ClassResourceFromJson(json);
}

@freezed
abstract class Character with _$Character {
  const Character._();

  const factory Character({
    required String id,
    required String name,
    @Default('') String nameEn,
    @Default('') String species,
    @Default('') String speciesEn,
    @Default('') String className,
    @Default('') String classNameEn,
    @Default('') String subclass,
    @Default('') String subclassEn,
    @Default(1) int level,
    @Default('') String background,
    @Default('') String backgroundEn,
    @Default('') String alignment,
    @Default('') String alignmentEn,
    @Default('') String deity,
    @Default('') String deityEn,
    @Default('') String creatureType,
    @Default('') String size,
    @Default(10) int ac,
    @Default(1) int maxHp,
    @Default(1) int currentHp,
    @Default(0) int tempHp,
    @Default('30ft') String speed,
    @Default(0) int initiative,
    @Default(2) int proficiencyBonus,
    @Default(10) int passivePerception,
    @Default(0) int spellDc,
    @Default(0) int spellAttack,
    @Default('') String spellcastingAbility,
    String? concentrationSpell,
    required AbilityScores abilityScores,
    @Default(<Skill>[]) List<Skill> skills,
    @Default(<Spell>[]) List<Spell> spells,
    @Default(<Spell>[]) List<Spell> cantrips,
    @Default(<SpellSlots>[]) List<SpellSlots> spellSlots,
    @Default(<Weapon>[]) List<Weapon> weapons,
    @Default(<Equipment>[]) List<Equipment> equipment,
    @Default(Currency()) Currency currency,
    @Default(Personality()) Personality personality,
    @Default(<CharacterFeature>[]) List<CharacterFeature> features,
    @Default(<String>[]) List<String> languages,
    @Default('') String backstory,
    @Default(<String>[]) List<String> personalityTags,
    @Default(<String>[]) List<String> conditions,

    /// 力竭等級（0–6，0 = 無）。
    @Default(0) int exhaustionLevel,

    /// 通用職業資源（非法術位；空 = 該職業無遊玩消耗資源）。
    @Default(<ClassResource>[]) List<ClassResource> resources,

    /// 生命骰骰面（依職業，如法師 6、野蠻人 12）。總數 = 角色等級。
    @Default(8) int hitDieFaces,

    /// 已花用的生命骰數。
    @Default(0) int hitDiceUsed,
  }) = _Character;

  factory Character.fromJson(Map<String, dynamic> json) =>
      _$CharacterFromJson(json);

  /// 生命骰總數（= 角色等級）。
  int get hitDiceTotal => level;

  /// 剩餘可花用的生命骰。
  int get hitDiceRemaining => (level - hitDiceUsed).clamp(0, level);

  static Character mock() {
    return const Character(
      id: 'mock-devlin-001',
      name: '戴夫林',
      nameEn: 'Devlin',
      species: '人類',
      speciesEn: 'Human',
      className: '法師',
      classNameEn: 'Wizard',
      subclass: '塑能學派',
      subclassEn: 'School of Evocation',
      level: 3,
      background: '賢者',
      backgroundEn: 'Sage',
      alignment: '守序善良',
      alignmentEn: 'Lawful Good',
      deity: '乜斯乍',
      deityEn: 'Mystra',
      creatureType: 'Humanoid',
      size: 'Medium',
      ac: 12,
      maxHp: 17,
      currentHp: 14,
      tempHp: 0,
      speed: '40ft',
      initiative: 1,
      proficiencyBonus: 2,
      passivePerception: 13,
      spellDc: 13,
      spellAttack: 5,
      spellcastingAbility: 'INT',
      concentrationSpell: '朦朧術',
      abilityScores: AbilityScores(
        str: AbilityScore(score: 10, modifier: 0),
        dex: AbilityScore(score: 12, modifier: 1),
        con: AbilityScore(score: 12, modifier: 1),
        int_: AbilityScore(score: 17, modifier: 3, proficientSave: true),
        wis: AbilityScore(score: 13, modifier: 1, proficientSave: true),
        cha: AbilityScore(score: 12, modifier: 1),
      ),
      skills: [
        Skill(name: '奧秘', nameEn: 'Arcana', abilityType: 'INT', modifier: 5, proficient: true),
        Skill(name: '歷史', nameEn: 'History', abilityType: 'INT', modifier: 5, proficient: true),
        Skill(name: '調查', nameEn: 'Investigation', abilityType: 'INT', modifier: 5, proficient: true),
        Skill(name: '洞察', nameEn: 'Insight', abilityType: 'WIS', modifier: 3, proficient: true),
        Skill(name: '感知', nameEn: 'Perception', abilityType: 'WIS', modifier: 3, proficient: true),
        Skill(name: '說服', nameEn: 'Persuasion', abilityType: 'CHA', modifier: 3, proficient: true),
        Skill(name: '特技', nameEn: 'Acrobatics', abilityType: 'DEX', modifier: 1),
        Skill(name: '馴獸', nameEn: 'Animal Handling', abilityType: 'WIS', modifier: 1),
        Skill(name: '體能', nameEn: 'Athletics', abilityType: 'STR', modifier: 0),
        Skill(name: '欺瞞', nameEn: 'Deception', abilityType: 'CHA', modifier: 1),
        Skill(name: '威嚇', nameEn: 'Intimidation', abilityType: 'CHA', modifier: 1),
        Skill(name: '醫藥', nameEn: 'Medicine', abilityType: 'WIS', modifier: 1),
        Skill(name: '自然', nameEn: 'Nature', abilityType: 'INT', modifier: 3),
        Skill(name: '表演', nameEn: 'Performance', abilityType: 'CHA', modifier: 1),
        Skill(name: '宗教', nameEn: 'Religion', abilityType: 'INT', modifier: 3),
        Skill(name: '巧手', nameEn: 'Sleight of Hand', abilityType: 'DEX', modifier: 1),
        Skill(name: '隱匿', nameEn: 'Stealth', abilityType: 'DEX', modifier: 1),
        Skill(name: '求生', nameEn: 'Survival', abilityType: 'WIS', modifier: 1),
      ],
      cantrips: [
        Spell(name: '火焰箭', nameEn: 'Fire Bolt', level: 0, damage: '1d10', damageType: 'fire', range: '120 FT (24格)', description: '你對施法距離內一名生物或物體擲出一團火焰，進行一次遠程法術攻擊。命中時，目標受到 1d10 點火焰傷害。未被穿著或攜帶的可燃物件被擊中時會開始燃燒。', upgrade: '升級效應：當你到達特定等級，傷害增加 1d10（5級 2d10、11級 3d10、17級 4d10）。'),
        Spell(name: '冰霜射線', nameEn: 'Ray of Frost', level: 0, damage: '1d8', damageType: 'cold', range: '60 FT (12格)', description: '一道冰冷的藍白光束射向射程內一名生物，進行一次遠程法術攻擊。命中時造成 1d8 點寒冰傷害，且目標速度降低 10 呎直到你的下個回合開始。', upgrade: '升級效應：5級 2d8、11級 3d8、17級 4d8。'),
        Spell(name: '法師之手', nameEn: 'Mage Hand', level: 0, range: '30 FT (6格)', description: '在射程內出現一隻幽靈般的漂浮手，持續 1 分鐘。你可用動作操控它搬運物件、開關容器或傾倒瓶罐，但無法攻擊、啟動魔法物品，也無法搬運超過 10 磅的重物。'),
        Spell(name: '光亮術', nameEn: 'Light', level: 0, range: '觸碰', description: '你碰觸一件不大於 10 呎的物體，使其發出 20 呎明亮光線與額外 20 呎微光，持續 1 小時。若目標被他人持有且不情願，需進行敏捷豁免。'),
      ],
      spells: [
        Spell(name: '魔法飛彈', nameEn: 'Magic Missile', level: 1, damage: '3×1d4+1', damageType: 'force', range: '120 FT (24格)', description: '你創造三枚閃耀的力場飛彈，各自命中射程內你選定的目標並自動命中，每枚造成 1d4+1 點力場傷害。', upgrade: '升環施法：每提升一環，飛彈數量增加 1 枚。'),
        Spell(name: '燃燒之手', nameEn: 'Burning Hands', level: 1, damage: '3d6', damageType: 'fire', range: '自身 (15呎錐形)', description: '你的指尖噴出一片 15 呎錐形烈焰。範圍內每個生物需進行敏捷豁免，失敗受到 3d6 點火焰傷害，成功則減半。', upgrade: '升環施法：每提升一環，傷害增加 1d6。'),
        Spell(name: '護盾術', nameEn: 'Shield', level: 1, castingTime: '1 reaction', range: '自身', description: '一道無形的力場屏障保護你。直到你的下個回合開始，你的 AC 獲得 +5（含觸發此反應的攻擊），並且不受魔法飛彈傷害。'),
        Spell(name: '迷蹤步', nameEn: 'Misty Step', level: 2, castingTime: 'bonus action', range: '自身', description: '你被一陣銀霧短暫包圍，瞬間傳送至 30 呎內一處你能看見的未被佔據空間。'),
        Spell(name: '法師護甲', nameEn: 'Mage Armor', level: 1, range: '觸碰', description: '你碰觸一名未著甲的目標，一層魔法力場護甲環繞它，使其基礎 AC 變為 13 + 敏捷調整值，持續 8 小時，或直到目標著甲或你解除法術。'),
        Spell(name: '朦朧術', nameEn: 'Blur', level: 2, range: '自身', concentration: true, description: '你的身形變得模糊晃動。專注期間（至多 1 分鐘），攻擊你的生物其攻擊檢定具有劣勢，除非攻擊者不依賴視覺或能看穿幻象。'),
      ],
      spellSlots: [
        SpellSlots(level: 1, total: 4, used: 0),
        SpellSlots(level: 2, total: 2, used: 0),
      ],
      weapons: [
        Weapon(name: '長棍', nameEn: 'Quarterstaff', attackBonus: 4, damage: '1d6', damageType: 'bludgeoning', properties: ['versatile (1d8)']),
        Weapon(name: '匕首 ×2', nameEn: 'Dagger ×2', attackBonus: 3, damage: '1d4+1', damageType: 'piercing', properties: ['finesse', 'light', 'thrown (20/60)']),
      ],
      equipment: [
        Equipment(name: '水晶球', nameEn: 'Crystal Orb', type: 'arcane focus', description: '奧術法器', equipped: true),
        Equipment(name: '法術書', nameEn: 'Spellbook', type: 'spellbook', description: '記錄已知法術', equipped: true),
        Equipment(name: '學者工具包', nameEn: "Scholar's Pack", type: 'pack', description: '含背包、書本、墨水、筆等', equipped: true),
      ],
      currency: Currency(gp: 25, sp: 8, cp: 14),
      personality: Personality(
        traits: '我對知識有著無窮的好奇心，總是沉浸在書本中。',
        ideals: '知識。通往力量與自我完善的道路在於知識。',
        bonds: '我的法術書是我最珍貴的財產，它記錄了我導師的教導。',
        flaws: '我堅信沒有任何問題是我無法用魔法解決的。',
      ),
      features: [
        CharacterFeature(name: '塑能學派', nameEn: 'School of Evocation', source: 'Wizard Lv2', description: '選擇塑能學派作為奧術傳統，獲得塑形法術等能力。'),
        CharacterFeature(name: '奧術恢復', nameEn: 'Arcane Recovery', source: 'Wizard Lv1', description: '短休後恢復部分已消耗的法術位（等級合計 ≤ 角色等級的一半，上取整）。'),
        CharacterFeature(name: '研究員', nameEn: 'Researcher', source: 'Background: Sage', description: '當你不知道某項資訊時，通常知道去哪裡或找誰來獲取該資訊。'),
      ],
      languages: ['Common', 'Dwarvish', 'Draconic', 'Elvish'],
      backstory: '',
      personalityTags: ['好奇', '書蟲', '理性'],
      conditions: [],
      hitDieFaces: 6,
      hitDiceUsed: 1,
    );
  }

  /// 非施法職業對照用 mock：野蠻人（無法術/法術位，資源為狂暴 pips）。
  static Character mockBarbarian() {
    return const Character(
      id: 'mock-gronk-001',
      name: '戈隆',
      nameEn: 'Gronk',
      species: '半獸人',
      speciesEn: 'Half-Orc',
      className: '野蠻人',
      classNameEn: 'Barbarian',
      subclass: '狂戰士之道',
      subclassEn: 'Path of the Berserker',
      level: 5,
      background: '士兵',
      backgroundEn: 'Soldier',
      alignment: '混亂善良',
      alignmentEn: 'Chaotic Good',
      creatureType: 'Humanoid',
      size: 'Medium',
      ac: 15,
      maxHp: 55,
      currentHp: 48,
      tempHp: 0,
      speed: '40ft',
      initiative: 2,
      proficiencyBonus: 3,
      passivePerception: 14,
      abilityScores: AbilityScores(
        str: AbilityScore(score: 17, modifier: 3, proficientSave: true),
        dex: AbilityScore(score: 14, modifier: 2),
        con: AbilityScore(score: 16, modifier: 3, proficientSave: true),
        int_: AbilityScore(score: 8, modifier: -1),
        wis: AbilityScore(score: 12, modifier: 1),
        cha: AbilityScore(score: 10, modifier: 0),
      ),
      skills: [
        Skill(name: '體能', nameEn: 'Athletics', abilityType: 'STR', modifier: 6, proficient: true),
        Skill(name: '威嚇', nameEn: 'Intimidation', abilityType: 'CHA', modifier: 3, proficient: true),
        Skill(name: '感知', nameEn: 'Perception', abilityType: 'WIS', modifier: 4, proficient: true),
        Skill(name: '求生', nameEn: 'Survival', abilityType: 'WIS', modifier: 4, proficient: true),
        Skill(name: '特技', nameEn: 'Acrobatics', abilityType: 'DEX', modifier: 2),
        Skill(name: '馴獸', nameEn: 'Animal Handling', abilityType: 'WIS', modifier: 1),
        Skill(name: '奧秘', nameEn: 'Arcana', abilityType: 'INT', modifier: -1),
        Skill(name: '欺瞞', nameEn: 'Deception', abilityType: 'CHA', modifier: 0),
        Skill(name: '歷史', nameEn: 'History', abilityType: 'INT', modifier: -1),
        Skill(name: '洞察', nameEn: 'Insight', abilityType: 'WIS', modifier: 1),
        Skill(name: '調查', nameEn: 'Investigation', abilityType: 'INT', modifier: -1),
        Skill(name: '醫藥', nameEn: 'Medicine', abilityType: 'WIS', modifier: 1),
        Skill(name: '自然', nameEn: 'Nature', abilityType: 'INT', modifier: -1),
        Skill(name: '表演', nameEn: 'Performance', abilityType: 'CHA', modifier: 0),
        Skill(name: '說服', nameEn: 'Persuasion', abilityType: 'CHA', modifier: 0),
        Skill(name: '宗教', nameEn: 'Religion', abilityType: 'INT', modifier: -1),
        Skill(name: '巧手', nameEn: 'Sleight of Hand', abilityType: 'DEX', modifier: 2),
        Skill(name: '隱匿', nameEn: 'Stealth', abilityType: 'DEX', modifier: 2),
      ],
      weapons: [
        Weapon(name: '巨斧', nameEn: 'Greataxe', attackBonus: 6, damage: '1d12', damageType: 'slashing', properties: ['heavy', 'two-handed']),
        Weapon(name: '標槍 ×3', nameEn: 'Javelin ×3', attackBonus: 6, damage: '1d6', damageType: 'piercing', properties: ['thrown (30/120)']),
      ],
      resources: [
        ClassResource(name: '狂暴', nameEn: 'Rage', current: 3, max: 3, recovery: ResourceRecovery.long, display: ResourceDisplay.pips),
      ],
      equipment: [
        Equipment(name: '探索者背包', nameEn: "Explorer's Pack", type: 'pack', description: '含背包、睡袋、糧食、繩索等', equipped: true),
        Equipment(name: '治療藥水', nameEn: 'Potion of Healing', type: 'potion', description: '飲用回復 2d4+2 HP'),
      ],
      currency: Currency(gp: 15, sp: 5, cp: 0),
      personality: Personality(
        traits: '我面對危險時從不退縮，戰吼能撼動敵膽。',
        ideals: '力量。強者生存，弱者由我守護。',
        bonds: '我的部族就是一切，為族人我願拼上性命。',
        flaws: '一旦動怒，我很難分辨敵友。',
      ),
      features: [
        CharacterFeature(name: '狂暴', nameEn: 'Rage', source: 'Barbarian Lv1', description: '以附贈動作進入狂暴：力量檢定與力量豁免具優勢、近戰力量傷害 +2、對鈍擊/穿刺/揮砍傷害有抗性。'),
        CharacterFeature(name: '魯莽攻擊', nameEn: 'Reckless Attack', source: 'Barbarian Lv2', description: '本回合首次攻擊可選擇魯莽：近戰力量攻擊具優勢，但對你的攻擊在你下回合前也具優勢。'),
        CharacterFeature(name: '危險感知', nameEn: 'Danger Sense', source: 'Barbarian Lv2', description: '對你能看見的效應，敏捷豁免具優勢。'),
        CharacterFeature(name: '二度攻擊', nameEn: 'Extra Attack', source: 'Barbarian Lv5', description: '攻擊動作時可攻擊兩次。'),
        CharacterFeature(name: '迅捷', nameEn: 'Fast Movement', source: 'Barbarian Lv5', description: '未著重甲時速度 +10 呎。'),
        CharacterFeature(name: '狂亂', nameEn: 'Frenzy', source: 'Berserker Lv3', description: '狂暴期間可選擇狂亂，於後續回合以附贈動作進行一次近戰武器攻擊。'),
      ],
      languages: ['Common', 'Orc'],
      personalityTags: ['暴躁', '忠誠', '直接'],
      conditions: [],
      hitDieFaces: 12,
      hitDiceUsed: 2,
    );
  }
}
