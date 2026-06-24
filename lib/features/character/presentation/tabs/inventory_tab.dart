import 'package:flutter/material.dart';

import '../../../../app/theme/app_colors.dart';
import '../../../../app/theme/app_spacing.dart';
import '../../../../app/theme/decorations.dart';
import '../../../../app/theme/dnd_colors.dart';
import '../../domain/character.dart';
import '../widgets/spell_entry.dart';

class InventoryTab extends StatelessWidget {
  final Character character;

  const InventoryTab({super.key, required this.character});

  @override
  Widget build(BuildContext context) {
    final dnd = Theme.of(context).extension<DndColors>()!;

    return SingleChildScrollView(
      padding: EdgeInsets.fromLTRB(
          AppSpacing.lg, 0, AppSpacing.lg, context.bottomNavClearance),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SectionTitle(title: 'TREASURY 財富'),
          _Treasury(currency: character.currency),
          const SectionTitle(title: 'EQUIPMENT 裝備'),
          if (character.weapons.isNotEmpty) ...[
            const _SubLabel(icon: Icons.gavel, text: '武器 WEAPONS'),
            const SizedBox(height: AppSpacing.sm),
            for (final w in character.weapons)
              Padding(
                padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                child: weaponEntryCard(w, dnd: dnd),
              ),
            const SizedBox(height: AppSpacing.md),
          ],
          const _SubLabel(icon: Icons.backpack_outlined, text: '裝備 GEAR'),
          const SizedBox(height: AppSpacing.sm),
          ...character.equipment.map((e) => _EquipmentRow(item: e)),
        ],
      ),
    );
  }
}

class _Treasury extends StatelessWidget {
  final Currency currency;
  const _Treasury({required this.currency});

  @override
  Widget build(BuildContext context) {
    final coins = [
      ('PP', currency.pp, const Color(0xFFD8D8E0)),
      ('GP', currency.gp, const Color(0xFFD4AF37)),
      ('EP', currency.ep, const Color(0xFFB9A96B)),
      ('SP', currency.sp, const Color(0xFFB8BCC2)),
      ('CP', currency.cp, const Color(0xFFB87333)),
    ];

    return ParchmentCard(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.lg),
      child: Row(
        children: [
          for (final (label, amount, color) in coins)
            Expanded(child: _Coin(label: label, amount: amount, color: color)),
        ],
      ),
    );
  }
}

class _Coin extends StatelessWidget {
  final String label;
  final int amount;
  final Color color;
  const _Coin({required this.label, required this.amount, required this.color});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      children: [
        Container(
          width: 30,
          height: 30,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: color.withValues(alpha: 0.85),
            border: Border.all(color: color, width: 1.5),
          ),
        ),
        const SizedBox(height: 6),
        Text(
          '$amount',
          style: TextStyle(
            fontFamily: 'Cinzel',
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: theme.colorScheme.onSurface,
          ),
        ),
        Text(
          label,
          style: const TextStyle(
            fontFamily: 'Inter',
            fontSize: 10,
            letterSpacing: 1,
            color: AppColors.sectionLabel,
          ),
        ),
      ],
    );
  }
}

class _SubLabel extends StatelessWidget {
  final IconData icon;
  final String text;
  const _SubLabel({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 14, color: AppColors.sectionLabel),
        const SizedBox(width: 6),
        Text(
          text,
          style: const TextStyle(
            fontFamily: 'Inter',
            fontSize: 11,
            fontWeight: FontWeight.w700,
            letterSpacing: 1.5,
            color: AppColors.sectionLabel,
          ),
        ),
      ],
    );
  }
}

class _EquipmentRow extends StatelessWidget {
  final Equipment item;
  const _EquipmentRow({required this.item});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: ParchmentCard(
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Row(
          children: [
            Icon(
              Icons.inventory_2_outlined,
              size: 18,
              color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text.rich(
                    TextSpan(children: [
                      TextSpan(
                        text: item.name,
                        style: TextStyle(
                          fontFamily: 'NotoSerifTC',
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: theme.colorScheme.onSurface,
                        ),
                      ),
                      TextSpan(
                        text: '  ${item.nameEn}',
                        style: TextStyle(
                          fontFamily: 'Inter',
                          fontSize: 11,
                          color:
                              theme.colorScheme.onSurface.withValues(alpha: 0.45),
                        ),
                      ),
                    ]),
                  ),
                  if (item.description.isNotEmpty) ...[
                    const SizedBox(height: 2),
                    Text(
                      item.description,
                      style: TextStyle(
                        fontFamily: 'NotoSerifTC',
                        fontSize: 11,
                        color:
                            theme.colorScheme.onSurface.withValues(alpha: 0.5),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            if (item.equipped)
              const Icon(Icons.check, size: 16, color: AppColors.success),
          ],
        ),
      ),
    );
  }
}
