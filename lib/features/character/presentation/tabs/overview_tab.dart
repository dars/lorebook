import 'package:flutter/material.dart';

import '../../../../app/theme/app_colors.dart';
import '../../../../app/theme/app_spacing.dart';
import '../../../../app/theme/decorations.dart';
import '../../domain/character.dart';
import '../widgets/info_field.dart';

class OverviewTab extends StatelessWidget {
  final Character character;

  const OverviewTab({super.key, required this.character});

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
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _Hero(character: character),
          const SizedBox(height: AppSpacing.lg),
          _InfoGrid(character: character),
          const SizedBox(height: AppSpacing.lg),
          _StatCards(character: character),
        ],
      ),
    );
  }
}

class _Hero extends StatelessWidget {
  final Character character;
  const _Hero({required this.character});

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(AppSpacing.radiusCharacterHeader),
      child: Container(
        height: 340,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              Color(0xFF2A2438),
              Color(0xFF1C1A2A),
              Color(0xFF14110C),
            ],
          ),
        ),
        child: Stack(
          fit: StackFit.expand,
          children: [
            // 立繪佔位浮水印
            Center(
              child: Icon(
                Icons.auto_awesome,
                size: 120,
                color: AppColors.accentGold.withValues(alpha: 0.06),
              ),
            ),
            // 底部漸層加深，確保文字可讀
            const DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.center,
                  end: Alignment.bottomCenter,
                  colors: [Color(0x00000000), Color(0xCC000000)],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(AppSpacing.xl),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.end,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${character.className} ${character.classNameEn.toUpperCase()} · ${character.subclass}',
                    style: const TextStyle(
                      fontFamily: 'NotoSerifTC',
                      fontSize: 13,
                      letterSpacing: 2,
                      color: AppColors.accentGold,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    character.name,
                    style: const TextStyle(
                      fontFamily: 'NotoSerifTC',
                      fontSize: 44,
                      fontWeight: FontWeight.w700,
                      height: 1.05,
                      color: Colors.white,
                    ),
                  ),
                  Text(
                    character.nameEn.toUpperCase(),
                    style: TextStyle(
                      fontFamily: 'Cinzel',
                      fontSize: 16,
                      letterSpacing: 8,
                      color: Colors.white.withValues(alpha: 0.7),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    '${character.background} · ${character.alignment} · ${character.deity}信徒',
                    style: TextStyle(
                      fontFamily: 'NotoSerifTC',
                      fontSize: 14,
                      color: Colors.white.withValues(alpha: 0.85),
                    ),
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

class _InfoGrid extends StatelessWidget {
  final Character character;
  const _InfoGrid({required this.character});

  @override
  Widget build(BuildContext context) {
    final rows = <List<InfoField>>[
      [
        InfoField(
          label: 'SPECIES · 物種',
          value: character.species,
          valueEn: character.speciesEn,
        ),
        InfoField(
          label: 'TYPE · 生物類型',
          value: character.creatureType,
        ),
      ],
      [
        InfoField(label: 'SIZE · 體型', value: character.size),
        InfoField(
          label: 'ALIGNMENT · 陣營',
          value: character.alignment,
          valueEn: character.alignmentEn,
        ),
      ],
      [
        InfoField(
          label: 'DEITY · 信仰',
          value: character.deity,
          valueEn: character.deityEn,
        ),
        InfoField(
          label: 'BACKGROUND · 背景',
          value: character.background,
          valueEn: character.backgroundEn,
        ),
      ],
    ];

    final divider = Theme.of(context).colorScheme.outline;

    return ParchmentCard(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.xl,
        vertical: AppSpacing.sm,
      ),
      child: Column(
        children: [
          for (var i = 0; i < rows.length; i++) ...[
            if (i > 0) Divider(color: divider, height: 1),
            Padding(
              padding: const EdgeInsets.symmetric(vertical: AppSpacing.lg),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(child: rows[i][0]),
                  const SizedBox(width: AppSpacing.lg),
                  Expanded(child: rows[i][1]),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _StatCards extends StatelessWidget {
  final Character character;
  const _StatCards({required this.character});

  @override
  Widget build(BuildContext context) {
    final speedNum = character.speed.replaceAll(RegExp(r'[^0-9]'), '');
    final stats = [
      _StatData('SPEED', speedNum, '呎 速度'),
      _StatData(
        'PROF',
        character.proficiencyBonus >= 0
            ? '+${character.proficiencyBonus}'
            : '${character.proficiencyBonus}',
        '熟練加值',
      ),
      _StatData('PERC', '${character.passivePerception}', '被動察覺'),
      _StatData('DC', '${character.spellDc}', '法術 DC'),
    ];

    return Row(
      children: [
        for (var i = 0; i < stats.length; i++) ...[
          if (i > 0) const SizedBox(width: AppSpacing.sm),
          Expanded(child: _StatCard(data: stats[i])),
        ],
      ],
    );
  }
}

class _StatData {
  final String label;
  final String value;
  final String sub;
  const _StatData(this.label, this.value, this.sub);
}

class _StatCard extends StatelessWidget {
  final _StatData data;
  const _StatCard({required this.data});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ParchmentCard(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
      child: Column(
        children: [
          Text(
            data.label,
            style: const TextStyle(
              fontFamily: 'Inter',
              fontSize: 9,
              letterSpacing: 1.5,
              color: AppColors.sectionLabel,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            data.value,
            style: TextStyle(
              fontFamily: 'Cinzel',
              fontSize: 24,
              fontWeight: FontWeight.w700,
              color: theme.colorScheme.onSurface,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            data.sub,
            style: TextStyle(
              fontFamily: 'NotoSerifTC',
              fontSize: 10,
              color: theme.colorScheme.onSurface.withValues(alpha: 0.55),
            ),
          ),
        ],
      ),
    );
  }
}
