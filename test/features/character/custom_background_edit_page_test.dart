import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:lorebook/features/character/data/custom_background_repository.dart';
import 'package:lorebook/features/character/domain/custom_background.dart';
import 'package:lorebook/features/character/presentation/custom_background_edit_page.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// custom-backgrounds spec「自訂背景的建立與編輯」：
/// 表單即時驗證（能力恰 3、技能恰 2、名稱非空），未通過禁止儲存。
class _FakeRepo extends CustomBackgroundRepository {
  final upserted = <CustomBackground>[];
  // 關閉 token auto-refresh，避免週期 Timer 觸發 widget test 的
  // pending-timer 檢查。
  _FakeRepo()
      : super(SupabaseClient(
          'http://localhost',
          'k',
          authOptions: const AuthClientOptions(autoRefreshToken: false),
        ));

  @override
  Future<List<CustomBackground>> fetchAll() async => [];

  @override
  Future<void> upsert(CustomBackground b) async => upserted.add(b);
}

void main() {
  late _FakeRepo repo;

  Future<GoRouter> pump(WidgetTester tester) async {
    repo = _FakeRepo();
    final router = GoRouter(
      initialLocation: '/',
      routes: [
        GoRoute(
          path: '/',
          builder: (_, _) => const Scaffold(body: Text('home')),
        ),
        GoRoute(
          path: '/edit',
          builder: (_, state) => CustomBackgroundEditPage(
            initial: state.extra as CustomBackground?,
          ),
        ),
      ],
    );
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          customBackgroundRepositoryProvider.overrideWithValue(repo),
        ],
        child: MaterialApp.router(routerConfig: router),
      ),
    );
    router.push('/edit');
    await tester.pumpAndSettle();
    return router;
  }

  bool saveEnabled(WidgetTester tester) =>
      tester.widget<FilledButton>(find.byType(FilledButton)).onPressed != null;

  testWidgets('未填妥時儲存不可用；填妥後可儲存並寫入 repository', (tester) async {
    final router = await pump(tester);
    expect(saveEnabled(tester), isFalse);

    await tester.enterText(find.byType(TextField).first, '獵人');
    // 能力區在技能區之前，用 .first 避免「感知」等同字撞名
    for (final label in ['敏捷', '體質', '魅力']) {
      await tester.tap(find.text(label).first);
      await tester.pump();
    }
    for (final label in ['隱匿', '求生', '警覺']) {
      await tester.tap(find.text(label).last);
      await tester.pump();
    }
    expect(saveEnabled(tester), isTrue);

    await tester.tap(find.text('儲存'));
    await tester.pumpAndSettle();

    final b = repo.upserted.single;
    expect(b.name, '獵人');
    expect(b.abilities.toSet(), {'DEX', 'CON', 'CHA'});
    expect(b.skills.toSet(), {'隱匿', '求生'});
    expect(b.originFeat, '警覺');
    expect(router.state.matchedLocation, '/'); // 儲存後返回
  });

  testWidgets('能力值第 4 個不可選（恰 3 互異）', (tester) async {
    await pump(tester);
    await tester.enterText(find.byType(TextField).first, 'X');
    for (final label in ['力量', '敏捷', '體質']) {
      await tester.tap(find.text(label).last);
      await tester.pump();
    }
    // 第 4 個能力（智力）已達上限，點了不生效
    await tester.tap(find.text('智力').last);
    await tester.pump();
    for (final label in ['隱匿', '求生', '警覺']) {
      await tester.tap(find.text(label).last);
      await tester.pump();
    }
    await tester.tap(find.text('儲存'));
    await tester.pumpAndSettle();
    expect(repo.upserted.single.abilities.toSet(), {'STR', 'DEX', 'CON'});
  });

  testWidgets('編輯模式帶入既有值', (tester) async {
    repo = _FakeRepo();
    const existing = CustomBackground(
      id: 'bg-1',
      name: '獵人',
      abilities: ['DEX', 'CON', 'WIS'],
      skills: ['隱匿', '求生'],
      originFeat: '警覺',
      description: '荒野的追蹤者。',
    );
    final router = GoRouter(
      initialLocation: '/',
      routes: [
        GoRoute(
          path: '/',
          builder: (_, _) => const Scaffold(body: Text('home')),
        ),
        GoRoute(
          path: '/edit',
          builder: (_, state) => CustomBackgroundEditPage(
            initial: state.extra as CustomBackground?,
          ),
        ),
      ],
    );
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          customBackgroundRepositoryProvider.overrideWithValue(repo),
        ],
        child: MaterialApp.router(routerConfig: router),
      ),
    );
    router.push('/edit', extra: existing);
    await tester.pumpAndSettle();

    expect(find.text('編輯自訂背景'), findsOneWidget);
    expect(find.text('獵人'), findsOneWidget);
    expect(saveEnabled(tester), isTrue); // 既有值即為合法

    await tester.tap(find.text('儲存'));
    await tester.pumpAndSettle();
    expect(repo.upserted.single.id, 'bg-1'); // 保留原 id（更新而非新增）
  });
}
