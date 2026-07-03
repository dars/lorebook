import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/theme/app_colors.dart';
import '../../../app/theme/app_spacing.dart';
import '../../../app/theme/decorations.dart';
import '../../../shared/domain/app_exception.dart';
import '../../../shared/presentation/widgets/character_avatar.dart';
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
                          onLongPress: () => _confirmDelete(context, ref, c),
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

/// 刪除角色：長按觸發（見 openspec character-delete design D1/D2）。
/// 已登入以雲端軟刪除為準，成功才移除本地，避免下次同步時「復活」。
Future<void> _confirmDelete(
  BuildContext context,
  WidgetRef ref,
  Character character,
) {
  return showDialog<void>(
    context: context,
    builder: (dialogContext) {
      var busy = false;
      return StatefulBuilder(
        builder: (dialogContext, setDialogState) => AlertDialog(
          title: const Text('刪除角色？'),
          content: Text('將刪除「${character.name}」。此操作無法復原。'),
          actions: [
            TextButton(
              onPressed: busy ? null : () => Navigator.pop(dialogContext),
              child: const Text('取消'),
            ),
            TextButton(
              onPressed: busy
                  ? null
                  : () async {
                      setDialogState(() => busy = true);
                      // 離線模式（Supabase 未初始化）取不到 repository：
                      // 視為無雲端可同步，僅做本地刪除。
                      CharacterSyncRepository? repo;
                      try {
                        repo = ref.read(characterSyncRepositoryProvider);
                      } catch (_) {
                        repo = null;
                      }
                      if (repo != null) {
                        try {
                          await repo.softDelete(character.id);
                        } on AppException {
                          if (!dialogContext.mounted) return;
                          setDialogState(() => busy = false);
                          ScaffoldMessenger.of(dialogContext).showSnackBar(
                            const SnackBar(content: Text('刪除失敗，請稍後再試')),
                          );
                          return;
                        }
                      }
                      // 先清選取再移除：避免清單變動觸發 fallback 角色
                      // 被同步控制器誤推上雲。
                      if (ref.read(selectedCharacterIdProvider) ==
                          character.id) {
                        ref.read(selectedCharacterIdProvider.notifier).state =
                            null;
                      }
                      ref
                          .read(characterListProvider.notifier)
                          .remove(character.id);
                      if (dialogContext.mounted) {
                        Navigator.pop(dialogContext);
                      }
                    },
              child: busy
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('刪除', style: TextStyle(color: AppColors.danger)),
            ),
          ],
        ),
      );
    },
  );
}

class _CharacterCard extends StatelessWidget {
  final Character character;
  final VoidCallback onTap;
  final VoidCallback onLongPress;

  const _CharacterCard({
    required this.character,
    required this.onTap,
    required this.onLongPress,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return GestureDetector(
      onTap: onTap,
      onLongPress: onLongPress,
      child: ParchmentCard(
        padding: AppSpacing.cardPadding,
        child: Row(
          children: [
            CharacterAvatar(
              character: character,
              size: 56,
              background: AppColors.primary.withValues(alpha: 0.15),
              initialStyle: const TextStyle(
                fontFamily: 'Cinzel',
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: AppColors.primary,
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
