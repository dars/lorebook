// Demo 角色產生器：輸出可直接寫入 user_characters.data 的 JSON。
//
// **組裝邏輯逐段對齊 `character_create_page.dart` 的 `_create()`**，並呼叫
// 同一批 domain helper（level1MaxHp / level1UnarmoredAc / spellSaveDcFor /
// deriveClassResources / spellFromCatalog）。手刻 JSON 會產生「AC 與裝備對
// 不上、法術位與等級對不上」的角色卡——推導值必須來自推導函式。
//
// 內容庫資料（職業特性、專長、法術）由 supabase CLI 事前匯出為 JSON 檔傳入，
// 本腳本不連線資料庫。匯出指令（<dir> 為任一暫存目錄）：
//
//   supabase db query --linked "select jsonb_agg(to_jsonb(f) - 'embedding') as j
//     from class_features f join classes c on c.id = f.class_id
//     where c.eng_name in ('Rogue','Fighter','Cleric') and f.level = 1
//       and f.is_subclass = false and f.source='XPHB'"
//   supabase db query --linked "select jsonb_agg(to_jsonb(f) - 'embedding') as j from feats f"
//   supabase db query --linked "select jsonb_agg(to_jsonb(s) - 'embedding') as j
//     from v_spells s where s.source='XPHB' and s.eng_name in (...)"
//
// 各自取回應 JSON 的 rows[0].j 存為 <dir>/class_features.json、feats.json、
// spells.json。注意 CLI 的「Initialising login role...」走 stderr，若以
// 2>/dev/null 抑制，就不可再用 tail -n +2 去頭。
//
// 用法：
//   dart run tool/seed_demo_characters.dart <內容庫 JSON 目錄> [--sql <user_id>]
//
// 不帶 --sql 時輸出人可讀的摘要供檢查；帶 --sql 時輸出 INSERT 陳述式。
// **SQL 一律帶 user_id**——user_characters 是多租戶表。

import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

import 'package:lorebook/features/catalog/domain/catalog_models.dart';
import 'package:lorebook/features/catalog/domain/fivetools_text.dart';
import 'package:lorebook/features/character/domain/character.dart';
import 'package:lorebook/features/character/domain/character_creation_data.dart';
import 'package:lorebook/features/character/domain/character_math.dart';
import 'package:lorebook/features/character/domain/class_resources.dart';
import 'package:lorebook/features/character/domain/origin_feat_lookup.dart';
import 'package:lorebook/features/character/domain/spell_from_catalog.dart';

/// 一張 demo 角色的輸入。能力值為**最終值**（標準陣列 ＋ 背景加值後）。
class DemoSpec {
  final String id;
  final String name;
  final String nameEn;
  final String speciesCn;
  final String classCn;
  final String backgroundCn;
  final String alignment;
  final String alignmentEn;
  final Map<String, int> scores;

  /// 職業可選技能（數量須等於 ClassOption.skillCount）。
  final List<String> classSkills;

  /// 種族可選技能（數量須等於 SpeciesOption.skillPickCount）。
  final List<String> speciesSkills;

  /// 戲法與一環法術的英文名（非施法職業留空）。
  final List<String> cantripsEn;
  final List<String> spellsEn;

  final String personalityTrait;
  final String ideal;
  final String bond;
  final String flaw;
  final List<String> personalityTags;
  final String backstory;

  const DemoSpec({
    required this.id,
    required this.name,
    required this.nameEn,
    required this.speciesCn,
    required this.classCn,
    required this.backgroundCn,
    required this.alignment,
    required this.alignmentEn,
    required this.scores,
    this.classSkills = const [],
    this.speciesSkills = const [],
    this.cantripsEn = const [],
    this.spellsEn = const [],
    this.personalityTrait = '',
    this.ideal = '',
    this.bond = '',
    this.flaw = '',
    this.personalityTags = const [],
    this.backstory = '',
  });
}

/// 三張 demo 角色，刻意涵蓋不同的畫面樣態：
/// - 盜賊：技能與工具熟練最密集，且無法術（驗證法術 tab 隱藏）
/// - 戰士：最單純的 1 級新手，新使用者實際會看到的樣子
/// - 牧師：戲法 ＋ 準備法術 ＋ 法術 DC，法術頁的完整呈現
const kDemos = <DemoSpec>[
  DemoSpec(
    id: 'demo-rogue-001',
    name: '琵琶・薊',
    nameEn: 'Pipa Thistle',
    speciesCn: '半身人',
    classCn: '盜賊',
    backgroundCn: '罪犯',
    alignment: '混亂中立',
    alignmentEn: 'Chaotic Neutral',
    // 標準陣列 15/14/13/12/10/8，背景加值 +2 敏捷 +1 智力
    scores: {'STR': 8, 'DEX': 17, 'CON': 14, 'INT': 14, 'WIS': 12, 'CHA': 10},
    classSkills: ['隱匿', '巧手', '感知', '欺瞞'],
    personalityTrait: '我從不坐在背對門口的位子。',
    ideal: '規矩是寫給那些付得起代價的人看的。',
    bond: '我欠碼頭區的老修女一條命，她從沒討過。',
    flaw: '看到沒上鎖的東西，手會自己動。',
    personalityTags: ['機警', '滑頭', '講義氣'],
    backstory: '在港都的屋瓦之間長大，靠著身形小、腳步輕活到現在。',
  ),
  DemoSpec(
    id: 'demo-fighter-001',
    name: '洛恩・石盾',
    nameEn: 'Loen Stoneshield',
    speciesCn: '人類',
    classCn: '戰士',
    backgroundCn: '士兵',
    alignment: '守序善良',
    alignmentEn: 'Lawful Good',
    // 標準陣列，背景加值 +2 力量 +1 體質
    scores: {'STR': 17, 'DEX': 13, 'CON': 15, 'INT': 10, 'WIS': 12, 'CHA': 8},
    classSkills: ['體能', '求生'],
    speciesSkills: ['感知'],
    personalityTrait: '我用行伍的規矩過日子，起床、擦劍、站哨。',
    ideal: '守住身後的人，比贏得眼前的仗重要。',
    bond: '我的隊伍沒能全員回來，名字我都記著。',
    flaw: '面對要動腦的難題，我第一個念頭永遠是硬闖。',
    personalityTags: ['可靠', '直率', '念舊'],
    backstory: '邊境守備隊出身，退伍後帶著一身舊傷和一把制式長劍上路。',
  ),
  DemoSpec(
    id: 'demo-cleric-001',
    name: '布蕾妲・晨鐘',
    nameEn: 'Bretta Matinbell',
    speciesCn: '矮人',
    classCn: '牧師',
    backgroundCn: '侍僧',
    alignment: '守序善良',
    alignmentEn: 'Lawful Good',
    // 標準陣列，背景加值 +2 感知 +1 智力
    scores: {'STR': 12, 'DEX': 10, 'CON': 14, 'INT': 13, 'WIS': 17, 'CHA': 8},
    classSkills: ['醫藥', '宗教'],
    cantripsEn: ['Sacred Flame', 'Light', 'Guidance'],
    spellsEn: ['Cure Wounds', 'Bless', 'Shield of Faith', 'Guiding Bolt'],
    personalityTrait: '我在每個天亮時敲一次鐘，即使身邊沒有人聽。',
    ideal: '光不必很亮，只要不熄。',
    bond: '山下那間小神殿是我長大的地方，它還在等我回去。',
    flaw: '我太容易相信一個人只是走岔了路。',
    personalityTags: ['溫和', '固執', '守時'],
    backstory: '自幼在山腹神殿司晨，被指派隨隊出行，記錄沿途需要照拂的人。',
  ),
];

/// 回傳 Never，故可直接用於 orElse，不需假轉型。
Never fail(String msg) => throw StateError(msg);

List<T> readAll<T>(String path, T Function(Map<String, dynamic>) from) {
  final raw = File(path).readAsStringSync();
  return [
    for (final e in jsonDecode(raw) as List)
      from((e as Map).cast<String, dynamic>()),
  ];
}

Character build(
  DemoSpec spec, {
  required List<CatalogClassFeature> allClassFeatures,
  required List<CatalogFeat> feats,
  required List<CatalogSpell> allSpells,
}) {
  final cls = kClasses.firstWhere(
    (c) => c.cn == spec.classCn,
    orElse: () => fail('查無職業 ${spec.classCn}'),
  );
  final sp = kSpecies.firstWhere(
    (s) => s.cn == spec.speciesCn,
    orElse: () => fail('查無種族 ${spec.speciesCn}'),
  );
  final bg = kBackgrounds.firstWhere(
    (b) => b.cn == spec.backgroundCn,
    orElse: () => fail('查無背景 ${spec.backgroundCn}'),
  );

  // 建角流程的規則約束：選錯數量或選到不可選的技能，App 不會產生這種角色。
  if (spec.classSkills.length != cls.skillCount) {
    fail(
      '${spec.name}：職業技能須 ${cls.skillCount} 個，給了 ${spec.classSkills.length}',
    );
  }
  for (final s in spec.classSkills) {
    if (!cls.skillChoices.contains(s)) {
      fail(
        '${spec.name}：$s 不在 ${cls.cn} 的可選技能內（${cls.skillChoices.join("／")}）',
      );
    }
  }
  if (spec.speciesSkills.length != sp.skillPickCount) {
    fail(
      '${spec.name}：種族技能須 ${sp.skillPickCount} 個，給了 ${spec.speciesSkills.length}',
    );
  }
  for (final s in spec.speciesSkills) {
    if (!sp.skillPickFrom.contains(s)) {
      fail('${spec.name}：$s 不在 ${sp.cn} 的可選技能內');
    }
  }

  const pb = 2; // 1 級固定
  final scores = {for (final a in kAbilityOrder) a: spec.scores[a]!};
  final mods = {for (final a in kAbilityOrder) a: abilityModifier(scores[a]!)};

  AbilityScore ab(String code) => AbilityScore(
    score: scores[code]!,
    modifier: mods[code]!,
    proficientSave: cls.saves.contains(code),
  );

  final profSkills = {...spec.classSkills, ...spec.speciesSkills, ...bg.skills};
  final skills = [
    for (final s in kSkills)
      Skill(
        name: s.name,
        nameEn: s.nameEn,
        abilityType: s.ability,
        modifier: mods[s.ability]! + (profSkills.contains(s.name) ? pb : 0),
        proficient: profSkills.contains(s.name),
      ),
  ];

  final perceptionMod = mods['WIS']! + (profSkills.contains('感知') ? pb : 0);
  final maxHp = level1MaxHp(cls, sp, mods);
  final caster = cls.spellAbility.isNotEmpty;
  final spellMod = caster ? mods[cls.spellAbility]! : 0;

  CatalogSpell spellByEn(String en) => allSpells.firstWhere(
    (s) => s.engName == en,
    orElse: () => fail('查無法術 $en'),
  );

  // 1 級職業特性：僅取非子職業者，與 _create() 一致。
  final classFeatures = [
    for (final f in allClassFeatures)
      if (!f.isSubclass && f.level == 1 && _belongsTo(f, cls))
        CharacterFeature(
          name: f.name,
          nameEn: f.engName ?? '',
          source: '職業：${cls.cn} Lv1',
          description: ftFlattenEntries(
            (f.data['entries'] as List<dynamic>?) ?? const [],
          ),
        ),
  ];

  final originFeat = originFeatDetail(feats, bg.originFeat);

  final features = <CharacterFeature>[
    ...classFeatures,
    for (final t in sp.allTraits)
      CharacterFeature(
        name: t.name,
        nameEn: t.nameEn,
        description: t.description,
        source: '種族：${sp.cn}',
      ),
    CharacterFeature(
      name: bg.originFeat,
      nameEn: originFeat.nameEn,
      description: originFeat.description,
      source: '背景：${bg.cn}',
    ),
  ];

  final abilityScores = AbilityScores(
    str: ab('STR'),
    dex: ab('DEX'),
    con: ab('CON'),
    int_: ab('INT'),
    wis: ab('WIS'),
    cha: ab('CHA'),
  );

  return Character(
    id: spec.id,
    name: spec.name,
    nameEn: spec.nameEn,
    species: sp.cn,
    speciesEn: sp.en,
    className: cls.cn,
    classNameEn: cls.en,
    level: 1,
    background: bg.cn,
    backgroundEn: bg.en,
    alignment: spec.alignment,
    alignmentEn: spec.alignmentEn,
    creatureType: 'Humanoid',
    size: sp.size,
    ac: level1UnarmoredAc(cls, mods),
    maxHp: maxHp,
    currentHp: maxHp,
    speed: sp.speed,
    initiative: mods['DEX']!,
    proficiencyBonus: pb,
    passivePerception: 10 + perceptionMod,
    spellDc: caster ? spellSaveDcFor(pb, spellMod) : 0,
    spellAttack: caster ? spellAttackFor(pb, spellMod) : 0,
    spellcastingAbility: cls.spellAbility,
    abilityScores: abilityScores,
    skills: skills,
    cantrips: [
      for (final en in spec.cantripsEn) spellFromCatalog(spellByEn(en)),
    ],
    spells: [for (final en in spec.spellsEn) spellFromCatalog(spellByEn(en))],
    spellSlots: caster
        ? [SpellSlots(level: 1, total: cls.level1Slots)]
        : const [],
    features: features,
    languages: const ['通用語'],
    toolProficiencies: [if (bg.toolProficiency.isNotEmpty) bg.toolProficiency],
    resources: deriveClassResources(cls.en, 1, abilityScores),
    hitDieFaces: cls.hitDie,
    personality: Personality(
      traits: spec.personalityTrait,
      ideals: spec.ideal,
      bonds: spec.bond,
      flaws: spec.flaw,
    ),
    personalityTags: spec.personalityTags,
    backstory: spec.backstory,
  );
}

/// 職業特性以 class_id 關聯，但匯出的 JSON 已依職業過濾；此處再以英文名
/// 對照，避免同一份匯出檔混入其他職業時錯配。
bool _belongsTo(CatalogClassFeature f, ClassOption cls) =>
    (f.data['className'] as String?)?.toLowerCase() == cls.en.toLowerCase();

String sqlQuote(String s) => "'${s.replaceAll("'", "''")}'";

const _dir = String.fromEnvironment('dir');
const _userId = String.fromEnvironment('user_id');

/// SQL 輸出檔。經 flutter test 的 stdout 會被加前綴且可能換行，不可靠。
const _out = String.fromEnvironment('out');

void main() => test('產生 demo 角色', generate);

void generate() {
  if (_dir.isEmpty) fail('需要 --dart-define=dir=<內容庫 JSON 目錄>');
  const dir = _dir;
  final userId = _userId.isEmpty ? null : _userId;

  final classFeatures = readAll(
    '$dir/class_features.json',
    CatalogClassFeature.fromJson,
  );
  final feats = readAll('$dir/feats.json', CatalogFeat.fromJson);
  final spells = readAll('$dir/spells.json', CatalogSpell.fromJson);

  final sql = StringBuffer();
  for (final spec in kDemos) {
    final c = build(
      spec,
      allClassFeatures: classFeatures,
      feats: feats,
      allSpells: spells,
    );
    if (userId == null) {
      stdout.writeln(
        '${c.name}（${c.species} ${c.className} ${c.level}）'
        ' AC ${c.ac} HP ${c.maxHp} 被動察覺 ${c.passivePerception}'
        '${c.spellDc > 0 ? " 法術DC ${c.spellDc}" : ""}\n'
        '  特性 ${c.features.length}：${c.features.map((f) => f.name).join("、")}\n'
        '  熟練技能：${c.skills.where((s) => s.proficient).map((s) => s.name).join("、")}\n'
        '  工具：${c.toolProficiencies.join("、")}｜資源：${c.resources.map((r) => r.name).join("、")}\n'
        '  戲法 ${c.cantrips.length}｜法術 ${c.spells.length}｜法術位 ${c.spellSlots.map((s) => "${s.level}環×${s.total}").join("、")}\n'
        '  JSON 欄位數：${c.toJson().keys.length}',
      );
    } else {
      if (_out.isEmpty) fail('輸出 SQL 需要 --dart-define=out=<檔案路徑>');
      final data = jsonEncode(c.toJson());
      sql.writeln(
        'insert into user_characters (id, user_id, name, class_name, level, data) values ('
        '${sqlQuote(c.id)}, ${sqlQuote(userId)}, ${sqlQuote(c.name)}, '
        '${sqlQuote(c.className)}, ${c.level}, ${sqlQuote(data)}::jsonb) '
        // 主鍵是複合的 (user_id, id)——各使用者的 id 彼此獨立。
        'on conflict (user_id, id) do update set name = excluded.name, '
        'class_name = excluded.class_name, level = excluded.level, '
        'data = excluded.data, deleted_at = null;',
      );
    }
  }
  if (sql.isNotEmpty) {
    File(_out).writeAsStringSync(sql.toString());
    stdout.writeln('已寫入 $_out');
  }
}
