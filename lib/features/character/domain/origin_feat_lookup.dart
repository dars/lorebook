import '../../catalog/domain/catalog_models.dart';
import '../../catalog/presentation/fivetools_renderer.dart';

/// 起源專長於內容庫（`feats`）中的英文名與說明。
///
/// 背景的 `originFeat` 可能帶變體括號（如「法術新手（法師）」），而內容庫
/// 只收主名「法術新手」——比對前先去掉括號部分，否則永遠查不到，起源專長
/// 那一列就會是角色卡上唯一點不開的特性。
///
/// 查無或內容庫取用失敗時回傳空值，該列退化為不可點擊（與職業特性一致）。
({String nameEn, String description}) originFeatDetail(
  List<CatalogFeat> feats,
  String originFeat,
) {
  final base = originFeat.split('（').first.trim();
  if (base.isEmpty) return (nameEn: '', description: '');
  for (final f in feats) {
    if (f.name == base) {
      return (
        nameEn: f.engName ?? '',
        description: ftFlattenEntries(
          (f.data['entries'] as List<dynamic>?) ?? const [],
        ),
      );
    }
  }
  return (nameEn: '', description: '');
}
