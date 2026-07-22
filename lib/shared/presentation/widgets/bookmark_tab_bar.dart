import 'package:flutter/material.dart';

import '../../../app/theme/app_colors.dart';
import '../../../app/theme/surface_colors.dart';
import '../app_destinations.dart';

class BookmarkTabBar extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onTap;

  const BookmarkTabBar({
    super.key,
    required this.currentIndex,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final surfaces = Theme.of(context).extension<SurfaceColors>()!;
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            surfaces.surface0.withValues(alpha: 0),
            surfaces.surface0.withValues(alpha: 1),
            surfaces.surface0,
          ],
          stops: const [0.0, 0.4, 1.0],
        ),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 20),
          child: Container(
            height: 60,
            decoration: BoxDecoration(
              color: surfaces.surface1.withValues(alpha: 0.8),
              borderRadius: BorderRadius.circular(30),
              border: Border.all(color: surfaces.border, width: 1),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x80000000),
                  blurRadius: 16,
                  offset: Offset(0, 4),
                ),
              ],
            ),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            child: Row(
              children: List.generate(appDestinations.length, (i) {
                final selected = i == currentIndex;
                final item = appDestinations[i];
                return Expanded(
                  child: GestureDetector(
                    behavior: HitTestBehavior.opaque,
                    onTap: () => onTap(i),
                    child: _FloatingTab(
                      icon: item.icon,
                      label: item.label,
                      selected: selected,
                    ),
                  ),
                );
              }),
            ),
          ),
        ),
      ),
    );
  }
}

class _FloatingTab extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool selected;

  const _FloatingTab({
    required this.icon,
    required this.label,
    required this.selected,
  });

  @override
  Widget build(BuildContext context) {
    final surfaces = Theme.of(context).extension<SurfaceColors>()!;
    final color = selected ? AppColors.accentGold : surfaces.textSecondary;

    return Container(
      height: 48,
      decoration: selected
          ? BoxDecoration(
              color: const Color(0x66876E2A),
              borderRadius: BorderRadius.circular(22),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x40C9A84C),
                  blurRadius: 8,
                  offset: Offset(0, 2),
                ),
              ],
            )
          : null,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(height: 2),
          Text(
            label,
            style: TextStyle(
              fontFamily: 'NotoSerifTC',
              fontSize: 10,
              fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}
