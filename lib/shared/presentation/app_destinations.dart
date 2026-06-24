import 'package:flutter/material.dart';

/// 全 App 主導覽分頁的單一來源 (single source of truth)。
///
/// 底部書籤列 (mobile)、側邊 NavigationRail (tablet) 與路由切換皆共用此清單，
/// 避免 icon / label / path 散落在多個檔案造成不同步。
class AppDestination {
  final String path;
  final IconData icon;
  final String label;

  /// 此分頁是否綁定「當前角色」情境。
  ///
  /// - `true`：顯示 [CharacterHeader]（行動、角色…）
  /// - `false`：全域 / 系統頁，顯示純標題的 [PageHeader]（設定…）
  final bool characterScoped;

  const AppDestination({
    required this.path,
    required this.icon,
    required this.label,
    this.characterScoped = true,
  });
}

const appDestinations = <AppDestination>[
  AppDestination(
    path: '/main/decision',
    icon: Icons.auto_fix_high,
    label: '行動',
  ),
  AppDestination(
    path: '/main/character',
    icon: Icons.person_outline,
    label: '角色',
  ),
  AppDestination(
    path: '/main/journal',
    icon: Icons.menu_book_outlined,
    label: '旅程',
  ),
  AppDestination(
    path: '/main/system',
    icon: Icons.settings_outlined,
    label: '設定',
    characterScoped: false,
  ),
];
