import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../app/theme/app_colors.dart';
import '../../../../app/theme/app_spacing.dart';
import '../../../../app/theme/decorations.dart';
import '../../../../features/character/domain/character_providers.dart';
import '../../../../shared/presentation/widgets/crystal_slot.dart';

class ResourcesSection extends ConsumerWidget {
  const ResourcesSection({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final character = ref.watch(currentCharacterProvider);

    if (character.spellSlots.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        AppSpacing.sectionSpacing,
        const SectionTitle(title: 'RESOURCES 資源'),
        Card(
          child: Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: 14,
              vertical: 10,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text('法術位', style: TextStyle(
                      fontFamily: 'NotoSerifTC',
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppColors.accentGold,
                    )),
                    const SizedBox(width: 8),
                    Text('Spell Slots', style: TextStyle(
                      fontFamily: 'Inter',
                      fontSize: 10,
                      color: AppColors.darkTextSecondary,
                    )),
                  ],
                ),
                const SizedBox(height: 10),
                ...character.spellSlots.asMap().entries.map((entry) {
                  final slot = entry.value;
                  final isLast = entry.key == character.spellSlots.length - 1;
                  return Padding(
                    padding: EdgeInsets.only(bottom: isLast ? 0 : AppSpacing.sm),
                    child: CrystalSlotRow(
                      level: slot.level,
                      total: slot.total,
                      used: slot.used,
                    ),
                  );
                }),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
