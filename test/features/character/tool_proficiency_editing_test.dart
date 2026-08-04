import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lorebook/app/theme/app_theme.dart';
import 'package:lorebook/features/catalog/data/catalog_repository.dart';
import 'package:lorebook/features/catalog/domain/catalog_models.dart';
import 'package:lorebook/features/character/domain/character.dart';
import 'package:lorebook/features/character/domain/character_providers.dart';
import 'package:lorebook/features/character/presentation/character_page.dart';

/// character-management spec「角色的工具熟練可於角色卡增刪」與其離線降級。
const _tools = [
  CatalogItem(
    id: 't1',
    name: '鐵匠工具',
    source: 'XPHB',
    category: 'tool',
    subcategory: '工匠工具',
  ),
  CatalogItem(
    id: 't2',
    name: '盜賊工具',
    source: 'XPHB',
    category: 'tool',
    subcategory: '工具',
  ),
];

AbilityScore _as(int s) => AbilityScore(score: s, modifier: (s - 10) ~/ 2);

Character _char({
  List<String> tools = const [],
  List<String> languages = const ['通用語'],
}) => Character(
  id: 'c1',
  name: '測試者',
  className: '戰士',
  classNameEn: 'Fighter',
  level: 1,
  maxHp: 10,
  currentHp: 10,
  languages: languages,
  toolProficiencies: tools,
  abilityScores: AbilityScores(
    str: _as(10),
    dex: _as(10),
    con: _as(10),
    int_: _as(10),
    wis: _as(10),
    cha: _as(10),
  ),
);

ProviderContainer _container(
  Character c, {
  List<CatalogItem> catalog = _tools,
}) {
  final container = ProviderContainer(
    overrides: [
      selectedCharacterIdProvider.overrideWith((ref) => c.id),
      itemCatalogProvider.overrideWith((ref) async => catalog),
    ],
  );
  container.read(characterListProvider.notifier).replaceAll([c]);
  return container;
}

Future<ProviderContainer> _pumpEditor(
  WidgetTester tester,
  Character c, {
  List<CatalogItem> catalog = _tools,
}) async {
  tester.view.physicalSize = const Size(1170, 2532);
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.reset);

  final container = _container(c, catalog: catalog);
  addTearDown(container.dispose);
  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: container,
      child: MaterialApp(
        theme: AppTheme.dark,
        home: const Scaffold(body: CharacterPage()),
      ),
    ),
  );
  await tester.pumpAndSettle();
  await tester.tap(find.text('傳記'));
  await tester.pumpAndSettle();
  await tester.ensureVisible(find.byIcon(Icons.edit_outlined).last);
  await tester.pumpAndSettle();
  await tester.tap(find.byIcon(Icons.edit_outlined).last);
  await tester.pumpAndSettle();
  return container;
}

void main() {
  group('notifier', () {
    test('新增、移除、去重（含前後空白）、不影響語言', () {
      final container = _container(_char());
      addTearDown(container.dispose);
      final n = container.read(currentCharacterProvider.notifier);

      n.addToolProficiency('鐵匠工具');
      n.addToolProficiency('盜賊工具');
      n.addToolProficiency('  鐵匠工具  ');
      expect(container.read(currentCharacterProvider).toolProficiencies, [
        '鐵匠工具',
        '盜賊工具',
      ]);

      n.removeToolProficiency('鐵匠工具');
      expect(container.read(currentCharacterProvider).toolProficiencies, [
        '盜賊工具',
      ]);
      // 語言不受影響
      expect(container.read(currentCharacterProvider).languages, ['通用語']);
    });
  });

  group('編輯介面', () {
    testWidgets('自分組候選選取加入', (tester) async {
      final container = await _pumpEditor(tester, _char());

      // 分組標題可見
      expect(find.text('工匠工具'), findsOneWidget);
      expect(find.text('工具'), findsWidgets); // 分組標題 ＋ 欄位標籤

      await tester.ensureVisible(find.text('鐵匠工具'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('鐵匠工具'));
      await tester.pumpAndSettle();

      expect(container.read(currentCharacterProvider).toolProficiencies, [
        '鐵匠工具',
      ]);
    });

    testWidgets('自由填寫清單外的工具', (tester) async {
      final container = await _pumpEditor(tester, _char());

      await tester.enterText(
        find.widgetWithText(TextField, '清單沒有的工具，自行填寫'),
        '符文雕刻工具',
      );
      await tester.testTextInput.receiveAction(TextInputAction.done);
      await tester.pumpAndSettle();

      expect(container.read(currentCharacterProvider).toolProficiencies, [
        '符文雕刻工具',
      ]);
    });

    testWidgets('移除工具', (tester) async {
      final container = await _pumpEditor(tester, _char(tools: const ['鐵匠工具']));
      // sheet 內的已選 chip 上的 ×（語言也有一個，取最後一個＝工具段）
      await tester.ensureVisible(find.byIcon(Icons.close).last);
      await tester.pumpAndSettle();
      await tester.tap(find.byIcon(Icons.close).last);
      await tester.pumpAndSettle();

      expect(
        container.read(currentCharacterProvider).toolProficiencies,
        isEmpty,
      );
    });
  });

  group('離線降級', () {
    testWidgets('內容庫為空時顯示提示，語言仍可用、自由填寫仍可加入', (tester) async {
      final container = await _pumpEditor(tester, _char(), catalog: const []);

      expect(find.textContaining('工具清單離線不可用'), findsOneWidget);

      // 語言段照常可用
      await tester.ensureVisible(find.text('矮人語'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('矮人語'));
      await tester.pumpAndSettle();
      expect(
        container.read(currentCharacterProvider).languages,
        contains('矮人語'),
      );

      // 離線時自由填寫是唯一的新增途徑
      await tester.enterText(
        find.widgetWithText(TextField, '清單沒有的工具，自行填寫'),
        '鐵匠工具',
      );
      await tester.testTextInput.receiveAction(TextInputAction.done);
      await tester.pumpAndSettle();
      expect(container.read(currentCharacterProvider).toolProficiencies, [
        '鐵匠工具',
      ]);
    });
  });
}
