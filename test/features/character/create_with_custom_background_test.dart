import 'package:flutter/material.dart';
import 'package:lorebook/app/theme/app_theme.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:lorebook/features/catalog/data/catalog_repository.dart';
import 'package:lorebook/features/catalog/domain/catalog_models.dart';
import 'package:lorebook/features/character/data/custom_background_repository.dart';
import 'package:lorebook/features/character/domain/character_providers.dart';
import 'package:lorebook/features/character/domain/custom_background.dart';
import 'package:lorebook/features/character/presentation/character_create_page.dart';

/// custom-backgrounds spec「建角選項合併供給」：自訂背景並列參與建角、
/// 行為與內建一致、角色快照 background 為自訂名稱且 backgroundEn 為空。
/// 走戰士（非施法職業）路線，全程不依賴內容庫。
const _hunter = CustomBackground(
  id: 'bg-hunter',
  name: '獵人',
  abilities: ['DEX', 'CON', 'WIS'],
  skills: ['隱匿', '求生'],
  originFeat: '警覺',
  description: '荒野的追蹤者。',
);

class _FakeCustomBgs extends CustomBackgroundsNotifier {
  @override
  Future<List<CustomBackground>> build() async => [_hunter];
}

const _fighterCatalog = [
  CatalogClass(id: 'c-fighter', name: '戰士', engName: 'Fighter', source: 'XPHB'),
];

const _fighterFeatures = [
  CatalogClassFeature(
    id: 'ff-1',
    name: '第二風',
    engName: 'Second Wind',
    source: 'XPHB',
    level: 1,
    classId: 'c-fighter',
  ),
  CatalogClassFeature(
    id: 'ff-2',
    name: '動作如潮',
    engName: 'Action Surge',
    source: 'XPHB',
    level: 2,
    classId: 'c-fighter',
  ),
];

class _ErrorCustomBgs extends CustomBackgroundsNotifier {
  @override
  Future<List<CustomBackground>> build() async => throw Exception('offline');
}

Future<ProviderContainer> _pump(
  WidgetTester tester, {
  bool offline = false,
}) async {
  final container = ProviderContainer(
    overrides: [
      customBackgroundsProvider.overrideWith(
        offline ? _ErrorCustomBgs.new : _FakeCustomBgs.new,
      ),
      // 內容庫：供 1 級職業特性帶入（offline 案例維持不覆寫＝取用失敗降級）。
      if (!offline) ...[
        classCatalogProvider.overrideWith((ref) async => _fighterCatalog),
        classFeatureCatalogProvider.overrideWith(
          (ref, id) async => _fighterFeatures,
        ),
      ],
    ],
  );
  addTearDown(container.dispose);
  final router = GoRouter(
    initialLocation: '/character-create',
    routes: [
      GoRoute(
        path: '/character-create',
        builder: (_, _) => const CharacterCreatePage(),
      ),
      GoRoute(
        path: '/main/decision',
        builder: (_, _) => const Scaffold(body: Text('main')),
      ),
      GoRoute(
        path: '/custom-background-edit',
        builder: (_, _) => const Scaffold(body: Text('editor')),
      ),
    ],
  );
  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: container,
      child: MaterialApp.router(theme: AppTheme.dark, routerConfig: router),
    ),
  );
  await tester.pumpAndSettle();
  return container;
}

Future<void> _next(WidgetTester tester) async {
  await tester.tap(find.text('下一步'));
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('自訂背景並列顯示、選取後行為與內建一致、快照正確', (tester) async {
    tester.view.physicalSize = const Size(1170, 2532); // iPhone 級尺寸
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);

    final container = await _pump(tester);

    // 基本：名稱 + 種族
    await tester.enterText(find.byType(TextField).first, '快照測試');
    await tester.tap(find.text('人類').first);
    await tester.pumpAndSettle();
    await _next(tester);

    // 職業：戰士（非施法，全程不需內容庫）
    await tester.ensureVisible(find.text('戰士').first);
    await tester.tap(find.text('戰士').first);
    await tester.pumpAndSettle();
    await _next(tester);

    // 背景：內建 4 個 + 自訂「獵人（自訂）」並列 + 新增入口
    expect(find.text('侍僧'), findsOneWidget);
    expect(find.text('獵人（自訂）'), findsOneWidget);
    expect(find.text('自訂背景'), findsOneWidget); // 「+ 自訂背景」入口
    await tester.tap(find.text('獵人（自訂）'));
    await tester.pumpAndSettle();
    // 敘述卡與重點提示（含編輯/刪除動作）
    expect(find.textContaining('荒野的追蹤者'), findsOneWidget);
    expect(find.textContaining('警覺'), findsOneWidget);
    expect(find.text('編輯'), findsOneWidget);
    expect(find.text('刪除'), findsOneWidget);
    await _next(tester);

    // 能力值：背景加值卡以自訂背景為題（行為與內建一致）
    expect(find.textContaining('背景加值 · 獵人'), findsOneWidget);
    await _next(tester);

    // 技能：背景固定技能自動帶入（隱匿/求生）
    expect(find.textContaining('背景 獵人（自動）'), findsOneWidget);
    // 職業區在種族區之前，職業技能用 .first
    await tester.ensureVisible(find.textContaining('體能 Athletics').first);
    await tester.tap(find.textContaining('體能 Athletics').first);
    await tester.pump();
    await tester.ensureVisible(find.textContaining('威嚇 Intimidation').first);
    await tester.tap(find.textContaining('威嚇 Intimidation').first);
    await tester.pump();
    // 人類種族技能任選 1
    await tester.ensureVisible(find.textContaining('醫藥 Medicine').last);
    await tester.tap(find.textContaining('醫藥 Medicine').last);
    await tester.pumpAndSettle();
    await _next(tester);

    // 確認並建立
    await tester.ensureVisible(find.text('建立角色'));
    await tester.tap(find.text('建立角色'));
    await tester.pumpAndSettle();

    final created = container.read(characterListProvider).last;
    expect(created.background, '獵人'); // 快照為自訂名稱（無後綴）
    expect(created.backgroundEn, ''); // 自訂背景無英文名
    expect(
      created.skills.where((s) => s.proficient).map((s) => s.name),
      containsAll(['隱匿', '求生', '體能', '威嚇']),
    );
    expect(created.features.map((f) => f.source), contains('背景：獵人'));
    // 1 級職業特性由內容庫帶入；2 級以上不帶（留給升級流程）。
    expect(created.features.map((f) => f.name), contains('第二風'));
    expect(created.features.map((f) => f.name), isNot(contains('動作如潮')));
    expect(
      created.features.firstWhere((f) => f.name == '第二風').source,
      '職業：戰士 Lv1',
    );
    // 職業資源由內建規則表推導：戰士 Lv1 含第二風 2/2（pips）；
    // 動作如潮 2 級才獲得。
    final secondWind = created.resources.firstWhere(
      (r) => r.nameEn == 'Second Wind',
    );
    expect(secondWind.max, 2);
    expect(secondWind.current, 2);
    expect(created.resources.any((r) => r.nameEn == 'Action Surge'), isFalse);
  });

  testWidgets('離線降級：僅內建背景 + 提示，不阻擋建角', (tester) async {
    tester.view.physicalSize = const Size(1170, 2532);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);

    await _pump(tester, offline: true);

    await tester.enterText(find.byType(TextField).first, 'X');
    await tester.tap(find.text('人類').first);
    await tester.pumpAndSettle();
    await _next(tester);
    await tester.ensureVisible(find.text('戰士').first);
    await tester.tap(find.text('戰士').first);
    await tester.pumpAndSettle();
    await _next(tester);

    expect(find.text('侍僧'), findsOneWidget); // 內建仍在
    expect(find.textContaining('自訂'), findsWidgets);
    expect(find.textContaining('離線不可用'), findsOneWidget);
    await tester.tap(find.text('士兵'));
    await tester.pumpAndSettle();
    await _next(tester); // 可正常續行
    expect(find.textContaining('背景加值 · 士兵'), findsOneWidget);
  });
}
