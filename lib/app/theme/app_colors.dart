import 'package:flutter/material.dart';

abstract final class AppColors {
  // ──────────────────────────────────────────
  // Core palette (matched to designs.pen)
  // ──────────────────────────────────────────
  static const primary = Color(0xFF6B4E3E);
  static const primaryDark = Color(0xFF4B3766);
  static const accentGold = Color(0xFFC9A84C);
  static const goldDim = Color(0xFF8B6E2A);
  static const success = Color(0xFF2E7D32);
  static const danger = Color(0xFFC0392B);

  // ──────────────────────────────────────────
  // Text — light theme
  // ──────────────────────────────────────────
  static const textPrimary = Color(0xFF1E1E1E);
  static const textSecondary = Color(0xFF8B8680);

  /// 介於 textPrimary 與 textSecondary 之間的暖色調文字，對應 darkTextLight
  /// 的角色（建角/升級精靈等描述文字，比 textSecondary 顯眼但不搶過標題）。
  static const textLight = Color(0xFF6B5D46);

  // ──────────────────────────────────────────
  // Surfaces — light theme (parchment)
  // ──────────────────────────────────────────
  static const surface0 = Color(0xFFFAF7F2);
  static const surface1 = Color(0xFFF3EFE6);

  /// 對應 darkSurface2：選取/啟用狀態的底色，比 surface1 更深一階。
  static const surface2 = Color(0xFFEEE6D2);
  static const border = Color(0xFFE0D9C7);

  /// 對應 darkBorder2：比主要邊框更淡的次要邊框／分隔線。
  static const border2 = Color(0xFFE8E0CC);

  // ──────────────────────────────────────────
  // Surfaces — dark theme (designs.pen tokens)
  // ──────────────────────────────────────────
  static const darkSurface0 = Color(0xFF1C1610);
  static const darkSurface1 = Color(0xFF2A1F0E);
  static const darkSurface2 = Color(0xFF241A0C);
  static const darkBorder = Color(0xFF5C4420);
  static const darkBorder2 = Color(0xFF3D2D10);
  static const darkTextPrimary = Color(0xFFE8D9B5);
  static const darkTextSecondary = Color(0xFFA08B62);
  static const darkTextLight = Color(0xFFC9B48A);
  static const sectionLabel = Color(0xFF8B7340);

  // ──────────────────────────────────────────
  // Semantic — HP bar
  // ──────────────────────────────────────────
  static const hpFull = Color(0xFFC0392B);
  static const hpMid = Color(0xFF8B3A3A);
  static const hpLow = Color(0xFFC0392B);
  static const hpBarBg = Color(0xFF5B3B3B);

  // ──────────────────────────────────────────
  // Spell slot crystal (gem green)
  // ──────────────────────────────────────────
  static const crystalActive = Color(0xFF2E7D4F);
  static const crystalEmpty = Color(0xFF4A3518);

  // ──────────────────────────────────────────
  // Color scheme constructors
  // ──────────────────────────────────────────
  static ColorScheme get lightScheme => const ColorScheme(
    brightness: Brightness.light,
    primary: primary,
    onPrimary: Colors.white,
    secondary: accentGold,
    onSecondary: textPrimary,
    error: danger,
    onError: Colors.white,
    surface: surface0,
    onSurface: textPrimary,
    surfaceContainerHighest: surface1,
    outline: border,
  );

  static ColorScheme get darkScheme => const ColorScheme(
    brightness: Brightness.dark,
    primary: accentGold,
    onPrimary: darkSurface0,
    secondary: primary,
    onSecondary: darkTextPrimary,
    error: danger,
    onError: Colors.white,
    surface: darkSurface0,
    onSurface: darkTextPrimary,
    surfaceContainerHighest: darkSurface1,
    outline: darkBorder,
  );
}
