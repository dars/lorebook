import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../app/theme/app_colors.dart';
import '../../../../app/theme/app_spacing.dart';
import '../../../../app/theme/decorations.dart';
import '../../../../features/character/domain/character_providers.dart';

class MovementSection extends ConsumerWidget {
  const MovementSection({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final character = ref.watch(currentCharacterProvider);

    final speedNum = int.tryParse(
      character.speed.replaceAll(RegExp(r'[^0-9]'), ''),
    ) ?? 30;
    final dashNum = speedNum * 2;
    final speedSquares = speedNum ~/ 5;
    final dashSquares = dashNum ~/ 5;

    return CollapsibleSection(
      title: 'MOVEMENT 移動',
      child: Row(
          children: [
            Expanded(
              child: _MovementCard(
                icon: Icons.directions_walk,
                label: '速度 Speed',
                value: speedNum,
                squares: speedSquares,
              ),
            ),
            const SizedBox(width: AppSpacing.sm),
            Expanded(
              child: _MovementCard(
                icon: Icons.flash_on,
                label: '衝刺 Dash',
                value: dashNum,
                squares: dashSquares,
              ),
            ),
          ],
        ),
    );
  }
}

class _MovementCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final int value;
  final int squares;

  const _MovementCard({
    required this.icon,
    required this.label,
    required this.value,
    required this.squares,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 90,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(AppSpacing.radiusCard),
        gradient: const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFF2E2010), Color(0xFF241808)],
        ),
        border: Border.all(color: AppColors.darkBorder, width: 1),
      ),
      child: Row(
        children: [
          Icon(icon, size: 28, color: AppColors.darkTextSecondary),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(label, style: TextStyle(
                fontFamily: 'NotoSerifTC',
                fontSize: 10,
                color: AppColors.darkTextLight,
              )),
              const SizedBox(height: 2),
              Row(
                crossAxisAlignment: CrossAxisAlignment.baseline,
                textBaseline: TextBaseline.alphabetic,
                children: [
                  Text(
                    '$value',
                    style: TextStyle(
                      fontFamily: 'Cinzel',
                      fontSize: 24,
                      fontWeight: FontWeight.w700,
                      color: AppColors.darkTextPrimary,
                    ),
                  ),
                  const SizedBox(width: 4),
                  Text('FT', style: TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppColors.darkTextSecondary,
                  )),
                ],
              ),
              Text('$squares 格', style: TextStyle(
                fontFamily: 'NotoSerifTC',
                fontSize: 10,
                color: AppColors.darkTextSecondary,
              )),
            ],
          ),
        ],
      ),
    );
  }
}
