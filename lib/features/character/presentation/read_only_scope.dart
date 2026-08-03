import 'package:flutter/widgets.dart';

/// 角色卡的唯讀情境（分享檢視頁）。
///
/// 唯讀性以此單一旗標控制，**不由各 tab 各自判斷**：新增分頁或欄位時，其
/// 寫入入口一併納入此開關即可。唯讀時寫入入口 SHALL **不予渲染**而非
/// 渲染後停用——避免留下大量按不動的觸控目標（見 openspec design D5）。
class ReadOnlyScope extends InheritedWidget {
  final bool readOnly;

  const ReadOnlyScope({
    super.key,
    required this.readOnly,
    required super.child,
  });

  /// 未包在 [ReadOnlyScope] 內時預設可編輯（主人自己的角色卡）。
  static bool of(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<ReadOnlyScope>()?.readOnly ??
      false;

  @override
  bool updateShouldNotify(ReadOnlyScope oldWidget) =>
      oldWidget.readOnly != readOnly;
}
