import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:lorebook/features/catalog/data/catalog_repository.dart';
import 'package:lorebook/features/catalog/domain/catalog_models.dart';
import 'package:lorebook/features/character/domain/character.dart';
import 'package:lorebook/features/character/domain/character_math.dart';
import 'package:lorebook/features/character/domain/character_providers.dart';
import 'package:lorebook/features/character/presentation/character_level_up_page.dart';

AbilityScore _as(int score) =>
    AbilityScore(score: score, modifier: abilityModifier(score));

Character _char({
  required String className,
  required String classNameEn,
  required int level,
  int hitDie = 10,
  String spellAbility = '',
}) => Character(
  id: 't1',
  name: '測試者',
  species: '人類',
  className: className,
  classNameEn: classNameEn,
  level: level,
  maxHp: 30,
  currentHp: 20,
  proficiencyBonus: proficiencyBonusFor(level),
  spellcastingAbility: spellAbility,
  hitDieFaces: hitDie,
  abilityScores: AbilityScores(
    str: _as(16),
    dex: _as(14),
    con: _as(14),
    int_: _as(10),
    wis: _as(12),
    cha: _as(8),
  ),
  skills: const [
    Skill(name: '體能', abilityType: 'STR', modifier: 5, proficient: true),
  ],
  spellSlots: spellAbility.isEmpty
      ? const []
      : const [SpellSlots(level: 1, total: 3, used: 1)],
);

const _fighterCatalog = [
  CatalogClass(id: 'c-fighter', name: '戰士', engName: 'Fighter', source: 'XPHB'),
];

Future<void> _pumpLevelUpPage(
  WidgetTester tester,
  ProviderContainer container,
) async {
  final router = GoRouter(
    initialLocation: '/character-level-up',
    routes: [
      GoRoute(
        path: '/character-level-up',
        builder: (_, _) => const CharacterLevelUpPage(),
      ),
      GoRoute(
        path: '/main/character',
        builder: (_, _) => const Scaffold(body: Text('character-page')),
      ),
    ],
  );
  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: container,
      child: MaterialApp.router(routerConfig: router),
    ),
  );
  await tester.pumpAndSettle();
}

ProviderContainer _container({
  required Character character,
  required List<Override> overrides,
}) {
  final container = ProviderContainer(
    overrides: [
      selectedCharacterIdProvider.overrideWith((ref) => character.id),
      ...overrides,
    ],
  );
  container.read(characterListProvider.notifier).replaceAll([character]);
  return container;
}

void main() {
  testWidgets('最短流程：無事件等級只有生命值與確認（特性空清單自動跳過）', (tester) async {
    final container = _container(
      character: _char(className: '戰士', classNameEn: 'Fighter', level: 12),
      overrides: [
        classCatalogProvider.overrideWith((ref) async => _fighterCatalog),
        classFeatureCatalogProvider.overrideWith(
          (ref, id) async => const <CatalogClassFeature>[],
        ),
      ],
    );
    addTearDown(container.dispose);
    await _pumpLevelUpPage(tester, container);

    expect(find.text('步驟 1 / 3 · 生命值'), findsOneWidget);
    expect(find.text('30 → 38'), findsOneWidget); // d10 平均 6 + 體質 +2

    await tester.tap(find.text('下一步'));
    await tester.pumpAndSettle();
    expect(find.text('步驟 3 / 3 · 確認'), findsOneWidget, reason: '特性步驟被跳過');

    await tester.tap(find.text('完成升級'));
    await tester.pumpAndSettle();

    expect(find.text('character-page'), findsOneWidget);
    final next = container.read(currentCharacterProvider);
    expect(next.level, 13);
    expect(next.maxHp, 38);
    expect(next.currentHp, 28);
    expect(next.proficiencyBonus, 5);
  });

  testWidgets('法師 Lv2→3 離線：子職/特性/法術可跳過，法術位仍依本地表更新', (tester) async {
    final container = _container(
      character: _char(
        className: '法師',
        classNameEn: 'Wizard',
        level: 2,
        hitDie: 6,
        spellAbility: 'INT',
      ),
      overrides: [
        classCatalogProvider.overrideWith(
          (ref) async => throw Exception('offline'),
        ),
        spellCatalogProvider.overrideWith(
          (ref, q) async => throw Exception('offline'),
        ),
      ],
    );
    addTearDown(container.dispose);
    await _pumpLevelUpPage(tester, container);

    expect(find.text('步驟 1 / 5 · 生命值'), findsOneWidget);
    await tester.tap(find.text('下一步'));
    await tester.pumpAndSettle();

    expect(find.text('步驟 2 / 5 · 子職'), findsOneWidget);
    expect(find.text('內容庫離線'), findsOneWidget);
    await tester.tap(find.text('下一步'));
    await tester.pumpAndSettle();

    expect(find.text('步驟 3 / 5 · 特性'), findsOneWidget);
    expect(find.text('內容庫離線'), findsOneWidget);
    await tester.tap(find.text('下一步'));
    await tester.pumpAndSettle();

    expect(find.text('步驟 4 / 5 · 法術'), findsOneWidget);
    expect(find.text('內容庫離線'), findsOneWidget);
    await tester.tap(find.text('下一步'));
    await tester.pumpAndSettle();

    expect(find.text('步驟 5 / 5 · 確認'), findsOneWidget);
    await tester.tap(find.text('完成升級'));
    await tester.pumpAndSettle();

    final next = container.read(currentCharacterProvider);
    expect(next.level, 3);
    expect(next.subclass, isEmpty, reason: '離線跳過子職');
    final slots = {for (final s in next.spellSlots) s.level: s};
    expect(slots[1]!.total, 4);
    expect(slots[1]!.used, 1, reason: '已用法術位保留');
    expect(slots[2]!.total, 2);
  });

  testWidgets('戰士 Lv3→4 ASI：+2 單屬性指派後完成', (tester) async {
    final container = _container(
      character: _char(className: '戰士', classNameEn: 'Fighter', level: 3),
      overrides: [
        classCatalogProvider.overrideWith((ref) async => _fighterCatalog),
        classFeatureCatalogProvider.overrideWith(
          (ref, id) async => const <CatalogClassFeature>[],
        ),
      ],
    );
    addTearDown(container.dispose);
    await _pumpLevelUpPage(tester, container);

    await tester.tap(find.text('下一步'));
    await tester.pumpAndSettle();
    expect(find.text('步驟 2 / 4 · 能力值'), findsOneWidget);

    // 未指派前不可續行。
    final nextBtn = tester.widget<FilledButton>(
      find.widgetWithText(FilledButton, '下一步'),
    );
    expect(nextBtn.onPressed, isNull);

    await tester.tap(find.text('力量 STR'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('下一步'));
    await tester.pumpAndSettle();
    expect(find.text('步驟 4 / 4 · 確認'), findsOneWidget, reason: '特性空清單跳過');

    await tester.tap(find.text('完成升級'));
    await tester.pumpAndSettle();

    final next = container.read(currentCharacterProvider);
    expect(next.level, 4);
    expect(next.abilityScores.str.score, 18);
    final athletics = next.skills.firstWhere((s) => s.name == '體能');
    expect(athletics.modifier, 4 + 2, reason: 'STR +4、熟練 +2');
  });
}
