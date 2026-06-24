import 'package:flutter/material.dart';

import '../../../../app/theme/app_colors.dart';

/// 總覽頁基本資訊格內的單一欄位：上方小標籤、下方中文值 + 英文值。
class InfoField extends StatelessWidget {
  final String label;
  final String value;
  final String valueEn;

  const InfoField({
    super.key,
    required this.label,
    required this.value,
    this.valueEn = '',
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontFamily: 'Inter',
            fontSize: 9,
            letterSpacing: 1.5,
            color: AppColors.sectionLabel,
          ),
        ),
        const SizedBox(height: 4),
        Text.rich(
          TextSpan(
            children: [
              TextSpan(
                text: value,
                style: TextStyle(
                  fontFamily: 'NotoSerifTC',
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: theme.colorScheme.onSurface,
                ),
              ),
              if (valueEn.isNotEmpty)
                TextSpan(
                  text: '  $valueEn',
                  style: TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 11,
                    color: theme.colorScheme.onSurface.withValues(alpha: 0.45),
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }
}
