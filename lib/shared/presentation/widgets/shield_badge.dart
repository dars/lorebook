import 'package:flutter/material.dart';

import '../../../app/theme/app_colors.dart';

class ShieldBadge extends StatelessWidget {
  final String label;
  final String value;
  final String? subtitle;
  final bool highlighted;
  final double size;

  const ShieldBadge({
    super.key,
    required this.label,
    required this.value,
    this.subtitle,
    this.highlighted = false,
    this.size = 80,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final accentColor = highlighted
        ? AppColors.success
        : theme.colorScheme.outline;

    return SizedBox(
      width: size,
      child: CustomPaint(
        painter: _ShieldPainter(
          fillColor:
              theme.cardTheme.color ??
              theme.colorScheme.surfaceContainerHighest,
          strokeColor: accentColor,
          highlighted: highlighted,
        ),
        child: SizedBox(
          width: size,
          height: size * 1.15,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                label,
                style: theme.textTheme.bodySmall?.copyWith(
                  fontSize: 10,
                  color: accentColor,
                ),
              ),
              Text(
                value,
                style: TextStyle(
                  fontFamily: 'SourceSans3',
                  fontSize: size * 0.3,
                  fontWeight: FontWeight.w700,
                  color: theme.colorScheme.onSurface,
                ),
              ),
              if (subtitle != null)
                Text(
                  subtitle!,
                  style: theme.textTheme.bodySmall?.copyWith(fontSize: 9),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ShieldPainter extends CustomPainter {
  final Color fillColor;
  final Color strokeColor;
  final bool highlighted;

  _ShieldPainter({
    required this.fillColor,
    required this.strokeColor,
    required this.highlighted,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;

    final path = Path()
      ..moveTo(w * 0.5, 0)
      ..lineTo(w, h * 0.08)
      ..lineTo(w, h * 0.6)
      ..quadraticBezierTo(w, h * 0.75, w * 0.5, h)
      ..quadraticBezierTo(0, h * 0.75, 0, h * 0.6)
      ..lineTo(0, h * 0.08)
      ..close();

    canvas.drawPath(
      path,
      Paint()
        ..color = fillColor
        ..style = PaintingStyle.fill,
    );

    canvas.drawPath(
      path,
      Paint()
        ..color = strokeColor
        ..style = PaintingStyle.stroke
        ..strokeWidth = highlighted ? 1.5 : 1.0,
    );
  }

  @override
  bool shouldRepaint(covariant _ShieldPainter oldDelegate) =>
      oldDelegate.fillColor != fillColor ||
      oldDelegate.strokeColor != strokeColor ||
      oldDelegate.highlighted != highlighted;
}
