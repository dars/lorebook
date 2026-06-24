import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../app/theme/app_colors.dart';
import '../../../../app/theme/app_spacing.dart';
import '../../../../app/theme/decorations.dart';
import '../../../../features/character/domain/character_providers.dart';
import '../../../../shared/presentation/widgets/ability_card.dart';
import '../../../../shared/presentation/widgets/entry_card.dart';

class ReactionSection extends ConsumerWidget {
  const ReactionSection({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final character = ref.watch(currentCharacterProvider);

    final shieldSpell = character.spells.where(
      (s) => s.nameEn == 'Shield',
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        AppSpacing.sectionSpacing,
        const SectionTitle(title: 'REACTION 反應'),
        if (shieldSpell.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: EntryCard(
              badge: '盾',
              title: shieldSpell.first.name,
              subtitle: shieldSpell.first.nameEn,
              meta: '自身',
              metaArrow: true,
              value: 'AC +5',
              valueColor: AppColors.accentGold,
              description: shieldSpell.first.description,
              footnote: shieldSpell.first.upgrade.isNotEmpty
                  ? shieldSpell.first.upgrade
                  : null,
              emphasizeBadge: true,
            ),
          ),
        AbilityCard(
          badgeText: '反',
          badgeColor: AppColors.darkTextSecondary,
          badgeFill: AppColors.darkSurface1,
          badgeStroke: AppColors.darkBorder,
          nameCN: '機會攻擊',
          nameEN: 'Opportunity Attack',
          range: '→ 5 FT',
          effect: '1次攻擊',
          effectColor: AppColors.darkTextLight,
          showChevron: false,
          cardStroke: AppColors.darkBorder,
        ),
      ],
    );
  }
}
