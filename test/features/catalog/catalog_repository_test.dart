import 'package:flutter_test/flutter_test.dart';
import 'package:lorebook/features/catalog/data/catalog_repository.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// 書源政策（catalog-source spec）：預設書源為 XPHB（2024 修訂版），
/// 且可於建構時注入替換（回滾 / 測試用）。
void main() {
  final client = SupabaseClient('http://localhost', 'test-key');

  test('預設書源為 XPHB（2024）', () {
    expect(kCatalogSource, 'XPHB');
    expect(CatalogRepository(client).source, 'XPHB');
  });

  test('書源可於建構時注入替換', () {
    expect(CatalogRepository(client, source: 'PHB').source, 'PHB');
  });
}
