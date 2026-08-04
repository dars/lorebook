/// 建角用的規則目錄與衍生計算（D&D 2024，精選常見清單）。
///
/// 機制資料齊全；`description` 為**佔位文案**，最終由文案人員撰寫。
/// `重點提示` 由機制欄位於 UI 端生成，不存於此。
library;

export 'character_math.dart' show abilityModifier;

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

/// 種族特性：名稱與說明分開存放。
///
/// 兩者黏成一個字串的話，`CharacterFeature.description` 永遠是空的，顯示端
/// 的說明分支也就永遠觸發不到——資訊會在建角時被丟掉。說明為純文字，不做
/// 機制自動化，也不進入內容庫的標記渲染路徑。
class SpeciesTrait {
  final String name;
  final String nameEn;

  /// 說明；空字串代表無說明，呈現時不提供展開互動。
  final String description;

  const SpeciesTrait(this.name, {this.nameEn = '', this.description = ''});
}

/// 種族（2024：不給能力加值；提供速度/體型/感官/特性）。
class SpeciesOption {
  final String cn;
  final String en;
  final String speed; // 如 '30ft'
  final String size; // 'Medium' / 'Small'
  /// 黑暗視覺距離（呎）；0 = 無。黑暗視覺的特性條目由此推導
  /// （見 [allTraits]），不在 [traits] 內重複列出。
  final int darkvisionFt;

  /// 每等級額外 HP（矮人堅韌 Dwarven Toughness = 1；其餘 0）。
  final int hpPerLevel;

  /// 種族技能特性可選數（人類「技能熟練」1、精靈「鷹眼」1；其餘 0）。
  final int skillPickCount;

  /// 種族技能可選清單（中文名；空 = 無種族技能特性）。
  final List<String> skillPickFrom;

  /// 可選體型（2024 人類可選中型/小型；空 = 固定為 [size]）。
  final List<String> sizeChoices;
  final List<SpeciesTrait> traits;
  final String description; // 佔位文案
  const SpeciesOption({
    required this.cn,
    required this.en,
    this.speed = '30ft',
    this.size = 'Medium',
    this.darkvisionFt = 0,
    this.hpPerLevel = 0,
    this.skillPickCount = 0,
    this.skillPickFrom = const [],
    this.sizeChoices = const [],
    this.traits = const [],
    this.description = '',
  });

  /// 實際可選體型清單（未宣告 sizeChoices 時為固定單值）。
  List<String> get effectiveSizeChoices =>
      sizeChoices.isEmpty ? [size] : sizeChoices;

  /// 呈現與寫入角色卡用的完整特性清單。
  ///
  /// 黑暗視覺由 [darkvisionFt] 推導而非各種族各寫一遍——先前兩種表示法
  /// 並存，導致建角卡上同時出現「黑暗視覺」與「黑暗視覺 120」兩個項目，
  /// 且 bool 表達不了 60／120 的差別。
  List<SpeciesTrait> get allTraits => [
    ...traits,
    if (darkvisionFt > 0)
      SpeciesTrait(
        '黑暗視覺 $darkvisionFt',
        nameEn: 'Darkvision',
        description: '$darkvisionFt 呎內，昏暗光線視為明亮、黑暗視為昏暗（僅能辨色為灰階）。',
      ),
  ];
}

const kSpecies = <SpeciesOption>[
  SpeciesOption(
    cn: '人類',
    en: 'Human',
    skillPickCount: 1,
    skillPickFrom: _allSkillNames,
    sizeChoices: ['Medium', 'Small'],
    traits: [
      SpeciesTrait(
        '足智多謀',
        nameEn: 'Resourceful',
        description: '每次長休結束時獲得一次英雄激勵。',
      ),
      SpeciesTrait('多才多藝', nameEn: 'Skillful', description: '任選一項技能獲得熟練。'),
      SpeciesTrait('天賦異稟', nameEn: 'Versatile', description: '額外獲得一個起源專長。'),
    ],
    description: '〔敘述佔位〕適應力極強、分布最廣的種族，靠才智與韌性立足於各地。（文案待補）',
  ),
  SpeciesOption(
    cn: '精靈',
    en: 'Elf',
    darkvisionFt: 60,
    skillPickCount: 1,
    skillPickFrom: ['洞察', '感知', '求生'],
    traits: [
      SpeciesTrait(
        '精靈血系',
        nameEn: 'Elven Lineage',
        description: '卓爾／高等／木精靈三選一，各自帶來不同的天生法術與增益。',
      ),
      SpeciesTrait(
        '妖精血統',
        nameEn: 'Fey Ancestry',
        description: '對抗魅惑的豁免具優勢，魔法無法使你入睡。',
      ),
      SpeciesTrait(
        '敏銳感官',
        nameEn: 'Keen Senses',
        description: '洞察、感知、求生擇一獲得熟練。',
      ),
      SpeciesTrait(
        '出神',
        nameEn: 'Trance',
        description: '長休只需 4 小時的冥想，期間保持部分意識。',
      ),
    ],
    description: '〔敘述佔位〕優雅長壽、與魔法和自然親近的種族，感官敏銳。（文案待補）',
  ),
  SpeciesOption(
    cn: '矮人',
    en: 'Dwarf',
    darkvisionFt: 120,
    hpPerLevel: 1,
    traits: [
      SpeciesTrait(
        '矮人韌性',
        nameEn: 'Dwarven Resilience',
        description: '具毒素傷害抗性，對抗中毒狀態的豁免具優勢。',
      ),
      SpeciesTrait(
        '矮人堅毅',
        nameEn: 'Dwarven Toughness',
        description: '生命值上限每個等級 +1。',
      ),
      SpeciesTrait(
        '石工直覺',
        nameEn: 'Stonecunning',
        description: '附贈動作獲得 60 呎震顫感知 10 分鐘，每次長休可用熟練加值次數。',
      ),
    ],
    description: '〔敘述佔位〕堅毅耐勞的山地與地底民族，擅長工藝與抵抗毒素。（文案待補）',
  ),
  SpeciesOption(
    cn: '半身人',
    en: 'Halfling',
    size: 'Small',
    traits: [
      SpeciesTrait(
        '幸運',
        nameEn: 'Lucky',
        description: 'd20 檢定擲出 1 時可重擲一次，須採用新結果。',
      ),
      SpeciesTrait('勇毅', nameEn: 'Brave', description: '對抗恐懼的豁免具優勢。'),
      SpeciesTrait(
        '半身人的靈巧',
        nameEn: 'Halfling Nimbleness',
        description: '可穿越體型比你大的生物所佔空間。',
      ),
      SpeciesTrait(
        '天生隱匿',
        nameEn: 'Naturally Stealthy',
        description: '被體型比你大的生物遮蔽時，仍可嘗試躲藏。',
      ),
    ],
    description: '〔敘述佔位〕樂天知足的小個子，天生幸運、臨危不亂。（文案待補）',
  ),
  SpeciesOption(
    cn: '龍裔',
    en: 'Dragonborn',
    darkvisionFt: 60,
    traits: [
      SpeciesTrait(
        '龍族血統',
        nameEn: 'Draconic Ancestry',
        description: '選定一種巨龍血脈，決定吐息與抗性的傷害類型。',
      ),
      SpeciesTrait(
        '吐息武器',
        nameEn: 'Breath Weapon',
        description: '攻擊時可改為噴吐能量，每次長休可用熟練加值次數。',
      ),
      SpeciesTrait(
        '傷害抗性',
        nameEn: 'Damage Resistance',
        description: '對血脈對應的傷害類型具抗性。',
      ),
      SpeciesTrait(
        '龍族飛行',
        nameEn: 'Draconic Flight',
        description: '5 級起可附贈動作生出靈體之翼，飛行速度等同步行速度，持續 10 分鐘。',
      ),
    ],
    description: '〔敘述佔位〕承襲巨龍血脈的戰士種族，可吐出龍息。（文案待補）',
  ),
  SpeciesOption(
    cn: '獸人',
    en: 'Orc',
    darkvisionFt: 120,
    traits: [
      SpeciesTrait(
        '腎上腺素爆發',
        nameEn: 'Adrenaline Rush',
        description: '附贈動作衝刺，並獲得等同熟練加值的臨時生命值。',
      ),
      SpeciesTrait(
        '不屈毅力',
        nameEn: 'Relentless Endurance',
        description: '生命值降至 0 時改為保留 1 點，每次長休一次。',
      ),
    ],
    description: '〔敘述佔位〕強壯而堅韌的戰鬥種族，衝勁十足且瀕死不倒。（文案待補）',
  ),
  SpeciesOption(
    cn: '提夫林',
    en: 'Tiefling',
    darkvisionFt: 60,
    sizeChoices: ['Medium', 'Small'],
    traits: [
      SpeciesTrait(
        '魔裔傳承',
        nameEn: 'Fiendish Legacy',
        description: '深淵／冥府／煉獄三選一，各自帶來不同的天生法術與抗性。',
      ),
      SpeciesTrait(
        '異界威儀',
        nameEn: 'Otherworldly Presence',
        description: '習得奇術戲法，施法屬性可自選智力、感知或魅力。',
      ),
    ],
    description: '〔敘述佔位〕帶有異界血脈的種族，天生掌握些許法術。（文案待補）',
  ),
  SpeciesOption(
    cn: '侏儒',
    en: 'Gnome',
    size: 'Small',
    darkvisionFt: 60,
    traits: [
      SpeciesTrait(
        '侏儒狡黠',
        nameEn: 'Gnomish Cunning',
        description: '智力、感知、魅力的豁免皆具優勢。',
      ),
      SpeciesTrait(
        '侏儒血系',
        nameEn: 'Gnomish Lineage',
        description: '森林／岩石二選一，帶來不同的天生法術或工藝能力。',
      ),
    ],
    description: '〔敘述佔位〕好奇心旺盛、心智抗性強的小個子發明家。（文案待補）',
  ),
  SpeciesOption(
    cn: '歌利亞',
    en: 'Goliath',
    speed: '35ft',
    traits: [
      SpeciesTrait(
        '巨人血統',
        nameEn: 'Giant Ancestry',
        description: '六種巨人恩賜擇一，各自提供不同的戰鬥增益。',
      ),
      SpeciesTrait(
        '巨大形體',
        nameEn: 'Large Form',
        description: '5 級起可附贈動作變為大型，持續 10 分鐘，每次長休一次。',
      ),
      SpeciesTrait(
        '魁梧體格',
        nameEn: 'Powerful Build',
        description: '對抗被擒抱的豁免具優勢；負重與推拉舉視為大型生物。',
      ),
    ],
    description: '〔敘述佔位〕承襲巨人血脈的高大山民，健步如飛、力能扛鼎。（文案待補）',
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

  /// 起源專長是否為使用者自行定義（內建背景恆為 false）。
  /// 模式一律以此判斷，不由名稱推導。
  final bool originFeatCustom;

  /// 自訂起源專長的說明；`originFeatCustom` 為 false 時不採用
  /// （說明取自內容庫）。
  final String originFeatDescription;
  final String description; // 佔位文案
  const BackgroundOption({
    required this.cn,
    required this.en,
    required this.abilities,
    required this.skills,
    required this.originFeat,
    this.originFeatCustom = false,
    this.originFeatDescription = '',
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
];
