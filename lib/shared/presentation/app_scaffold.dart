import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'app_destinations.dart';
import 'character_header.dart';
import 'page_header.dart';
import 'responsive_layout.dart';
import 'widgets/bookmark_tab_bar.dart';

class AppScaffold extends StatelessWidget {
  final Widget child;

  const AppScaffold({super.key, required this.child});

  int _currentIndex(BuildContext context) {
    final location = GoRouterState.of(context).matchedLocation;
    final idx = appDestinations.indexWhere((d) => location.startsWith(d.path));
    return idx >= 0 ? idx : 0;
  }

  @override
  Widget build(BuildContext context) {
    final index = _currentIndex(context);
    final destination = appDestinations[index];

    // 角色情境頁顯示角色頭；全域 / 系統頁顯示純標題頁首。
    // LEVEL 徽章僅在角色頁可點擊觸發升級（其他頁純顯示，避免誤觸）。
    final header = destination.characterScoped
        ? CharacterHeader(levelUpEnabled: destination.path == '/main/character')
        : PageHeader(title: destination.label);

    return ResponsiveLayout(
      mobile: Scaffold(
        extendBody: true,
        body: Column(
          children: [
            header,
            Expanded(child: child),
          ],
        ),
        bottomNavigationBar: BookmarkTabBar(
          currentIndex: index,
          onTap: (i) => context.go(appDestinations[i].path),
        ),
      ),
      tablet: Scaffold(
        body: Row(
          children: [
            NavigationRail(
              selectedIndex: index,
              onDestinationSelected: (i) => context.go(appDestinations[i].path),
              labelType: NavigationRailLabelType.all,
              destinations: [
                for (final d in appDestinations)
                  NavigationRailDestination(
                    icon: Icon(d.icon),
                    label: Text(d.label),
                  ),
              ],
            ),
            const VerticalDivider(thickness: 0.5, width: 0.5),
            Expanded(
              child: Column(
                children: [
                  header,
                  Expanded(child: child),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
