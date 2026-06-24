import 'package:flutter/material.dart';

abstract final class AppSpacing {
  static const double xs = 4;
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double xl = 20;
  static const double xxl = 24;
  static const double xxxl = 32;
  static const double xxxxl = 40;

  static const double radiusCard = 4;
  static const double radiusChip = 4;
  static const double radiusCharacterHeader = 16;

  static const double borderWidth = 1;
  static const double iconStrokeWidth = 1.5;

  static const cardPadding = EdgeInsets.all(lg);
  static const pagePadding = EdgeInsets.symmetric(horizontal: lg, vertical: sm);
  static const sectionSpacing = SizedBox(height: xxl);
}

extension BottomNavClearance on BuildContext {
  /// 浮動底部導覽列所需的內容底部留白（含裝置安全區）。
  ///
  /// AppScaffold 採 `extendBody: true`，Flutter 會把底部導覽列高度併入
  /// MediaQuery 的底部 padding，這裡再加一點間距作為呼吸空間。
  double get bottomNavClearance =>
      MediaQuery.paddingOf(this).bottom + AppSpacing.lg;
}
