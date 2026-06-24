import 'package:flutter/material.dart';

import 'app_colors.dart';
import 'app_spacing.dart';

class CardCornerDecoration extends StatelessWidget {
  final Widget child;

  const CardCornerDecoration({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    final borderColor = Theme.of(context).colorScheme.outline;
    return CustomPaint(
      painter: _CornerPainter(color: borderColor),
      child: child,
    );
  }
}

class _CornerPainter extends CustomPainter {
  final Color color;
  _CornerPainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color.withValues(alpha: 0.4)
      ..strokeWidth = 1.0
      ..style = PaintingStyle.stroke;

    const len = 16.0;
    const offset = 4.0;

    // Top-left
    canvas.drawLine(
      const Offset(offset, offset + len),
      const Offset(offset, offset),
      paint,
    );
    canvas.drawLine(
      const Offset(offset, offset),
      const Offset(offset + len, offset),
      paint,
    );

    // Top-right
    canvas.drawLine(
      Offset(size.width - offset - len, offset),
      Offset(size.width - offset, offset),
      paint,
    );
    canvas.drawLine(
      Offset(size.width - offset, offset),
      Offset(size.width - offset, offset + len),
      paint,
    );

    // Bottom-left
    canvas.drawLine(
      Offset(offset, size.height - offset - len),
      Offset(offset, size.height - offset),
      paint,
    );
    canvas.drawLine(
      Offset(offset, size.height - offset),
      Offset(offset + len, size.height - offset),
      paint,
    );

    // Bottom-right
    canvas.drawLine(
      Offset(size.width - offset - len, size.height - offset),
      Offset(size.width - offset, size.height - offset),
      paint,
    );
    canvas.drawLine(
      Offset(size.width - offset, size.height - offset - len),
      Offset(size.width - offset, size.height - offset),
      paint,
    );
  }

  @override
  bool shouldRepaint(covariant _CornerPainter oldDelegate) =>
      oldDelegate.color != color;
}

class DndDivider extends StatelessWidget {
  const DndDivider({super.key});

  @override
  Widget build(BuildContext context) {
    final color = Theme.of(context).colorScheme.outline;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
      child: Row(
        children: [
          Expanded(child: Divider(color: color, thickness: 0.5)),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm),
            child: Icon(Icons.diamond_outlined, size: 8, color: color),
          ),
          Expanded(child: Divider(color: color, thickness: 0.5)),
        ],
      ),
    );
  }
}

class SectionTitle extends StatelessWidget {
  final String title;
  final String? subtitle;
  final IconData? icon;

  const SectionTitle({
    super.key,
    required this.title,
    this.subtitle,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    final match = RegExp(r'^([A-Za-z0-9·_\s]+?)\s+([一-鿿].*)$').firstMatch(title);
    final enLabel = match?.group(1) ?? title;
    final cnLabel = match?.group(2);
    const labelColor = AppColors.sectionLabel;
    final lineColor = AppColors.darkBorder2;

    return Padding(
      padding: const EdgeInsets.only(
        top: AppSpacing.lg,
        bottom: AppSpacing.sm,
      ),
      child: Row(
        children: [
          if (icon != null) ...[
            Icon(icon, size: 14, color: labelColor),
            const SizedBox(width: AppSpacing.sm),
          ],
          Text(
            enLabel,
            style: const TextStyle(
              fontFamily: 'Inter',
              fontSize: 10,
              fontWeight: FontWeight.w700,
              letterSpacing: 2,
              color: labelColor,
            ),
          ),
          if (cnLabel != null) ...[
            const SizedBox(width: 6),
            Text(
              cnLabel,
              style: const TextStyle(
                fontFamily: 'NotoSerifTC',
                fontSize: 10,
                fontWeight: FontWeight.w400,
                color: labelColor,
              ),
            ),
          ],
          const SizedBox(width: 6),
          Expanded(
            child: Container(
              height: 1,
              color: lineColor,
            ),
          ),
        ],
      ),
    );
  }
}

class ParchmentCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;

  const ParchmentCard({
    super.key,
    required this.child,
    this.padding,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: padding ?? AppSpacing.cardPadding,
        child: child,
      ),
    );
  }
}
