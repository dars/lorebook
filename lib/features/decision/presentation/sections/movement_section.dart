import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../app/theme/app_colors.dart';
import '../../../../app/theme/decorations.dart';
import '../../../../features/character/domain/character_providers.dart';

class MovementSection extends ConsumerWidget {
  const MovementSection({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final character = ref.watch(currentCharacterProvider);

    final speedNum = int.tryParse(
          character.speed.replaceAll(RegExp(r'[^0-9]'), ''),
        ) ??
        30;
    final dashNum = speedNum * 2;

    return CollapsibleSection(
      title: 'MOVEMENT 移動',
      child: Padding(
        padding: const EdgeInsets.only(top: 2, bottom: 4),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            _MovementStat(
              icon: Icons.directions_walk,
              label: '速度',
              value: speedNum,
              squares: speedNum ~/ 5,
            ),
            _MovementStat(
              icon: Icons.flash_on,
              label: '衝刺',
              value: dashNum,
              squares: dashNum ~/ 5,
              dim: true,
            ),
          ],
        ),
      ),
    );
  }
}

/// 單列 inline 移動數值：icon + 中文 + 數值 ft + 「N格」小字。
class _MovementStat extends StatelessWidget {
  final IconData icon;
  final String label;
  final int value;
  final int squares;
  final bool dim;

  const _MovementStat({
    required this.icon,
    required this.label,
    required this.value,
    required this.squares,
    this.dim = false,
  });

  @override
  Widget build(BuildContext context) {
    final numColor = dim ? AppColors.darkTextSecondary : AppColors.darkTextPrimary;
    return Row(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Icon(icon,
            size: 16,
            color: dim ? AppColors.darkTextSecondary : AppColors.accentGold),
        const SizedBox(width: 6),
        Text(label,
            style: TextStyle(
              fontFamily: 'NotoSerifTC',
              fontSize: 11,
              color: AppColors.darkTextLight,
            )),
        const SizedBox(width: 5),
        Text('$value',
            style: TextStyle(
              fontFamily: 'Cinzel',
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: numColor,
            )),
        const SizedBox(width: 2),
        Text('FT',
            style: TextStyle(
              fontFamily: 'Inter',
              fontSize: 9,
              fontWeight: FontWeight.w600,
              color: AppColors.darkTextSecondary,
            )),
        const SizedBox(width: 5),
        Text('· $squares 格',
            style: TextStyle(
              fontFamily: 'NotoSerifTC',
              fontSize: 10,
              color: AppColors.sectionLabel,
            )),
      ],
    );
  }
}
