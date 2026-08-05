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

import 'package:lorebook/features/character/domain/character.dart';
import 'package:lorebook/features/character/domain/class_resources.dart';
import 'package:lorebook/features/character/domain/currency_math.dart';
import 'package:lorebook/features/character/domain/derived_stats.dart';

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
