import 'package:flutter/material.dart';

import 'app_colors.dart';
import 'app_spacing.dart';
import 'surface_colors.dart';

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
    final match = RegExp(
      r'^([A-Za-z0-9·_\s]+?)\s+([一-鿿].*)$',
    ).firstMatch(title);
    final enLabel = match?.group(1) ?? title;
    final cnLabel = match?.group(2);
    const labelColor = AppColors.sectionLabel;
    final lineColor = Theme.of(context).extension<SurfaceColors>()!.border2;

    return Padding(
      padding: const EdgeInsets.only(top: AppSpacing.lg, bottom: AppSpacing.sm),
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
          Expanded(child: Container(height: 1, color: lineColor)),
        ],
      ),
    );
  }
}

/// 可收合的頂層區段：標題樣式對齊 [SectionTitle]，加上 chevron，點標題切換收合。
/// 收合時僅顯示標題列；展開時於下方顯示 [child]。
class CollapsibleSection extends StatefulWidget {
  final String title;
  final Widget child;
  final bool initiallyExpanded;

  /// 收合時於標題列顯示的摘要（如「攻擊・施法・其他」）；null 則不顯示。
  final String? summary;

  /// 頁面/欄位中的第一個 section 時設為 true，省略標題上緣間距，
  /// 避免與上層（如 CharacterHeader）的間距疊加後顯得過大。
  final bool isFirst;

  const CollapsibleSection({
    super.key,
    required this.title,
    required this.child,
    this.initiallyExpanded = true,
    this.summary,
    this.isFirst = false,
  });

  @override
  State<CollapsibleSection> createState() => _CollapsibleSectionState();
}

class _CollapsibleSectionState extends State<CollapsibleSection> {
  late bool _expanded = widget.initiallyExpanded;

  @override
  Widget build(BuildContext context) {
    final match = RegExp(
      r'^([A-Za-z0-9·_\s]+?)\s+([一-鿿].*)$',
    ).firstMatch(widget.title);
    final enLabel = match?.group(1) ?? widget.title;
    final cnLabel = match?.group(2);
    const labelColor = AppColors.sectionLabel;
    final surfaces = Theme.of(context).extension<SurfaceColors>()!;
    final lineColor = surfaces.border2;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        InkWell(
          onTap: () => setState(() => _expanded = !_expanded),
          child: Padding(
            padding: EdgeInsets.only(
              top: widget.isFirst ? 0 : AppSpacing.md,
              bottom: AppSpacing.sm,
            ),
            child: Row(
              children: [
                Icon(
                  _expanded ? Icons.expand_more : Icons.chevron_right,
                  size: 17,
                  color: surfaces.accent,
                ),
                const SizedBox(width: 6),
                Text(
                  enLabel,
                  style: TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 2,
                    color: surfaces.accent,
                  ),
                ),
                if (cnLabel != null) ...[
                  const SizedBox(width: 6),
                  Text(
                    cnLabel,
                    style: TextStyle(
                      fontFamily: 'NotoSerifTC',
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: surfaces.textPrimary,
                    ),
                  ),
                ],
                const SizedBox(width: 8),
                if (!_expanded && widget.summary != null)
                  Flexible(
                    child: Text(
                      widget.summary!,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontFamily: 'NotoSerifTC',
                        fontSize: 10,
                        color: labelColor.withValues(alpha: 0.7),
                      ),
                    ),
                  ),
                const SizedBox(width: 6),
                Expanded(child: Container(height: 1, color: lineColor)),
              ],
            ),
          ),
        ),
        if (_expanded) widget.child,
      ],
    );
  }
}

class ParchmentCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;

  const ParchmentCard({super.key, required this.child, this.padding});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(padding: padding ?? AppSpacing.cardPadding, child: child),
    );
  }
}
