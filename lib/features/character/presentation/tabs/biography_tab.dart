import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../app/theme/app_colors.dart';
import '../../../../app/theme/app_spacing.dart';
import '../../../../app/theme/decorations.dart';
import '../../../../app/theme/surface_colors.dart';
import '../../domain/character.dart';
import '../../domain/character_providers.dart';
import '../../domain/derived_stats.dart';
import '../widgets/editor_sheet.dart';

class BiographyTab extends ConsumerWidget {
  final Character character;

  const BiographyTab({super.key, required this.character});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = character.personality;
    final hasPersonality =
        p.traits.isNotEmpty ||
        p.ideals.isNotEmpty ||
        p.bonds.isNotEmpty ||
        p.flaws.isNotEmpty;

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
            title: 'ABOUT 其人其事',
            trailing: SectionEditIcon(
              onTap: () => _showAboutEditor(context, character),
            ),
            child: _About(character: character),
          ),
          CollapsibleSection(
            title: 'PERSONALITY 性格',
            trailing: SectionEditIcon(
              onTap: () => _showPersonalityEditor(context, p),
            ),
            child: ParchmentCard(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.lg,
                vertical: AppSpacing.sm,
              ),
              child: hasPersonality
                  ? Column(
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
                    )
                  : const _EmptyHint(text: '尚未描述性格，點右上角編輯'),
            ),
          ),
          CollapsibleSection(
            title: 'FEATURES & TRAITS 特長',
            child: _Features(character: character),
          ),
        ],
      ),
    );
  }
}

class _EmptyHint extends StatelessWidget {
  final String text;
  const _EmptyHint({required this.text});

  @override
  Widget build(BuildContext context) {
    final surfaces = Theme.of(context).extension<SurfaceColors>()!;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
      child: Text(
        text,
        style: TextStyle(
          fontFamily: 'NotoSerifTC',
          fontSize: 12,
          color: surfaces.textSecondary,
        ),
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
    final empty = !hasStory && character.personalityTags.isEmpty;

    return ParchmentCard(
      padding: const EdgeInsets.all(AppSpacing.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (empty) const _EmptyHint(text: '尚未撰寫背景故事，點右上角編輯'),
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
                        color: theme.colorScheme.onSurface.withValues(
                          alpha: 0.8,
                        ),
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

// ─────────────────────────────────────────── 編輯 sheet

void _showAboutEditor(BuildContext context, Character character) {
  showModalBottomSheet<void>(
    context: context,
    useRootNavigator: true,
    isScrollControlled: true,
    backgroundColor: Theme.of(context).extension<SurfaceColors>()!.surface1,
    showDragHandle: true,
    builder: (context) => _AboutEditorSheet(
      backstory: character.backstory,
      tags: character.personalityTags,
    ),
  );
}

void _showPersonalityEditor(BuildContext context, Personality personality) {
  showModalBottomSheet<void>(
    context: context,
    useRootNavigator: true,
    isScrollControlled: true,
    backgroundColor: Theme.of(context).extension<SurfaceColors>()!.surface1,
    showDragHandle: true,
    builder: (context) => _PersonalityEditorSheet(personality: personality),
  );
}

class _AboutEditorSheet extends ConsumerStatefulWidget {
  final String backstory;
  final List<String> tags;
  const _AboutEditorSheet({required this.backstory, required this.tags});

  @override
  ConsumerState<_AboutEditorSheet> createState() => _AboutEditorSheetState();
}

class _AboutEditorSheetState extends ConsumerState<_AboutEditorSheet> {
  late final _story = TextEditingController(text: widget.backstory);
  late final _tags = TextEditingController(text: widget.tags.join('、'));

  @override
  void dispose() {
    _story.dispose();
    _tags.dispose();
    super.dispose();
  }

  void _save() {
    final tags = _tags.text
        .split(RegExp(r'[、,，\s]+'))
        .map((t) => t.trim())
        .where((t) => t.isNotEmpty)
        .toList();
    ref
        .read(currentCharacterProvider.notifier)
        .updateAbout(backstory: _story.text.trim(), tags: tags);
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    return EditorSheetScaffold(
      title: '編輯其人其事',
      onSave: _save,
      fields: [
        const EditorFieldLabel('背景故事'),
        TextField(
          controller: _story,
          maxLines: 5,
          minLines: 3,
          style: const TextStyle(fontFamily: 'NotoSerifTC', fontSize: 14),
          decoration: const InputDecoration(hintText: '這個角色的過去與動機…'),
        ),
        const SizedBox(height: AppSpacing.md),
        const EditorFieldLabel('性格標籤'),
        TextField(
          controller: _tags,
          style: const TextStyle(fontFamily: 'NotoSerifTC', fontSize: 14),
          decoration: const InputDecoration(hintText: '以頓號分隔，如：好奇、書蟲、理性'),
        ),
      ],
    );
  }
}

class _PersonalityEditorSheet extends ConsumerStatefulWidget {
  final Personality personality;
  const _PersonalityEditorSheet({required this.personality});

  @override
  ConsumerState<_PersonalityEditorSheet> createState() =>
      _PersonalityEditorSheetState();
}

class _PersonalityEditorSheetState
    extends ConsumerState<_PersonalityEditorSheet> {
  late final _traits = TextEditingController(text: widget.personality.traits);
  late final _ideals = TextEditingController(text: widget.personality.ideals);
  late final _bonds = TextEditingController(text: widget.personality.bonds);
  late final _flaws = TextEditingController(text: widget.personality.flaws);

  @override
  void dispose() {
    _traits.dispose();
    _ideals.dispose();
    _bonds.dispose();
    _flaws.dispose();
    super.dispose();
  }

  void _save() {
    ref
        .read(currentCharacterProvider.notifier)
        .updatePersonality(
          Personality(
            traits: _traits.text.trim(),
            ideals: _ideals.text.trim(),
            bonds: _bonds.text.trim(),
            flaws: _flaws.text.trim(),
          ),
        );
    Navigator.pop(context);
  }

  Widget _field(String label, TextEditingController c, String hint) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      EditorFieldLabel(label),
      TextField(
        controller: c,
        maxLines: 2,
        minLines: 1,
        style: const TextStyle(fontFamily: 'NotoSerifTC', fontSize: 14),
        decoration: InputDecoration(hintText: hint),
      ),
      const SizedBox(height: AppSpacing.md),
    ],
  );

  @override
  Widget build(BuildContext context) {
    return EditorSheetScaffold(
      title: '編輯性格',
      onSave: _save,
      fields: [
        _field('特質', _traits, '性格上的顯著特點'),
        _field('理念', _ideals, '信念與價值觀'),
        _field('羈絆', _bonds, '在意的人事物'),
        _field('缺陷', _flaws, '弱點或惡習'),
      ],
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
  final Character character;
  const _Features({required this.character});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final features = character.features;
    final languages = character.languages;
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
                      Row(
                        children: [
                          Flexible(
                            child: Text.rich(
                              TextSpan(
                                children: [
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
                                ],
                              ),
                            ),
                          ),
                          // 著甲條件不滿足 → 失效提示（不隱藏、不刪除）
                          if (featureArmorViolation(character, features[i])
                              case final violation?) ...[
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 6,
                                vertical: 1,
                              ),
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(4),
                                border: Border.all(
                                  color: AppColors.danger.withValues(
                                    alpha: 0.6,
                                  ),
                                ),
                              ),
                              child: Text(
                                violation,
                                style: TextStyle(
                                  fontFamily: 'NotoSerifTC',
                                  fontSize: 9,
                                  color: AppColors.danger.withValues(
                                    alpha: 0.9,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                      if (features[i].description.isNotEmpty) ...[
                        const SizedBox(height: 3),
                        Text(
                          features[i].description,
                          style: TextStyle(
                            fontFamily: 'NotoSerifTC',
                            fontSize: 12,
                            height: 1.5,
                            color: theme.colorScheme.onSurface.withValues(
                              alpha: 0.6,
                            ),
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
