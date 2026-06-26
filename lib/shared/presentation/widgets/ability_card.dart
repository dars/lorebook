import 'package:flutter/material.dart';

import '../../../app/theme/app_colors.dart';

class StatRow extends StatelessWidget {
  final String labelCN;
  final String labelEN;
  final String modifier;
  final bool isProficient;
  final IconData? icon;

  const StatRow({
    super.key,
    required this.labelCN,
    required this.labelEN,
    required this.modifier,
    this.isProficient = false,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    final modColor =
        isProficient ? AppColors.accentGold : AppColors.darkTextSecondary;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
      decoration: BoxDecoration(
        color: AppColors.darkSurface1,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: AppColors.darkBorder, width: 1),
      ),
      child: Row(
        children: [
          if (icon != null) ...[
            Icon(icon, size: 14, color: modColor),
            const SizedBox(width: 8),
          ] else ...[
            Container(
              width: 6,
              height: 6,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: isProficient ? AppColors.accentGold : AppColors.darkBorder,
              ),
            ),
            const SizedBox(width: 10),
          ],
          Text(
            labelCN,
            style: TextStyle(
              fontFamily: 'NotoSerifTC',
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: AppColors.darkTextPrimary,
            ),
          ),
          const SizedBox(width: 6),
          Text(
            labelEN,
            style: TextStyle(
              fontFamily: 'Inter',
              fontSize: 11,
              color: AppColors.darkTextSecondary,
            ),
          ),
          const Spacer(),
          Text(
            modifier,
            style: TextStyle(
              fontFamily: 'Cinzel',
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: modColor,
            ),
          ),
        ],
      ),
    );
  }
}

class CompactStatRow extends StatelessWidget {
  final String labelCN;
  final String labelEN;
  final String modifier;
  final bool isProficient;
  final bool selected;
  final VoidCallback? onTap;

  const CompactStatRow({
    super.key,
    required this.labelCN,
    required this.labelEN,
    required this.modifier,
    this.isProficient = false,
    this.selected = false,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final modColor = selected
        ? AppColors.accentGold
        : (isProficient ? AppColors.accentGold : AppColors.darkTextSecondary);
    final borderColor =
        selected ? AppColors.accentGold : AppColors.darkBorder;
    final fillColor =
        selected ? const Color(0x22C9A84C) : AppColors.darkSurface1;

    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: fillColor,
          borderRadius: BorderRadius.circular(6),
          border: Border.all(color: borderColor, width: selected ? 1.5 : 1),
        ),
        child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  labelCN,
                  style: TextStyle(
                    fontFamily: 'NotoSerifTC',
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: AppColors.darkTextPrimary,
                  ),
                ),
                Text(
                  labelEN,
                  style: TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 10,
                    color: AppColors.darkTextSecondary,
                  ),
                ),
              ],
            ),
          ),
          Text(
            modifier,
            style: TextStyle(
              fontFamily: 'Cinzel',
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: modColor,
            ),
          ),
        ],
        ),
      ),
    );
  }
}
