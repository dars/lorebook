import 'package:flutter/material.dart';

import '../../../../app/theme/app_colors.dart';
import '../../../../app/theme/app_spacing.dart';
import '../../../../app/theme/decorations.dart';
import '../../domain/character.dart';

class BiographyTab extends StatelessWidget {
  final Character character;

  const BiographyTab({super.key, required this.character});

  @override
  Widget build(BuildContext context) {
    final p = character.personality;
    return SingleChildScrollView(
      padding: EdgeInsets.fromLTRB(
          AppSpacing.lg, 0, AppSpacing.lg, context.bottomNavClearance),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CollapsibleSection(
            title: 'ABOUT 其人其事',
            child: _About(character: character),
          ),
          CollapsibleSection(
            title: 'PERSONALITY 性格',
            child: ParchmentCard(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.lg,
                vertical: AppSpacing.sm,
              ),
              child: Column(
                children: [
                  if (p.traits.isNotEmpty)
                    _TraitRow(label: '特質', value: p.traits),
                  if (p.ideals.isNotEmpty)
                    _TraitRow(label: '理念', value: p.ideals),
                  if (p.bonds.isNotEmpty)
                    _TraitRow(label: '羈絆', value: p.bonds),
                  if (p.flaws.isNotEmpty)
                    _TraitRow(label: '缺陷', value: p.flaws),
                ],
              ),
            ),
          ),
          CollapsibleSection(
            title: 'FEATURES & TRAITS 特長',
            child: _Features(
              features: character.features,
              languages: character.languages,
            ),
          ),
        ],
      ),
    );
  }
}

class _About extends StatelessWidget {
  final Character character;
  const _About({required this.character});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final hasStory = character.backstory.isNotEmpty;

    return ParchmentCard(
      padding: const EdgeInsets.all(AppSpacing.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (hasStory) ...[
            Text(
              '「${character.backstory}」',
              style: TextStyle(
                fontFamily: 'NotoSerifTC',
                fontSize: 15,
                height: 1.7,
                fontStyle: FontStyle.italic,
                color: theme.colorScheme.onSurface.withValues(alpha: 0.9),
              ),
            ),
            const SizedBox(height: AppSpacing.md),
          ],
          if (character.personalityTags.isNotEmpty)
            Wrap(
              spacing: AppSpacing.sm,
              runSpacing: AppSpacing.sm,
              children: [
                for (final tag in character.personalityTags)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.md,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(AppSpacing.lg),
                      border: Border.all(color: theme.colorScheme.outline),
                    ),
                    child: Text(
                      tag,
                      style: TextStyle(
                        fontFamily: 'NotoSerifTC',
                        fontSize: 13,
                        color: theme.colorScheme.onSurface
                            .withValues(alpha: 0.8),
                      ),
                    ),
                  ),
              ],
            ),
        ],
      ),
    );
  }
}

class _TraitRow extends StatelessWidget {
  final String label;
  final String value;
  const _TraitRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 40,
            child: Text(
              label,
              style: const TextStyle(
                fontFamily: 'NotoSerifTC',
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: AppColors.goldDim,
              ),
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Text(
              value,
              style: TextStyle(
                fontFamily: 'NotoSerifTC',
                fontSize: 14,
                height: 1.5,
                color: theme.colorScheme.onSurface,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Features extends StatelessWidget {
  final List<CharacterFeature> features;
  final List<String> languages;
  const _Features({required this.features, required this.languages});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ParchmentCard(
      padding: const EdgeInsets.all(AppSpacing.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (var i = 0; i < features.length; i++) ...[
            if (i > 0) const SizedBox(height: AppSpacing.lg),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Icon(Icons.circle, size: 6, color: AppColors.goldDim),
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text.rich(
                        TextSpan(children: [
                          TextSpan(
                            text: features[i].name,
                            style: TextStyle(
                              fontFamily: 'NotoSerifTC',
                              fontSize: 15,
                              fontWeight: FontWeight.w600,
                              color: theme.colorScheme.onSurface,
                            ),
                          ),
                          TextSpan(
                            text: '  ${features[i].nameEn}',
                            style: TextStyle(
                              fontFamily: 'Inter',
                              fontSize: 11,
                              color: theme.colorScheme.onSurface
                                  .withValues(alpha: 0.45),
                            ),
                          ),
                        ]),
                      ),
                      if (features[i].description.isNotEmpty) ...[
                        const SizedBox(height: 3),
                        Text(
                          features[i].description,
                          style: TextStyle(
                            fontFamily: 'NotoSerifTC',
                            fontSize: 12,
                            height: 1.5,
                            color: theme.colorScheme.onSurface
                                .withValues(alpha: 0.6),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ],
          if (languages.isNotEmpty) ...[
            Padding(
              padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
              child: Divider(color: theme.colorScheme.outline, height: 1),
            ),
            Row(
              children: [
                SizedBox(
                  width: 40,
                  child: Text(
                    '語言',
                    style: const TextStyle(
                      fontFamily: 'NotoSerifTC',
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: AppColors.goldDim,
                    ),
                  ),
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: Text(
                    languages.join(' · '),
                    style: TextStyle(
                      fontFamily: 'NotoSerifTC',
                      fontSize: 13,
                      color: theme.colorScheme.onSurface,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
