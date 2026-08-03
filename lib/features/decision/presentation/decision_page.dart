import 'package:flutter/material.dart';

import '../../../app/theme/app_spacing.dart';
import '../../../features/character/domain/character.dart';
import '../../../features/character/presentation/read_only_scope.dart';
import '../../../shared/presentation/responsive_layout.dart';
import 'sections/status_section.dart';
import 'sections/resources_section.dart';
import 'sections/movement_section.dart';
import 'sections/actions_section.dart';
import 'sections/checks_section.dart';
import 'sections/rest_section.dart';

/// 行動頁。排列依寬度級距切換（見 CLAUDE.md 版型適配原則）：
/// compact/medium 單欄（medium 置中限寬）、expanded 三欄
/// （designs.pen「行動 iPad」）。內容皆為同一批 section，僅重新分配。
class DecisionPage extends StatelessWidget {
  /// 指定角色時以其呈現（分享檢視頁）；null 則為當前角色。
  final Character? character;

  const DecisionPage({super.key, this.character});

  @override
  Widget build(BuildContext context) {
    return ResponsiveLayout(
      mobile: _singleColumn(context, bottomClearance: true),
      tablet: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 600),
          child: _singleColumn(context, bottomClearance: false),
        ),
      ),
      expanded: _ThreeColumnLayout(character: character),
    );
  }

  Widget _singleColumn(BuildContext context, {required bool bottomClearance}) {
    // 休息是主人自己的操作（消生命骰、重置資源），唯讀檢視不呈現。
    final readOnly = ReadOnlyScope.of(context);
    return SingleChildScrollView(
      padding: AppSpacing.pagePadding,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          StatusSection(character: character),
          ResourcesSection(character: character),
          MovementSection(character: character),
          ActionsSection(character: character),
          ChecksSection(character: character),
          if (!readOnly) const RestSection(),
          SizedBox(
            height: bottomClearance
                ? context.bottomNavClearance
                : AppSpacing.xl,
          ),
        ],
      ),
    );
  }
}

/// expanded（iPad 橫向）三欄：欄 1 狀態/資源/移動/休息、欄 2 動作、
/// 欄 3 附贈/反應/檢定；各欄獨立捲動。
class _ThreeColumnLayout extends StatelessWidget {
  final Character? character;

  const _ThreeColumnLayout({this.character});

  @override
  Widget build(BuildContext context) {
    final readOnly = ReadOnlyScope.of(context);
    Widget col(List<Widget> children) => Expanded(
      child: SingleChildScrollView(
        padding: const EdgeInsets.only(bottom: AppSpacing.xl),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: children,
        ),
      ),
    );

    return Padding(
      padding: AppSpacing.pagePadding,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          col([
            StatusSection(character: character),
            ResourcesSection(character: character),
            MovementSection(character: character),
            if (!readOnly) const RestSection(),
          ]),
          const SizedBox(width: AppSpacing.lg),
          col([
            ActionsSection(
              showBonus: false,
              showReaction: false,
              character: character,
            ),
          ]),
          const SizedBox(width: AppSpacing.lg),
          col([
            ActionsSection(showAction: false, character: character),
            ChecksSection(character: character),
          ]),
        ],
      ),
    );
  }
}
