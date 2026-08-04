import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../catalog/data/catalog_repository.dart';
import '../../catalog/domain/catalog_models.dart';

/// 工具熟練的可選清單，依內容庫的 `subcategory` 分組
/// （工匠工具／工具／遊戲組／樂器）。
///
/// 工具是規則裡的既有集合，不需要使用者發明——因此為選單而非自由填空。
/// `itemCatalogProvider` 取用失敗時本身回傳空清單，故離線時這裡為空 map，
/// 呼叫端據此顯示離線提示並允許留空。
final toolProficiencyOptionsProvider =
    FutureProvider<Map<String, List<CatalogItem>>>((ref) async {
      final items = await ref.watch(itemCatalogProvider.future);
      final grouped = <String, List<CatalogItem>>{};
      for (final i in items) {
        if (i.category != 'tool') continue;
        grouped.putIfAbsent(i.subcategory, () => []).add(i);
      }
      return grouped;
    });
