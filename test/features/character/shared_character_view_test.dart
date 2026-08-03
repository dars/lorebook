import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lorebook/app/theme/app_theme.dart';
import 'package:lorebook/features/character/data/character_share_repository.dart';
import 'package:lorebook/features/character/domain/character.dart';
import 'package:lorebook/features/character/domain/character_providers.dart';
import 'package:lorebook/features/character/domain/shared_character_result.dart';
import 'package:lorebook/features/character/presentation/character_page.dart';
import 'package:lorebook/features/character/presentation/read_only_scope.dart';
import 'package:lorebook/features/character/presentation/shared_character_view_page.dart';
import 'package:lorebook/shared/domain/app_exception.dart';

AbilityScore _as(int score) =>
    AbilityScore(score: score, modifier: (score - 10) ~/ 2);

Character _char() => Character(
  id: 'c1',
  name: '戴夫林',
  className: '法師',
  classNameEn: 'Wizard',
  level: 5,
  maxHp: 30,
  currentHp: 23,
  spellcastingAbility: 'INT',
  abilityScores: AbilityScores(
    str: _as(10),
    dex: _as(14),
    con: _as(12),
    int_: _as(16),
    wis: _as(12),
    cha: _as(10),
  ),
  equipment: const [
    Equipment(
      name: '法杖',
      itemType: ItemType.weapon,
      equipped: true,
      damage: '1d6',
    ),
    Equipment(name: '治療藥水', itemType: ItemType.consumable, quantity: 2),
  ],
);

void _phone(WidgetTester tester) {
  tester.view.physicalSize = const Size(1170, 2532);
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.reset);
}

/// 唯讀模式下把角色卡的五個 tab 走一遍，斷言沒有任何寫入入口。
Future<void> _pumpReadOnlyTabs(WidgetTester tester, Character c) async {
  await tester.pumpWidget(
    ProviderScope(
      child: MaterialApp(
        theme: AppTheme.dark,
        home: Scaffold(
          body: ReadOnlyScope(
            readOnly: true,
            child: CharacterPage(character: c),
          ),
        ),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  group('唯讀模式（character-share：檢視為純唯讀）', () {
    testWidgets('總覽／傳記：無編輯鈕；物品：無新增、無裝備切換、無使用鈕', (tester) async {
      _phone(tester);
      final c = _char();
      await _pumpReadOnlyTabs(tester, c);

      // 總覽：無區段編輯鈕、無立繪相機鈕、無分享區段。
      expect(find.byIcon(Icons.edit), findsNothing);
      expect(find.byIcon(Icons.photo_camera_outlined), findsNothing);
      expect(find.text('SHARE 分享'), findsNothing);
      expect(find.text('建立分享連結'), findsNothing);

      // 物品頁：物品仍看得到，但沒有任何可寫入的控制項。
      await tester.tap(find.text('物品'));
      await tester.pumpAndSettle();
      expect(find.text('法杖'), findsOneWidget);
      expect(find.text('使用'), findsNothing);
      expect(find.byIcon(Icons.radio_button_unchecked), findsNothing);
      expect(find.byType(Dismissible), findsNothing);

      // 傳記頁：兩個區段皆無編輯鈕。
      await tester.tap(find.text('傳記'));
      await tester.pumpAndSettle();
      expect(find.byIcon(Icons.edit), findsNothing);
    });

    testWidgets('可編輯模式（對照組）：編輯入口存在', (tester) async {
      _phone(tester);
      final c = _char();
      final container = ProviderContainer(
        overrides: [selectedCharacterIdProvider.overrideWith((ref) => c.id)],
      );
      addTearDown(container.dispose);
      container.read(characterListProvider.notifier).replaceAll([c]);

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

      await tester.tap(find.text('物品'));
      await tester.pumpAndSettle();
      expect(find.text('使用'), findsOneWidget);
      expect(find.byType(Dismissible), findsWidgets);
    });
  });

  group('分享檢視頁的五種狀態', () {
    Future<void> pumpWith(
      WidgetTester tester,
      Future<SharedCharacterResult> Function() fetch,
    ) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            sharedCharacterProvider.overrideWith((ref, token) => fetch()),
          ],
          child: MaterialApp(
            theme: AppTheme.dark,
            home: const SharedCharacterViewPage(token: 'tok'),
          ),
        ),
      );
      await tester.pumpAndSettle();
    }

    testWidgets('成功：顯示角色卡與資料時點，且無寫入入口', (tester) async {
      _phone(tester);
      await pumpWith(
        tester,
        () async => SharedCharacterOk(_char(), DateTime(2026, 8, 3, 14, 32)),
      );
      expect(find.textContaining('唯讀檢視'), findsOneWidget);
      expect(find.textContaining('14:32'), findsOneWidget);
      expect(find.byIcon(Icons.edit), findsNothing);
    });

    testWidgets('預設落在行動頁：DM 看得到 HP／AC／狀態，但不能改', (tester) async {
      _phone(tester);
      await pumpWith(
        tester,
        () async => SharedCharacterOk(_char(), DateTime(2026, 8, 3, 14, 32)),
      );

      // 跑團當下要看的即時數值都在。
      // CollapsibleSection 把標題拆成 EN／CN 兩個 Text。
      expect(find.text('STATUS'), findsOneWidget);
      expect(find.text('23'), findsOneWidget); // 當前 HP
      expect(find.text('/30'), findsOneWidget); // 最大 HP
      expect(find.textContaining('狀態異常'), findsOneWidget);

      // 但沒有任何寫入入口：HP 加減、休息、資源增減。
      expect(find.byKey(const Key('hp-minus')), findsNothing);
      expect(find.byKey(const Key('hp-plus')), findsNothing);
      expect(find.text('REST'), findsNothing);
      expect(find.text('短休'), findsNothing);
      expect(find.text('長休'), findsNothing);
    });

    testWidgets('可切到角色頁看建卡結果', (tester) async {
      _phone(tester);
      await pumpWith(
        tester,
        () async => SharedCharacterOk(_char(), DateTime(2026, 8, 3, 14, 32)),
      );
      await tester.tap(find.text('角色'));
      await tester.pumpAndSettle();
      expect(find.text('BASIC'), findsOneWidget);
      expect(find.byIcon(Icons.edit), findsNothing);
    });

    testWidgets('已撤銷：說明主人已停止分享，不含身分資訊', (tester) async {
      _phone(tester);
      await pumpWith(tester, () async => const SharedCharacterRevoked());
      expect(find.text('已停止分享'), findsOneWidget);
      expect(find.textContaining('角色主人已停止分享'), findsOneWidget);
      expect(find.textContaining('找不到'), findsNothing);
    });

    testWidgets('角色已刪除', (tester) async {
      _phone(tester);
      await pumpWith(tester, () async => const SharedCharacterDeleted());
      expect(find.text('角色已刪除'), findsOneWidget);
    });

    testWidgets('token 不存在', (tester) async {
      _phone(tester);
      await pumpWith(tester, () async => const SharedCharacterNotFound());
      expect(find.text('找不到'), findsOneWidget);
      expect(find.textContaining('確認網址'), findsOneWidget);
    });

    testWidgets('載入失敗：說明並提供重試，不顯示任何角色資料', (tester) async {
      _phone(tester);
      await pumpWith(
        tester,
        () async => throw const DataException('讀取分享的角色卡失敗：連線逾時'),
      );
      expect(find.text('無法載入'), findsOneWidget);
      expect(find.text('重試'), findsOneWidget);
      expect(find.text('戴夫林'), findsNothing);
    });
  });
}
