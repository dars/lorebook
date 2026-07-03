import 'package:flutter/material.dart';

import '../../../app/theme/app_colors.dart';
import '../../../app/theme/app_spacing.dart';

/// 可重複使用的條目卡，樣式對齊 designs.pen 的 `AbilityCard`。
///
/// 單一卡片（圓角 + 邊框）內分為：
/// 1. 標題列 — 左側徽章、中文 / 英文名稱、右側資訊與數值、展開指示
/// 2. 分隔線（展開時）
/// 3. 描述面板（展開時，較深底色的凹陷區）— 描述本文 + 補充說明
///
/// 法術、戲法、武器等清單皆可套用。
class EntryCard extends StatefulWidget {
  /// 左側徽章文字（戲 / 環數 / 攻…）。
  final String badge;
  final String title;
  final String subtitle;

  /// 右上資訊（射程、命中…）。
  final String? meta;

  /// meta 前是否顯示箭頭（表示射程 / 方向）。
  final bool metaArrow;

  /// 右下主要數值（傷害、命中…）。
  final String? value;

  /// 數值顏色（依傷害類型等），預設使用主題金色。
  final Color? valueColor;

  /// 展開後的描述本文（留空則不可展開）。
  final String? description;

  /// 展開後的補充說明（升級效應、特性…）。
  final String? footnote;

  /// 徽章是否以金色強調（已備法術、武器）。
  final bool emphasizeBadge;

  const EntryCard({
    super.key,
    required this.badge,
    required this.title,
    required this.subtitle,
    this.meta,
    this.metaArrow = false,
    this.value,
    this.valueColor,
    this.description,
    this.footnote,
    this.emphasizeBadge = false,
  });

  bool get _expandable =>
      (description != null && description!.isNotEmpty) ||
      (footnote != null && footnote!.isNotEmpty);

  @override
  State<EntryCard> createState() => _EntryCardState();
}

class _EntryCardState extends State<EntryCard> {
  static const _radius = 10.0;
  bool _expanded = false;

  void _toggle() {
    if (!widget._expandable) return;
    setState(() => _expanded = !_expanded);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final border = scheme.outline;
    final headerBg = theme.cardTheme.color ?? scheme.surfaceContainerHighest;
    final panelBg = theme.scaffoldBackgroundColor;

    return DecoratedBox(
      // 邊框畫在前景，避免被內層不透明的 ClipRRect 蓋掉（外框才看得見）。
      position: DecorationPosition.foreground,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(_radius),
        border: Border.all(color: border),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(_radius),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // 標題列
            Material(
              color: headerBg,
              child: InkWell(
                onTap: widget._expandable ? _toggle : null,
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 12,
                  ),
                  child: _header(theme),
                ),
              ),
            ),
            // 描述面板
            if (_expanded) ...[
              Container(height: 1, color: border),
              Container(
                width: double.infinity,
                color: panelBg,
                padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
                child: _detail(theme),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _header(ThemeData theme) {
    final scheme = theme.colorScheme;
    final valueColor = widget.valueColor ?? AppColors.goldDim;
    final badgeBorder = widget.emphasizeBadge
        ? AppColors.goldDim
        : scheme.outline;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        // 徽章
        Container(
          width: 34,
          height: 34,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(6),
            border: Border.all(color: badgeBorder),
            color: widget.emphasizeBadge
                ? AppColors.goldDim.withValues(alpha: 0.09)
                : null,
          ),
          child: Text(
            widget.badge,
            style: TextStyle(
              fontFamily: 'NotoSerifTC',
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: widget.emphasizeBadge
                  ? AppColors.goldDim
                  : scheme.onSurface.withValues(alpha: 0.7),
            ),
          ),
        ),
        const SizedBox(width: AppSpacing.md),
        // 名稱
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                widget.title,
                style: TextStyle(
                  fontFamily: 'NotoSerifTC',
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: scheme.onSurface,
                ),
              ),
              if (widget.subtitle.isNotEmpty)
                Text(
                  widget.subtitle,
                  style: TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 11,
                    color: scheme.onSurface.withValues(alpha: 0.45),
                  ),
                ),
            ],
          ),
        ),
        const SizedBox(width: AppSpacing.md),
        // 右側資訊
        if (widget.meta != null || widget.value != null)
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              if (widget.meta != null)
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (widget.metaArrow) ...[
                      Icon(
                        Icons.arrow_forward,
                        size: 11,
                        color: scheme.onSurface.withValues(alpha: 0.45),
                      ),
                      const SizedBox(width: 3),
                    ],
                    Text(
                      widget.meta!,
                      style: TextStyle(
                        fontFamily: 'NotoSerifTC',
                        fontSize: 12,
                        color: scheme.onSurface.withValues(alpha: 0.55),
                      ),
                    ),
                  ],
                ),
              if (widget.value != null) ...[
                const SizedBox(height: 2),
                Text(
                  widget.value!,
                  style: TextStyle(
                    fontFamily: 'Cinzel',
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: valueColor,
                  ),
                ),
              ],
            ],
          ),
        // 展開指示
        if (widget._expandable) ...[
          const SizedBox(width: AppSpacing.sm),
          AnimatedRotation(
            turns: _expanded ? 0.5 : 0,
            duration: const Duration(milliseconds: 150),
            child: Icon(
              Icons.expand_more,
              size: 20,
              color: scheme.onSurface.withValues(alpha: 0.4),
            ),
          ),
        ],
      ],
    );
  }

  Widget _detail(ThemeData theme) {
    final scheme = theme.colorScheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (widget.description != null && widget.description!.isNotEmpty)
          Text(
            widget.description!,
            style: TextStyle(
              fontFamily: 'NotoSerifTC',
              fontSize: 14,
              height: 1.75,
              color: scheme.onSurface.withValues(alpha: 0.85),
            ),
          ),
        if (widget.footnote != null && widget.footnote!.isNotEmpty) ...[
          const SizedBox(height: AppSpacing.md),
          Text(
            widget.footnote!,
            style: TextStyle(
              fontFamily: 'NotoSerifTC',
              fontSize: 13,
              height: 1.6,
              color: AppColors.goldDim,
            ),
          ),
        ],
      ],
    );
  }
}
