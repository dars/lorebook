import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart' hide AuthException;

import '../../../features/auth/domain/auth_state.dart';
import '../../../shared/data/supabase_client.dart';
import '../../../shared/domain/app_exception.dart';
import '../domain/character.dart';
import '../domain/character_providers.dart';

/// 角色資料雲端同步（`user_characters` 表，見
/// supabase/migrations/0001_user_characters.sql）。
///
/// 策略：整份 `Character.toJson()` 存 `data jsonb`（文件層級
/// last-write-wins）；`name`/`class_name`/`level` 為清單用提升欄位；
/// 刪除採軟刪除（`deleted_at`）。未登入（離線模式）時所有操作
/// 靜默略過 / 擲 [DataException] 由呼叫端降級。
class CharacterSyncRepository {
  final SupabaseClient _client;

  CharacterSyncRepository(this._client);

  bool get _signedIn => _client.auth.currentSession != null;

  /// 取回此使用者全部角色（未刪除，新→舊）。
  Future<List<Character>> fetchAll() async {
    if (!_signedIn) throw const DataException('未登入，無法讀取雲端角色');
    try {
      final rows = await _client
          .from('user_characters')
          .select('data')
          .isFilter('deleted_at', null)
          .order('updated_at', ascending: false);
      return [
        for (final r in rows)
          Character.fromJson((r['data'] as Map).cast<String, dynamic>()),
      ];
    } on PostgrestException catch (e) {
      throw DataException('讀取雲端角色失敗：${e.message}');
    } catch (e) {
      throw DataException('讀取雲端角色失敗：$e');
    }
  }

  /// 推送（新增或覆蓋）一個角色。未登入時靜默略過。
  Future<void> upsert(Character c) async {
    if (!_signedIn) return;
    try {
      await _client.from('user_characters').upsert({
        'id': c.id,
        'name': c.name,
        'class_name': c.className,
        'level': c.level,
        'data': c.toJson(),
      });
    } on PostgrestException catch (e) {
      throw DataException('同步角色失敗：${e.message}');
    } catch (e) {
      throw DataException('同步角色失敗：$e');
    }
  }

  /// 軟刪除（多裝置下 tombstone 防止被復活）。未登入時靜默略過。
  Future<void> softDelete(String id) async {
    if (!_signedIn) return;
    try {
      await _client
          .from('user_characters')
          .update({'deleted_at': DateTime.now().toUtc().toIso8601String()})
          .eq('id', id);
    } on PostgrestException catch (e) {
      throw DataException('刪除雲端角色失敗：${e.message}');
    } catch (e) {
      throw DataException('刪除雲端角色失敗：$e');
    }
  }
}

final characterSyncRepositoryProvider = Provider<CharacterSyncRepository>((
  ref,
) {
  final client = ref.watch(supabaseClientProvider);
  return CharacterSyncRepository(client);
});

/// 雲端角色清單（角色選擇頁用；離線/未登入時為 error 狀態，由 UI 降級）。
///
/// 依賴 auth 狀態：登入/登出/token 更新都會重新抓取，避免
/// 「登入前抓失敗被快取、登入後不重試」的時序問題。
final remoteCharactersProvider = FutureProvider<List<Character>>((ref) {
  ref.watch(authStateChangesProvider);
  return ref.watch(characterSyncRepositoryProvider).fetchAll();
});

/// 自動同步控制器：
/// - 當前角色任何變更 → debounce 3 秒後推送；
/// - App 進背景 → 立即推送未送出的變更。
///
/// 掛載方式：在 App root `ref.watch(characterSyncControllerProvider)`。
/// 未選定角色（selectedCharacterId == null，current 為 mock fallback）
/// 時不推送，避免把展示用 mock 寫上雲端。
final characterSyncControllerProvider = Provider<void>((ref) {
  final repo = ref.watch(characterSyncRepositoryProvider);
  Timer? timer;
  Character? pending;

  Future<void> flush() async {
    final c = pending;
    pending = null;
    timer?.cancel();
    if (c == null) return;
    try {
      await repo.upsert(c);
    } on AppException catch (e) {
      // 推送失敗（離線等）不打擾使用者；下次變更會再試。
      debugPrint('角色同步略過：${e.message}');
    }
  }

  ref.listen(currentCharacterProvider, (prev, next) {
    if (ref.read(selectedCharacterIdProvider) == null) return;
    if (identical(prev, next)) return;
    pending = next;
    timer?.cancel();
    timer = Timer(const Duration(seconds: 3), flush);
  });

  final lifecycle = AppLifecycleListener(
    onStateChange: (state) {
      if (state == AppLifecycleState.paused ||
          state == AppLifecycleState.inactive) {
        flush();
      }
    },
  );

  ref.onDispose(() {
    timer?.cancel();
    lifecycle.dispose();
  });
});
