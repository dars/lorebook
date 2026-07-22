import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/theme/app_spacing.dart';
import '../../../shared/presentation/responsive_layout.dart';
import '../domain/character_providers.dart';
import 'tabs/abilities_tab.dart';
import 'tabs/biography_tab.dart';
import 'tabs/inventory_tab.dart';
import 'tabs/overview_tab.dart';
import 'tabs/spells_tab.dart';
import 'widgets/character_tab_bar.dart';

/// 角色頁。排列依寬度級距切換（見 CLAUDE.md 版型適配原則）：
/// compact/medium 五 tab 單欄（medium 置中限寬）；expanded（iPad 橫向）
/// 總覽常駐左欄、右欄為其餘四 tab 的分頁區。
class CharacterPage extends ConsumerStatefulWidget {
  const CharacterPage({super.key});

  @override
  ConsumerState<CharacterPage> createState() => _CharacterPageState();
}

class _CharacterPageState extends ConsumerState<CharacterPage> {
  static const _tabs = ['總覽', '屬性', '法術', '物品', '傳記'];

  /// expanded 右欄的四 tab（總覽常駐左欄）。
  static const _detailTabs = ['屬性', '法術', '物品', '傳記'];

  int _index = 0;
  int _detailIndex = 0;
  late final PageController _pageController = PageController(
    initialPage: _index,
  );
  late final PageController _detailPageController = PageController(
    initialPage: _detailIndex,
  );

  @override
  void dispose() {
    _pageController.dispose();
    _detailPageController.dispose();
    super.dispose();
  }

  void _animateTo(PageController controller, int i) {
    controller.animateToPage(
      i,
      duration: const Duration(milliseconds: 250),
      curve: Curves.easeOutCubic,
    );
  }

  @override
  Widget build(BuildContext context) {
    return ResponsiveLayout(
      mobile: _tabbedColumn(),
      tablet: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 700),
          child: _tabbedColumn(),
        ),
      ),
      expanded: _twoColumn(),
    );
  }

  Widget _tabbedColumn() {
    final character = ref.watch(currentCharacterProvider);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        CharacterTabBar(
          tabs: _tabs,
          currentIndex: _index,
          onChanged: (i) => _animateTo(_pageController, i),
        ),
        Expanded(
          child: PageView(
            controller: _pageController,
            onPageChanged: (i) => setState(() => _index = i),
            children: [
              OverviewTab(character: character),
              AbilitiesTab(character: character),
              SpellsTab(character: character),
              InventoryTab(character: character),
              BiographyTab(character: character),
            ],
          ),
        ),
      ],
    );
  }

  Widget _twoColumn() {
    final character = ref.watch(currentCharacterProvider);

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // 左欄：總覽常駐（跑團高頻查閱）。
        Expanded(flex: 2, child: OverviewTab(character: character)),
        const SizedBox(width: AppSpacing.lg),
        // 右欄：其餘四 tab 分頁區。
        Expanded(
          flex: 3,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              CharacterTabBar(
                tabs: _detailTabs,
                currentIndex: _detailIndex,
                onChanged: (i) => _animateTo(_detailPageController, i),
              ),
              Expanded(
                child: PageView(
                  controller: _detailPageController,
                  onPageChanged: (i) => setState(() => _detailIndex = i),
                  children: [
                    AbilitiesTab(character: character),
                    SpellsTab(character: character),
                    InventoryTab(character: character),
                    BiographyTab(character: character),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
