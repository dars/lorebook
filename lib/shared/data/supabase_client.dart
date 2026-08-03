import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

final supabaseClientProvider = Provider<SupabaseClient>(
  (ref) => Supabase.instance.client,
);

/// Supabase 是否已初始化。未帶 `--dart-define-from-file=.env.json` 建置時
/// App 以離線模式運作，此時存取 [supabaseClientProvider] 會擲例外——需要
/// 雲端的 UI（如分享）應先以此判斷再降級。
bool get isSupabaseInitialized {
  try {
    // 必須存取 .client：未初始化（或 initialize 失敗留下半初始化 instance）
    // 時才會丟 LateInitializationError。
    Supabase.instance.client;
    return true;
  } catch (_) {
    return false;
  }
}
