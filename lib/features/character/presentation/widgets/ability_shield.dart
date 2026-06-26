import 'package:flutter/material.dart';

import '../../../../app/theme/app_colors.dart';

/// 屬性頁的能力值盾牌：上方中文名、置中大修正值、英文縮寫，
/// 底部圓圈顯示原始能力值。施法屬性以高亮色強調。
class AbilityShield extends StatelessWidget {
  final String nameCn;
  final String nameEn;
  final int modifier;
  final int score;
  final bool highlighted;

  const AbilityShield({
    super.key,
    required this.nameCn,
    required this.nameEn,
    required this.modifier,
    required this.score,
    this.highlighted = false,
  });

  String get _modText => modifier >= 0 ? '+$modifier' : '$modifier';

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final accent =
        highlighted ? AppColors.accentGold : theme.colorScheme.outline;
    final fill = highlighted
        ? AppColors.accentGold.withValues(alpha: 0.08)
        : (theme.cardTheme.color ?? theme.colorScheme.surfaceContainerHighest);

    return AspectRatio(
      aspectRatio: 0.82,
      child: CustomPaint(
        painter: _ShieldPainter(fill: fill, stroke: accent),
        child: Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                nameCn,
                style: TextStyle(
                  fontFamily: 'NotoSerifTC',
                  fontSize: 13,
                  color: theme.colorScheme.onSurface,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                _modText,
                style: TextStyle(
                  fontFamily: 'Cinzel',
                  fontSize: 30,
                  fontWeight: FontWeight.w700,
                  height: 1,
                  color: highlighted
                      ? AppColors.accentGold
                      : theme.colorScheme.onSurface,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                nameEn,
                style: TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 10,
                  letterSpacing: 1,
                  color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
                ),
              ),
              const SizedBox(height: 6),
              Container(
                width: 28,
                height: 28,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: theme.scaffoldBackgroundColor,
                  border: Border.all(color: accent, width: 1),
                ),
                child: Text(
                  '$score',
                  style: TextStyle(
                    fontFamily: 'Cinzel',
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: theme.colorScheme.onSurface,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ShieldPainter extends CustomPainter {
  final Color fill;
  final Color stroke;

  _ShieldPainter({required this.fill, required this.stroke});

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;

    final path = Path()
      ..moveTo(w * 0.5, 0)
      ..lineTo(w, h * 0.06)
      ..lineTo(w, h * 0.55)
      ..quadraticBezierTo(w, h * 0.82, w * 0.5, h)
      ..quadraticBezierTo(0, h * 0.82, 0, h * 0.55)
      ..lineTo(0, h * 0.06)
      ..close();

    canvas
      ..drawPath(path, Paint()..color = fill)
      ..drawPath(
        path,
        Paint()
          ..color = stroke
          ..style = PaintingStyle.stroke
          ..strokeWidth = 1.2,
      );
  }

  @override
  bool shouldRepaint(covariant _ShieldPainter old) =>
      old.fill != fill || old.stroke != stroke;
}
