import 'package:flutter/material.dart';

import '../../../app/theme/app_colors.dart';
import '../../../app/theme/surface_colors.dart';

/// 金色 pip（點狀）資源顯示，供法術位與離散型職業資源共用。
///
/// 顯示 [max] 顆點，前 [current] 顆為實心金色。點選某顆會把當前值設為
/// 「點到實心 → 該位置（減少）／點到空 → 該位置+1（增加）」，透過 [onChanged]
/// 回傳新的當前值。[onChanged] 為 null 時不可互動。
class GoldPips extends StatelessWidget {
  final int current;
  final int max;
  final ValueChanged<int>? onChanged;

  const GoldPips({
    super.key,
    required this.current,
    required this.max,
    this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 6,
      runSpacing: 6,
      children: List.generate(max, (i) {
        final filled = i < current;
        return GestureDetector(
          onTap: onChanged == null
              ? null
              : () => onChanged!(filled ? i : i + 1),
          behavior: HitTestBehavior.opaque,
          child: _Pip(filled: filled),
        );
      }),
    );
  }
}

class _Pip extends StatelessWidget {
  final bool filled;
  const _Pip({required this.filled});

  @override
  Widget build(BuildContext context) {
    final surfaces = Theme.of(context).extension<SurfaceColors>()!;
    return Container(
      width: 16,
      height: 16,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: filled ? AppColors.accentGold : surfaces.surface2,
        border: Border.all(
          color: filled ? const Color(0xFFE0C56A) : surfaces.border,
          width: 1,
        ),
      ),
    );
  }
}
