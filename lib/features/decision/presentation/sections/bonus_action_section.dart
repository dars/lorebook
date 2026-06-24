import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../app/theme/app_colors.dart';
import '../../../../app/theme/app_spacing.dart';
import '../../../../app/theme/decorations.dart';
import '../../../../app/theme/dnd_colors.dart';
import '../../../../features/character/domain/character_providers.dart';
import '../../../../features/character/presentation/widgets/spell_entry.dart';
import '../../../../shared/presentation/widgets/ability_card.dart';

class BonusActionSection extends ConsumerWidget {
  const BonusActionSection({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final character = ref.watch(currentCharacterProvider);
    final dnd = Theme.of(context).extension<DndColors>()!;

    final bonusSpells = character.spells.where(
      (s) => s.castingTime.contains('bonus') || s.castingTime.contains('附贈'),
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        AppSpacing.sectionSpacing,
        const SectionTitle(title: 'BONUS ACTION 附贈動作'),
        if (bonusSpells.isNotEmpty)
          ...bonusSpells.map((spell) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: spellEntryCard(
                  spell,
                  badge: '贈',
                  dnd: dnd,
                  emphasize: true,
                ),
              ))
        else
          AbilityCard(
            badgeText: '贈',
            badgeColor: AppColors.darkTextSecondary,
            badgeFill: AppColors.darkSurface1,
            badgeStroke: AppColors.darkBorder2,
            nameCN: '無附贈動作',
            nameEN: 'No Bonus Actions',
            showChevron: false,
            cardStroke: AppColors.darkBorder2,
          ),
      ],
    );
  }
}
