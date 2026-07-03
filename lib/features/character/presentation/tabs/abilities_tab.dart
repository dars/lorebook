import 'package:flutter/material.dart';

import '../../../../app/theme/app_colors.dart';
import '../../../../app/theme/app_spacing.dart';
import '../../../../app/theme/decorations.dart';
import '../../domain/character.dart';
import '../widgets/ability_shield.dart';

/// 六大能力的顯示順序與中文名。
const _abilityOrder = [
  ('STR', '力量'),
  ('DEX', '敏捷'),
  ('CON', '體魄'),
  ('INT', '智力'),
  ('WIS', '感知'),
  ('CHA', '魅力'),
];

class AbilitiesTab extends StatelessWidget {
  final Character character;

  const AbilitiesTab({super.key, required this.character});

  AbilityScore _scoreFor(String code) {
    final a = character.abilityScores;
    return switch (code) {
      'STR' => a.str,
      'DEX' => a.dex,
      'CON' => a.con,
      'INT' => a.int_,
      'WIS' => a.wis,
      'CHA' => a.cha,
      _ => a.str,
    };
  }

  @override
  Widget build(BuildContext context) {
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
            title: 'ABILITIES 屬性',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _abilityRow(['STR', 'DEX', 'CON']),
                const SizedBox(height: AppSpacing.sm),
                _abilityRow(['INT', 'WIS', 'CHA']),
              ],
            ),
          ),
          CollapsibleSection(
            title: 'SAVING THROWS 豁免',
            child: _SavingThrows(character: character),
          ),
          CollapsibleSection(
            title: 'SKILLS 技能',
            child: _SkillsByAbility(character: character),
          ),
        ],
      ),
    );
  }

  Widget _abilityRow(List<String> codes) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (var i = 0; i < codes.length; i++) ...[
          if (i > 0) const SizedBox(width: AppSpacing.sm),
          Expanded(child: _buildShield(codes[i])),
        ],
      ],
    );
  }

  Widget _buildShield(String code) {
    final cn = _abilityOrder.firstWhere((e) => e.$1 == code).$2;
    final s = _scoreFor(code);
    return AbilityShield(
      nameCn: cn,
      nameEn: code,
      modifier: s.modifier,
      score: s.score,
      highlighted: code == character.spellcastingAbility,
    );
  }
}

class _SavingThrows extends StatelessWidget {
  final Character character;
  const _SavingThrows({required this.character});

  AbilityScore _scoreFor(String code) {
    final a = character.abilityScores;
    return switch (code) {
      'STR' => a.str,
      'DEX' => a.dex,
      'CON' => a.con,
      'INT' => a.int_,
      'WIS' => a.wis,
      'CHA' => a.cha,
      _ => a.str,
    };
  }

  @override
  Widget build(BuildContext context) {
    final pb = character.proficiencyBonus;
    final entries = _abilityOrder.map((e) {
      final s = _scoreFor(e.$1);
      final save = s.modifier + (s.proficientSave ? pb : 0);
      return (e.$2, save, s.proficientSave);
    }).toList();

    final rows = <Widget>[];
    for (var i = 0; i < entries.length; i += 2) {
      rows.add(
        Padding(
          padding: const EdgeInsets.only(bottom: AppSpacing.sm),
          child: Row(
            children: [
              Expanded(child: _SaveCell(data: entries[i])),
              const SizedBox(width: AppSpacing.sm),
              Expanded(child: _SaveCell(data: entries[i + 1])),
            ],
          ),
        ),
      );
    }
    return Column(children: rows);
  }
}

class _SaveCell extends StatelessWidget {
  final (String, int, bool) data;
  const _SaveCell({required this.data});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final (cn, save, prof) = data;
    final modText = save >= 0 ? '+$save' : '$save';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: AppColors.darkSurface1,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(
          color: prof ? AppColors.accentGold : theme.colorScheme.outline,
          width: 1,
        ),
      ),
      child: Row(
        children: [
          Icon(
            prof ? Icons.check_circle : Icons.circle_outlined,
            size: 11,
            color: prof
                ? AppColors.accentGold
                : theme.colorScheme.onSurface.withValues(alpha: 0.3),
          ),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Text(
              '$cn豁免',
              style: TextStyle(
                fontFamily: 'NotoSerifTC',
                fontSize: 13,
                fontWeight: prof ? FontWeight.w600 : FontWeight.w400,
                color: theme.colorScheme.onSurface,
              ),
            ),
          ),
          Text(
            modText,
            style: TextStyle(
              fontFamily: 'Cinzel',
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: prof
                  ? AppColors.accentGold
                  : theme.colorScheme.onSurface.withValues(alpha: 0.6),
            ),
          ),
        ],
      ),
    );
  }
}

class _SkillsByAbility extends StatelessWidget {
  final Character character;
  const _SkillsByAbility({required this.character});

  @override
  Widget build(BuildContext context) {
    // 依能力分組，保留 _abilityOrder 的順序。
    final groups = <String, List<Skill>>{};
    for (final (code, _) in _abilityOrder) {
      final list = character.skills
          .where((s) => s.abilityType == code)
          .toList();
      if (list.isNotEmpty) groups[code] = list;
    }

    return Column(
      children: [
        for (final entry in groups.entries) ...[
          _SkillGroup(
            code: entry.key,
            cn: _abilityOrder.firstWhere((e) => e.$1 == entry.key).$2,
            character: character,
            skills: entry.value,
          ),
          const SizedBox(height: AppSpacing.md),
        ],
      ],
    );
  }
}

class _SkillGroup extends StatelessWidget {
  final String code;
  final String cn;
  final Character character;
  final List<Skill> skills;

  const _SkillGroup({
    required this.code,
    required this.cn,
    required this.character,
    required this.skills,
  });

  int _abilityMod() {
    final a = character.abilityScores;
    return switch (code) {
      'STR' => a.str.modifier,
      'DEX' => a.dex.modifier,
      'CON' => a.con.modifier,
      'INT' => a.int_.modifier,
      'WIS' => a.wis.modifier,
      'CHA' => a.cha.modifier,
      _ => 0,
    };
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final mod = _abilityMod();
    final modText = mod >= 0 ? '+$mod' : '$mod';

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // 左側小能力標
        SizedBox(
          width: 56,
          child: Column(
            children: [
              Text(
                cn,
                style: TextStyle(
                  fontFamily: 'NotoSerifTC',
                  fontSize: 12,
                  color: theme.colorScheme.onSurface.withValues(alpha: 0.7),
                ),
              ),
              Text(
                modText,
                style: TextStyle(
                  fontFamily: 'Cinzel',
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: theme.colorScheme.onSurface,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: AppSpacing.sm),
        Expanded(
          child: Column(
            children: [for (final skill in skills) _SkillRow(skill: skill)],
          ),
        ),
      ],
    );
  }
}

class _SkillRow extends StatelessWidget {
  final Skill skill;
  const _SkillRow({required this.skill});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final modText = skill.modifier >= 0
        ? '+${skill.modifier}'
        : '${skill.modifier}';
    final accent = skill.proficient
        ? AppColors.accentGold
        : theme.colorScheme.onSurface.withValues(alpha: 0.3);

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        children: [
          Icon(
            skill.proficient ? Icons.circle : Icons.circle_outlined,
            size: 9,
            color: accent,
          ),
          const SizedBox(width: AppSpacing.sm),
          Text(
            skill.name,
            style: TextStyle(
              fontFamily: 'NotoSerifTC',
              fontSize: 14,
              fontWeight: skill.proficient ? FontWeight.w600 : FontWeight.w400,
              color: theme.colorScheme.onSurface,
            ),
          ),
          const SizedBox(width: 6),
          Expanded(
            child: Text(
              skill.nameEn,
              style: TextStyle(
                fontFamily: 'Inter',
                fontSize: 11,
                color: theme.colorScheme.onSurface.withValues(alpha: 0.4),
              ),
            ),
          ),
          Text(
            modText,
            style: TextStyle(
              fontFamily: 'Cinzel',
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: skill.proficient
                  ? AppColors.accentGold
                  : theme.colorScheme.onSurface.withValues(alpha: 0.6),
            ),
          ),
        ],
      ),
    );
  }
}
