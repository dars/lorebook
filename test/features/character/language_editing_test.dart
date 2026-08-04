import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lorebook/app/theme/app_theme.dart';
import 'package:lorebook/features/character/domain/character.dart';
import 'package:lorebook/features/character/domain/character_creation_data.dart';
import 'package:lorebook/features/character/domain/character_providers.dart';
import 'package:lorebook/features/character/presentation/character_page.dart';

/// character-management spec「角色的語言可於角色卡增刪」。
AbilityScore _as(int s) => AbilityScore(score: s, modifier: (s - 10) ~/ 2);

Character _char({List<String> languages = const []}) => Character(
  id: 'c1',
  name: '測試者',
  className: '戰士',
  classNameEn: 'Fighter',
  level: 1,
  maxHp: 10,
  currentHp: 10,
  languages: languages,
  abilityScores: AbilityScores(
    str: _as(10),
    dex: _as(10),
    con: _as(10),
    int_: _as(10),
    wis: _as(10),
    cha: _as(10),
  ),
);

ProviderContainer _container(Character c) {
  final container = ProviderContainer(
    overrides: [selectedCharacterIdProvider.overrideWith((ref) => c.id)],
  );
  container.read(characterListProvider.notifier).replaceAll([c]);
  return container;
}

Future<ProviderContainer> _pumpEditor(WidgetTester tester, Character c) async {
  tester.view.physicalSize = const Size(1170, 2532);
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.reset);

  final container = _container(c);
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
  // 熟練區段的編輯入口（其人其事／性格各有一個，熟練是第三個）
  await tester.ensureVisible(find.byIcon(Icons.edit_outlined).last);
  await tester.pumpAndSettle();
  await tester.tap(find.byIcon(Icons.edit_outlined).last);
  await tester.pumpAndSettle();
  return container;
}

void main() {
  group('內建語言清單', () {
    test('16 種且不含未查證的三種', () {
      expect(kLanguages, hasLength(16));
      expect(kLanguages, contains('通用語'));
      expect(kLanguages, contains('地底通用語'));
      for (final unverified in ['通用手語', '德魯伊語', '盜賊黑話']) {
        expect(
          kLanguages,
          isNot(contains(unverified)),
          reason: 'SRD 5.2 是否收錄未查證，刻意不收',
        );
      }
    });
  });

  group('notifier', () {
    test('新增、移除、去重（含前後空白）、順序維持', () {
      final container = _container(_char(languages: const ['通用語']));
      addTearDown(container.dispose);
      final n = container.read(currentCharacterProvider.notifier);

      n.addLanguage('矮人語');
      n.addLanguage('精靈語');
      expect(container.read(currentCharacterProvider).languages, [
        '通用語',
        '矮人語',
        '精靈語',
      ]);

      // 去重：完全相同與前後空白差異皆不重覆加入
      n.addLanguage('矮人語');
      n.addLanguage('  矮人語  ');
      expect(container.read(currentCharacterProvider).languages, hasLength(3));

      n.removeLanguage('矮人語');
      expect(container.read(currentCharacterProvider).languages, [
        '通用語',
        '精靈語',
      ]);
    });

    test('空字串不加入', () {
      final container = _container(_char());
      addTearDown(container.dispose);
      container.read(currentCharacterProvider.notifier).addLanguage('   ');
      expect(container.read(currentCharacterProvider).languages, isEmpty);
    });
  });

  group('預設語言', () {
    test('內建範例角色的語言與內建清單同語系（否則編輯時會與候選重複）', () {
      for (final c in [Character.mock(), Character.mockBarbarian()]) {
        expect(c.languages, isNotEmpty);
        for (final l in c.languages) {
          expect(kLanguages, contains(l), reason: '$l 應與內建清單同語系，否則編輯時會與候選重複');
        }
      }
    });
  });

  group('編輯介面', () {
    testWidgets('自清單選取加入，並自候選中消失', (tester) async {
      final container = await _pumpEditor(tester, _char());

      await tester.ensureVisible(find.text('矮人語'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('矮人語'));
      await tester.pumpAndSettle();

      expect(container.read(currentCharacterProvider).languages, ['矮人語']);
      // 兩處：sheet 內的已選 chip ＋ 背後傳記頁的熟練列（modal 不遮蔽 tree）。
      // 候選區那一個已消失，否則會是三個。
      expect(find.text('矮人語'), findsNWidgets(2));
    });

    testWidgets('候選 chip 橫向排列，不會每個各佔一行', (tester) async {
      // 曾經的 bug：chip 外層用 Container(alignment: center) 湊觸控高度，
      // 而設了 alignment 的 Container 在 Wrap 的鬆散約束下會撐滿寬度，
      // 導致 16 個語言各佔一行、整個 sheet 拉到螢幕高。
      await _pumpEditor(tester, _char());

      final a = tester.getTopLeft(find.text('通用語'));
      final b = tester.getTopLeft(find.text('矮人語'));
      expect(a.dy, b.dy, reason: '前兩個候選應在同一行（chip 寬度須為內容寬）');
      expect(b.dx, greaterThan(a.dx));
    });

    testWidgets('自由填寫清單外的語言', (tester) async {
      final container = await _pumpEditor(tester, _char());

      await tester.enterText(
        find.widgetWithText(TextField, '清單沒有的語言，自行填寫'),
        '巨魔語',
      );
      await tester.testTextInput.receiveAction(TextInputAction.done);
      await tester.pumpAndSettle();

      expect(container.read(currentCharacterProvider).languages, ['巨魔語']);
    });

    testWidgets('熟練為空時仍可開啟編輯並加入第一項', (tester) async {
      // _char() 沒有任何語言與工具 → 空狀態，但區段與入口仍在
      final container = await _pumpEditor(tester, _char());
      expect(find.text('熟練'), findsWidgets); // sheet 已開啟

      await tester.ensureVisible(find.text('通用語'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('通用語'));
      await tester.pumpAndSettle();
      expect(container.read(currentCharacterProvider).languages, ['通用語']);
    });
  });
}
