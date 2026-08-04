import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lorebook/app/theme/app_theme.dart';
import 'package:lorebook/features/character/domain/character.dart';
import 'package:lorebook/features/character/domain/character_creation_data.dart';
import 'package:lorebook/features/character/domain/character_providers.dart';
import 'package:lorebook/features/character/presentation/character_page.dart';

/// character-management spec「種族特性為結構化條目」與「特性說明以點擊展開」。
AbilityScore _as(int score) =>
    AbilityScore(score: score, modifier: (score - 10) ~/ 2);

Character _char({
  required List<CharacterFeature> features,
  List<String> tools = const [],
  List<String> languages = const [],
}) => Character(
  toolProficiencies: tools,
  languages: languages,
  id: 'c1',
  name: '測試者',
  species: '矮人',
  className: '戰士',
  classNameEn: 'Fighter',
  level: 3,
  maxHp: 30,
  currentHp: 30,
  features: features,
  abilityScores: AbilityScores(
    str: _as(14),
    dex: _as(12),
    con: _as(14),
    int_: _as(10),
    wis: _as(12),
    cha: _as(10),
  ),
);

Future<void> _pumpBiography(WidgetTester tester, Character c) async {
  tester.view.physicalSize = const Size(1170, 2532);
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.reset);

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
  await tester.tap(find.text('傳記'));
  await tester.pumpAndSettle();
}

void main() {
  group('內建種族特性為結構化條目', () {
    test('每條特性都有名稱；說明皆已補齊', () {
      for (final sp in kSpecies) {
        expect(sp.allTraits, isNotEmpty, reason: '${sp.cn} 應有特性');
        for (final t in sp.allTraits) {
          expect(t.name, isNotEmpty, reason: '${sp.cn} 的特性名稱不可為空');
          expect(
            t.description,
            isNotEmpty,
            reason: '${sp.cn} 的「${t.name}」應有說明',
          );
        }
      }
    });

    test('黑暗視覺由距離推導，不在 traits 內重複列出', () {
      for (final sp in kSpecies) {
        // 重複的根源是兩種表示法並存——traits 裡不該再各寫一遍。
        expect(
          sp.traits.where((t) => t.name.contains('黑暗視覺')),
          isEmpty,
          reason: '${sp.cn} 的 traits 不應含黑暗視覺',
        );
        final derived = sp.allTraits.where((t) => t.name.contains('黑暗視覺'));
        if (sp.darkvisionFt > 0) {
          expect(derived, hasLength(1), reason: '${sp.cn} 應推導出一條黑暗視覺');
          expect(derived.first.name, '黑暗視覺 ${sp.darkvisionFt}');
        } else {
          expect(derived, isEmpty, reason: '${sp.cn} 無黑暗視覺');
        }
      }
    });

    test('黑暗視覺距離符合 SRD（精靈 60、矮人與獸人 120）', () {
      int ft(String cn) => kSpecies.firstWhere((s) => s.cn == cn).darkvisionFt;
      expect(ft('精靈'), 60);
      expect(ft('矮人'), 120);
      expect(ft('獸人'), 120);
      expect(ft('龍裔'), 60);
      expect(ft('人類'), 0);
      expect(ft('半身人'), 0);
      expect(ft('歌利亞'), 0);
    });

    test('名稱與說明分開存放，未黏成單一字串', () {
      final dwarf = kSpecies.firstWhere((s) => s.cn == '矮人');
      final tough = dwarf.traits.firstWhere((t) => t.name == '矮人堅毅');
      expect(tough.name, '矮人堅毅');
      expect(tough.nameEn, 'Dwarven Toughness');
      expect(tough.description, contains('每個等級'));
      // 舊格式（'矮人堅毅 +1HP/級'）不應殘留在名稱裡。
      expect(tough.name, isNot(contains(' ')));
    });
  });

  group('角色頁特性清單', () {
    testWidgets('清單只顯示名稱，點擊有說明者才出說明', (tester) async {
      await _pumpBiography(
        tester,
        _char(
          features: const [
            CharacterFeature(
              name: '矮人堅毅',
              nameEn: 'Dwarven Toughness',
              source: '種族：矮人',
              description: '生命值上限每個等級 +1。',
            ),
          ],
        ),
      );

      // 說明不常駐。
      // 名稱與英文名同屬一個 Text.rich，故以 textContaining 比對。
      expect(find.textContaining('矮人堅毅'), findsOneWidget);
      expect(find.text('生命值上限每個等級 +1。'), findsNothing);

      await tester.tap(find.textContaining('矮人堅毅'));
      await tester.pumpAndSettle();
      expect(find.text('生命值上限每個等級 +1。'), findsOneWidget);
      expect(find.text('種族：矮人'), findsOneWidget);
    });

    testWidgets('職業特性採同一互動', (tester) async {
      await _pumpBiography(
        tester,
        _char(
          features: const [
            CharacterFeature(
              name: '第二風',
              nameEn: 'Second Wind',
              source: '職業：戰士',
              description: '附贈動作回復生命值。',
            ),
          ],
        ),
      );
      expect(find.text('附贈動作回復生命值。'), findsNothing);
      await tester.tap(find.textContaining('第二風'));
      await tester.pumpAndSettle();
      expect(find.text('附贈動作回復生命值。'), findsOneWidget);
    });

    testWidgets('無說明者不可點擊且畫面正常（上線前建立的角色）', (tester) async {
      await _pumpBiography(
        tester,
        _char(
          features: const [
            // 舊快照：整串在 name、description 為空。
            CharacterFeature(name: '矮人堅毅 +1HP/級', source: '種族：矮人'),
          ],
        ),
      );

      expect(find.textContaining('矮人堅毅 +1HP/級'), findsOneWidget);
      expect(find.byIcon(Icons.info_outline), findsNothing);

      // 點下去不應開出任何彈窗。
      await tester.tap(find.textContaining('矮人堅毅 +1HP/級'));
      await tester.pumpAndSettle();
      expect(find.byType(AlertDialog), findsNothing);
    });
  });

  group('工具熟練的呈現', () {
    testWidgets('熟練自成區段，與特長分開', (tester) async {
      await _pumpBiography(
        tester,
        _char(
          features: const [],
          tools: const ['盜賊工具'],
          languages: const ['通用語'],
        ),
      );
      // 熟練有自己的區段標題（CollapsibleSection 拆成 EN／CN 兩個 Text）
      expect(find.text('PROFICIENCIES'), findsOneWidget);
      expect(find.text('熟練'), findsOneWidget);
      expect(find.text('工具'), findsOneWidget);
      expect(find.text('盜賊工具'), findsOneWidget);
      expect(find.text('語言'), findsOneWidget);
      // 特長區段仍在，且不再包含熟練。
      // 註：標題含 '&'，不在 CollapsibleSection 的中英拆分字元集內，
      // 因此整串為單一 Text（'PROFICIENCIES 熟練' 則會被拆成兩段）。
      expect(find.text('FEATURES & TRAITS 特長'), findsOneWidget);
    });

    testWidgets('無工具時整列不渲染（既有角色的降級路徑）', (tester) async {
      await _pumpBiography(
        tester,
        _char(features: const [], languages: const ['通用語']),
      );
      expect(find.text('工具'), findsNothing);
      expect(find.text('語言'), findsOneWidget); // 語言仍在，區段照常顯示
    });

    testWidgets('語言與工具皆空時，熟練區段整個不渲染', (tester) async {
      await _pumpBiography(tester, _char(features: const []));
      expect(find.text('PROFICIENCIES'), findsNothing);
    });
  });
}
