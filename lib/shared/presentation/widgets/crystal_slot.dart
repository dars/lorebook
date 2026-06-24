import 'package:flutter/material.dart';

import '../../../app/theme/app_colors.dart';

class CrystalSlotRow extends StatelessWidget {
  final int level;
  final int total;
  final int used;
  final ValueChanged<int>? onUsedChanged;

  const CrystalSlotRow({
    super.key,
    required this.level,
    required this.total,
    required this.used,
    this.onUsedChanged,
  });

  int get remaining => total - used;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        SizedBox(
          width: 40,
          child: Text(
            '$level環',
            style: TextStyle(
              fontFamily: 'NotoSerifTC',
              fontSize: 12,
              color: AppColors.darkTextSecondary,
            ),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Wrap(
            spacing: 4,
            children: List.generate(total, (i) {
              final isActive = i < remaining;
              return GestureDetector(
                onTap: onUsedChanged != null
                    ? () => onUsedChanged!(isActive ? used + 1 : used - 1)
                    : null,
                child: _CrystalIcon(active: isActive),
              );
            }),
          ),
        ),
        SizedBox(
          width: 36,
          child: Text(
            '$remaining/$total',
            style: TextStyle(
              fontFamily: 'Cinzel',
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: AppColors.darkTextSecondary,
            ),
            textAlign: TextAlign.end,
          ),
        ),
      ],
    );
  }
}

class _CrystalIcon extends StatelessWidget {
  final bool active;

  const _CrystalIcon({required this.active});

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      size: const Size(20, 24),
      painter: _CrystalPainter(
        color: active ? AppColors.crystalActive : AppColors.crystalEmpty,
        active: active,
      ),
    );
  }
}

class _CrystalPainter extends CustomPainter {
  final Color color;
  final bool active;

  _CrystalPainter({required this.color, required this.active});

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;

    final path = Path()
      ..moveTo(w * 0.5, 0)
      ..lineTo(w * 0.85, h * 0.3)
      ..lineTo(w * 0.7, h)
      ..lineTo(w * 0.3, h)
      ..lineTo(w * 0.15, h * 0.3)
      ..close();

    canvas.drawPath(
      path,
      Paint()
        ..color = color.withValues(alpha: active ? 0.85 : 0.3)
        ..style = PaintingStyle.fill,
    );

    canvas.drawPath(
      path,
      Paint()
        ..color = active ? const Color(0xFF4CAF7D) : color
        ..style = PaintingStyle.stroke
        ..strokeWidth = active ? 1.2 : 0.8,
    );

    if (active) {
      final highlightPath = Path()
        ..moveTo(w * 0.5, h * 0.08)
        ..lineTo(w * 0.65, h * 0.3)
        ..lineTo(w * 0.5, h * 0.25)
        ..close();
      canvas.drawPath(
        highlightPath,
        Paint()
          ..color = Colors.white.withValues(alpha: 0.3)
          ..style = PaintingStyle.fill,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _CrystalPainter oldDelegate) =>
      oldDelegate.color != color || oldDelegate.active != active;
}
