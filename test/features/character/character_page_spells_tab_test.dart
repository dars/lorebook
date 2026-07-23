import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lorebook/app/theme/app_theme.dart';
import 'package:lorebook/features/character/domain/character.dart';
import 'package:lorebook/features/character/domain/character_providers.dart';
import 'package:lorebook/features/character/presentation/character_page.dart';

AbilityScore _as(int score) =>
    AbilityScore(score: score, modifier: (score - 10) ~/ 2);

Character _char({
  String classNameEn = 'Barbarian',
  String spellAbility = '',
  List<SpellSlots> slots = const [],
}) => Character(
  id: 'c1',
  name: '測試者',
  className: classNameEn == 'Barbarian' ? '野蠻人' : '法師',
  classNameEn: classNameEn,
  level: 5,
  maxHp: 40,
  currentHp: 40,
  spellcastingAbility: spellAbility,
  spellSlots: slots,
  abilityScores: AbilityScores(
    str: _as(16),
    dex: _as(14),
    con: _as(14),
    int_: _as(10),
    wis: _as(12),
    cha: _as(8),
  ),
);

Future<ProviderContainer> _pump(WidgetTester tester, Character c) async {
  final container = ProviderContainer(
    overrides: [selectedCharacterIdProvider.overrideWith((ref) => c.id)],
  );
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
  return container;
}

void main() {
  testWidgets('非施法職業（野蠻人）隱藏法術 tab', (tester) async {
    tester.view.physicalSize = const Size(1170, 2532);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);

    final container = await _pump(tester, _char());
    addTearDown(container.dispose);

    expect(find.text('法術'), findsNothing);
    expect(find.text('總覽'), findsOneWidget);
    expect(find.text('物品'), findsOneWidget);
  });

  testWidgets('施法職業顯示法術 tab', (tester) async {
    tester.view.physicalSize = const Size(1170, 2532);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);

    final container = await _pump(
      tester,
      _char(
        classNameEn: 'Wizard',
        spellAbility: 'INT',
        slots: const [SpellSlots(level: 1, total: 4)],
      ),
    );
    addTearDown(container.dispose);

    expect(find.text('法術'), findsOneWidget);
  });

  testWidgets('無施法屬性但有手動法術位者仍顯示法術 tab', (tester) async {
    tester.view.physicalSize = const Size(1170, 2532);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);

    final container = await _pump(
      tester,
      _char(slots: const [SpellSlots(level: 1, total: 1)]),
    );
    addTearDown(container.dispose);

    expect(find.text('法術'), findsOneWidget);
  });
}
