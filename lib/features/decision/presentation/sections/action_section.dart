import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../app/theme/app_colors.dart';
import '../../../../app/theme/app_spacing.dart';
import '../../../../app/theme/decorations.dart';
import '../../../../app/theme/dnd_colors.dart';
import '../../../../features/character/domain/character_providers.dart';
import '../../../../features/character/presentation/widgets/spell_entry.dart';
import '../../../../shared/presentation/widgets/ability_card.dart';

class ActionSection extends ConsumerWidget {
  const ActionSection({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final character = ref.watch(currentCharacterProvider);
    final dnd = Theme.of(context).extension<DndColors>()!;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        AppSpacing.sectionSpacing,
        const SectionTitle(title: 'ACTION 動作'),

        // Sub: Attack
        const SubSectionHeader(
          icon: Icons.sports_martial_arts,
          labelCN: '攻擊',
          labelEN: 'Attack',
        ),
        const SizedBox(height: 8),

        // Weapon cards
        ...character.weapons.map((weapon) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: weaponEntryCard(weapon, dnd: dnd),
            )),

        // Sub: Spellcasting
        const SubSectionHeader(
          icon: Icons.auto_awesome,
          labelCN: '施法',
          labelEN: 'Spellcasting',
        ),
        const SizedBox(height: 8),

        // Cantrips group
        if (character.cantrips.isNotEmpty) ...[
          Padding(
            padding: const EdgeInsets.only(left: 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      '戲法',
                      style: TextStyle(
                        fontFamily: 'NotoSerifTC',
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: AppColors.darkTextSecondary,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      'Cantrips',
                      style: TextStyle(
                        fontFamily: 'Inter',
                        fontSize: 10,
                        color: AppColors.darkTextSecondary.withValues(alpha: 0.6),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                ...character.cantrips.map((spell) => Padding(
                      padding: const EdgeInsets.only(bottom: 6),
                      child: spellEntryCard(spell, badge: '戲', dnd: dnd),
                    )),
              ],
            ),
          ),
        ],

        // Spells group
        if (character.spells
            .where((s) => s.level > 0 && s.prepared && s.castingTime == '1 action')
            .isNotEmpty) ...[
          Padding(
            padding: const EdgeInsets.only(left: 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      '已備法術',
                      style: TextStyle(
                        fontFamily: 'NotoSerifTC',
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: AppColors.darkTextSecondary,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      'Prepared Spells',
                      style: TextStyle(
                        fontFamily: 'Inter',
                        fontSize: 10,
                        color: AppColors.darkTextSecondary.withValues(alpha: 0.6),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                _buildRingLabel(1),
                const SizedBox(height: 4),
                ...character.spells
                    .where((s) => s.level == 1 && s.prepared)
                    .map((spell) => Padding(
                          padding: const EdgeInsets.only(bottom: 6),
                          child: spellEntryCard(
                            spell,
                            badge: '${spell.level}',
                            dnd: dnd,
                            emphasize: true,
                          ),
                        )),
              ],
            ),
          ),
        ],

        // Sub: Other Actions
        const SubSectionHeader(
          icon: Icons.more_horiz,
          labelCN: '其他',
          labelEN: 'Other Actions',
        ),
        const SizedBox(height: 8),

        AbilityCard(
          badgeText: '其',
          badgeColor: AppColors.darkTextSecondary,
          badgeFill: AppColors.darkSurface1,
          badgeStroke: AppColors.darkBorder2,
          nameCN: '衝刺',
          nameEN: 'Dash',
          range: '—',
          effect: '×2 移動',
          effectColor: AppColors.darkTextLight,
          showChevron: false,
          cardStroke: AppColors.darkBorder2,
        ),
        const SizedBox(height: 8),

        AbilityCard(
          badgeText: '其',
          badgeColor: AppColors.darkTextSecondary,
          badgeFill: AppColors.darkSurface1,
          badgeStroke: AppColors.darkBorder2,
          nameCN: '撤退',
          nameEN: 'Disengage',
          range: '—',
          effect: '無借位',
          effectColor: AppColors.darkTextLight,
          showChevron: false,
          cardStroke: AppColors.darkBorder2,
        ),
        const SizedBox(height: 8),

        AbilityCard(
          badgeText: '其',
          badgeColor: AppColors.darkTextSecondary,
          badgeFill: AppColors.darkSurface1,
          badgeStroke: AppColors.darkBorder2,
          nameCN: '協助',
          nameEN: 'Help',
          range: '→ 5 FT',
          effect: '優勢',
          effectColor: const Color(0xFF7BC99E),
          showChevron: false,
          cardStroke: AppColors.darkBorder2,
        ),
      ],
    );
  }

  Widget _buildRingLabel(int level) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(4),
            border: Border.all(color: AppColors.goldDim, width: 1),
          ),
          child: Text(
            '$level環',
            style: TextStyle(
              fontFamily: 'NotoSerifTC',
              fontSize: 10,
              fontWeight: FontWeight.w600,
              color: AppColors.accentGold,
            ),
          ),
        ),
        const SizedBox(width: 8),
        Text(
          'Level $level',
          style: TextStyle(
            fontFamily: 'Inter',
            fontSize: 10,
            color: AppColors.darkTextSecondary.withValues(alpha: 0.5),
          ),
        ),
      ],
    );
  }

}
