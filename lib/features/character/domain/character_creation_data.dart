/// 建角用的規則目錄與衍生計算（D&D 2024，精選常見清單）。
///
/// 機制資料齊全；`description` 為**佔位文案**，最終由文案人員撰寫。
/// `重點提示` 由機制欄位於 UI 端生成，不存於此。
library;

/// 六大能力代碼順序（六角圖、陣列指派皆依此）。
const kAbilityOrder = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];

const kAbilityCn = {
  'STR': '力量',
  'DEX': '敏捷',
  'CON': '體質',
  'INT': '智力',
  'WIS': '感知',
  'CHA': '魅力',
};

/// D&D 標準陣列。
const kStandardArray = [15, 14, 13, 12, 10, 8];

/// 購點制（Point Buy）總預算與各分數累計花費（8–15）。
const kPointBuyBudget = 27;
const kPointBuyCost = {8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9};

/// 陣營（敘事，無機制）。
const kAlignments = [
  '守序善良',
  '中立善良',
  '混亂善良',
  '守序中立',
  '絕對中立',
  '混亂中立',
  '守序邪惡',
  '中立邪惡',
  '混亂邪惡',
];

/// 能力調整值（向下取整，負值亦正確）。
int abilityModifier(int score) => ((score - 10) / 2).floor();

/// 技能定義（中英 + 對應能力）。
class SkillDef {
  final String name;
  final String nameEn;
  final String ability;
  const SkillDef(this.name, this.nameEn, this.ability);
}

const kSkills = <SkillDef>[
  SkillDef('體能', 'Athletics', 'STR'),
  SkillDef('特技', 'Acrobatics', 'DEX'),
  SkillDef('巧手', 'Sleight of Hand', 'DEX'),
  SkillDef('隱匿', 'Stealth', 'DEX'),
  SkillDef('奧秘', 'Arcana', 'INT'),
  SkillDef('歷史', 'History', 'INT'),
  SkillDef('調查', 'Investigation', 'INT'),
  SkillDef('自然', 'Nature', 'INT'),
  SkillDef('宗教', 'Religion', 'INT'),
  SkillDef('馴獸', 'Animal Handling', 'WIS'),
  SkillDef('洞察', 'Insight', 'WIS'),
  SkillDef('醫藥', 'Medicine', 'WIS'),
  SkillDef('感知', 'Perception', 'WIS'),
  SkillDef('求生', 'Survival', 'WIS'),
  SkillDef('欺瞞', 'Deception', 'CHA'),
  SkillDef('威嚇', 'Intimidation', 'CHA'),
  SkillDef('表演', 'Performance', 'CHA'),
  SkillDef('說服', 'Persuasion', 'CHA'),
];

SkillDef skillByName(String name) => kSkills.firstWhere((s) => s.name == name);

/// 種族（2024：不給能力加值；提供速度/體型/感官/特性）。
class SpeciesOption {
  final String cn;
  final String en;
  final String speed; // 如 '30ft'
  final String size; // 'Medium' / 'Small'
  final bool darkvision;

  /// 每等級額外 HP（矮人堅韌 Dwarven Toughness = 1；其餘 0）。
  final int hpPerLevel;
  final List<String> traits;
  final String description; // 佔位文案
  const SpeciesOption({
    required this.cn,
    required this.en,
    this.speed = '30ft',
    this.size = 'Medium',
    this.darkvision = false,
    this.hpPerLevel = 0,
    this.traits = const [],
    this.description = '',
  });
}

const kSpecies = <SpeciesOption>[
  SpeciesOption(
    cn: '人類',
    en: 'Human',
    traits: ['多才', '技能熟練', '起源專長'],
    description: '〔敘述佔位〕適應力極強、分布最廣的種族，靠才智與韌性立足於各地。（文案待補）',
  ),
  SpeciesOption(
    cn: '精靈',
    en: 'Elf',
    darkvision: true,
    traits: ['仙靈血脈', '鷹眼', '漫遊冥思'],
    description: '〔敘述佔位〕優雅長壽、與魔法和自然親近的種族，感官敏銳。（文案待補）',
  ),
  SpeciesOption(
    cn: '矮人',
    en: 'Dwarf',
    darkvision: true,
    hpPerLevel: 1,
    traits: ['矮人韌性', '矮人堅韌 +1HP/級', '石之低語', '黑暗視覺 120'],
    description: '〔敘述佔位〕堅毅耐勞的山地與地底民族，擅長工藝與抵抗毒素。（文案待補）',
  ),
  SpeciesOption(
    cn: '半身人',
    en: 'Halfling',
    size: 'Small',
    traits: ['幸運', '勇敢', '敏捷靈活'],
    description: '〔敘述佔位〕樂天知足的小個子，天生幸運、臨危不亂。（文案待補）',
  ),
  SpeciesOption(
    cn: '龍裔',
    en: 'Dragonborn',
    darkvision: true,
    traits: ['龍息武器', '傷害抗性', '黑暗視覺'],
    description: '〔敘述佔位〕承襲巨龍血脈的戰士種族，可吐出龍息。（文案待補）',
  ),
  SpeciesOption(
    cn: '半獸人',
    en: 'Orc',
    darkvision: true,
    traits: ['不屈毅力', '兇猛衝鋒', '黑暗視覺 120'],
    description: '〔敘述佔位〕強壯而堅韌的戰鬥種族，擁有衝鋒爆發力與瀕死不倒的韌性。（文案待補）',
  ),
  SpeciesOption(
    cn: '提夫林',
    en: 'Tiefling',
    darkvision: true,
    traits: ['地獄抗性', '魔法傳承', '黑暗視覺'],
    description: '〔敘述佔位〕帶有異界血脈的種族，天生掌握些許法術。（文案待補）',
  ),
  SpeciesOption(
    cn: '侏儒',
    en: 'Gnome',
    size: 'Small',
    darkvision: true,
    traits: ['侏儒狡詐', '黑暗視覺'],
    description: '〔敘述佔位〕好奇心旺盛、心智抗性強的小個子發明家。（文案待補）',
  ),
];

/// 職業（2024）。
class ClassOption {
  final String cn;
  final String en;
  final int hitDie; // 生命骰骰面
  final String spellAbility; // 施法屬性代碼；'' = 非施法
  final List<String> saves; // 固定豁免熟練（2 代碼）
  final List<String> primaryAbilities; // 六角圖高亮
  final int skillCount; // 可選技能數
  final List<String> skillChoices; // 可選技能（中文名）

  /// 1 級戲法已知數（2024；0 = 無戲法，如聖騎士/遊俠）。
  final int cantripsKnown;

  /// 1 級一環準備法術數（2024；0 = 非施法職業）。
  final int preparedSpells;

  /// 1 級一環法術位數（2024；邪術師為契約法術位）。
  final int level1Slots;

  /// 無甲防禦（Unarmored Defense）附加屬性代碼：
  /// 野蠻人 'CON'、武僧 'WIS'；'' = 無（AC = 10 + 敏捷）。
  final String unarmoredDefense;
  final String description; // 佔位文案
  const ClassOption({
    required this.cn,
    required this.en,
    required this.hitDie,
    this.spellAbility = '',
    required this.saves,
    required this.primaryAbilities,
    required this.skillCount,
    required this.skillChoices,
    this.cantripsKnown = 0,
    this.preparedSpells = 0,
    this.level1Slots = 0,
    this.unarmoredDefense = '',
    this.description = '',
  });

  bool get isCaster => spellAbility.isNotEmpty;
}

/// 1 級無甲 AC（2024）：10 + 敏捷 + 無甲防禦附加屬性（野蠻人體質、
/// 武僧感知；其餘職業無附加）。[mods] 為能力代碼 → 調整值。
int level1UnarmoredAc(ClassOption cls, Map<String, int> mods) =>
    10 +
    mods['DEX']! +
    (cls.unarmoredDefense.isEmpty ? 0 : mods[cls.unarmoredDefense]!);

/// 1 級最大 HP（2024）：生命骰最大值 + 體質調整值 + 種族每級加成
/// （矮人堅韌），最低 1。
int level1MaxHp(ClassOption cls, SpeciesOption sp, Map<String, int> mods) =>
    (cls.hitDie + mods['CON']! + sp.hpPerLevel).clamp(1, 999);

const _allSkillNames = [
  '體能',
  '特技',
  '巧手',
  '隱匿',
  '奧秘',
  '歷史',
  '調查',
  '自然',
  '宗教',
  '馴獸',
  '洞察',
  '醫藥',
  '感知',
  '求生',
  '欺瞞',
  '威嚇',
  '表演',
  '說服',
];

const kClasses = <ClassOption>[
  ClassOption(
    cn: '野蠻人',
    en: 'Barbarian',
    hitDie: 12,
    unarmoredDefense: 'CON',
    saves: ['STR', 'CON'],
    primaryAbilities: ['STR'],
    skillCount: 2,
    skillChoices: ['馴獸', '體能', '威嚇', '自然', '感知', '求生'],
    description: '〔敘述佔位〕揮舞重武器、以怒火為力量的前線戰士；越受傷越兇猛。（文案待補）',
  ),
  ClassOption(
    cn: '吟遊詩人',
    en: 'Bard',
    hitDie: 8,
    spellAbility: 'CHA',
    cantripsKnown: 2,
    preparedSpells: 4,
    level1Slots: 2,
    saves: ['DEX', 'CHA'],
    primaryAbilities: ['CHA'],
    skillCount: 3,
    skillChoices: _allSkillNames,
    description: '〔敘述佔位〕以表演與魔法鼓舞同伴、樣樣通的多才施法者。（文案待補）',
  ),
  ClassOption(
    cn: '牧師',
    en: 'Cleric',
    hitDie: 8,
    spellAbility: 'WIS',
    cantripsKnown: 3,
    preparedSpells: 4,
    level1Slots: 2,
    saves: ['WIS', 'CHA'],
    primaryAbilities: ['WIS'],
    skillCount: 2,
    skillChoices: ['歷史', '洞察', '醫藥', '說服', '宗教'],
    description: '〔敘述佔位〕承神祇之力的神聖施法者，能治療、守護與打擊。（文案待補）',
  ),
  ClassOption(
    cn: '德魯伊',
    en: 'Druid',
    hitDie: 8,
    spellAbility: 'WIS',
    cantripsKnown: 2,
    preparedSpells: 4,
    level1Slots: 2,
    saves: ['INT', 'WIS'],
    primaryAbilities: ['WIS'],
    skillCount: 2,
    skillChoices: ['奧秘', '馴獸', '洞察', '醫藥', '自然', '感知', '宗教', '求生'],
    description: '〔敘述佔位〕汲取自然之力的施法者，可變身野獸。（文案待補）',
  ),
  ClassOption(
    cn: '戰士',
    en: 'Fighter',
    hitDie: 10,
    saves: ['STR', 'CON'],
    primaryAbilities: ['STR', 'DEX'],
    skillCount: 2,
    skillChoices: ['特技', '馴獸', '體能', '歷史', '洞察', '威嚇', '說服', '感知', '求生'],
    description: '〔敘述佔位〕精通各式武器與戰技的全能戰鬥者。（文案待補）',
  ),
  ClassOption(
    cn: '武僧',
    en: 'Monk',
    hitDie: 8,
    unarmoredDefense: 'WIS',
    saves: ['STR', 'DEX'],
    primaryAbilities: ['DEX', 'WIS'],
    skillCount: 2,
    skillChoices: ['特技', '體能', '歷史', '洞察', '宗教', '隱匿'],
    description: '〔敘述佔位〕以氣與徒手武技作戰、身法迅捷的武者。（文案待補）',
  ),
  ClassOption(
    cn: '聖騎士',
    en: 'Paladin',
    hitDie: 10,
    spellAbility: 'CHA',
    cantripsKnown: 0,
    preparedSpells: 2,
    level1Slots: 2,
    saves: ['WIS', 'CHA'],
    primaryAbilities: ['STR', 'CHA'],
    skillCount: 2,
    skillChoices: ['體能', '洞察', '威嚇', '醫藥', '說服', '宗教'],
    description: '〔敘述佔位〕立下誓言、半戰半法的聖戰士，能治療與制裁。（文案待補）',
  ),
  ClassOption(
    cn: '遊俠',
    en: 'Ranger',
    hitDie: 10,
    spellAbility: 'WIS',
    cantripsKnown: 0,
    preparedSpells: 2,
    level1Slots: 2,
    saves: ['STR', 'DEX'],
    primaryAbilities: ['DEX', 'WIS'],
    skillCount: 3,
    skillChoices: ['馴獸', '體能', '洞察', '調查', '自然', '感知', '隱匿', '求生'],
    description: '〔敘述佔位〕通曉荒野、半法的追蹤獵手與神射手。（文案待補）',
  ),
  ClassOption(
    cn: '盜賊',
    en: 'Rogue',
    hitDie: 8,
    saves: ['DEX', 'INT'],
    primaryAbilities: ['DEX'],
    skillCount: 4,
    skillChoices: ['特技', '體能', '欺瞞', '洞察', '威嚇', '調查', '感知', '說服', '巧手', '隱匿'],
    description: '〔敘述佔位〕擅長潛行、技巧與偷襲的多面手。（文案待補）',
  ),
  ClassOption(
    cn: '術士',
    en: 'Sorcerer',
    hitDie: 6,
    spellAbility: 'CHA',
    cantripsKnown: 4,
    preparedSpells: 2,
    level1Slots: 2,
    saves: ['CON', 'CHA'],
    primaryAbilities: ['CHA'],
    skillCount: 2,
    skillChoices: ['奧秘', '欺瞞', '洞察', '威嚇', '說服', '宗教'],
    description: '〔敘述佔位〕天生擁有魔法血脈、爆發力強的施法者。（文案待補）',
  ),
  ClassOption(
    cn: '邪術師',
    en: 'Warlock',
    hitDie: 8,
    spellAbility: 'CHA',
    cantripsKnown: 2,
    preparedSpells: 2,
    level1Slots: 1,
    saves: ['WIS', 'CHA'],
    primaryAbilities: ['CHA'],
    skillCount: 2,
    skillChoices: ['奧秘', '欺瞞', '歷史', '威嚇', '調查', '自然', '宗教'],
    description: '〔敘述佔位〕與異界主宰締約、換取詭祕力量的施法者。（文案待補）',
  ),
  ClassOption(
    cn: '法師',
    en: 'Wizard',
    hitDie: 6,
    spellAbility: 'INT',
    cantripsKnown: 3,
    preparedSpells: 4,
    level1Slots: 2,
    saves: ['INT', 'WIS'],
    primaryAbilities: ['INT'],
    skillCount: 2,
    skillChoices: ['奧秘', '歷史', '洞察', '調查', '醫藥', '自然', '宗教'],
    description: '〔敘述佔位〕鑽研法術書、博學多能的奧術施法者。（文案待補）',
  ),
];

/// 背景（2024：給能力加值候選、固定技能、起源專長）。
class BackgroundOption {
  final String cn;
  final String en;
  final List<String> abilities; // 能力加值候選（3 代碼）
  final List<String> skills; // 固定技能熟練（中文名）
  final String originFeat; // 起源專長名（機制效果後續）
  final String description; // 佔位文案
  const BackgroundOption({
    required this.cn,
    required this.en,
    required this.abilities,
    required this.skills,
    required this.originFeat,
    this.description = '',
  });
}

const kBackgrounds = <BackgroundOption>[
  BackgroundOption(
    cn: '士兵',
    en: 'Soldier',
    abilities: ['STR', 'DEX', 'CON'],
    skills: ['體能', '威嚇'],
    originFeat: '野蠻打擊',
    description: '〔敘述佔位〕受過軍事訓練的戰士，習於紀律與陣列作戰。（文案待補）',
  ),
  BackgroundOption(
    cn: '賢者',
    en: 'Sage',
    abilities: ['CON', 'INT', 'WIS'],
    skills: ['奧秘', '歷史'],
    originFeat: '法術新手（法師）',
    description: '〔敘述佔位〕埋首典籍的學者，博聞強記、通曉祕辛。（文案待補）',
  ),
  BackgroundOption(
    cn: '侍僧',
    en: 'Acolyte',
    abilities: ['INT', 'WIS', 'CHA'],
    skills: ['洞察', '宗教'],
    originFeat: '法術新手（牧師）',
    description: '〔敘述佔位〕在神殿中侍奉的信徒，熟稔禮儀與信仰。（文案待補）',
  ),
  BackgroundOption(
    cn: '罪犯',
    en: 'Criminal',
    abilities: ['DEX', 'CON', 'INT'],
    skills: ['巧手', '隱匿'],
    originFeat: '警覺',
    description: '〔敘述佔位〕遊走法外的能手，熟悉黑街與不法門路。（文案待補）',
  ),
  BackgroundOption(
    cn: '守衛',
    en: 'Guard',
    abilities: ['STR', 'INT', 'WIS'],
    skills: ['體能', '感知'],
    originFeat: '警覺',
    description: '〔敘述佔位〕看守城門與要地的衛兵，警覺而盡責。（文案待補）',
  ),
  BackgroundOption(
    cn: '嚮導',
    en: 'Guide',
    abilities: ['DEX', 'CON', 'WIS'],
    skills: ['隱匿', '求生'],
    originFeat: '法術新手（德魯伊）',
    description: '〔敘述佔位〕熟悉荒野路徑的引路人，能在野外生存。（文案待補）',
  ),
  BackgroundOption(
    cn: '水手',
    en: 'Sailor',
    abilities: ['STR', 'DEX', 'WIS'],
    skills: ['特技', '感知'],
    originFeat: '酒館鬥毆',
    description: '〔敘述佔位〕走船闖海的水手，身手俐落、見多識廣。（文案待補）',
  ),
  BackgroundOption(
    cn: '貴族',
    en: 'Noble',
    abilities: ['STR', 'INT', 'CHA'],
    skills: ['歷史', '說服'],
    originFeat: '技藝精湛',
    description: '〔敘述佔位〕出身名門的貴族，談吐得體、人脈廣闊。（文案待補）',
  ),
];
