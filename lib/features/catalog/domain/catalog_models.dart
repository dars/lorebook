/// 5etools 內容資料庫（Supabase）的目錄模型。
///
/// 對應 designs/SUPABASE.md 的 JSONB 混合模式：
/// - 提升欄位（過濾/排序用）拉成具型別的屬性；
/// - `data` 保留完整原始 5etools 物件（渲染細節：entries、range、
///   `{@dice 1d8}` 等標記），由 renderer 層自行解析。
///
/// 慣例：`name` 為繁體中文顯示名；`engName` 為英文原名（可為 null）；
/// `source` 為英文書源代碼（PHB = 2014 年版玩家手冊；2024 版代碼為
/// XPHB，本庫目前未收錄）。
library;

String _s(Object? v) => v as String? ?? '';
String? _sn(Object? v) => v as String?;

/// 材料成分：可為字串、物件（`{text, cost, consume}`，有價材料）或
/// bool（罕見）。統一取顯示文字。
String? _compM(Object? v) {
  if (v == null) return null;
  if (v is String) return v;
  if (v is Map) return v['text'] as String? ?? '';
  if (v is bool) return v ? '' : null;
  return '$v';
}

int _i(Object? v) => v as int? ?? 0;
int? _in(Object? v) => v as int?;
bool _b(Object? v) => v as bool? ?? false;

List<String> _strList(Object? v) => (v as List?)?.cast<String>() ?? const [];

List<dynamic> _list(Object? v) => v as List? ?? const [];

Map<String, dynamic> _map(Object? v) =>
    (v as Map?)?.cast<String, dynamic>() ?? const {};

/// 種族（`races` 表；2024 術語為 Species）。
class CatalogSpecies {
  final String id;
  final String name;
  final String? engName;
  final String source;
  final int? page;
  final bool srd;

  /// 體型代碼（T/S/M/L/H/G）。
  final List<String> sizes;

  /// 完整 5etools 原始物件（speed、darkvision、traitTags、entries…）。
  final Map<String, dynamic> data;

  const CatalogSpecies({
    required this.id,
    required this.name,
    this.engName,
    required this.source,
    this.page,
    this.srd = false,
    this.sizes = const [],
    this.data = const {},
  });

  factory CatalogSpecies.fromJson(Map<String, dynamic> json) => CatalogSpecies(
    id: _s(json['id']),
    name: _s(json['name']),
    engName: _sn(json['eng_name']),
    source: _s(json['source']),
    page: _in(json['page']),
    srd: _b(json['srd']),
    sizes: _strList(json['size']),
    data: _map(json['data']),
  );
}

/// 職業（`classes` 表）。
class CatalogClass {
  final String id;
  final String name;
  final String? engName;
  final String source;
  final int? page;
  final bool srd;

  /// 生命骰骰面（如野蠻人 12、法師 6）。
  final int hdFaces;

  /// 施法屬性（'int'/'wis'/'cha'；null = 非施法職業）。
  final String? spellcastingAbility;

  /// 施法進度（'full'/'1/2'/'pact'…；null = 非施法職業）。
  final String? casterProgression;

  final Map<String, dynamic> data;

  const CatalogClass({
    required this.id,
    required this.name,
    this.engName,
    required this.source,
    this.page,
    this.srd = false,
    this.hdFaces = 0,
    this.spellcastingAbility,
    this.casterProgression,
    this.data = const {},
  });

  factory CatalogClass.fromJson(Map<String, dynamic> json) => CatalogClass(
    id: _s(json['id']),
    name: _s(json['name']),
    engName: _sn(json['eng_name']),
    source: _s(json['source']),
    page: _in(json['page']),
    srd: _b(json['srd']),
    hdFaces: _i(json['hd_faces']),
    spellcastingAbility: _sn(json['spellcasting_ability']),
    casterProgression: _sn(json['caster_progression']),
    data: _map(json['data']),
  );
}

/// 子職業（`subclasses` 表）。
class CatalogSubclass {
  final String id;
  final String name;
  final String? engName;

  /// 短名（如「狂戰士」之於「狂戰士道途」）。
  final String? shortName;

  /// 所屬職業（uuid 代理鍵；跨表關聯一律用此，勿用 class_name 字串）。
  final String? classId;
  final String source;
  final int? page;
  final Map<String, dynamic> data;

  const CatalogSubclass({
    required this.id,
    required this.name,
    this.engName,
    this.shortName,
    this.classId,
    required this.source,
    this.page,
    this.data = const {},
  });

  factory CatalogSubclass.fromJson(Map<String, dynamic> json) =>
      CatalogSubclass(
        id: _s(json['id']),
        name: _s(json['name']),
        engName: _sn(json['eng_name']),
        shortName: _sn(json['short_name']),
        classId: _sn(json['class_id']),
        source: _s(json['source']),
        page: _in(json['page']),
        data: _map(json['data']),
      );
}

/// 職業 / 子職業能力（`class_features` 表）。
class CatalogClassFeature {
  final String id;
  final String name;
  final String? engName;
  final String source;
  final int? page;

  /// 獲得等級（1–20）。
  final int level;

  /// 是否為子職業能力（true 時 subclassShortName 有值）。
  final bool isSubclass;
  final String? subclassShortName;
  final String? classId;
  final Map<String, dynamic> data;

  const CatalogClassFeature({
    required this.id,
    required this.name,
    this.engName,
    required this.source,
    this.page,
    required this.level,
    this.isSubclass = false,
    this.subclassShortName,
    this.classId,
    this.data = const {},
  });

  factory CatalogClassFeature.fromJson(Map<String, dynamic> json) =>
      CatalogClassFeature(
        id: _s(json['id']),
        name: _s(json['name']),
        engName: _sn(json['eng_name']),
        source: _s(json['source']),
        page: _in(json['page']),
        level: _i(json['level']),
        isSubclass: _b(json['is_subclass']),
        subclassShortName: _sn(json['subclass_short_name']),
        classId: _sn(json['class_id']),
        data: _map(json['data']),
      );
}

/// 背景（`backgrounds` 表）。
class CatalogBackground {
  final String id;
  final String name;
  final String? engName;
  final String source;
  final int? page;
  final bool srd;
  final Map<String, dynamic> data;

  const CatalogBackground({
    required this.id,
    required this.name,
    this.engName,
    required this.source,
    this.page,
    this.srd = false,
    this.data = const {},
  });

  factory CatalogBackground.fromJson(Map<String, dynamic> json) =>
      CatalogBackground(
        id: _s(json['id']),
        name: _s(json['name']),
        engName: _sn(json['eng_name']),
        source: _s(json['source']),
        page: _in(json['page']),
        srd: _b(json['srd']),
        data: _map(json['data']),
      );
}

/// 專長（`feats` 表）。
class CatalogFeat {
  final String id;
  final String name;
  final String? engName;
  final String source;
  final int? page;
  final bool srd;

  /// 先決條件（5etools 原始 jsonb；null = 無）。
  final List<dynamic>? prerequisite;
  final Map<String, dynamic> data;

  const CatalogFeat({
    required this.id,
    required this.name,
    this.engName,
    required this.source,
    this.page,
    this.srd = false,
    this.prerequisite,
    this.data = const {},
  });

  factory CatalogFeat.fromJson(Map<String, dynamic> json) => CatalogFeat(
    id: _s(json['id']),
    name: _s(json['name']),
    engName: _sn(json['eng_name']),
    source: _s(json['source']),
    page: _in(json['page']),
    srd: _b(json['srd']),
    prerequisite: json['prerequisite'] as List?,
    data: _map(json['data']),
  );
}

/// 法術（`v_spells` view：常用欄位已攤平，無 `data`）。
class CatalogSpell {
  final String id;
  final String name;
  final String? engName;
  final String source;
  final int? page;

  /// 環數（0 = 戲法）。
  final int level;

  /// 學派單字元代碼（A/C/D/E/V/I/N/T）。
  final String school;

  /// 學派英文全名（Evocation…）。
  final String schoolName;
  final bool ritual;
  final bool concentration;
  final bool srd;

  /// 構材成分：V（言語）/ S（姿勢）/ M（材料，null = 不需）。
  final bool compV;
  final bool compS;
  final String? compM;

  /// 5etools 原始結構（renderer 解析）。
  final List<dynamic> castingTime;
  final Map<String, dynamic> range;
  final List<dynamic> duration;
  final List<dynamic> entries;

  /// 可用職業（英文名，如 'Wizard'）。
  final List<String> classes;
  final List<String> damageInflict;
  final List<String> savingThrow;
  final List<String> conditionInflict;

  const CatalogSpell({
    required this.id,
    required this.name,
    this.engName,
    required this.source,
    this.page,
    required this.level,
    this.school = '',
    this.schoolName = '',
    this.ritual = false,
    this.concentration = false,
    this.srd = false,
    this.compV = false,
    this.compS = false,
    this.compM,
    this.castingTime = const [],
    this.range = const {},
    this.duration = const [],
    this.entries = const [],
    this.classes = const [],
    this.damageInflict = const [],
    this.savingThrow = const [],
    this.conditionInflict = const [],
  });

  factory CatalogSpell.fromJson(Map<String, dynamic> json) => CatalogSpell(
    id: _s(json['id']),
    name: _s(json['name']),
    engName: _sn(json['eng_name']),
    source: _s(json['source']),
    page: _in(json['page']),
    level: _i(json['level']),
    school: _s(json['school']),
    schoolName: _s(json['school_name']),
    ritual: _b(json['ritual']),
    concentration: _b(json['concentration']),
    srd: _b(json['srd']),
    compV: _b(json['comp_v']),
    compS: _b(json['comp_s']),
    compM: _compM(json['comp_m']),
    castingTime: _list(json['casting_time']),
    range: _map(json['range']),
    duration: _list(json['duration']),
    entries: _list(json['entries']),
    classes: _strList(json['classes']),
    damageInflict: _strList(json['damage_inflict']),
    savingThrow: _strList(json['saving_throw']),
    conditionInflict: _strList(json['condition_inflict']),
  );
}

/// 長尾通用內容（`entries` 表；kind 判別：condition / language /
/// deity / optionalfeature / action / variantrule…）。
class CatalogEntry {
  final String id;
  final String kind;
  final String name;
  final String? engName;
  final String source;
  final int? page;
  final bool srd;
  final Map<String, dynamic> data;

  const CatalogEntry({
    required this.id,
    required this.kind,
    required this.name,
    this.engName,
    required this.source,
    this.page,
    this.srd = false,
    this.data = const {},
  });

  factory CatalogEntry.fromJson(Map<String, dynamic> json) => CatalogEntry(
    id: _s(json['id']),
    kind: _s(json['kind']),
    name: _s(json['name']),
    engName: _sn(json['eng_name']),
    source: _s(json['source']),
    page: _in(json['page']),
    srd: _b(json['srd']),
    data: _map(json['data']),
  );
}

/// 裝備目錄（`v_items` view；item-catalog 規格）。
///
/// 機制欄位：武器帶傷害骰/傷害類型/屬性標籤；護甲帶 AC 公式參數
/// （ac_base + armor_category，Dex 加成規則由類別決定）。價格一律
/// `price_cp` 整數（cp 計），App 端不解析幣別字串。
class CatalogItem {
  final String id;
  final String name;
  final String? engName;
  final String source;

  /// 類別：weapon / armor / gear / tool。
  final String category;

  /// 子分類（分組瀏覽用：簡易近戰/軍用遠程/輕甲/光源…）。
  final String subcategory;
  final int priceCp;
  final String weight;
  final bool srd;

  /// 武器機制。
  final String damageDice;
  final String damageType;
  final List<String> properties;

  /// 護甲機制：light / medium / heavy / shield（非護甲為空）。
  final String armorCategory;
  final int acBase;

  /// 武器精通（2024）：如 'Topple'（已去書源後綴）。
  final List<String> mastery;

  /// 5etools 原始規則文字結構（renderer 解析）。
  final List<dynamic> entries;

  const CatalogItem({
    required this.id,
    required this.name,
    this.engName,
    required this.source,
    this.category = '',
    this.subcategory = '',
    this.priceCp = 0,
    this.weight = '',
    this.srd = false,
    this.damageDice = '',
    this.damageType = '',
    this.properties = const [],
    this.armorCategory = '',
    this.acBase = 0,
    this.mastery = const [],
    this.entries = const [],
  });

  bool get isWeapon => category == 'weapon';
  bool get isArmor => category == 'armor';
  bool get finesse =>
      properties.any((p) => p.toLowerCase().contains('finesse'));

  factory CatalogItem.fromJson(Map<String, dynamic> json) => CatalogItem(
    id: _s(json['id']),
    name: _s(json['name']),
    engName: _sn(json['eng_name']),
    source: _s(json['source']),
    category: _s(json['category']),
    subcategory: _s(json['subcategory']),
    priceCp: _i(json['price_cp']),
    weight: json['weight']?.toString() ?? '',
    srd: _b(json['srd']),
    damageDice: _s(json['damage_dice']),
    damageType: _s(json['damage_type']),
    properties: _strList(json['properties']),
    armorCategory: _s(json['armor_category']),
    acBase: _i(json['ac_base']),
    mastery: [
      for (final m in _list(json['mastery']))
        if (m is String) m.split('|').first,
    ],
    entries: _list(json['entries']),
  );
}
