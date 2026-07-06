/// 角色衍生數值的共用純函式與規則常數表（D&D 2024）。
///
/// 建角與升級共用同一份計算；法術位/戲法/可備法術等「數字表」為規則常數，
/// 放本地零網路依賴（內容庫負責特性文字、法術描述等「內容」）。
library;

/// 能力調整值（向下取整，負值亦正確）。
int abilityModifier(int score) => ((score - 10) / 2).floor();

/// 熟練加值（Lv1–4 = +2，之後每 4 級 +1：Lv5/9/13/17 提升）。
int proficiencyBonusFor(int level) => 2 + ((level - 1) ~/ 4);

/// 豁免/技能加值：能力調整值 +（熟練則加熟練加值）。
int proficientBonus(int mod, bool proficient, int pb) =>
    mod + (proficient ? pb : 0);

/// 被動察覺：10 + 感知調整值 +（感知技能熟練則加熟練加值）。
int passivePerceptionFor(int wisMod, bool perceptionProficient, int pb) =>
    10 + proficientBonus(wisMod, perceptionProficient, pb);

/// 施法豁免 DC：8 + 熟練加值 + 施法屬性調整值。
int spellSaveDcFor(int pb, int spellMod) => 8 + pb + spellMod;

/// 施法命中：熟練加值 + 施法屬性調整值。
int spellAttackFor(int pb, int spellMod) => pb + spellMod;

/// 升級取平均值時的生命骰固定值（d6→4、d8→5、d10→6、d12→7）。
int averageHitDieValue(int faces) => faces ~/ 2 + 1;

/// 升 1 級的最大 HP 增量：骰值 + 體質調整值（最低 1）+ 種族每級加成
/// （矮人堅韌）。
int levelHpGain(int roll, int conMod, {int speciesHpPerLevel = 0}) =>
    (roll + conMod < 1 ? 1 : roll + conMod) + speciesHpPerLevel;

/// 施法進程（法術位表的種類）。
enum CasterProgression { none, full, half, pact }

/// 內容庫 `classes.caster_progression` 字串 → 進程；對不上視為非施法。
CasterProgression casterProgressionFromString(String? value) {
  switch (value) {
    case 'full':
      return CasterProgression.full;
    case '1/2':
    case 'half':
    case 'artificer':
      return CasterProgression.half;
    case 'pact':
      return CasterProgression.pact;
    default:
      return CasterProgression.none;
  }
}

/// 各職業（英文名）的施法進程（2024，本地權威表）。
const kClassProgression = <String, CasterProgression>{
  'Bard': CasterProgression.full,
  'Cleric': CasterProgression.full,
  'Druid': CasterProgression.full,
  'Sorcerer': CasterProgression.full,
  'Wizard': CasterProgression.full,
  'Paladin': CasterProgression.half,
  'Ranger': CasterProgression.half,
  'Warlock': CasterProgression.pact,
};

/// 全施法者法術位表（2024 PHB；index = 等級-1，內層 index = 環數-1）。
const _fullCasterSlots = <List<int>>[
  [2, 0, 0, 0, 0, 0, 0, 0, 0],
  [3, 0, 0, 0, 0, 0, 0, 0, 0],
  [4, 2, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 2, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 1, 0, 0, 0, 0, 0],
  [4, 3, 3, 2, 0, 0, 0, 0, 0],
  [4, 3, 3, 3, 1, 0, 0, 0, 0],
  [4, 3, 3, 3, 2, 0, 0, 0, 0],
  [4, 3, 3, 3, 2, 1, 0, 0, 0],
  [4, 3, 3, 3, 2, 1, 0, 0, 0],
  [4, 3, 3, 3, 2, 1, 1, 0, 0],
  [4, 3, 3, 3, 2, 1, 1, 0, 0],
  [4, 3, 3, 3, 2, 1, 1, 1, 0],
  [4, 3, 3, 3, 2, 1, 1, 1, 0],
  [4, 3, 3, 3, 2, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 2, 1, 1],
];

/// 半施法者法術位表（2024：聖騎士/遊俠自 Lv1 起有法術位）。
const _halfCasterSlots = <List<int>>[
  [2, 0, 0, 0, 0],
  [2, 0, 0, 0, 0],
  [3, 0, 0, 0, 0],
  [3, 0, 0, 0, 0],
  [4, 2, 0, 0, 0],
  [4, 2, 0, 0, 0],
  [4, 3, 0, 0, 0],
  [4, 3, 0, 0, 0],
  [4, 3, 2, 0, 0],
  [4, 3, 2, 0, 0],
  [4, 3, 3, 0, 0],
  [4, 3, 3, 0, 0],
  [4, 3, 3, 1, 0],
  [4, 3, 3, 1, 0],
  [4, 3, 3, 2, 0],
  [4, 3, 3, 2, 0],
  [4, 3, 3, 3, 1],
  [4, 3, 3, 3, 1],
  [4, 3, 3, 3, 2],
  [4, 3, 3, 3, 2],
];

/// 契約法術（邪術師）：index = 等級-1 → (法術位數, 位階)。
const _pactSlots = <(int, int)>[
  (1, 1),
  (2, 1),
  (2, 2),
  (2, 2),
  (2, 3),
  (2, 3),
  (2, 4),
  (2, 4),
  (2, 5),
  (2, 5),
  (3, 5),
  (3, 5),
  (3, 5),
  (3, 5),
  (3, 5),
  (3, 5),
  (4, 5),
  (4, 5),
  (4, 5),
  (4, 5),
];

/// 指定進程與等級的各環法術位上限（環數 → 數量；非施法回傳空）。
Map<int, int> spellSlotTotalsFor(CasterProgression progression, int level) {
  if (level < 1 || level > 20) return const {};
  switch (progression) {
    case CasterProgression.none:
      return const {};
    case CasterProgression.full:
    case CasterProgression.half:
      final row = progression == CasterProgression.full
          ? _fullCasterSlots[level - 1]
          : _halfCasterSlots[level - 1];
      return {
        for (var ring = 1; ring <= row.length; ring++)
          if (row[ring - 1] > 0) ring: row[ring - 1],
      };
    case CasterProgression.pact:
      final (count, slotLevel) = _pactSlots[level - 1];
      return {slotLevel: count};
  }
}

/// 指定進程與等級可施放的最高環數（0 = 無法術位）。
int maxSpellRingFor(CasterProgression progression, int level) {
  final slots = spellSlotTotalsFor(progression, level);
  return slots.isEmpty ? 0 : slots.keys.reduce((a, b) => a > b ? a : b);
}

/// 各職業已知戲法數（2024；index = 等級-1）。非施法/無戲法職業不在表中。
const kCantripsKnown = <String, List<int>>{
  'Bard': [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  'Cleric': [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  'Druid': [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  'Sorcerer': [4, 4, 4, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6],
  'Warlock': [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  'Wizard': [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
};

/// 各職業可備法術數（2024；index = 等級-1）。
const kPreparedSpells = <String, List<int>>{
  'Bard': _fullPrepared,
  'Cleric': _fullPrepared,
  'Druid': _fullPrepared,
  // 法師自 Lv14 起進程高於其他全施法者（XPHB 法師特性表）。
  'Wizard': [
    4,
    5,
    6,
    7,
    9,
    10,
    11,
    12,
    14,
    15,
    16,
    16,
    17,
    18,
    19,
    21,
    22,
    23,
    24,
    25,
  ],
  'Sorcerer': [
    2,
    4,
    6,
    7,
    9,
    10,
    11,
    12,
    14,
    15,
    16,
    16,
    17,
    17,
    18,
    18,
    19,
    20,
    21,
    22,
  ],
  'Warlock': [
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    10,
    10,
    11,
    11,
    12,
    12,
    13,
    13,
    14,
    14,
    15,
    15,
  ],
  'Paladin': _halfPrepared,
  'Ranger': _halfPrepared,
};

const _fullPrepared = [
  4,
  5,
  6,
  7,
  9,
  10,
  11,
  12,
  14,
  15,
  16,
  16,
  17,
  17,
  18,
  18,
  19,
  20,
  21,
  22,
];

const _halfPrepared = [
  2,
  3,
  4,
  5,
  6,
  6,
  7,
  7,
  9,
  9,
  10,
  10,
  11,
  11,
  12,
  12,
  14,
  14,
  15,
  15,
];

/// 升至 [newLevel] 時可新選的戲法數（已知數差額；無則 0）。
int newCantripPicksFor(String classEn, int newLevel) {
  final table = kCantripsKnown[classEn];
  if (table == null || newLevel < 2 || newLevel > 20) return 0;
  return table[newLevel - 1] - table[newLevel - 2];
}

/// 升至 [newLevel] 時可新選的法術數。
///
/// 法師固定 2（每級免費抄 2 個法術進法書，2024）；其餘職業取可備數
/// 差額（差額 0 的等級無新法術，僅替換——本 app 不做替換）。
int newSpellPicksFor(String classEn, int newLevel) {
  if (newLevel < 2 || newLevel > 20) return 0;
  if (classEn == 'Wizard') return 2;
  final table = kPreparedSpells[classEn];
  if (table == null) return 0;
  final diff = table[newLevel - 1] - table[newLevel - 2];
  return diff < 0 ? 0 : diff;
}
