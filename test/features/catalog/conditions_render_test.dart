import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lorebook/features/catalog/domain/catalog_models.dart';
import 'package:lorebook/features/catalog/presentation/fivetools_renderer.dart';

/// 對「全部 15 種 PHB 狀態」的真實資料做渲染煙霧測試。
/// fixture 為 Supabase `entries` kind=condition source=PHB 的完整快照。
void main() {
  final raw = File(
    'test/features/catalog/fixtures/conditions_phb.json',
  ).readAsStringSync();
  final rows = (jsonDecode(raw) as List).cast<Map<String, dynamic>>();

  test('fixture 完整（15 種狀態）', () {
    expect(rows, hasLength(15));
  });

  for (final row in rows) {
    final entry = CatalogEntry.fromJson(row);
    testWidgets('渲染 ${entry.name}（${entry.engName}）不拋例外', (tester) async {
      final entries = entry.data['entries'] as List;
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(child: FtEntriesView(entries)),
          ),
        ),
      );
      // 至少渲染出一些文字，且沒有殘留未解析的 {@ 標記。
      final richTexts = tester
          .widgetList<RichText>(find.byType(RichText))
          .map((w) => w.text.toPlainText())
          .join();
      expect(richTexts, isNotEmpty);
      expect(richTexts.contains('{@'), isFalse, reason: '不應殘留未解析的 5etools 標記');
    });
  }
}
