import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../app/theme/app_colors.dart';
import '../../../../app/theme/app_spacing.dart';
import '../../../../app/theme/decorations.dart';
import '../../../../app/theme/dnd_colors.dart';
import '../../../../app/theme/surface_colors.dart';
import '../../../../features/catalog/data/catalog_repository.dart';
import '../../../../features/catalog/domain/catalog_models.dart';
import '../../../../features/catalog/presentation/fivetools_renderer.dart';
import '../../../../features/character/domain/character.dart';
import '../../../../features/character/domain/character_providers.dart';
import '../../../../features/character/domain/derived_stats.dart';
import '../../domain/conditions_catalog.dart';

class StatusSection extends ConsumerWidget {
  const StatusSection({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final character = ref.watch(currentCharacterProvider);
    final notifier = ref.read(currentCharacterProvider.notifier);
    final dividerColor = Theme.of(context).colorScheme.outline;

    return CollapsibleSection(
      title: 'STATUS 狀態',
      isFirst: true,
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Column(
            children: [
              // 上半：HP ｜ AC ｜ 專注
              Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Expanded(
                    child: _HpColumn(
                      character: character,
                      onMinus: () => notifier.adjustHp(-1),
                      onPlus: () => notifier.adjustHp(1),
                      onTapShield: () =>
                          _showTempHpDialog(context, ref, character.tempHp),
                    ),
                  ),
                  _vDivider(dividerColor),
                  const _AcShield(),
                  _vDivider(dividerColor),
                  Expanded(
                    child: _ConcentrationColumn(
                      character: character,
                      onTap: () => _onTapConcentration(context, ref, character),
                    ),
                  ),
                ],
              ),
              Padding(
                padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
                child: Divider(color: dividerColor, height: 1),
              ),
              // 下半：狀態異常列
              _ConditionsRow(
                character: character,
                notifier: notifier,
                onEdit: () => _showConditionsSheet(context, ref),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _vDivider(Color color) => Padding(
    padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm),
    child: Container(width: 1, height: 100, color: color),
  );
}

// ─────────────────────────────────────────── HP 欄

class _HpColumn extends StatelessWidget {
  final Character character;
  final VoidCallback onMinus;
  final VoidCallback onPlus;
  final VoidCallback onTapShield;

  const _HpColumn({
    required this.character,
    required this.onMinus,
    required this.onPlus,
    required this.onTapShield,
  });

  Color _barColor(double ratio) {
    if (ratio <= 0.25) return AppColors.danger;
    if (ratio <= 0.5) return AppColors.goldDim;
    return AppColors.success;
  }

  @override
  Widget build(BuildContext context) {
    final ratio = character.maxHp == 0
        ? 0.0
        : (character.currentHp / character.maxHp).clamp(0.0, 1.0);
    final dying = character.currentHp == 0;
    final dnd = Theme.of(context).extension<DndColors>()!;
    final surfaces = Theme.of(context).extension<SurfaceColors>()!;

    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.favorite, size: 12, color: AppColors.danger),
            const SizedBox(width: 4),
            Text(
              'HP',
              style: TextStyle(
                fontFamily: 'Inter',
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: surfaces.accent,
              ),
            ),
          ],
        ),
        const SizedBox(height: 2),
        // 窄欄（iPad 三欄等）時整列等比縮小，chip 不會貼到欄界。
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 6),
          child: FittedBox(
            fit: BoxFit.scaleDown,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.baseline,
              textBaseline: TextBaseline.alphabetic,
              children: [
                Text(
                  '${character.currentHp}',
                  style: TextStyle(
                    fontFamily: 'Cinzel',
                    fontSize: 30,
                    fontWeight: FontWeight.w700,
                    color: dying ? AppColors.danger : surfaces.textPrimary,
                  ),
                ),
                Text(
                  '/${character.maxHp}',
                  style: TextStyle(
                    fontFamily: 'Cinzel',
                    fontSize: 14,
                    color: surfaces.textSecondary,
                  ),
                ),
                const SizedBox(width: 8),
                _TempHpChip(
                  value: character.tempHp,
                  color: dnd.tempHp,
                  onTap: onTapShield,
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 4),
        ClipRRect(
          borderRadius: BorderRadius.circular(3),
          child: SizedBox(
            height: 5,
            child: Row(
              children: [
                // 條總長 = maxHp + 臨時：傷害先消藍段、紅段不動，行為可直接看見。
                if (character.currentHp > 0)
                  Expanded(
                    flex: character.currentHp,
                    child: Container(color: _barColor(ratio)),
                  ),
                if (character.tempHp > 0)
                  Expanded(
                    flex: character.tempHp,
                    child: Container(color: dnd.tempHp),
                  ),
                if (character.maxHp - character.currentHp > 0)
                  Expanded(
                    flex: character.maxHp - character.currentHp,
                    child: Container(color: dnd.hpBarBg),
                  ),
                if (character.maxHp == 0 && character.tempHp == 0)
                  Expanded(child: Container(color: dnd.hpBarBg)),
              ],
            ),
          ),
        ),
        const SizedBox(height: 8),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            _HpButton(
              key: const Key('hp-minus'),
              icon: Icons.remove,
              onPressed: onMinus,
            ),
            const SizedBox(width: 10),
            _HpButton(
              key: const Key('hp-plus'),
              icon: Icons.add,
              onPressed: onPlus,
            ),
          ],
        ),
      ],
    );
  }
}

/// 臨時 HP chip：有值時「+N 臨時」、歸零時「＋臨時」幽靈態提示可點。
/// 值變動時脈衝一下，讓「傷害先吃臨時」看得見。
class _TempHpChip extends StatefulWidget {
  final int value;
  final Color color;
  final VoidCallback onTap;

  const _TempHpChip({
    required this.value,
    required this.color,
    required this.onTap,
  });

  @override
  State<_TempHpChip> createState() => _TempHpChipState();
}

class _TempHpChipState extends State<_TempHpChip>
    with SingleTickerProviderStateMixin {
  late final AnimationController _pulse = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 280),
  );
  late final Animation<double> _scale = TweenSequence<double>([
    TweenSequenceItem(tween: Tween(begin: 1.0, end: 1.25), weight: 1),
    TweenSequenceItem(tween: Tween(begin: 1.25, end: 1.0), weight: 1),
  ]).animate(_pulse);

  @override
  void didUpdateWidget(_TempHpChip oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.value != widget.value && widget.value > 0) {
      _pulse.forward(from: 0);
    }
  }

  @override
  void dispose() {
    _pulse.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final active = widget.value > 0;
    final color = widget.color;
    return GestureDetector(
      onTap: widget.onTap,
      behavior: HitTestBehavior.opaque,
      child: ScaleTransition(
        scale: _scale,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
          decoration: BoxDecoration(
            // 幽靈態也帶一點底色與較實的框，避免在深色卡上糊成灰。
            color: color.withValues(alpha: active ? 0.16 : 0.08),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: active ? color : color.withValues(alpha: 0.55),
            ),
          ),
          child: active
              ? Row(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Text(
                      '+${widget.value}',
                      style: TextStyle(
                        fontFamily: 'Cinzel',
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: color,
                      ),
                    ),
                    const SizedBox(width: 3),
                    Text(
                      '臨時',
                      style: TextStyle(
                        fontFamily: 'NotoSerifTC',
                        fontSize: 9,
                        color: color,
                      ),
                    ),
                  ],
                )
              : Text(
                  '＋臨時',
                  style: TextStyle(
                    fontFamily: 'NotoSerifTC',
                    fontSize: 9,
                    color: color.withValues(alpha: 0.9),
                  ),
                ),
        ),
      ),
    );
  }
}

class _HpButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onPressed;
  const _HpButton({super.key, required this.icon, required this.onPressed});

  @override
  Widget build(BuildContext context) {
    final surfaces = Theme.of(context).extension<SurfaceColors>()!;
    return InkWell(
      onTap: onPressed,
      borderRadius: BorderRadius.circular(6),
      child: Container(
        width: 44,
        height: 32,
        decoration: BoxDecoration(
          color: surfaces.border,
          borderRadius: BorderRadius.circular(6),
        ),
        child: Icon(icon, size: 16, color: surfaces.textPrimary),
      ),
    );
  }
}

// ─────────────────────────────────────────── 專注欄

class _ConcentrationColumn extends StatelessWidget {
  final Character character;
  final VoidCallback onTap;

  const _ConcentrationColumn({required this.character, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final surfaces = Theme.of(context).extension<SurfaceColors>()!;
    final spellName = character.concentrationSpell;
    final active = spellName != null && spellName.isNotEmpty;

    String? subLabel;
    if (active) {
      final match = [
        ...character.spells,
        ...character.cantrips,
      ].where((s) => s.name == spellName);
      subLabel = match.isNotEmpty && match.first.nameEn.isNotEmpty
          ? '${match.first.nameEn}・專注'
          : '專注中';
    }

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(6),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.auto_fix_high, size: 12, color: surfaces.accent),
                const SizedBox(width: 4),
                Text(
                  '專注',
                  style: TextStyle(
                    fontFamily: 'NotoSerifTC',
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                    color: surfaces.textSecondary,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            if (active) ...[
              Text(
                spellName,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontFamily: 'NotoSerifTC',
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: surfaces.textPrimary,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                subLabel!,
                style: TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 10,
                  color: surfaces.textSecondary,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                '點按取消',
                style: TextStyle(
                  fontFamily: 'NotoSerifTC',
                  fontSize: 11,
                  color: surfaces.textSecondary.withValues(alpha: 0.8),
                ),
              ),
            ] else
              Text(
                '點按選擇',
                style: TextStyle(
                  fontFamily: 'NotoSerifTC',
                  fontSize: 13,
                  color: surfaces.textSecondary.withValues(alpha: 0.6),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────── 狀態異常列

class _ConditionsRow extends StatelessWidget {
  final Character character;
  final CurrentCharacterNotifier notifier;
  final VoidCallback onEdit;

  const _ConditionsRow({
    required this.character,
    required this.notifier,
    required this.onEdit,
  });

  @override
  Widget build(BuildContext context) {
    final surfaces = Theme.of(context).extension<SurfaceColors>()!;
    final hasAny =
        character.conditions.isNotEmpty || character.exhaustionLevel > 0;

    // 整個區塊可點 → 開啟狀態選單；chip 自身的點擊/移除不受影響。
    return InkWell(
      onTap: onEdit,
      borderRadius: BorderRadius.circular(6),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 2),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  Icons.warning_amber_rounded,
                  size: 12,
                  color: AppColors.sectionLabel,
                ),
                const SizedBox(width: 6),
                Text(
                  '狀態異常・CONDITIONS',
                  style: TextStyle(
                    fontFamily: 'NotoSerifTC',
                    fontSize: 10,
                    color: AppColors.goldDim,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            if (!hasAny)
              Text(
                '目前無異常狀態',
                style: TextStyle(
                  fontFamily: 'NotoSerifTC',
                  fontSize: 11,
                  color: surfaces.textSecondary,
                ),
              )
            else
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: [
                  for (final name in character.conditions)
                    _ConditionChip(
                      label: name,
                      onRemove: () => notifier.removeCondition(name),
                      onTap: () => _showEffectDialog(context, name),
                    ),
                  if (character.exhaustionLevel > 0)
                    _ConditionChip(
                      label: '力竭 ${character.exhaustionLevel}',
                      onRemove: () =>
                          notifier.adjustExhaustion(-character.exhaustionLevel),
                      onTap: () => _showEffectDialog(context, '力竭'),
                    ),
                ],
              ),
          ],
        ),
      ),
    );
  }
}

class _ConditionChip extends StatelessWidget {
  final String label;
  final VoidCallback onRemove;
  final VoidCallback onTap;

  const _ConditionChip({
    required this.label,
    required this.onRemove,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final surfaces = Theme.of(context).extension<SurfaceColors>()!;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.only(left: 10, right: 4, top: 4, bottom: 4),
        decoration: BoxDecoration(
          color: const Color(0x33C0392B),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.danger.withValues(alpha: 0.5)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              label,
              style: TextStyle(
                fontFamily: 'NotoSerifTC',
                fontSize: 11,
                color: surfaces.textPrimary,
              ),
            ),
            const SizedBox(width: 2),
            GestureDetector(
              onTap: onRemove,
              behavior: HitTestBehavior.opaque,
              child: Icon(Icons.close, size: 14, color: surfaces.textSecondary),
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────── 互動：對話框 / bottom sheet

void _showTempHpDialog(BuildContext context, WidgetRef ref, int current) {
  final controller = TextEditingController(text: current > 0 ? '$current' : '');
  showDialog<void>(
    context: context,
    builder: (context) => AlertDialog(
      title: const Text('設定臨時 HP'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          TextField(
            controller: controller,
            keyboardType: TextInputType.number,
            autofocus: true,
            decoration: const InputDecoration(hintText: '輸入臨時 HP'),
          ),
          const SizedBox(height: 8),
          Text(
            '臨時 HP 不疊加：輸入值會取代既有值（輸入 0 清空）。',
            style: TextStyle(
              fontSize: 11,
              color: Theme.of(
                context,
              ).extension<SurfaceColors>()!.textSecondary,
            ),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('取消'),
        ),
        TextButton(
          onPressed: () {
            final v = int.tryParse(controller.text.trim()) ?? 0;
            ref.read(currentCharacterProvider.notifier).setTempHp(v);
            Navigator.pop(context);
          },
          child: const Text('套用'),
        ),
      ],
    ),
  );
}

void _onTapConcentration(
  BuildContext context,
  WidgetRef ref,
  Character character,
) {
  final spellName = character.concentrationSpell;
  if (spellName != null && spellName.isNotEmpty) {
    // 專注中 → 確認取消
    showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('取消專注？'),
        content: Text('將結束對「$spellName」的專注。'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('保持專注'),
          ),
          TextButton(
            onPressed: () {
              ref.read(currentCharacterProvider.notifier).endConcentration();
              Navigator.pop(context);
            },
            child: const Text('取消專注'),
          ),
        ],
      ),
    );
  } else {
    _showConcentrationSheet(context, ref);
  }
}

void _showConcentrationSheet(BuildContext context, WidgetRef ref) {
  final character = ref.read(currentCharacterProvider);
  final items = [
    ...character.spells,
    ...character.cantrips,
  ].where((s) => s.concentration).toList();

  showModalBottomSheet<void>(
    context: context,
    backgroundColor: Theme.of(context).extension<SurfaceColors>()!.surface1,
    showDragHandle: true,
    builder: (context) {
      final textSecondary = Theme.of(
        context,
      ).extension<SurfaceColors>()!.textSecondary;
      return SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Padding(
              padding: EdgeInsets.fromLTRB(20, 4, 20, 8),
              child: Text(
                '選擇專注法術',
                style: TextStyle(
                  fontFamily: 'NotoSerifTC',
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            if (items.isEmpty)
              Padding(
                padding: const EdgeInsets.all(20),
                child: Text(
                  '沒有需要專注的法術',
                  style: TextStyle(color: textSecondary),
                ),
              )
            else
              Flexible(
                child: ListView(
                  shrinkWrap: true,
                  children: [
                    for (final s in items)
                      ListTile(
                        title: Text(
                          s.name,
                          style: const TextStyle(fontFamily: 'NotoSerifTC'),
                        ),
                        subtitle: s.nameEn.isNotEmpty ? Text(s.nameEn) : null,
                        trailing: Text(
                          '${s.level}環',
                          style: TextStyle(color: textSecondary),
                        ),
                        onTap: () {
                          ref
                              .read(currentCharacterProvider.notifier)
                              .startConcentration(s.name);
                          Navigator.pop(context);
                        },
                      ),
                  ],
                ),
              ),
            const SizedBox(height: 8),
          ],
        ),
      );
    },
  );
}

void _showConditionsSheet(BuildContext context, WidgetRef ref) {
  showModalBottomSheet<void>(
    context: context,
    backgroundColor: Theme.of(context).extension<SurfaceColors>()!.surface1,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (context) => Consumer(
      builder: (context, ref, _) {
        final character = ref.watch(currentCharacterProvider);
        final notifier = ref.read(currentCharacterProvider.notifier);
        return DraggableScrollableSheet(
          expand: false,
          initialChildSize: 0.7,
          maxChildSize: 0.92,
          builder: (context, scrollController) => Column(
            children: [
              const Padding(
                padding: EdgeInsets.fromLTRB(20, 4, 20, 8),
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    '異常狀態',
                    style: TextStyle(
                      fontFamily: 'NotoSerifTC',
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
              Expanded(
                child: ListView(
                  controller: scrollController,
                  children: [
                    for (final c in kConditions)
                      if (c.leveled)
                        _ExhaustionTile(
                          info: c,
                          level: character.exhaustionLevel,
                          onMinus: () => notifier.adjustExhaustion(-1),
                          onPlus: () => notifier.adjustExhaustion(1),
                        )
                      else
                        CheckboxListTile(
                          value: character.conditions.contains(c.name),
                          onChanged: (v) {
                            if (v == true) {
                              notifier.addCondition(c.name);
                            } else {
                              notifier.removeCondition(c.name);
                            }
                          },
                          title: Text(
                            '${c.name}　${c.nameEn}',
                            style: const TextStyle(fontFamily: 'NotoSerifTC'),
                          ),
                          subtitle: Text(
                            c.effect,
                            style: TextStyle(
                              fontSize: 11,
                              color: Theme.of(
                                context,
                              ).extension<SurfaceColors>()!.textSecondary,
                            ),
                          ),
                          controlAffinity: ListTileControlAffinity.leading,
                          dense: true,
                        ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    ),
  );
}

class _ExhaustionTile extends StatelessWidget {
  final ConditionInfo info;
  final int level;
  final VoidCallback onMinus;
  final VoidCallback onPlus;

  const _ExhaustionTile({
    required this.info,
    required this.level,
    required this.onMinus,
    required this.onPlus,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      title: Text(
        '${info.name}　${info.nameEn}　Lv$level',
        style: const TextStyle(fontFamily: 'NotoSerifTC'),
      ),
      subtitle: Text(
        info.effect,
        style: TextStyle(
          fontSize: 11,
          color: Theme.of(context).extension<SurfaceColors>()!.textSecondary,
        ),
      ),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          IconButton(
            onPressed: level > 0 ? onMinus : null,
            icon: const Icon(Icons.remove_circle_outline),
          ),
          Text(
            '$level',
            style: const TextStyle(
              fontFamily: 'Cinzel',
              fontWeight: FontWeight.w700,
            ),
          ),
          IconButton(
            key: const Key('exhaustion-plus'),
            onPressed: level < 6 ? onPlus : null,
            icon: const Icon(Icons.add_circle_outline),
          ),
        ],
      ),
    );
  }
}

void _showEffectDialog(BuildContext context, String name) {
  final info = conditionByName(name);
  if (info == null) return;
  showDialog<void>(
    context: context,
    builder: (context) => AlertDialog(
      title: Text('${info.name}　${info.nameEn}'),
      // 規則全文一律來自內容庫（entries kind=condition，XPHB 2024，
      // 含力竭）；以英文名對應，離線時降級顯示本地摘要。
      content: Consumer(
        builder: (context, ref, _) {
          final async = ref.watch(entryCatalogProvider('condition'));
          return ConstrainedBox(
            constraints: const BoxConstraints(maxHeight: 420),
            child: SingleChildScrollView(
              child: async.when(
                data: (entries) {
                  CatalogEntry? match;
                  for (final e in entries) {
                    if (e.engName == info.nameEn) {
                      match = e;
                      break;
                    }
                  }
                  final full = match?.data['entries'] as List?;
                  if (full == null) return Text(info.effect);
                  return FtEntriesView(full);
                },
                loading: () => Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(info.effect),
                    const SizedBox(height: 12),
                    const LinearProgressIndicator(minHeight: 2),
                  ],
                ),
                error: (_, _) => Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(info.effect),
                    const SizedBox(height: 12),
                    Text(
                      '內容庫離線，僅顯示摘要。',
                      style: TextStyle(
                        fontSize: 11,
                        color: Theme.of(
                          context,
                        ).extension<SurfaceColors>()!.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('關閉'),
        ),
      ],
    ),
  );
}

// ─────────────────────────────────────────── AC 盾牌（沿用）

class _AcShield extends StatelessWidget {
  const _AcShield();

  @override
  Widget build(BuildContext context) {
    // AC 由裝備狀態推導（equipment-effects）；點按可看依據／切換法師護甲。
    return Consumer(
      builder: (context, ref, _) {
        final character = ref.watch(currentCharacterProvider);
        final acResult = computeAc(character);
        final value = acResult.value;
        final isDark = Theme.of(context).brightness == Brightness.dark;
        final surfaces = Theme.of(context).extension<SurfaceColors>()!;
        return InkWell(
          onTap: () => _showAcSheet(context, ref),
          borderRadius: BorderRadius.circular(8),
          child: SizedBox(
            width: 96,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.shield_outlined,
                      size: 14,
                      color: const Color(0xFFC8A86B),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      'AC',
                      style: TextStyle(
                        fontFamily: 'Cinzel',
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 1.5,
                        color: const Color(0xFFC8A86B),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                SizedBox(
                  width: 80,
                  height: 86,
                  child: CustomPaint(
                    painter: _ShieldPainter(
                      fillTop: isDark
                          ? const Color(0xFF3A2E1E)
                          : surfaces.surface2,
                      fillBottom: isDark
                          ? const Color(0xFF1E1710)
                          : surfaces.surface0,
                    ),
                    child: Center(
                      child: Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: ShaderMask(
                          shaderCallback: (bounds) => const LinearGradient(
                            begin: Alignment.bottomCenter,
                            end: Alignment.topCenter,
                            colors: [Color(0xFFF0D080), Color(0xFFC8963C)],
                          ).createShader(bounds),
                          child: Text(
                            '$value',
                            style: const TextStyle(
                              fontFamily: 'Cinzel',
                              fontSize: 34,
                              fontWeight: FontWeight.w700,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  acResult.label,
                  style: TextStyle(
                    fontFamily: 'NotoSerifTC',
                    fontSize: 11,
                    letterSpacing: 0.5,
                    color: const Color(0xFFA08050),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  /// AC 依據明細＋法師護甲開關（僅法術清單含 Mage Armor 者顯示開關）。
  void _showAcSheet(BuildContext context, WidgetRef ref) {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Theme.of(context).extension<SurfaceColors>()!.surface1,
      showDragHandle: true,
      builder: (context) => Consumer(
        builder: (context, ref, _) {
          final character = ref.watch(currentCharacterProvider);
          final surfaces = Theme.of(context).extension<SurfaceColors>()!;
          final acResult = computeAc(character);
          return SafeArea(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 4, 20, 8),
                  child: Text(
                    'AC ${acResult.value}・${acResult.label}',
                    style: const TextStyle(
                      fontFamily: 'NotoSerifTC',
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Text(
                    'AC 由裝備狀態自動推導：護甲/盾牌請至角色頁物品欄切換裝備。',
                    style: TextStyle(
                      fontFamily: 'NotoSerifTC',
                      fontSize: 11,
                      color: surfaces.textSecondary,
                    ),
                  ),
                ),
                if (knowsMageArmor(character))
                  SwitchListTile(
                    value: character.mageArmorActive,
                    onChanged: wearingArmor(character)
                        ? null // 著甲中不可施放（2024 規則）
                        : (v) => ref
                              .read(currentCharacterProvider.notifier)
                              .setMageArmor(v),
                    title: const Text(
                      '法師護甲 Mage Armor',
                      style: TextStyle(fontFamily: 'NotoSerifTC', fontSize: 14),
                    ),
                    subtitle: Text(
                      wearingArmor(character)
                          ? '著甲中無法施放'
                          : '基礎 AC 13 + 敏捷（著甲時自動結束）',
                      style: TextStyle(
                        fontSize: 11,
                        color: surfaces.textSecondary,
                      ),
                    ),
                    activeThumbColor: AppColors.accentGold,
                  ),
                const SizedBox(height: 8),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _ShieldPainter extends CustomPainter {
  final Color fillTop;
  final Color fillBottom;

  const _ShieldPainter({required this.fillTop, required this.fillBottom});

  @override
  void paint(Canvas canvas, Size size) {
    final sx = size.width / 140;
    final sy = size.height / 150;

    final outerPath = Path()
      ..moveTo(70 * sx, 0)
      ..lineTo(140 * sx, 28 * sy)
      ..lineTo(140 * sx, 90 * sy)
      ..cubicTo(140 * sx, 128 * sy, 70 * sx, 150 * sy, 70 * sx, 150 * sy)
      ..cubicTo(70 * sx, 150 * sy, 0, 128 * sy, 0, 90 * sy)
      ..lineTo(0, 28 * sy)
      ..close();

    canvas.drawPath(
      outerPath.shift(const Offset(0, 2)),
      Paint()
        ..color = const Color(0x88000000)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 6),
    );

    final fillPaint = Paint()
      ..shader = LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [fillTop, fillBottom],
      ).createShader(Rect.fromLTWH(0, 0, size.width, size.height));
    canvas.drawPath(outerPath, fillPaint);

    final strokePaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2 * sx
      ..shader = const LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [Color(0xFFD4A843), Color(0xFF8B6820), Color(0xFFD4A843)],
        stops: [0.0, 0.5, 1.0],
      ).createShader(Rect.fromLTWH(0, 0, size.width, size.height));
    canvas.drawPath(outerPath, strokePaint);
  }

  @override
  bool shouldRepaint(covariant _ShieldPainter oldDelegate) =>
      oldDelegate.fillTop != fillTop || oldDelegate.fillBottom != fillBottom;
}
