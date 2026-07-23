import '../../catalog/domain/catalog_models.dart';
import '../../catalog/domain/fivetools_text.dart';
import 'character.dart';

/// 舊角色職業特性回填：規則表/建角修正前建立的角色，特性清單缺
/// 1 級（或漏發等級）的本職特性；讀入時以內容庫比對補寫。
///
/// - 只補「該職業、非子職、獲得等級 ≤ 角色等級」且清單中不存在者
/// - 比對鍵：engName（空值時退回中文名），不覆寫既有條目
/// - 子職特性不回填（shortName 與角色 subclassEn 的對應不可靠，
///   且子職是升級流程的補選項目，留給該流程）
Character backfillClassFeatures(
  Character c,
  List<CatalogClassFeature> catalogFeatures,
) {
  final missing = <CatalogClassFeature>[];
  for (final f in catalogFeatures) {
    if (f.isSubclass || f.level > c.level) continue;
    final en = f.engName ?? '';
    final exists = c.features.any(
      (e) => en.isNotEmpty ? e.nameEn == en : e.name == f.name,
    );
    if (!exists) missing.add(f);
  }
  if (missing.isEmpty) return c;
  missing.sort((a, b) => a.level - b.level);
  return c.copyWith(
    features: [
      // 職業特性放清單前段（與建角產出的順序一致）。
      for (final f in missing)
        CharacterFeature(
          name: f.name,
          nameEn: f.engName ?? '',
          source: '職業：${c.className} Lv${f.level}',
          description: ftFlattenEntries(
            (f.data['entries'] as List<dynamic>?) ?? const [],
          ),
        ),
      ...c.features,
    ],
  );
}
