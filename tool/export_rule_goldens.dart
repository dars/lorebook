// 規則邏輯的 golden 對照匯出器。
//
// 用途：Next.js 重寫時，規則推導不得憑規格重寫，必須逐項對上現行 Flutter
// 實作的輸出（web-only-nextjs-migration，design D7）。這類邏輯的失敗模式
// 不是「寫不出來」，而是「看起來對、但特定情境算錯」——玩家不會回報，只會
// 默默失去信任。一次性切換沒有並行雙軌當安全網，對拍是主要防線。
//
// 以 flutter test 執行（freezed 產生碼會 import flutter/foundation）。
// 放在 tool/ 所以不會被 `flutter test` 預設掃到。
//
//   flutter test tool/export_rule_goldens.dart --dart-define=out=golden
//
// 輸出為 <out>/<函式名>.json，格式一律 [{input, output}, …]，input 為新實作
// 也吃得到的純資料，output 為現行實作的結果。

import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

import 'package:lorebook/features/catalog/domain/fivetools_text.dart';

import 'package:lorebook/features/character/domain/character.dart';
import 'package:lorebook/features/character/domain/character_math.dart';
import 'package:lorebook/features/character/domain/class_resources.dart';
import 'package:lorebook/features/character/domain/currency_math.dart';
import 'package:lorebook/features/character/domain/derived_stats.dart';
import 'package:lorebook/features/character/domain/level_up.dart';

const _out = String.fromEnvironment('out');

AbilityScore _ab(int score) => AbilityScore(
  score: score,
  modifier: (score - 10 >= 0 ? score - 10 : score - 11) ~/ 2,
);

AbilityScores _scores({
  int str = 10,
  int dex = 10,
  int con = 10,
  int intel = 10,
  int wis = 10,
  int cha = 10,
}) => AbilityScores(
  str: _ab(str),
  dex: _ab(dex),
  con: _ab(con),
  int_: _ab(intel),
  wis: _ab(wis),
  cha: _ab(cha),
);

/// AC 推導只讀取少數欄位，其餘留預設——golden 的 input 因此小而可讀。
Character _acCase({
  required String classNameEn,
  AbilityScores? scores,
  List<Equipment> equipment = const [],
  bool mageArmorActive = false,
  int legacyAc = 0,
}) => Character(
  id: 'ac-case',
  name: 'AC',
  className: '',
  classNameEn: classNameEn,
  level: 1,
  maxHp: 1,
  currentHp: 1,
  ac: legacyAc,
  mageArmorActive: mageArmorActive,
  abilityScores: scores ?? _scores(),
  equipment: equipment,
);

Equipment _armor(
  String name,
  ArmorCategory cat,
  int acBase, {
  bool equipped = true,
}) => Equipment(
  name: name,
  itemType: ItemType.armor,
  quantity: 1,
  equipped: equipped,
  armorCategory: cat,
  acBase: acBase,
);

final _shield = _armor('盾牌', ArmorCategory.shield, 0);

/// 逐一涵蓋 computeAc 的每個分支，含「持盾對無甲防禦的差別效果」這個
/// 容易在重寫時漏掉的規則：野蠻人持盾仍有效，武僧持盾失效。
List<({String desc, Character c})> _acCases() => [
  (desc: '無甲・敏捷', c: _acCase(classNameEn: 'Fighter', scores: _scores(dex: 16))),
  (
    desc: '無甲・敏捷＋盾牌',
    c: _acCase(
      classNameEn: 'Fighter',
      scores: _scores(dex: 16),
      equipment: [_shield],
    ),
  ),
  (
    desc: '輕甲：base＋敏捷全額',
    c: _acCase(
      classNameEn: 'Fighter',
      scores: _scores(dex: 16),
      equipment: [_armor('皮甲', ArmorCategory.light, 11)],
    ),
  ),
  (
    desc: '中甲：敏捷上限 +2（敏捷 +3 只計 +2）',
    c: _acCase(
      classNameEn: 'Fighter',
      scores: _scores(dex: 16),
      equipment: [_armor('鏈衫', ArmorCategory.medium, 13)],
    ),
  ),
  (
    desc: '中甲：敏捷 +1 未達上限，全額計入',
    c: _acCase(
      classNameEn: 'Fighter',
      scores: _scores(dex: 12),
      equipment: [_armor('鏈衫', ArmorCategory.medium, 13)],
    ),
  ),
  (
    desc: '重甲：完全不計敏捷',
    c: _acCase(
      classNameEn: 'Fighter',
      scores: _scores(dex: 16),
      equipment: [_armor('板甲', ArmorCategory.heavy, 18)],
    ),
  ),
  (
    desc: '重甲＋盾牌',
    c: _acCase(
      classNameEn: 'Fighter',
      scores: _scores(dex: 16),
      equipment: [_armor('板甲', ArmorCategory.heavy, 18), _shield],
    ),
  ),
  (
    desc: '野蠻人無甲防禦：10＋敏＋體',
    c: _acCase(classNameEn: 'Barbarian', scores: _scores(dex: 14, con: 16)),
  ),
  (
    desc: '野蠻人無甲防禦＋盾牌（持盾仍有效）',
    c: _acCase(
      classNameEn: 'Barbarian',
      scores: _scores(dex: 14, con: 16),
      equipment: [_shield],
    ),
  ),
  (
    desc: '武僧無甲防禦：10＋敏＋感',
    c: _acCase(classNameEn: 'Monk', scores: _scores(dex: 16, wis: 14)),
  ),
  (
    desc: '武僧持盾：無甲防禦失效，退回一般無甲',
    c: _acCase(
      classNameEn: 'Monk',
      scores: _scores(dex: 16, wis: 14),
      equipment: [_shield],
    ),
  ),
  (
    desc: '法師護甲：13＋敏，高於一般無甲',
    c: _acCase(
      classNameEn: 'Wizard',
      scores: _scores(dex: 12),
      mageArmorActive: true,
    ),
  ),
  (
    desc: '法師護甲低於無甲防禦時不採用（取最高）',
    c: _acCase(
      classNameEn: 'Barbarian',
      scores: _scores(dex: 14, con: 18),
      mageArmorActive: true,
    ),
  ),
  (
    desc: '自訂護甲缺 acBase：回退舊靜態 ac 欄位',
    c: _acCase(
      classNameEn: 'Fighter',
      scores: _scores(dex: 14),
      equipment: [_armor('祖傳鎧', ArmorCategory.none, 0)],
      legacyAc: 15,
    ),
  ),
  (
    desc: '未裝備的護甲不計入',
    c: _acCase(
      classNameEn: 'Fighter',
      scores: _scores(dex: 16),
      equipment: [_armor('板甲', ArmorCategory.heavy, 18, equipped: false)],
    ),
  ),
];

/// 分層扣款的邊界：剛好、需向上換零、跨多階換零、不足。
List<({String desc, Currency c, int priceCp})> _payCases() => [
  (desc: '免費（0 cp）不動財富', c: const Currency(gp: 1), priceCp: 0),
  (desc: '同階剛好扣完', c: const Currency(cp: 50), priceCp: 50),
  (desc: '同階不足，向上換零一枚 sp', c: const Currency(sp: 5, cp: 3), priceCp: 8),
  (desc: '跨階換零：只有 gp 買 3 cp', c: const Currency(gp: 1), priceCp: 3),
  (desc: '跨兩階換零：只有 pp 買 7 cp', c: const Currency(pp: 1), priceCp: 7),
  (
    desc: '混合幣別，優先扣小額',
    c: const Currency(pp: 1, gp: 5, ep: 2, sp: 3, cp: 9),
    priceCp: 137,
  ),
  (desc: '不產生 ep：找零走 gp/sp/cp', c: const Currency(ep: 1), priceCp: 3),
  (desc: '總額不足，回傳差額且財富不變', c: const Currency(sp: 2), priceCp: 100),
  (desc: '身無分文', c: const Currency(), priceCp: 1),
  (desc: '總額剛好用盡', c: const Currency(gp: 1, sp: 2, cp: 3), priceCp: 123),
];

/// 攻擊列的案例：涵蓋 finesse 取較高屬性、缺傷害資料的降級、數量、
/// 以及「徒手攻擊恆存在」這條。
Equipment _weapon(
  String name, {
  String damage = '',
  String damageType = '',
  bool finesse = false,
  int quantity = 1,
  bool equipped = true,
  List<String> properties = const [],
}) => Equipment(
  name: name,
  nameEn: name,
  itemType: ItemType.weapon,
  equipped: equipped,
  quantity: quantity,
  damage: damage,
  damageType: damageType,
  finesse: finesse,
  properties: properties,
);

List<({String desc, Character c})> _attackCases() => [
  (
    desc: '無武器：只有徒手攻擊',
    c: _acCase(classNameEn: 'Wizard', scores: _scores(str: 8)),
  ),
  (
    desc: '力量型武器：命中與傷害都用力量',
    c: _acCase(
      classNameEn: 'Fighter',
      scores: _scores(str: 16, dex: 12),
      equipment: [_weapon('長劍', damage: '1d8', damageType: 'slashing')],
    ),
  ),
  (
    desc: 'finesse：取力量與敏捷較高者（此處敏捷較高）',
    c: _acCase(
      classNameEn: 'Rogue',
      scores: _scores(str: 10, dex: 18),
      equipment: [
        _weapon('短劍', damage: '1d6', damageType: 'piercing', finesse: true),
      ],
    ),
  ),
  (
    desc: 'finesse：力量較高時取力量',
    c: _acCase(
      classNameEn: 'Rogue',
      scores: _scores(str: 18, dex: 10),
      equipment: [
        _weapon('短劍', damage: '1d6', damageType: 'piercing', finesse: true),
      ],
    ),
  ),
  (
    desc: '調整值為 0 時傷害不加尾綴',
    c: _acCase(
      classNameEn: 'Fighter',
      scores: _scores(str: 10),
      equipment: [_weapon('長劍', damage: '1d8')],
    ),
  ),
  (
    desc: '負調整值：傷害顯示為減項',
    c: _acCase(
      classNameEn: 'Fighter',
      scores: _scores(str: 6),
      equipment: [_weapon('長劍', damage: '1d8')],
    ),
  ),
  (
    desc: '缺傷害資料：降級為僅顯示名稱（hitBonus 與 damage 為 null）',
    c: _acCase(
      classNameEn: 'Fighter',
      scores: _scores(str: 16),
      equipment: [_weapon('祖傳寶劍')],
    ),
  ),
  (
    desc: '數量與屬性標籤原樣帶出',
    c: _acCase(
      classNameEn: 'Fighter',
      scores: _scores(str: 14),
      equipment: [
        _weapon(
          '飛刀',
          damage: '1d4',
          damageType: 'piercing',
          finesse: true,
          quantity: 4,
          properties: ['thrown (20/60)', 'finesse'],
        ),
      ],
    ),
  ),
  (
    desc: '未裝備的武器不入攻擊列',
    c: _acCase(
      classNameEn: 'Fighter',
      scores: _scores(str: 16),
      equipment: [_weapon('長劍', damage: '1d8', equipped: false)],
    ),
  ),
  (
    desc: '徒手傷害下限為 0（力量 -3 時不為負）',
    c: _acCase(classNameEn: 'Wizard', scores: _scores(str: 4)),
  ),
];

/// 升級案例。刻意涵蓋「取平均 vs 擲骰」「ASI 提升 CON 的回溯」「法術位已用數
/// 的保留」「職業資源差額入帳」這幾條。
Character _lvCase({
  required String classNameEn,
  required int level,
  AbilityScores? scores,
  List<SpellSlots> slots = const [],
  List<ClassResource> resources = const [],
  int maxHp = 30,
  int currentHp = 20,
  String species = '人類',
  String spellcastingAbility = '',
}) => Character(
  id: 'lv',
  name: 'Lv',
  className: '',
  classNameEn: classNameEn,
  species: species,
  level: level,
  maxHp: maxHp,
  currentHp: currentHp,
  hitDieFaces: classNameEn == 'Wizard' ? 6 : 10,
  spellcastingAbility: spellcastingAbility,
  spellSlots: slots,
  resources: resources,
  abilityScores: scores ?? _scores(),
);

List<({String desc, Character c, LevelUpChoices choices})> _levelUpCases() => [
  (
    desc: '取平均值：HP 增量 = 平均 + 體質',
    c: _lvCase(classNameEn: 'Fighter', level: 1, scores: _scores(con: 14)),
    choices: const LevelUpChoices(),
  ),
  (
    desc: '擲骰值取代平均值',
    c: _lvCase(classNameEn: 'Fighter', level: 1, scores: _scores(con: 14)),
    choices: const LevelUpChoices(hpRoll: 9),
  ),
  (
    desc: 'ASI 提升體質時回溯既有等級的 HP',
    c: _lvCase(classNameEn: 'Fighter', level: 3, scores: _scores(con: 13)),
    choices: const LevelUpChoices(asi: {'CON': 1}),
  ),
  (
    desc: 'ASI 分配兩點到不同能力',
    c: _lvCase(
      classNameEn: 'Fighter',
      level: 3,
      scores: _scores(str: 15, dex: 13),
    ),
    choices: const LevelUpChoices(asi: {'STR': 1, 'DEX': 1}),
  ),
  (
    desc: '能力值上限 20——加值不會溢出',
    c: _lvCase(classNameEn: 'Fighter', level: 3, scores: _scores(str: 20)),
    choices: const LevelUpChoices(asi: {'STR': 2}),
  ),
  (
    desc: '法術位：已用數保留並夾至新上限（升級不視為休息）',
    c: _lvCase(
      classNameEn: 'Wizard',
      level: 2,
      spellcastingAbility: 'INT',
      scores: _scores(intel: 16, con: 12),
      slots: [SpellSlots(level: 1, total: 3, used: 3)],
    ),
    choices: const LevelUpChoices(),
  ),
  (
    desc: '職業資源：差額入帳而非回滿',
    c: _lvCase(
      classNameEn: 'Barbarian',
      level: 2,
      scores: _scores(con: 14),
      resources: [
        ClassResource(name: '狂暴', nameEn: 'Rage', current: 0, max: 2),
      ],
    ),
    choices: const LevelUpChoices(),
  ),
  (
    desc: '矮人的每級額外 HP 計入',
    c: _lvCase(
      classNameEn: 'Fighter',
      level: 1,
      species: '矮人',
      scores: _scores(con: 14),
    ),
    choices: const LevelUpChoices(),
  ),
  (
    desc: 'Lv3 子職選擇',
    c: _lvCase(classNameEn: 'Fighter', level: 2),
    choices: const LevelUpChoices(subclass: '冠軍', subclassEn: 'Champion'),
  ),
];

Map<String, dynamic> _currencyJson(Currency c) => {
  'pp': c.pp,
  'gp': c.gp,
  'ep': c.ep,
  'sp': c.sp,
  'cp': c.cp,
};

void write(String name, List<Map<String, dynamic>> cases) {
  final f = File('$_out/$name.json');
  f.parent.createSync(recursive: true);
  f.writeAsStringSync('${const JsonEncoder.withIndent('  ').convert(cases)}\n');
  stdout.writeln('$name.json：${cases.length} 筆');
}

void main() {
  test('匯出規則 golden 對照', () {
    if (_out.isEmpty) fail('需要 --dart-define=out=<輸出目錄>');

    write('compute_ac', [
      for (final k in _acCases())
        {
          'desc': k.desc,
          'input': k.c.toJson(),
          'output': {
            'value': computeAc(k.c).value,
            'label': computeAc(k.c).label,
          },
        },
    ]);

    write('pay_from', [
      for (final k in _payCases())
        () {
          final r = payFrom(k.c, k.priceCp);
          return {
            'desc': k.desc,
            'input': {'currency': _currencyJson(k.c), 'priceCp': k.priceCp},
            'output': {
              'ok': r.ok,
              'remaining': _currencyJson(r.remaining),
              'shortfallCp': r.shortfallCp,
            },
          };
        }(),
    ]);

    // 貨幣顯示格式也入 golden：全 App 的金額呈現都經過它，格式漂掉會很明顯。
    write('format_cp', [
      for (final cp in [0, 1, 9, 10, 99, 100, 137, 1000, 1234, 123456])
        {
          'input': {'cp': cp},
          'output': {'text': formatCp(cp)},
        },
    ]);

    write('attack_entries', [
      for (final k in _attackCases())
        {
          'desc': k.desc,
          'input': k.c.toJson(),
          'output': [
            for (final a in attackEntries(k.c))
              {
                'name': a.name,
                'nameEn': a.nameEn,
                'hitBonus': a.hitBonus,
                'damage': a.damage,
                'damageType': a.damageType,
                'quantity': a.quantity,
                'unarmed': a.unarmed,
                'properties': a.properties,
              },
          ],
        },
    ]);

    // 升級相關的規則表。applyLevelUp 本身是流程編排（依賴玩家選擇），
    // 隨其頁面移植；此處只凍結表格與純推導——那才是抄漏一格會出錯的部分。
    write('level_tables', [
      for (final cls in [
        'Barbarian',
        'Bard',
        'Cleric',
        'Druid',
        'Fighter',
        'Monk',
        'Paladin',
        'Ranger',
        'Rogue',
        'Sorcerer',
        'Warlock',
        'Wizard',
      ])
        for (var lv = 1; lv <= 20; lv++)
          {
            'input': {'classEn': cls, 'level': lv},
            'output': {
              'proficiencyBonus': proficiencyBonusFor(lv),
              'isAsiLevel': asiLevelsFor(cls).contains(lv),
              'spellSlots': {
                for (final e in spellSlotTotalsFor(
                  kClassProgression[cls] ?? CasterProgression.none,
                  lv,
                ).entries)
                  '${e.key}': e.value,
              },
              'maxSpellRing': maxSpellRingFor(
                kClassProgression[cls] ?? CasterProgression.none,
                lv,
              ),
              'cantripsKnown': kCantripsKnown[cls]?[lv - 1] ?? 0,
              'preparedSpells': kPreparedSpells[cls]?[lv - 1] ?? 0,
              'newCantripPicks': newCantripPicksFor(cls, lv),
              'newSpellPicks': newSpellPicksFor(cls, lv),
            },
          },
    ]);

    // 5etools 標記解析。規格明訂未知標記與不成對括號須降級為純文字而非
    // 崩潰——那類降級路徑最容易在重寫時漏掉，因此個別立案例。
    write('ft_plain_text', [
      for (final t in <(String, String)>[
        ('骰子標記取第一參數', '造成 {@dice 1d8} 點傷害'),
        ('骰子標記有顯示名時取第二參數', '造成 {@dice 2d6|2d6 火焰} 傷害'),
        ('dc 標記加前綴', '{@dc 15} 敏捷豁免'),
        ('hit 標記補正號', '{@hit 5} 命中'),
        ('hit 標記已有正負號則不重複', '{@hit +5} 與 {@hit -1}'),
        ('參照標記取第三參數為顯示名', '見 {@spell fireball|XPHB|火球術}'),
        ('參照標記無顯示名時取第一參數', '受到 {@condition 無力} 影響'),
        ('巢狀標記遞迴展開', '{@b 造成 {@dice 1d6} 傷害}'),
        ('粗體標記保留內容', '{@b 重要}的說明'),
        ('未知標記降級為內容純文字', '這是 {@unknowntag 一段文字} 的測試'),
        ('不成對左括號原樣輸出', '這裡有一個 {@dice 1d8 沒有收尾'),
        ('無參數的標記', '{@dice}'),
        ('純文字不受影響', '完全沒有標記的一段話'),
        ('空字串', ''),
      ])
        {
          'desc': t.$1,
          'input': {'text': t.$2},
          'output': {'text': ftPlainText(t.$2)},
        },
    ]);

    write('ft_flatten_entries', [
      for (final t in <(String, List<dynamic>)>[
        ('純字串段落', <dynamic>['第一段', '第二段']),
        (
          'list 加上項目符號',
          <dynamic>[
            {
              'type': 'list',
              'items': ['甲', '乙'],
            },
          ],
        ),
        (
          '具名區塊加上【】標頭',
          <dynamic>[
            {
              'name': '法術位',
              'entries': ['說明文字'],
            },
          ],
        ),
        (
          'table 捨棄（純文字無法表達）',
          <dynamic>[
            {
              'type': 'table',
              'rows': [
                ['a', 'b'],
              ],
            },
            '表格後的段落',
          ],
        ),
        (
          '巢狀區塊遞迴',
          <dynamic>[
            {
              'name': '外層',
              'entries': [
                {
                  'name': '內層',
                  'entries': ['深處的文字 {@dice 1d4}'],
                },
              ],
            },
          ],
        ),
        ('空 entries', <dynamic>[]),
      ])
        {
          'desc': t.$1,
          'input': {'entries': t.$2},
          'output': {'text': ftFlattenEntries(t.$2)},
        },
    ]);

    write('ft_format', [
      for (final t in <(String, List<dynamic>)>[
        (
          '1 動作',
          <dynamic>[
            {'unit': 'action', 'number': 1},
          ],
        ),
        (
          '附贈動作',
          <dynamic>[
            {'unit': 'bonus', 'number': 1},
          ],
        ),
        (
          '10 分鐘',
          <dynamic>[
            {'unit': 'minute', 'number': 10},
          ],
        ),
        (
          '未知單位原樣輸出',
          <dynamic>[
            {'unit': 'round', 'number': 2},
          ],
        ),
        ('空清單', <dynamic>[]),
      ])
        {
          'desc': '施法時間：${t.$1}',
          'input': {'castingTime': t.$2},
          'output': {'text': ftFormatCastingTime(t.$2)},
        },
      for (final t in <(String, Map<String, dynamic>)>[
        (
          '點狀射程（呎）',
          {
            'type': 'point',
            'distance': {'type': 'feet', 'amount': 120},
          },
        ),
        (
          '觸及',
          {
            'type': 'point',
            'distance': {'type': 'touch'},
          },
        ),
        (
          '自身',
          {
            'type': 'point',
            'distance': {'type': 'self'},
          },
        ),
        (
          '錐形範圍',
          {
            'type': 'cone',
            'distance': {'type': 'feet', 'amount': 15},
          },
        ),
        ('特殊', {'type': 'special'}),
        ('空結構', <String, dynamic>{}),
      ])
        {
          'desc': '射程：${t.$1}',
          'input': {'range': t.$2},
          'output': {'text': ftFormatRange(t.$2)},
        },
    ]);

    // applyLevelUp：先前 README 列為未涵蓋，此處補上。
    //
    // 它是流程編排但仍是純函式，且含幾條容易漏的規則：CON 修正提升時回溯
    // 既有等級的 HP、法術位的已用數保留並夾至新上限（升級不視為休息）、
    // 職業資源的差額入帳。這些漏掉都不會報錯，只會讓數字悄悄不對。
    write('apply_level_up', [
      for (final k in _levelUpCases())
        {
          'desc': k.desc,
          'input': {
            'character': k.c.toJson(),
            'choices': {
              'hpRoll': k.choices.hpRoll,
              'asi': k.choices.asi,
              'subclass': k.choices.subclass,
              'subclassEn': k.choices.subclassEn,
            },
          },
          'output': applyLevelUp(
            k.c,
            LevelUpPlan.forCharacter(k.c),
            k.choices,
          ).toJson(),
        },
    ]);

    // 職業資源：全職業 × 1–20 級。這是最容易在重寫時抄漏一格的表格。
    final classes = <String>{
      for (final r in kClassResourceRules) r.classEn,
    }.toList()..sort();
    write('derive_class_resources', [
      for (final cls in classes)
        for (var lv = 1; lv <= 20; lv++)
          {
            'input': {
              'classEn': cls,
              'level': lv,
              // 資源上限可能與能力值修正掛鉤，固定一組有代表性的數值。
              'scores': {'CHA': 16, 'CON': 14, 'WIS': 12},
            },
            'output': [
              for (final r in deriveClassResources(
                cls,
                lv,
                _scores(cha: 16, con: 14, wis: 12),
              ))
                {
                  'name': r.name,
                  'nameEn': r.nameEn,
                  'max': r.max,
                  'current': r.current,
                  'dieFaces': r.dieFaces,
                  'recovery': r.recovery.name,
                  'unit': r.unit,
                  'display': r.display.name,
                },
            ],
          },
    ]);
  });
}
