import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/theme/app_colors.dart';
import '../../../app/theme/app_spacing.dart';
import '../../../app/theme/decorations.dart';
import '../data/character_sync_repository.dart';
import '../domain/character.dart';
import '../domain/character_providers.dart';

class CharacterSelectPage extends ConsumerWidget {
  final void Function(String id) onCharacterSelected;

  const CharacterSelectPage({super.key, required this.onCharacterSelected});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // 雲端清單抓成功 → 取代本地清單；失敗（離線/未登入）→ 維持本地資料。
    ref.listen(remoteCharactersProvider, (_, next) {
      final remote = next.valueOrNull;
      if (remote != null) {
        ref.read(characterListProvider.notifier).replaceAll(remote);
      }
    });
    final characters = ref.watch(characterListProvider);
    final isSyncing = ref.watch(remoteCharactersProvider).isLoading;
    final theme = Theme.of(context);

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 480),
            child: Padding(
              padding: AppSpacing.pagePadding,
              child: Column(
                children: [
                  const SizedBox(height: AppSpacing.xxxxl),
                  Text(
                    '選擇角色',
                    style: theme.textTheme.headlineLarge?.copyWith(
                      fontFamily: 'Cinzel',
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xxl),
                  if (isSyncing) ...[
                    const LinearProgressIndicator(minHeight: 2),
                    const SizedBox(height: AppSpacing.md),
                  ],
                  Expanded(
                    child: ListView.separated(
                      itemCount: characters.length,
                      separatorBuilder: (_, _) =>
                          const SizedBox(height: AppSpacing.md),
                      itemBuilder: (context, index) {
                        final c = characters[index];
                        return _CharacterCard(
                          character: c,
                          onTap: () => onCharacterSelected(c.id),
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: () => context.push('/character-create'),
                      icon: const Icon(Icons.add, color: AppColors.accentGold),
                      label: Text(
                        '新增角色',
                        style: theme.textTheme.titleSmall?.copyWith(
                          color: AppColors.accentGold,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(
                          vertical: AppSpacing.lg,
                        ),
                        side: const BorderSide(color: AppColors.accentGold),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _CharacterCard extends StatelessWidget {
  final Character character;
  final VoidCallback onTap;

  const _CharacterCard({required this.character, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return GestureDetector(
      onTap: onTap,
      child: ParchmentCard(
        padding: AppSpacing.cardPadding,
        child: Row(
          children: [
            CircleAvatar(
              radius: 28,
              backgroundColor: AppColors.primary.withValues(alpha: 0.15),
              child: Text(
                character.name.characters.first,
                style: const TextStyle(
                  fontFamily: 'Cinzel',
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  color: AppColors.primary,
                ),
              ),
            ),
            const SizedBox(width: AppSpacing.lg),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    character.name,
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  Text(
                    '${character.species} · ${character.className}',
                    style: theme.textTheme.bodySmall,
                  ),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.sm,
                vertical: AppSpacing.xs,
              ),
              decoration: BoxDecoration(
                color: AppColors.accentGold.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(AppSpacing.radiusChip),
              ),
              child: Text(
                'Lv ${character.level}',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: AppColors.accentGold,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
