import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/theme/app_colors.dart';
import 'widgets/character_avatar.dart';
import '../../app/theme/app_spacing.dart';
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

    return Container(
      decoration: BoxDecoration(color: AppColors.darkSurface0),
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
                      color: AppColors.darkTextPrimary,
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
                            color: AppColors.darkTextPrimary,
                          ),
                        ),
                        Text(
                          '${character.species} · ${character.className} ${character.level}',
                          style: TextStyle(
                            fontFamily: 'NotoSerifTC',
                            fontSize: 11,
                            color: AppColors.darkTextSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  _levelBadge(context, character),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _levelBadge(BuildContext context, Character character) {
    final badge = Column(
      children: [
        Text(
          'LEVEL',
          style: TextStyle(
            fontFamily: 'Inter',
            fontSize: 9,
            fontWeight: FontWeight.w600,
            letterSpacing: 1,
            color: AppColors.darkTextSecondary,
          ),
        ),
        Text(
          '${character.level}',
          style: TextStyle(
            fontFamily: 'Cinzel',
            fontSize: 28,
            fontWeight: FontWeight.w700,
            color: AppColors.darkTextPrimary,
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
          return AlertDialog(
            backgroundColor: AppColors.darkSurface1,
            title: const Text(
              '調升等級',
              style: TextStyle(
                fontFamily: 'NotoSerifTC',
                fontSize: 17,
                fontWeight: FontWeight.w700,
                color: AppColors.darkTextPrimary,
              ),
            ),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '要將${character.name}調升至 Lv ${character.level + 1} 嗎？',
                  style: const TextStyle(
                    fontFamily: 'NotoSerifTC',
                    fontSize: 13,
                    color: AppColors.darkTextLight,
                  ),
                ),
                const SizedBox(height: AppSpacing.xs),
                const Text(
                  '將進入引導式升級流程，完成前不會變更角色。',
                  style: TextStyle(
                    fontFamily: 'NotoSerifTC',
                    fontSize: 11,
                    color: AppColors.darkTextSecondary,
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
                      side: const BorderSide(color: AppColors.darkBorder),
                    ),
                  ),
                ],
              ],
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(dialogContext).pop(),
                child: const Text(
                  '取消',
                  style: TextStyle(
                    fontFamily: 'NotoSerifTC',
                    color: AppColors.darkTextSecondary,
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
