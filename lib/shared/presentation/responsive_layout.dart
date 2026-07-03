import 'package:flutter/material.dart';

/// 寬度級距（對齊 Material 3 window size class）。
enum WindowSizeClass {
  /// < 600dp：手機。
  compact,

  /// 600–840dp：iPad 直向等；排列沿用手機、得置中限寬。
  medium,

  /// ≥ 840dp：iPad 橫向等；可用多欄排列。
  expanded,
}

/// 依寬度級距切換版型。
///
/// - [mobile]：compact 版型（必填）。
/// - [tablet]：medium 版型；未提供 [expanded] 時也作為 ≥840 的 fallback。
/// - [expanded]：expanded 版型（≥840dp，如 iPad 橫向的多欄排列）。
class ResponsiveLayout extends StatelessWidget {
  final Widget mobile;
  final Widget? tablet;
  final Widget? expanded;

  const ResponsiveLayout({
    super.key,
    required this.mobile,
    this.tablet,
    this.expanded,
  });

  static const breakpoint = 600.0;
  static const expandedBreakpoint = 840.0;

  static WindowSizeClass sizeClassOf(BuildContext context) {
    final w = MediaQuery.sizeOf(context).width;
    if (w >= expandedBreakpoint) return WindowSizeClass.expanded;
    if (w >= breakpoint) return WindowSizeClass.medium;
    return WindowSizeClass.compact;
  }

  static bool isTablet(BuildContext context) =>
      MediaQuery.sizeOf(context).width >= breakpoint;

  static bool isExpanded(BuildContext context) =>
      MediaQuery.sizeOf(context).width >= expandedBreakpoint;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final w = constraints.maxWidth;
        if (w >= expandedBreakpoint && expanded != null) {
          return expanded!;
        }
        if (w >= breakpoint && tablet != null) {
          return tablet!;
        }
        return mobile;
      },
    );
  }
}
