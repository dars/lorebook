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
    final tab = switch (_index) {
      0 => OverviewTab(character: character),
      1 => AbilitiesTab(character: character),
      2 => SpellsTab(character: character),
      3 => InventoryTab(character: character),
      _ => BiographyTab(character: character),
    };

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        CharacterTabBar(
          tabs: _tabs,
          currentIndex: _index,
          onChanged: (i) => setState(() => _index = i),
        ),
        Expanded(child: tab),
      ],
    );
  }

  Widget _twoColumn() {
    final character = ref.watch(currentCharacterProvider);
    final detail = switch (_detailIndex) {
      0 => AbilitiesTab(character: character),
      1 => SpellsTab(character: character),
      2 => InventoryTab(character: character),
      _ => BiographyTab(character: character),
    };

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
                onChanged: (i) => setState(() => _detailIndex = i),
              ),
              Expanded(child: detail),
            ],
          ),
        ),
      ],
    );
  }
}
