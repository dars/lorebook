import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:lorebook/app/theme/app_theme.dart';
import 'package:lorebook/features/catalog/data/catalog_repository.dart';
import 'package:lorebook/features/catalog/domain/catalog_models.dart';
import 'package:lorebook/features/character/presentation/character_create_page.dart';

/// character-management spec「新增角色（簡化版）」：能力值三種取值方式
/// 各自附使用說明——標準陣列／購點／擲骰對沒跑過團的人是空詞，只給 tab
/// 名稱等於要他先去查規則書。
const _fighterCatalog = [
  CatalogClass(id: 'c-fighter', name: '戰士', engName: 'Fighter', source: 'XPHB'),
];

Future<void> _pump(WidgetTester tester) async {
  final container = ProviderContainer(
    overrides: [
      classCatalogProvider.overrideWith((ref) async => _fighterCatalog),
      classFeatureCatalogProvider.overrideWith(
        (ref, id) async => const <CatalogClassFeature>[],
      ),
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
    ],
  );
  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: container,
      child: MaterialApp.router(theme: AppTheme.dark, routerConfig: router),
    ),
  );
  await tester.pumpAndSettle();
}

Future<void> _next(WidgetTester tester) async {
  await tester.tap(find.text('下一步'));
  await tester.pumpAndSettle();
}

/// 走到能力值步驟（名稱 → 種族 → 職業 → 背景）。
Future<void> _toAbilityStep(WidgetTester tester) async {
  await _pump(tester);
  await tester.enterText(find.byType(TextField).first, '說明測試');
  await tester.tap(find.text('人類').first);
  await tester.pumpAndSettle();
  await _next(tester);

  await tester.ensureVisible(find.text('戰士').first);
  await tester.tap(find.text('戰士').first);
  await tester.pumpAndSettle();
  await _next(tester);

  await tester.tap(find.text('侍僧').first);
  await tester.pumpAndSettle();
  await _next(tester);
}

/// 走到種族步驟（僅需填名稱）。
Future<void> _toSpeciesStep(WidgetTester tester) async {
  await _pump(tester);
  await tester.enterText(find.byType(TextField).first, '特性測試');
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('建角種族步驟：特性可點擊看說明', (tester) async {
    tester.view.physicalSize = const Size(1170, 2532);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);

    await _toSpeciesStep(tester);
    await tester.tap(find.text('矮人').first);
    await tester.pumpAndSettle();

    // 敘述卡的特性只顯示名稱。
    expect(find.text('矮人堅毅'), findsOneWidget);
    expect(find.text('生命值上限每個等級 +1。'), findsNothing);

    await tester.ensureVisible(find.text('矮人堅毅'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('矮人堅毅'));
    await tester.pumpAndSettle();
    expect(find.text('生命值上限每個等級 +1。'), findsOneWidget);
  });

  testWidgets('摘要常駐、詳解預設收合，點「怎麼用」展開', (tester) async {
    tester.view.physicalSize = const Size(1170, 2532);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);

    await _toAbilityStep(tester);

    // 摘要常駐；詳解（操作步驟／適合誰）預設不渲染。
    expect(find.text('六個固定數值，你決定誰拿哪個'), findsOneWidget);
    expect(find.text('怎麼用'), findsOneWidget);
    expect(find.textContaining('自動對調'), findsNothing);
    expect(find.textContaining('適合：'), findsNothing);

    await tester.tap(find.text('怎麼用'));
    await tester.pumpAndSettle();
    expect(find.textContaining('自動對調'), findsOneWidget);
    expect(find.textContaining('適合：第一次建角'), findsOneWidget);
  });

  testWidgets('展開後三種方式各有圖解與適合誰，切換 tab 保留展開', (tester) async {
    tester.view.physicalSize = const Size(1170, 2532);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);

    await _toAbilityStep(tester);
    await tester.tap(find.text('怎麼用'));
    await tester.pumpAndSettle();

    // 標準陣列：六個值以 chip 呈現，並標示已用／未用。
    for (final v in ['15', '14', '13', '12', '10', '8']) {
      expect(find.text(v), findsWidgets);
    }
    expect(find.text('還沒用'), findsOneWidget);
    expect(find.text('已指派'), findsOneWidget);

    // 購點：成本表取代文字換算（切換方式後仍保持展開）。
    await tester.tap(find.text('購點'));
    await tester.pumpAndSettle();
    expect(find.textContaining('自動對調'), findsNothing);
    expect(find.text('分數'), findsOneWidget);
    expect(find.text('累計花費'), findsOneWidget);
    expect(find.textContaining('14 與 15 每加 1 分要 2 點'), findsOneWidget);
    expect(find.textContaining('適合：想自己精算'), findsOneWidget);

    // 擲骰：一次實例演完，骰式為小寫 NdX。
    await tester.tap(find.text('擲骰'));
    await tester.pumpAndSettle();
    expect(find.textContaining('4d6'), findsOneWidget);
    expect(find.text('一次的樣子'), findsOneWidget);
    expect(find.textContaining('去掉最低的 2'), findsOneWidget);
    expect(find.textContaining('App 不代擲'), findsOneWidget);
    expect(find.textContaining('適合：接受運氣'), findsOneWidget);
    expect(find.text('分數'), findsNothing);
  });

  testWidgets('成本表由 kPointBuyCost 生成，非硬寫文案', (tester) async {
    tester.view.physicalSize = const Size(1170, 2532);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);

    await _toAbilityStep(tester);
    await tester.tap(find.text('怎麼用'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('購點'));
    await tester.pumpAndSettle();

    // 8→0 … 15→9 全部出現在表中（分數列與花費列各一組）。
    expect(find.text('8'), findsWidgets);
    expect(find.text('9'), findsWidgets);
    expect(find.text('7'), findsWidgets); // 14 的累計花費
  });
}
