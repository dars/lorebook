import 'package:flutter/material.dart';

import '../../../app/theme/app_colors.dart';

class AbilityCard extends StatelessWidget {
  final String badgeText;
  final Color? badgeColor;
  final Color? badgeFill;
  final Color? badgeStroke;
  final String nameCN;
  final String nameEN;
  final String? range;
  final String? effect;
  final Color? effectColor;
  final bool showChevron;
  final bool expanded;
  final String? description;
  final String? upgradeNote;
  final VoidCallback? onTap;
  final Color? cardStroke;

  const AbilityCard({
    super.key,
    required this.badgeText,
    this.badgeColor,
    this.badgeFill,
    this.badgeStroke,
    required this.nameCN,
    required this.nameEN,
    this.range,
    this.effect,
    this.effectColor,
    this.showChevron = true,
    this.expanded = false,
    this.description,
    this.upgradeNote,
    this.onTap,
    this.cardStroke,
  });

  @override
  Widget build(BuildContext context) {
    final stroke = cardStroke ?? AppColors.darkBorder;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          color: AppColors.darkSurface1,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: stroke, width: 1),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _buildCardRow(),
            if (expanded && description != null) ...[
              Container(height: 1, color: stroke),
              _buildDescPanel(),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildCardRow() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      color: const Color(0xFF2E2010),
      child: Row(
        children: [
          _buildBadge(),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  nameCN,
                  style: TextStyle(
                    fontFamily: 'NotoSerifTC',
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: AppColors.darkTextPrimary,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  nameEN,
                  style: TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 11,
                    color: AppColors.darkTextSecondary,
                  ),
                ),
              ],
            ),
          ),
          if (range != null || effect != null)
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                if (range != null)
                  Text(
                    range!,
                    style: TextStyle(
                      fontFamily: 'Cinzel',
                      fontSize: 10,
                      color: AppColors.darkTextSecondary,
                    ),
                  ),
                if (effect != null)
                  Text(
                    effect!,
                    style: TextStyle(
                      fontFamily: 'Cinzel',
                      fontSize: 17,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.5,
                      color: effectColor ?? AppColors.accentGold,
                    ),
                  ),
              ],
            ),
          if (showChevron) ...[
            const SizedBox(width: 8),
            Icon(
              expanded ? Icons.expand_more : Icons.chevron_right,
              size: 16,
              color: AppColors.darkTextSecondary,
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildBadge() {
    return Container(
      width: 32,
      height: 32,
      decoration: BoxDecoration(
        color: badgeFill ?? const Color(0x18C9A84C),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(
          color: badgeStroke ?? AppColors.accentGold,
          width: 1,
        ),
      ),
      alignment: Alignment.center,
      child: Text(
        badgeText,
        style: TextStyle(
          fontFamily: 'NotoSerifTC',
          fontSize: 12,
          fontWeight: FontWeight.w700,
          color: badgeColor ?? AppColors.accentGold,
        ),
      ),
    );
  }

  Widget _buildDescPanel() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFF201508), Color(0xFF1A1005)],
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (description != null)
            Text(
              description!,
              style: TextStyle(
                fontFamily: 'NotoSerifTC',
                fontSize: 13,
                height: 1.8,
                color: AppColors.darkTextLight,
              ),
            ),
          if (upgradeNote != null) ...[
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0x0DC9A84C),
                borderRadius: BorderRadius.circular(6),
                border: Border.all(color: AppColors.goldDim, width: 1),
              ),
              child: Text(
                upgradeNote!,
                style: TextStyle(
                  fontFamily: 'NotoSerifTC',
                  fontSize: 11,
                  height: 1.5,
                  color: AppColors.sectionLabel,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class SubSectionHeader extends StatelessWidget {
  final IconData icon;
  final String labelCN;
  final String labelEN;
  final int? count;

  const SubSectionHeader({
    super.key,
    required this.icon,
    required this.labelCN,
    required this.labelEN,
    this.count,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0xCC2A1F0E),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: AppColors.darkBorder2, width: 1),
      ),
      child: Row(
        children: [
          Icon(icon, size: 14, color: AppColors.goldDim),
          const SizedBox(width: 8),
          Text(
            labelCN,
            style: TextStyle(
              fontFamily: 'NotoSerifTC',
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: AppColors.darkTextPrimary,
            ),
          ),
          const SizedBox(width: 8),
          Text(
            labelEN,
            style: TextStyle(
              fontFamily: 'Inter',
              fontSize: 10,
              color: AppColors.darkTextSecondary,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Container(height: 1, color: AppColors.darkBorder2),
          ),
          if (count != null) ...[
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: const Color(0x18C9A84C),
                borderRadius: BorderRadius.circular(4),
                border: Border.all(color: AppColors.goldDim, width: 1),
              ),
              child: Text(
                '$count',
                style: TextStyle(
                  fontFamily: 'Cinzel',
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: AppColors.accentGold,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

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
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
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
                    fontSize: 14,
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
              fontSize: 17,
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
