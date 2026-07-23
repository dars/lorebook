import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lorebook/app/theme/app_theme.dart';
import 'package:lorebook/features/character/domain/character.dart';
import 'package:lorebook/features/character/domain/character_math.dart';
import 'package:lorebook/features/character/domain/character_providers.dart';
import 'package:lorebook/features/decision/presentation/sections/status_section.dart';

AbilityScore _as(int score) =>
    AbilityScore(score: score, modifier: abilityModifier(score));

Character _char({int tempHp = 0}) => Character(
  id: 't1',
  name: '測試者',
  species: '人類',
  className: '法師',
  classNameEn: 'Wizard',
  level: 1,
  maxHp: 17,
  currentHp: 14,
  tempHp: tempHp,
  proficiencyBonus: 2,
  hitDieFaces: 6,
  abilityScores: AbilityScores(
    str: _as(10),
    dex: _as(14),
    con: _as(14),
    int_: _as(16),
    wis: _as(12),
    cha: _as(8),
  ),
);

Future<ProviderContainer> _pump(
  WidgetTester tester,
  Character character,
) async {
  final container = ProviderContainer(
    overrides: [
      selectedCharacterIdProvider.overrideWith((ref) => character.id),
    ],
  );
  container.read(characterListProvider.notifier).replaceAll([character]);
  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: container,
      child: MaterialApp(
        theme: AppTheme.dark,
        home: const Scaffold(
          body: SingleChildScrollView(child: StatusSection()),
        ),
      ),
    ),
  );
  await tester.pumpAndSettle();
  return container;
}

void main() {
  testWidgets('臨時 HP 歸零：顯示「＋臨時」幽靈 chip', (tester) async {
    final container = await _pump(tester, _char());
    addTearDown(container.dispose);

    expect(find.text('＋臨時'), findsOneWidget);
    expect(find.text('臨時'), findsNothing);
  });

  testWidgets('臨時 HP 有值：顯示「+N 臨時」chip', (tester) async {
    final container = await _pump(tester, _char(tempHp: 5));
    addTearDown(container.dispose);

    expect(find.text('+5'), findsOneWidget);
    expect(find.text('臨時'), findsOneWidget);
    expect(find.text('＋臨時'), findsNothing);
  });

  testWidgets('按 − 傷害先吃臨時：本體不動、chip 減 1', (tester) async {
    final container = await _pump(tester, _char(tempHp: 2));
    addTearDown(container.dispose);

    await tester.tap(find.byKey(const Key('hp-minus')));
    await tester.pumpAndSettle();

    expect(find.text('14'), findsOneWidget); // 本體 HP 不變
    expect(find.text('+1'), findsOneWidget);

    // 臨時耗盡後再扣，才進本體並回到幽靈 chip
    await tester.tap(find.byKey(const Key('hp-minus')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('hp-minus')));
    await tester.pumpAndSettle();

    expect(find.text('13'), findsOneWidget);
    expect(find.text('＋臨時'), findsOneWidget);
  });
}
