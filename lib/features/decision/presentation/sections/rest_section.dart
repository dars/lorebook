import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../app/theme/app_colors.dart';
import '../../../../app/theme/app_spacing.dart';
import '../../../../app/theme/decorations.dart';
import '../../../../app/theme/surface_colors.dart';
import '../../../../features/character/domain/character_providers.dart';
import '../../../../shared/presentation/widgets/entry_card.dart';

class RestSection extends ConsumerWidget {
  const RestSection({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return CollapsibleSection(
      title: 'REST 休息',
      child: Row(
        children: [
          Expanded(
            child: _RestButton(
              icon: Icons.free_breakfast,
              label: '短休',
              subtitle: '生命骰・職業能力',
              onTap: () => _showShortRest(context),
            ),
          ),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: _RestButton(
              icon: Icons.nights_stay,
              label: '長休',
              subtitle: '完全恢復',
              onTap: () => _confirmLongRest(context, ref),
            ),
          ),
        ],
      ),
    );
  }

  void _confirmLongRest(BuildContext context, WidgetRef ref) {
    showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('確定長休？'),
        content: const Text('將回滿 HP、法術位、職業資源，清除臨時 HP，並降低 1 級力竭。'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('取消'),
          ),
          TextButton(
            onPressed: () {
              ref.read(currentCharacterProvider.notifier).longRest();
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('長休完成：已完全恢復'),
                  duration: Duration(seconds: 2),
                ),
              );
            },
            child: const Text('確定長休'),
          ),
        ],
      ),
    );
  }

  void _showShortRest(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Theme.of(context).extension<SurfaceColors>()!.surface1,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (context) => Consumer(
        builder: (context, ref, _) {
          final character = ref.watch(currentCharacterProvider);
          final arcane = character.features.where(
            (f) => f.nameEn == 'Arcane Recovery' || f.name == '奧術恢復',
          );
          return SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Padding(
                    padding: EdgeInsets.only(bottom: 12),
                    child: Text(
                      '短休',
                      style: TextStyle(
                        fontFamily: 'NotoSerifTC',
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  // 生命骰（標記花用；擲骰與回血由玩家自行處理）
                  _HitDiceTile(
                    faces: character.hitDieFaces,
                    remaining: character.hitDiceRemaining,
                    total: character.hitDiceTotal,
                    onUse: () =>
                        ref.read(currentCharacterProvider.notifier).useHitDie(),
                  ),
                  const SizedBox(height: 12),
                  // 奧術恢復（若有）
                  for (final f in arcane)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: EntryCard(
                        badge: '復',
                        title: f.name,
                        subtitle: f.nameEn,
                        meta: '1/天',
                        description: f.description,
                        emphasizeBadge: true,
                      ),
                    ),
                  const SizedBox(height: 4),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton(
                      onPressed: () {
                        ref.read(currentCharacterProvider.notifier).shortRest();
                        Navigator.pop(context);
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('短休完成：短休資源已回復'),
                            duration: Duration(seconds: 2),
                          ),
                        );
                      },
                      child: const Text('完成短休'),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

class _HitDiceTile extends StatelessWidget {
  final int faces;
  final int remaining;
  final int total;
  final VoidCallback onUse;

  const _HitDiceTile({
    required this.faces,
    required this.remaining,
    required this.total,
    required this.onUse,
  });

  @override
  Widget build(BuildContext context) {
    final canUse = remaining > 0;
    final surfaces = Theme.of(context).extension<SurfaceColors>()!;
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: Theme.of(context).scaffoldBackgroundColor,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Theme.of(context).colorScheme.outline),
      ),
      child: Row(
        children: [
          Icon(Icons.casino, size: 18, color: AppColors.goldDim),
          const SizedBox(width: 10),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '生命骰',
                style: TextStyle(
                  fontFamily: 'NotoSerifTC',
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: surfaces.textPrimary,
                ),
              ),
              Text(
                'd$faces · 剩餘 $remaining/$total',
                style: TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 10,
                  color: surfaces.textSecondary,
                ),
              ),
            ],
          ),
          const Spacer(),
          OutlinedButton(
            onPressed: canUse ? onUse : null,
            child: Text(canUse ? '花 1 顆' : '已用盡'),
          ),
        ],
      ),
    );
  }
}

class _RestButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final String subtitle;
  final VoidCallback onTap;

  const _RestButton({
    required this.icon,
    required this.label,
    required this.subtitle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final surfaces = Theme.of(context).extension<SurfaceColors>()!;
    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppSpacing.radiusCard),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 12),
          child: Column(
            children: [
              Icon(icon, size: 22, color: AppColors.accentGold),
              const SizedBox(height: 6),
              Text(
                label,
                style: TextStyle(
                  fontFamily: 'NotoSerifTC',
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: surfaces.textPrimary,
                ),
              ),
              Text(
                subtitle,
                style: TextStyle(
                  fontFamily: 'NotoSerifTC',
                  fontSize: 10,
                  color: surfaces.textSecondary,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
