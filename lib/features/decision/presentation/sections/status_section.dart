import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../app/theme/app_colors.dart';
import '../../../../app/theme/app_spacing.dart';
import '../../../../app/theme/decorations.dart';
import '../../../../app/theme/dnd_colors.dart';
import '../../../../features/character/domain/character.dart';
import '../../../../features/character/domain/character_providers.dart';
import '../../domain/conditions_catalog.dart';

class StatusSection extends ConsumerWidget {
  const StatusSection({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final character = ref.watch(currentCharacterProvider);
    final notifier = ref.read(currentCharacterProvider.notifier);
    final dividerColor = Theme.of(context).colorScheme.outline;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SectionTitle(title: 'STATUS 狀態'),
        Card(
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
                        onTap: () =>
                            _onTapConcentration(context, ref, character),
                      ),
                    ),
                  ],
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
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
      ],
    );
  }

  Widget _vDivider(Color color) => Padding(
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm),
        child: Container(width: 1, height: 120, color: color),
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
    final tempColor = Theme.of(context).extension<DndColors>()!.tempHp;

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
                color: AppColors.accentGold,
              ),
            ),
          ],
        ),
        const SizedBox(height: 2),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.baseline,
          textBaseline: TextBaseline.alphabetic,
          children: [
            Text(
              '${character.currentHp}',
              style: TextStyle(
                fontFamily: 'Cinzel',
                fontSize: 30,
                fontWeight: FontWeight.w700,
                color: dying ? AppColors.danger : AppColors.darkTextPrimary,
              ),
            ),
            Text(
              '/${character.maxHp}',
              style: TextStyle(
                fontFamily: 'Cinzel',
                fontSize: 14,
                color: AppColors.darkTextSecondary,
              ),
            ),
            const SizedBox(width: 6),
            _TempHpShield(
              value: character.tempHp,
              color: tempColor,
              onTap: onTapShield,
            ),
          ],
        ),
        const SizedBox(height: 4),
        ClipRRect(
          borderRadius: BorderRadius.circular(3),
          child: SizedBox(
            height: 5,
            child: Row(
              children: [
                Expanded(
                  flex: (ratio * 100).round(),
                  child: Container(color: _barColor(ratio)),
                ),
                if (ratio < 1.0)
                  Expanded(
                    flex: ((1 - ratio) * 100).round(),
                    child: Container(color: AppColors.hpBarBg),
                  ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 8),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            _HpButton(icon: Icons.remove, onPressed: onMinus),
            const SizedBox(width: 10),
            _HpButton(icon: Icons.add, onPressed: onPlus),
          ],
        ),
      ],
    );
  }
}

class _TempHpShield extends StatelessWidget {
  final int value;
  final Color color;
  final VoidCallback onTap;

  const _TempHpShield({
    required this.value,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final active = value > 0;
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: SizedBox(
        width: 26,
        height: 26,
        child: Stack(
          alignment: Alignment.center,
          children: [
            Icon(
              Icons.shield,
              size: 26,
              color: active ? color : color.withValues(alpha: 0.3),
            ),
            if (active)
              Text(
                '$value',
                style: const TextStyle(
                  fontFamily: 'Cinzel',
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _HpButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onPressed;
  const _HpButton({required this.icon, required this.onPressed});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onPressed,
      borderRadius: BorderRadius.circular(6),
      child: Container(
        width: 44,
        height: 32,
        decoration: BoxDecoration(
          color: AppColors.darkBorder,
          borderRadius: BorderRadius.circular(6),
        ),
        child: Icon(icon, size: 16, color: AppColors.darkTextPrimary),
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
    final spellName = character.concentrationSpell;
    final active = spellName != null && spellName.isNotEmpty;

    String? subLabel;
    if (active) {
      final match = [...character.spells, ...character.cantrips]
          .where((s) => s.name == spellName);
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
                Icon(Icons.auto_fix_high, size: 12, color: AppColors.accentGold),
                const SizedBox(width: 4),
                Text(
                  '專注',
                  style: TextStyle(
                    fontFamily: 'NotoSerifTC',
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                    color: AppColors.darkTextSecondary,
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
                  color: AppColors.darkTextPrimary,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                subLabel!,
                style: TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 9,
                  color: AppColors.darkTextSecondary,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                '點按取消',
                style: TextStyle(
                  fontFamily: 'NotoSerifTC',
                  fontSize: 9,
                  color: AppColors.darkTextSecondary.withValues(alpha: 0.7),
                ),
              ),
            ] else
              Text(
                '點按選擇',
                style: TextStyle(
                  fontFamily: 'NotoSerifTC',
                  fontSize: 13,
                  color: AppColors.darkTextSecondary.withValues(alpha: 0.6),
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
    final hasAny =
        character.conditions.isNotEmpty || character.exhaustionLevel > 0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(Icons.warning_amber_rounded,
                size: 12, color: AppColors.sectionLabel),
            const SizedBox(width: 6),
            Text(
              '狀態異常・CONDITIONS',
              style: TextStyle(
                fontFamily: 'NotoSerifTC',
                fontSize: 10,
                color: AppColors.goldDim,
              ),
            ),
            const Spacer(),
            InkWell(
              onTap: onEdit,
              borderRadius: BorderRadius.circular(4),
              child: Padding(
                padding: const EdgeInsets.all(4),
                child: Icon(Icons.edit_outlined,
                    size: 16, color: AppColors.darkTextSecondary),
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        if (!hasAny)
          GestureDetector(
            onTap: onEdit,
            behavior: HitTestBehavior.opaque,
            child: Text(
              '目前無異常狀態',
              style: TextStyle(
                fontFamily: 'NotoSerifTC',
                fontSize: 11,
                color: AppColors.darkTextSecondary,
              ),
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
                color: AppColors.darkTextPrimary,
              ),
            ),
            const SizedBox(width: 2),
            GestureDetector(
              onTap: onRemove,
              behavior: HitTestBehavior.opaque,
              child: Icon(Icons.close,
                  size: 14, color: AppColors.darkTextSecondary),
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
            style: TextStyle(fontSize: 11, color: AppColors.darkTextSecondary),
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
    BuildContext context, WidgetRef ref, Character character) {
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
  final items = [...character.spells, ...character.cantrips]
      .where((s) => s.concentration)
      .toList();

  showModalBottomSheet<void>(
    context: context,
    backgroundColor: AppColors.darkSurface1,
    showDragHandle: true,
    builder: (context) => SafeArea(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.fromLTRB(20, 4, 20, 8),
            child: Text('選擇專注法術',
                style: TextStyle(
                    fontFamily: 'NotoSerifTC',
                    fontSize: 16,
                    fontWeight: FontWeight.w700)),
          ),
          if (items.isEmpty)
            Padding(
              padding: const EdgeInsets.all(20),
              child: Text('沒有需要專注的法術',
                  style: TextStyle(color: AppColors.darkTextSecondary)),
            )
          else
            Flexible(
              child: ListView(
                shrinkWrap: true,
                children: [
                  for (final s in items)
                    ListTile(
                      title: Text(s.name,
                          style: const TextStyle(fontFamily: 'NotoSerifTC')),
                      subtitle: s.nameEn.isNotEmpty ? Text(s.nameEn) : null,
                      trailing: Text('${s.level}環',
                          style: TextStyle(color: AppColors.darkTextSecondary)),
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
    ),
  );
}

void _showConditionsSheet(BuildContext context, WidgetRef ref) {
  showModalBottomSheet<void>(
    context: context,
    backgroundColor: AppColors.darkSurface1,
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
                  child: Text('異常狀態',
                      style: TextStyle(
                          fontFamily: 'NotoSerifTC',
                          fontSize: 16,
                          fontWeight: FontWeight.w700)),
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
                          title: Text('${c.name}　${c.nameEn}',
                              style: const TextStyle(fontFamily: 'NotoSerifTC')),
                          subtitle: Text(c.effect,
                              style: TextStyle(
                                  fontSize: 11,
                                  color: AppColors.darkTextSecondary)),
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
      title: Text('${info.name}　${info.nameEn}　Lv$level',
          style: const TextStyle(fontFamily: 'NotoSerifTC')),
      subtitle: Text(info.effect,
          style: TextStyle(fontSize: 11, color: AppColors.darkTextSecondary)),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          IconButton(
            onPressed: level > 0 ? onMinus : null,
            icon: const Icon(Icons.remove_circle_outline),
          ),
          Text('$level',
              style: const TextStyle(
                  fontFamily: 'Cinzel', fontWeight: FontWeight.w700)),
          IconButton(
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
      content: Text(info.effect),
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
    // AC 為唯讀，直接從 provider 取。
    return Consumer(
      builder: (context, ref, _) {
        final value = ref.watch(
            currentCharacterProvider.select((c) => c.ac));
        return SizedBox(
          width: 96,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.shield_outlined,
                      size: 14, color: const Color(0xFFC8A86B)),
                  const SizedBox(width: 4),
                  Text('AC',
                      style: TextStyle(
                        fontFamily: 'Cinzel',
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 1.5,
                        color: const Color(0xFFC8A86B),
                      )),
                ],
              ),
              const SizedBox(height: 4),
              SizedBox(
                width: 80,
                height: 86,
                child: CustomPaint(
                  painter: _ShieldPainter(),
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
                '無甲・敏捷',
                style: TextStyle(
                  fontFamily: 'NotoSerifTC',
                  fontSize: 11,
                  letterSpacing: 0.5,
                  color: const Color(0xFFA08050),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _ShieldPainter extends CustomPainter {
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
      ..shader = const LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [Color(0xFF3A2E1E), Color(0xFF1E1710)],
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
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
