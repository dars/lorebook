import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../shared/data/supabase_client.dart';
import '../../../shared/domain/app_exception.dart';
import '../domain/catalog_models.dart';

/// 目前開放的書源代碼（XPHB = 2024 修訂版玩家手冊）。
///
/// 規則核心統一為 2024 5r；內容庫僅含該書源中屬 SRD 5.2
/// （CC-BY-4.0）的資料列，測試可於建構時注入替換書源。
const kCatalogSource = 'XPHB';

/// 5etools 內容資料庫的唯讀目錄（designs/SUPABASE.md）。
///
/// 所有查詢固定過濾單一書源 [source]；跨表關聯職業一律用 uuid
/// `class_id`（名稱欄位中英混雜，不可靠）。
class CatalogRepository {
  final SupabaseClient _client;
  final String source;

  CatalogRepository(this._client, {this.source = kCatalogSource});

  Future<List<T>> _list<T>(
    String what,
    T Function(Map<String, dynamic>) fromJson,
    Future<List<Map<String, dynamic>>> Function() query,
  ) async {
    try {
      final rows = await query();
      return [for (final r in rows) fromJson(r)];
    } on PostgrestException catch (e) {
      throw DataException('讀取$what失敗：${e.message}');
    } catch (e) {
      throw DataException('讀取$what失敗：$e');
    }
  }

  /// 種族清單（`races`）。
  Future<List<CatalogSpecies>> fetchSpecies() => _list(
    '種族目錄',
    CatalogSpecies.fromJson,
    () => _client
        .from('races')
        .select()
        .eq('source', source)
        .order('page', ascending: true),
  );

  /// 職業清單（`classes`）。
  Future<List<CatalogClass>> fetchClasses() => _list(
    '職業目錄',
    CatalogClass.fromJson,
    () => _client
        .from('classes')
        .select()
        .eq('source', source)
        .order('page', ascending: true),
  );

  /// 某職業的子職業清單（`subclasses`）。
  Future<List<CatalogSubclass>> fetchSubclasses(String classId) => _list(
    '子職業目錄',
    CatalogSubclass.fromJson,
    () => _client
        .from('subclasses')
        .select()
        .eq('class_id', classId)
        .eq('source', source)
        .order('page', ascending: true),
  );

  /// 某職業的能力清單（`class_features`），含子職業能力。
  ///
  /// [maxLevel] 只取該等級（含）以下；[isSubclass] 篩選職業本體 /
  /// 子職業能力（null = 全部）。
  Future<List<CatalogClassFeature>> fetchClassFeatures(
    String classId, {
    int? maxLevel,
    bool? isSubclass,
  }) => _list('職業能力', CatalogClassFeature.fromJson, () {
    var q = _client
        .from('class_features')
        .select()
        .eq('class_id', classId)
        .eq('source', source);
    if (maxLevel != null) q = q.lte('level', maxLevel);
    if (isSubclass != null) q = q.eq('is_subclass', isSubclass);
    return q.order('level', ascending: true).order('page');
  });

  /// 背景清單（`backgrounds`）。
  Future<List<CatalogBackground>> fetchBackgrounds() => _list(
    '背景目錄',
    CatalogBackground.fromJson,
    () => _client
        .from('backgrounds')
        .select()
        .eq('source', source)
        .order('name', ascending: true),
  );

  /// 專長清單（`feats`）。
  Future<List<CatalogFeat>> fetchFeats() => _list(
    '專長目錄',
    CatalogFeat.fromJson,
    () => _client
        .from('feats')
        .select()
        .eq('source', source)
        .order('name', ascending: true),
  );

  /// 法術清單（`v_spells` view）。
  ///
  /// [level] 指定環數（0 = 戲法）；[className] 過濾可用職業
  /// （**英文名**，如 'Wizard'，見 SUPABASE.md 雙語慣例）。
  Future<List<CatalogSpell>> fetchSpells({int? level, String? className}) =>
      _list('法術目錄', CatalogSpell.fromJson, () {
        var q = _client.from('v_spells').select().eq('source', source);
        if (level != null) q = q.eq('level', level);
        if (className != null) q = q.contains('classes', [className]);
        return q.order('level', ascending: true).order('name');
      });

  /// 裝備目錄（`v_items` view；item-catalog 規格）。
  ///
  /// [category] 過濾類別（weapon / armor / gear / tool）。資料未匯入時
  /// 回傳空清單（呼叫端據此降級隱藏目錄入口）。
  Future<List<CatalogItem>> fetchItems({String? category}) =>
      _list('裝備目錄', CatalogItem.fromJson, () {
        var q = _client.from('v_items').select().eq('source', source);
        if (category != null) q = q.eq('category', category);
        return q.order('name', ascending: true);
      });

  /// 長尾通用內容（`entries`），以 [kind] 判別：
  /// condition / language / deity / optionalfeature / action /
  /// variantrule / disease…
  Future<List<CatalogEntry>> fetchEntries(String kind) => _list(
    '規則條目（$kind）',
    CatalogEntry.fromJson,
    () => _client
        .from('entries')
        .select()
        .eq('kind', kind)
        .eq('source', source)
        .order('name', ascending: true),
  );
}

final catalogRepositoryProvider = Provider<CatalogRepository>((ref) {
  final client = ref.watch(supabaseClientProvider);
  return CatalogRepository(client);
});

// ── 目錄 providers（UI 以 ref.watch(...).when(...) 消費）──

final speciesCatalogProvider = FutureProvider<List<CatalogSpecies>>(
  (ref) => ref.watch(catalogRepositoryProvider).fetchSpecies(),
);

final classCatalogProvider = FutureProvider<List<CatalogClass>>(
  (ref) => ref.watch(catalogRepositoryProvider).fetchClasses(),
);

final backgroundCatalogProvider = FutureProvider<List<CatalogBackground>>(
  (ref) => ref.watch(catalogRepositoryProvider).fetchBackgrounds(),
);

final featCatalogProvider = FutureProvider<List<CatalogFeat>>(
  (ref) => ref.watch(catalogRepositoryProvider).fetchFeats(),
);

/// 依職業 uuid 取子職業。
final subclassCatalogProvider =
    FutureProvider.family<List<CatalogSubclass>, String>(
      (ref, classId) =>
          ref.watch(catalogRepositoryProvider).fetchSubclasses(classId),
    );

/// 依職業 uuid 取全部職業能力（等級/本體子職業篩選由 UI 端做，
/// 或直接呼叫 repository 帶參數）。
final classFeatureCatalogProvider =
    FutureProvider.family<List<CatalogClassFeature>, String>(
      (ref, classId) =>
          ref.watch(catalogRepositoryProvider).fetchClassFeatures(classId),
    );

/// 法術查詢參數（record：結構相等，適合 family key）。
typedef SpellQuery = ({int? level, String? className});

final spellCatalogProvider =
    FutureProvider.family<List<CatalogSpell>, SpellQuery>(
      (ref, q) => ref
          .watch(catalogRepositoryProvider)
          .fetchSpells(level: q.level, className: q.className),
    );

/// 依 kind 取長尾條目（'condition'、'language'、'deity'…）。
final entryCatalogProvider = FutureProvider.family<List<CatalogEntry>, String>(
  (ref, kind) => ref.watch(catalogRepositoryProvider).fetchEntries(kind),
);

/// 裝備目錄（全類別一次取回；items 未匯入或查詢失敗時回傳空清單，
/// 呼叫端據此降級隱藏「從目錄挑選」入口——inventory-items 規格）。
final itemCatalogProvider = FutureProvider<List<CatalogItem>>((ref) async {
  try {
    return await ref.watch(catalogRepositoryProvider).fetchItems();
  } catch (_) {
    return const [];
  }
});
