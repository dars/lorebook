import 'package:flutter/material.dart';

import 'app_colors.dart';
import 'app_spacing.dart';
import 'app_text_styles.dart';
import 'dnd_colors.dart';

abstract final class AppTheme {
  static ThemeData get light => _build(
    colorScheme: AppColors.lightScheme,
    surface0: AppColors.surface0,
    surface1: AppColors.surface1,
    borderColor: AppColors.border,
    textPrimary: AppColors.textPrimary,
    textSecondary: AppColors.textSecondary,
  );

  static ThemeData get dark => _build(
    colorScheme: AppColors.darkScheme,
    surface0: AppColors.darkSurface0,
    surface1: AppColors.darkSurface1,
    borderColor: AppColors.darkBorder,
    textPrimary: AppColors.darkTextPrimary,
    textSecondary: AppColors.darkTextSecondary,
  );

  static ThemeData _build({
    required ColorScheme colorScheme,
    required Color surface0,
    required Color surface1,
    required Color borderColor,
    required Color textPrimary,
    required Color textSecondary,
  }) {
    final isDark = colorScheme.brightness == Brightness.dark;

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: surface0,
      extensions: [isDark ? DndColors.dark : DndColors.light],
      textTheme: TextTheme(
        headlineLarge: AppTextStyles.h1.copyWith(color: textPrimary),
        headlineMedium: AppTextStyles.h2.copyWith(color: textPrimary),
        bodyLarge: AppTextStyles.body1.copyWith(color: textPrimary),
        bodyMedium: AppTextStyles.body2.copyWith(color: textPrimary),
        bodySmall: AppTextStyles.caption.copyWith(color: textSecondary),
        labelMedium: AppTextStyles.sectionLabel.copyWith(color: textSecondary),
      ),
      cardTheme: CardThemeData(
        color: surface1,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppSpacing.radiusCard),
          side: BorderSide(color: borderColor, width: AppSpacing.borderWidth),
        ),
        margin: EdgeInsets.zero,
      ),
      chipTheme: ChipThemeData(
        backgroundColor: surface1,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppSpacing.radiusChip),
          side: BorderSide(color: borderColor, width: AppSpacing.borderWidth),
        ),
      ),
      dividerTheme: DividerThemeData(
        color: borderColor,
        thickness: AppSpacing.borderWidth,
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: colorScheme.brightness == Brightness.dark
            ? AppColors.darkSurface1
            : AppColors.primary,
        foregroundColor: colorScheme.brightness == Brightness.dark
            ? AppColors.darkTextPrimary
            : Colors.white,
        elevation: 0,
        centerTitle: true,
      ),
      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        backgroundColor: surface1,
        selectedItemColor: AppColors.accentGold,
        unselectedItemColor: textSecondary,
        type: BottomNavigationBarType.fixed,
        elevation: 0,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: surface0,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppSpacing.radiusChip),
          borderSide: BorderSide(color: borderColor),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppSpacing.radiusChip),
          borderSide: BorderSide(color: borderColor),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppSpacing.radiusChip),
          borderSide: const BorderSide(color: AppColors.accentGold, width: 2),
        ),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.lg,
          vertical: AppSpacing.md,
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppSpacing.radiusChip),
          ),
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.xxl,
            vertical: AppSpacing.md,
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: textPrimary,
          side: BorderSide(color: borderColor),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppSpacing.radiusChip),
          ),
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.xxl,
            vertical: AppSpacing.md,
          ),
        ),
      ),
    );
  }
}
