import 'package:flutter/material.dart';

import '../../../../app/theme/app_colors.dart';
import '../../../../app/theme/app_spacing.dart';
import '../../../../app/theme/decorations.dart';

class RestSection extends StatelessWidget {
  const RestSection({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        AppSpacing.sectionSpacing,
        const SectionTitle(title: 'REST 休息'),
        Row(
          children: [
            Expanded(
              child: _RestButton(
                icon: Icons.free_breakfast,
                label: '短休',
                subtitle: '恢復 Hit Dice',
                onTap: () {},
              ),
            ),
            const SizedBox(width: AppSpacing.sm),
            Expanded(
              child: _RestButton(
                icon: Icons.nights_stay,
                label: '長休',
                subtitle: '完全恢復',
                onTap: () {},
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _RestButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final String subtitle;
  final VoidCallback onTap;

  const _RestButton({
    required this.icon,
    required this.label,
    required this.subtitle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppSpacing.radiusCard),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 12),
          child: Column(
            children: [
              Icon(icon, size: 22, color: AppColors.accentGold),
              const SizedBox(height: 6),
              Text(
                label,
                style: TextStyle(
                  fontFamily: 'NotoSerifTC',
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: AppColors.darkTextPrimary,
                ),
              ),
              Text(subtitle, style: TextStyle(
                fontFamily: 'NotoSerifTC',
                fontSize: 10,
                color: AppColors.darkTextSecondary,
              )),
            ],
          ),
        ),
      ),
    );
  }
}
