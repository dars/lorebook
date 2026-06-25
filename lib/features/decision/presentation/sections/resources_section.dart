import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../app/theme/app_colors.dart';
import '../../../../app/theme/app_spacing.dart';
import '../../../../app/theme/decorations.dart';
import '../../../../features/character/domain/character.dart';
import '../../../../features/character/domain/character_providers.dart';
import '../../../../shared/presentation/widgets/gold_pips.dart';

String _recoverLabel(ResourceRecovery r) => switch (r) {
      ResourceRecovery.short => '短休',
      ResourceRecovery.long => '長休',
      ResourceRecovery.none => '',
    };

class ResourcesSection extends ConsumerWidget {
  const ResourcesSection({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final character = ref.watch(currentCharacterProvider);
    final notifier = ref.read(currentCharacterProvider.notifier);
    final hasSlots = character.spellSlots.isNotEmpty;
    final hasResources = character.resources.isNotEmpty;

    if (!hasSlots && !hasResources) return const SizedBox.shrink();

    final dividerColor = Theme.of(context).colorScheme.outline;

    return CollapsibleSection(
      title: 'RESOURCES 資源',
      child: Card(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (hasSlots) ...[
                  _SubHeader(cn: '法術位', en: 'Spell Slots'),
                  const SizedBox(height: 10),
                  for (final slot in character.spellSlots)
                    Padding(
                      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                      child: _PipRow(
                        label: '${slot.level}環',
                        sub: '',
                        current: slot.total - slot.used,
                        max: slot.total,
                        onChanged: (v) =>
                            notifier.setSlotUsed(slot.level, slot.total - v),
                      ),
                    ),
                ],
                if (hasResources) ...[
                  if (hasSlots)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: Divider(color: dividerColor, height: 1),
                    ),
                  for (final r in character.resources)
                    Padding(
                      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                      child: _ResourceRow(resource: r, notifier: notifier),
                    ),
                ],
              ],
            ),
          ),
        ),
    );
  }
}

class _SubHeader extends StatelessWidget {
  final String cn;
  final String en;
  const _SubHeader({required this.cn, required this.en});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Text(cn,
            style: TextStyle(
              fontFamily: 'NotoSerifTC',
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: AppColors.accentGold,
            )),
        const SizedBox(width: 8),
        Text(en,
            style: TextStyle(
              fontFamily: 'Inter',
              fontSize: 10,
              color: AppColors.darkTextSecondary,
            )),
      ],
    );
  }
}

/// 共用 label 欄（中文 + 英文）。
class _Label extends StatelessWidget {
  final String cn;
  final String en;
  const _Label({required this.cn, required this.en});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 88,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(cn,
              style: TextStyle(
                fontFamily: 'NotoSerifTC',
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: AppColors.darkTextPrimary,
              )),
          if (en.isNotEmpty)
            Text(en,
                style: TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 9,
                  color: AppColors.darkTextSecondary,
                )),
        ],
      ),
    );
  }
}

class _RightInfo extends StatelessWidget {
  final String? value;
  final String recover;
  const _RightInfo({this.value, required this.recover});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        if (value != null)
          Text(value!,
              style: TextStyle(
                fontFamily: 'Cinzel',
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: AppColors.darkTextSecondary,
              )),
        if (recover.isNotEmpty)
          Text(recover,
              style: TextStyle(
                fontFamily: 'Inter',
                fontSize: 8,
                letterSpacing: 1,
                color: AppColors.sectionLabel,
              )),
      ],
    );
  }
}

/// 次數點（pips）列：法術位與離散職業資源共用。
class _PipRow extends StatelessWidget {
  final String label;
  final String sub;
  final int current;
  final int max;
  final String recover;
  final ValueChanged<int> onChanged;

  const _PipRow({
    required this.label,
    required this.sub,
    required this.current,
    required this.max,
    this.recover = '',
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        _Label(cn: label, en: sub),
        const SizedBox(width: 12),
        Expanded(child: GoldPips(current: current, max: max, onChanged: onChanged)),
        const SizedBox(width: 8),
        _RightInfo(value: '$current/$max', recover: recover),
      ],
    );
  }
}

class _ResourceRow extends StatelessWidget {
  final ClassResource resource;
  final CurrentCharacterNotifier notifier;
  const _ResourceRow({required this.resource, required this.notifier});

  @override
  Widget build(BuildContext context) {
    final r = resource;
    final recover = _recoverLabel(r.recovery);

    switch (r.display) {
      case ResourceDisplay.pips:
        return _PipRow(
          label: r.name,
          sub: r.nameEn,
          current: r.current,
          max: r.max,
          recover: recover,
          onChanged: (v) => notifier.setResourceCurrent(r.name, v),
        );
      case ResourceDisplay.number:
        return Row(
          children: [
            _Label(cn: r.name, en: r.nameEn),
            const SizedBox(width: 12),
            Expanded(
              child: Row(
                children: [
                  _StepBtn(sym: '−', onTap: () => notifier.spendResource(r.name)),
                  const SizedBox(width: 8),
                  Text('${r.current}',
                      style: TextStyle(
                        fontFamily: 'Cinzel',
                        fontSize: 22,
                        fontWeight: FontWeight.w700,
                        color: AppColors.accentGold,
                      )),
                  if (r.unit.isNotEmpty) ...[
                    const SizedBox(width: 3),
                    Text(r.unit,
                        style: TextStyle(
                          fontFamily: 'NotoSerifTC',
                          fontSize: 12,
                          color: AppColors.darkTextSecondary,
                        )),
                  ],
                  const SizedBox(width: 8),
                  _StepBtn(
                      sym: '+', onTap: () => notifier.restoreResource(r.name)),
                ],
              ),
            ),
            const SizedBox(width: 8),
            _RightInfo(value: '上限 ${r.max}', recover: recover),
          ],
        );
      case ResourceDisplay.dice:
        return Row(
          children: [
            _Label(cn: r.name, en: r.nameEn),
            const SizedBox(width: 12),
            Expanded(
              child: Row(
                children: [
                  _DieChip(faces: r.dieFaces),
                  const SizedBox(width: 6),
                  Text('×',
                      style: TextStyle(
                        fontFamily: 'Cinzel',
                        fontSize: 14,
                        color: AppColors.darkTextSecondary,
                      )),
                  const SizedBox(width: 6),
                  _StepBtn(sym: '−', onTap: () => notifier.spendResource(r.name)),
                  const SizedBox(width: 8),
                  Text('${r.current}',
                      style: TextStyle(
                        fontFamily: 'Cinzel',
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                        color: AppColors.accentGold,
                      )),
                  const SizedBox(width: 8),
                  _StepBtn(
                      sym: '+', onTap: () => notifier.restoreResource(r.name)),
                ],
              ),
            ),
            const SizedBox(width: 8),
            _RightInfo(value: '上限 ${r.max}', recover: recover),
          ],
        );
    }
  }
}

class _StepBtn extends StatelessWidget {
  final String sym;
  final VoidCallback onTap;
  const _StepBtn({required this.sym, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        width: 24,
        height: 24,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(color: AppColors.goldDim, width: 1),
        ),
        child: Text(sym,
            style: TextStyle(
              fontFamily: 'Cinzel',
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: AppColors.accentGold,
            )),
      ),
    );
  }
}

class _DieChip extends StatelessWidget {
  final int faces;
  const _DieChip({required this.faces});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: AppColors.accentGold, width: 1),
        color: const Color(0x18C9A84C),
      ),
      child: Text('1d$faces',
          style: TextStyle(
            fontFamily: 'Cinzel',
            fontSize: 15,
            fontWeight: FontWeight.w700,
            color: AppColors.accentGold,
          )),
    );
  }
}
