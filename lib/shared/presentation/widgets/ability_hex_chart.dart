import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../../app/theme/app_colors.dart';
import '../../../app/theme/surface_colors.dart';

/// 六角能力雷達圖。
///
/// [values] 為六軸正規化值（0~1），順序對應 [labels]（預設 力/敏/體/智/感/魅）。
/// [highlights] 為要以金色強調的軸索引。
class AbilityHexChart extends StatelessWidget {
  final List<double> values;
  final Set<int> highlights;
  final List<String> labels;

  const AbilityHexChart({
    super.key,
    required this.values,
    this.highlights = const {},
    this.labels = const ['力量', '敏捷', '體質', '智力', '感知', '魅力'],
  });

  @override
  Widget build(BuildContext context) {
    final surfaces = Theme.of(context).extension<SurfaceColors>()!;
    return Center(
      child: SizedBox(
        width: 220,
        height: 200,
        child: CustomPaint(
          painter: _AbilityHexPainter(
            values: values,
            highlights: highlights,
            labels: labels,
            gridColor: surfaces.border2,
            labelColor: surfaces.textSecondary,
          ),
        ),
      ),
    );
  }
}

class _AbilityHexPainter extends CustomPainter {
  final List<double> values;
  final Set<int> highlights;
  final List<String> labels;
  final Color gridColor;
  final Color labelColor;

  _AbilityHexPainter({
    required this.values,
    required this.highlights,
    required this.labels,
    required this.gridColor,
    required this.labelColor,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = math.min(size.width, size.height) / 2 - 26;

    Offset vertex(int i, double r) {
      final angle = -math.pi / 2 + i * math.pi / 3;
      return center + Offset(math.cos(angle) * r, math.sin(angle) * r);
    }

    final grid = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1
      ..color = gridColor;
    for (final ring in [0.4, 0.7, 1.0]) {
      final path = Path();
      for (var i = 0; i < 6; i++) {
        final p = vertex(i, radius * ring);
        i == 0 ? path.moveTo(p.dx, p.dy) : path.lineTo(p.dx, p.dy);
      }
      path.close();
      canvas.drawPath(path, grid);
    }
    for (var i = 0; i < 6; i++) {
      canvas.drawLine(center, vertex(i, radius), grid);
    }

    final dataPath = Path();
    for (var i = 0; i < 6; i++) {
      final p = vertex(i, radius * values[i].clamp(0.0, 1.0));
      i == 0 ? dataPath.moveTo(p.dx, p.dy) : dataPath.lineTo(p.dx, p.dy);
    }
    dataPath.close();
    canvas.drawPath(
      dataPath,
      Paint()
        ..style = PaintingStyle.fill
        ..color = AppColors.accentGold.withValues(alpha: 0.30),
    );
    canvas.drawPath(
      dataPath,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.5
        ..color = AppColors.accentGold,
    );

    for (var i = 0; i < 6; i++) {
      final on = highlights.contains(i);
      final tp = TextPainter(
        text: TextSpan(
          text: labels[i],
          style: TextStyle(
            fontFamily: 'NotoSerifTC',
            fontSize: 12,
            fontWeight: on ? FontWeight.w700 : FontWeight.w400,
            color: on ? AppColors.accentGold : labelColor,
          ),
        ),
        textDirection: TextDirection.ltr,
      )..layout();
      final p = vertex(i, radius + 16);
      tp.paint(canvas, p - Offset(tp.width / 2, tp.height / 2));
    }
  }

  @override
  bool shouldRepaint(_AbilityHexPainter old) =>
      old.values != values ||
      old.highlights != highlights ||
      old.gridColor != gridColor ||
      old.labelColor != labelColor;
}
