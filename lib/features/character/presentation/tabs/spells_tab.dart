import 'package:flutter/material.dart';

import '../../../../app/theme/app_colors.dart';
import '../../../../app/theme/app_spacing.dart';
import '../../../../app/theme/decorations.dart';
import '../../../../app/theme/dnd_colors.dart';
import '../../domain/character.dart';
import '../widgets/spell_entry.dart';

class SpellsTab extends StatelessWidget {
  final Character character;

  const SpellsTab({super.key, required this.character});

  @override
  Widget build(BuildContext context) {
    final dnd = Theme.of(context).extension<DndColors>()!;

    return SingleChildScrollView(
      padding: EdgeInsets.fromLTRB(
        AppSpacing.lg,
        0,
        AppSpacing.lg,
        context.bottomNavClearance,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CollapsibleSection(
            title: 'SPELLCASTING 施法',
            child: _SpellcastingCard(character: character),
          ),
          CollapsibleSection(
            title: 'CANTRIPS 戲法',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                for (final c in character.cantrips)
                  Padding(
                    padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                    child: spellEntryCard(c, badge: '戲', dnd: dnd),
                  ),
              ],
            ),
          ),
          CollapsibleSection(
            title: 'SPELLBOOK 已備法術',
            child: _Spellbook(spells: character.spells, dnd: dnd),
          ),
        ],
      ),
    );
  }
}

class _SpellcastingCard extends StatelessWidget {
  final Character character;
  const _SpellcastingCard({required this.character});

  String _abilityCn(String code) => switch (code) {
    'INT' => '智力',
    'WIS' => '感知',
    'CHA' => '魅力',
    _ => code,
  };

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final divider = theme.colorScheme.outline;
    final slotText = character.spellSlots
        .map((s) => '${s.level}環 ×${s.total}')
        .join('   ');

    return ParchmentCard(
      padding: const EdgeInsets.all(AppSpacing.lg),
      child: Column(
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Expanded(
                child: _StatCol(
                  label: 'ABILITY',
                  value: _abilityCn(character.spellcastingAbility),
                  sub: '施法屬性 ${character.spellcastingAbility}',
                ),
              ),
              Container(width: 1, height: 56, color: divider),
              Expanded(
                child: _StatCol(
                  label: 'SAVE DC',
                  value: '${character.spellDc}',
                  sub: '法術豁免',
                ),
              ),
              Container(width: 1, height: 56, color: divider),
              Expanded(
                child: _StatCol(
                  label: 'ATTACK',
                  value: character.spellAttack >= 0
                      ? '+${character.spellAttack}'
                      : '${character.spellAttack}',
                  sub: '法術命中',
                ),
              ),
            ],
          ),
          Padding(
            padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
            child: Divider(color: divider, height: 1),
          ),
          Row(
            children: [
              Text(
                '每日法術位上限',
                style: TextStyle(
                  fontFamily: 'NotoSerifTC',
                  fontSize: 13,
                  color: theme.colorScheme.onSurface.withValues(alpha: 0.75),
                ),
              ),
              const Spacer(),
              Text(
                slotText,
                style: TextStyle(
                  fontFamily: 'Cinzel',
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: theme.colorScheme.onSurface,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Align(
            alignment: Alignment.centerRight,
            child: Text(
              '即時消耗於「行動」頁追蹤',
              style: TextStyle(
                fontFamily: 'NotoSerifTC',
                fontSize: 11,
                fontStyle: FontStyle.italic,
                color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _StatCol extends StatelessWidget {
  final String label;
  final String value;
  final String sub;
  const _StatCol({required this.label, required this.value, required this.sub});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      children: [
        Text(
          label,
          style: const TextStyle(
            fontFamily: 'Inter',
            fontSize: 9,
            letterSpacing: 1.5,
            color: AppColors.sectionLabel,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          value,
          style: TextStyle(
            fontFamily: 'Cinzel',
            fontSize: 26,
            fontWeight: FontWeight.w700,
            color: theme.colorScheme.onSurface,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          sub,
          style: TextStyle(
            fontFamily: 'NotoSerifTC',
            fontSize: 10,
            color: theme.colorScheme.onSurface.withValues(alpha: 0.55),
          ),
        ),
      ],
    );
  }
}

class _Spellbook extends StatelessWidget {
  final List<Spell> spells;
  final DndColors dnd;
  const _Spellbook({required this.spells, required this.dnd});

  static const _levelCn = {
    1: '1環  First Level',
    2: '2環  Second Level',
    3: '3環  Third Level',
    4: '4環  Fourth Level',
    5: '5環  Fifth Level',
    6: '6環  Sixth Level',
    7: '7環  Seventh Level',
    8: '8環  Eighth Level',
    9: '9環  Ninth Level',
  };

  @override
  Widget build(BuildContext context) {
    final levels = spells.map((s) => s.level).toSet().toList()..sort();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (final level in levels) ...[
          Padding(
            padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
            child: _LevelLabel(text: _levelCn[level] ?? '$level環'),
          ),
          for (final spell in spells.where((s) => s.level == level))
            Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.sm),
              child: spellEntryCard(
                spell,
                badge: '$level',
                dnd: dnd,
                emphasize: true,
              ),
            ),
        ],
      ],
    );
  }
}

class _LevelLabel extends StatelessWidget {
  final String text;
  const _LevelLabel({required this.text});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: 3,
      ),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(AppSpacing.xs),
        border: Border.all(color: theme.colorScheme.outline),
      ),
      child: Text(
        text,
        style: TextStyle(
          fontFamily: 'NotoSerifTC',
          fontSize: 12,
          color: theme.colorScheme.onSurface.withValues(alpha: 0.7),
        ),
      ),
    );
  }
}
