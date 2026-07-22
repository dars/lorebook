import 'package:flutter/material.dart';

import 'app_colors.dart';

/// 表面／邊框／文字色票，以 [ThemeExtension] 形式掛在 [ThemeData] 上，
/// 讓原本散落各處、直接寫死 `AppColors.dark*` 的元件改為依主題切換。
///
/// 取用方式：
/// ```dart
/// final surfaces = Theme.of(context).extension<SurfaceColors>()!;
/// final color = surfaces.textPrimary;
/// ```
@immutable
class SurfaceColors extends ThemeExtension<SurfaceColors> {
  final Color surface0;
  final Color surface1;

  /// 選取／啟用狀態的底色（比 surface1 更深一階）。
  final Color surface2;

  final Color border;

  /// 比 [border] 更淡的次要邊框／分隔線。
  final Color border2;

  final Color textPrimary;
  final Color textSecondary;

  /// 介於 textPrimary 與 textSecondary 之間的暖色調文字。
  final Color textLight;

  /// 金色強調（文字/圖示/線條用）：深色主題用亮金，淺色主題用暗金——
  /// 亮金壓在羊皮紙底上對比只剩 ~2:1，不可讀。
  /// 注意：金色「背景」（如 FilledButton 配深字）不在此列，仍用 accentGold。
  final Color accent;

  const SurfaceColors({
    required this.surface0,
    required this.surface1,
    required this.surface2,
    required this.border,
    required this.border2,
    required this.textPrimary,
    required this.textSecondary,
    required this.textLight,
    required this.accent,
  });

  @override
  SurfaceColors copyWith({
    Color? surface0,
    Color? surface1,
    Color? surface2,
    Color? border,
    Color? border2,
    Color? textPrimary,
    Color? textSecondary,
    Color? textLight,
    Color? accent,
  }) {
    return SurfaceColors(
      surface0: surface0 ?? this.surface0,
      surface1: surface1 ?? this.surface1,
      surface2: surface2 ?? this.surface2,
      border: border ?? this.border,
      border2: border2 ?? this.border2,
      textPrimary: textPrimary ?? this.textPrimary,
      textSecondary: textSecondary ?? this.textSecondary,
      textLight: textLight ?? this.textLight,
      accent: accent ?? this.accent,
    );
  }

  @override
  SurfaceColors lerp(ThemeExtension<SurfaceColors>? other, double t) {
    if (other is! SurfaceColors) return this;
    return SurfaceColors(
      surface0: Color.lerp(surface0, other.surface0, t)!,
      surface1: Color.lerp(surface1, other.surface1, t)!,
      surface2: Color.lerp(surface2, other.surface2, t)!,
      border: Color.lerp(border, other.border, t)!,
      border2: Color.lerp(border2, other.border2, t)!,
      textPrimary: Color.lerp(textPrimary, other.textPrimary, t)!,
      textSecondary: Color.lerp(textSecondary, other.textSecondary, t)!,
      textLight: Color.lerp(textLight, other.textLight, t)!,
      accent: Color.lerp(accent, other.accent, t)!,
    );
  }

  static const dark = SurfaceColors(
    surface0: AppColors.darkSurface0,
    surface1: AppColors.darkSurface1,
    surface2: AppColors.darkSurface2,
    border: AppColors.darkBorder,
    border2: AppColors.darkBorder2,
    textPrimary: AppColors.darkTextPrimary,
    textSecondary: AppColors.darkTextSecondary,
    textLight: AppColors.darkTextLight,
    accent: AppColors.accentGold,
  );

  static const light = SurfaceColors(
    surface0: AppColors.surface0,
    surface1: AppColors.surface1,
    surface2: AppColors.surface2,
    border: AppColors.border,
    border2: AppColors.border2,
    textPrimary: AppColors.textPrimary,
    textSecondary: AppColors.textSecondary,
    textLight: AppColors.textLight,
    accent: AppColors.goldDim,
  );
}
