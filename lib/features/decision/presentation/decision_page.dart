import 'package:flutter/material.dart';

import '../../../app/theme/app_spacing.dart';
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
  const DecisionPage({super.key});

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
      expanded: const _ThreeColumnLayout(),
    );
  }

  Widget _singleColumn(BuildContext context, {required bool bottomClearance}) {
    return SingleChildScrollView(
      padding: AppSpacing.pagePadding,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const StatusSection(),
          const ResourcesSection(),
          const MovementSection(),
          const ActionsSection(),
          const ChecksSection(),
          const RestSection(),
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
  const _ThreeColumnLayout();

  @override
  Widget build(BuildContext context) {
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
          col(const [
            StatusSection(),
            ResourcesSection(),
            MovementSection(),
            RestSection(),
          ]),
          const SizedBox(width: AppSpacing.lg),
          col(const [ActionsSection(showBonus: false, showReaction: false)]),
          const SizedBox(width: AppSpacing.lg),
          col(const [ActionsSection(showAction: false), ChecksSection()]),
        ],
      ),
    );
  }
}
