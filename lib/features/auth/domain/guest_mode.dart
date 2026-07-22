import 'package:flutter_riverpod/flutter_riverpod.dart';

/// 訪客試玩模式：未登入即可操作內建範例角色。
/// 僅本機 session，資料不上雲（同步層對未登入本就靜默略過），
/// 重新整理 / 重開 App 後回到登入頁。
final guestModeProvider = StateProvider<bool>((ref) => false);
