import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/theme/app_colors.dart';
import 'widgets/character_avatar.dart';
import '../../app/theme/app_spacing.dart';
import '../../app/theme/surface_colors.dart';
import '../../features/catalog/data/catalog_repository.dart';
import '../../features/character/domain/character.dart';
import '../../features/character/domain/character_providers.dart';

class CharacterHeader extends ConsumerWidget {
  const CharacterHeader({super.key, this.levelUpEnabled = false});

  /// LEVEL 徽章是否可點擊觸發升級（僅角色頁啟用；行動頁等維持純顯示）。
  final bool levelUpEnabled;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final character = ref.watch(currentCharacterProvider);
    final surfaces = Theme.of(context).extension<SurfaceColors>()!;

    return Container(
      decoration: BoxDecoration(color: surfaces.surface0),
      child: SafeArea(
        bottom: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              height: 1,
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    Color(0x00C9A84C),
                    Color(0x80C9A84C),
                    Color(0x00C9A84C),
                  ],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: 20,
                vertical: AppSpacing.sm,
              ),
              child: Row(
                children: [
                  CharacterAvatar(
                    character: character,
                    size: 36,
                    borderColor: AppColors.accentGold,
                    borderWidth: 1.5,
                    initialStyle: TextStyle(
                      fontFamily: 'Cinzel',
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: surfaces.textPrimary,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          character.name,
                          style: TextStyle(
                            fontFamily: 'Cinzel',
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: surfaces.textPrimary,
                          ),
                        ),
                        Text(
                          '${character.species} · ${character.className} ${character.level}',
                          style: TextStyle(
                            fontFamily: 'NotoSerifTC',
                            fontSize: 11,
                            color: surfaces.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  _levelBadge(context, character, surfaces),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _levelBadge(
    BuildContext context,
    Character character,
    SurfaceColors surfaces,
  ) {
    final badge = Column(
      children: [
        Text(
          'LEVEL',
          style: TextStyle(
            fontFamily: 'Inter',
            fontSize: 9,
            fontWeight: FontWeight.w600,
            letterSpacing: 1,
            color: surfaces.textSecondary,
          ),
        ),
        Text(
          '${character.level}',
          style: TextStyle(
            fontFamily: 'Cinzel',
            fontSize: 28,
            fontWeight: FontWeight.w700,
            color: surfaces.textPrimary,
          ),
        ),
      ],
    );

    if (!levelUpEnabled) return badge;

    // 觸控目標 ≥ 48dp（padding 撐大熱區，視覺尺寸不變）。
    return InkWell(
      onTap: () => _onLevelTap(context, character),
      borderRadius: BorderRadius.circular(10),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
        child: badge,
      ),
    );
  }

  void _onLevelTap(BuildContext context, Character character) {
    if (character.level >= 20) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('已達最高等級 Lv 20')));
      return;
    }
    final maybeSubclass = character.level >= 3 && character.subclass.isEmpty;

    showDialog<void>(
      context: context,
      builder: (dialogContext) => Consumer(
        builder: (context, ref, _) {
          // 補選子職入口：內容庫可用（已載入）才顯示。
          final catalogReady =
              maybeSubclass && ref.watch(classCatalogProvider).hasValue;
          final surfaces = Theme.of(context).extension<SurfaceColors>()!;
          return AlertDialog(
            backgroundColor: surfaces.surface1,
            title: Text(
              '調升等級',
              style: TextStyle(
                fontFamily: 'NotoSerifTC',
                fontSize: 17,
                fontWeight: FontWeight.w700,
                color: surfaces.textPrimary,
              ),
            ),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '要將${character.name}調升至 Lv ${character.level + 1} 嗎？',
                  style: TextStyle(
                    fontFamily: 'NotoSerifTC',
                    fontSize: 13,
                    color: surfaces.textLight,
                  ),
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  '將進入引導式升級流程，完成前不會變更角色。',
                  style: TextStyle(
                    fontFamily: 'NotoSerifTC',
                    fontSize: 11,
                    color: surfaces.textSecondary,
                  ),
                ),
                if (catalogReady) ...[
                  const SizedBox(height: AppSpacing.md),
                  OutlinedButton.icon(
                    onPressed: () {
                      Navigator.of(dialogContext).pop();
                      GoRouter.of(
                        context,
                      ).push('/character-level-up?mode=subclass');
                    },
                    icon: const Icon(
                      Icons.alt_route,
                      size: 15,
                      color: AppColors.accentGold,
                    ),
                    label: const Text(
                      '補選子職',
                      style: TextStyle(
                        fontFamily: 'NotoSerifTC',
                        fontSize: 12,
                        color: AppColors.accentGold,
                      ),
                    ),
                    style: OutlinedButton.styleFrom(
                      side: BorderSide(color: surfaces.border),
                    ),
                  ),
                ],
              ],
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(dialogContext).pop(),
                child: Text(
                  '取消',
                  style: TextStyle(
                    fontFamily: 'NotoSerifTC',
                    color: surfaces.textSecondary,
                  ),
                ),
              ),
              FilledButton(
                onPressed: () {
                  Navigator.of(dialogContext).pop();
                  GoRouter.of(context).push('/character-level-up');
                },
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.accentGold,
                ),
                child: Text(
                  '調升至 Lv ${character.level + 1}',
                  style: const TextStyle(
                    fontFamily: 'NotoSerifTC',
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF1A1206),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
