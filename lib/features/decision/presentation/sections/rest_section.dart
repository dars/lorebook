import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../app/theme/app_colors.dart';
import '../../../../app/theme/app_spacing.dart';
import '../../../../app/theme/decorations.dart';
import '../../../../features/character/domain/character_providers.dart';

class RestSection extends ConsumerWidget {
  const RestSection({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
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
                subtitle: '恢復短休資源',
                onTap: () {
                  ref.read(currentCharacterProvider.notifier).shortRest();
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('短休：短休資源已回復'),
                      duration: Duration(seconds: 2),
                    ),
                  );
                },
              ),
            ),
            const SizedBox(width: AppSpacing.sm),
            Expanded(
              child: _RestButton(
                icon: Icons.nights_stay,
                label: '長休',
                subtitle: '完全恢復',
                // 長休：回滿職業資源 + 清空臨時 HP（HP/法術位完整恢復屬 rest-flow 後續）。
                onTap: () {
                  ref.read(currentCharacterProvider.notifier).longRest();
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('長休：資源回滿、臨時 HP 已清空'),
                      duration: Duration(seconds: 2),
                    ),
                  );
                },
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
