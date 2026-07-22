import 'package:flutter/material.dart';

import '../../app/theme/app_colors.dart';
import '../../app/theme/app_spacing.dart';
import '../../app/theme/surface_colors.dart';

/// 全域 / 系統頁使用的輕量標題列（例如「設定」）。
///
/// 沿用 [CharacterHeader] 的視覺框架（金色細線 + 深色底），但不綁定角色，
/// 只顯示頁面標題。
class PageHeader extends StatelessWidget {
  final String title;
  final String? subtitle;

  const PageHeader({super.key, required this.title, this.subtitle});

  @override
  Widget build(BuildContext context) {
    final surfaces = Theme.of(context).extension<SurfaceColors>()!;
    return Container(
      color: surfaces.surface0,
      child: SafeArea(
        bottom: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              height: 1,
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    Color(0x00C9A84C),
                    Color(0x80C9A84C),
                    Color(0x00C9A84C),
                  ],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: 20,
                vertical: AppSpacing.md,
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          title,
                          style: TextStyle(
                            fontFamily: 'Cinzel',
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                            color: surfaces.textPrimary,
                          ),
                        ),
                        if (subtitle != null)
                          Text(
                            subtitle!,
                            style: const TextStyle(
                              fontFamily: 'Inter',
                              fontSize: 10,
                              letterSpacing: 2,
                              color: AppColors.sectionLabel,
                            ),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
