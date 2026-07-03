import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/theme/app_colors.dart';
import 'widgets/character_avatar.dart';
import '../../app/theme/app_spacing.dart';
import '../../features/character/domain/character_providers.dart';

class CharacterHeader extends ConsumerWidget {
  const CharacterHeader({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final character = ref.watch(currentCharacterProvider);

    return Container(
      decoration: BoxDecoration(color: AppColors.darkSurface0),
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
                vertical: AppSpacing.sm,
              ),
              child: Row(
                children: [
                  CharacterAvatar(
                    character: character,
                    size: 36,
                    borderColor: AppColors.accentGold,
                    borderWidth: 1.5,
                    initialStyle: TextStyle(
                      fontFamily: 'Cinzel',
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: AppColors.darkTextPrimary,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          character.name,
                          style: TextStyle(
                            fontFamily: 'Cinzel',
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: AppColors.darkTextPrimary,
                          ),
                        ),
                        Text(
                          '${character.species} · ${character.className} ${character.level}',
                          style: TextStyle(
                            fontFamily: 'NotoSerifTC',
                            fontSize: 11,
                            color: AppColors.darkTextSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Column(
                    children: [
                      Text(
                        'LEVEL',
                        style: TextStyle(
                          fontFamily: 'Inter',
                          fontSize: 9,
                          fontWeight: FontWeight.w600,
                          letterSpacing: 1,
                          color: AppColors.darkTextSecondary,
                        ),
                      ),
                      Text(
                        '${character.level}',
                        style: TextStyle(
                          fontFamily: 'Cinzel',
                          fontSize: 28,
                          fontWeight: FontWeight.w700,
                          color: AppColors.darkTextPrimary,
                        ),
                      ),
                    ],
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
