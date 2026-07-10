import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart' hide AuthException;

import '../../../features/auth/domain/auth_state.dart';
import '../../../shared/data/supabase_client.dart';
import '../../../shared/domain/app_exception.dart';
import '../domain/custom_background.dart';

/// 自訂背景雲端存取（`user_backgrounds` 表，見
/// supabase/migrations/0004_user_backgrounds.sql）。
///
/// 策略比照 [CharacterSyncRepository]：整份 `toJson()` 存 `data jsonb`
/// （文件層級 last-write-wins）；`name` 為清單用提升欄位；刪除採軟刪除
/// （`deleted_at` tombstone）。未登入時讀取擲 [DataException] 由呼叫端
/// 降級，寫入靜默略過。
class CustomBackgroundRepository {
  final SupabaseClient _client;

  CustomBackgroundRepository(this._client);

  bool get _signedIn => _client.auth.currentSession != null;

  /// 取回此使用者全部自訂背景（未刪除，舊→新，選項順序穩定）。
  Future<List<CustomBackground>> fetchAll() async {
    if (!_signedIn) throw const DataException('未登入，無法讀取自訂背景');
    try {
      final rows = await _client
          .from('user_backgrounds')
          .select('data')
          .isFilter('deleted_at', null)
          .order('created_at', ascending: true);
      return [
        for (final r in rows)
          CustomBackground.fromJson((r['data'] as Map).cast<String, dynamic>()),
      ];
    } on PostgrestException catch (e) {
      throw DataException('讀取自訂背景失敗：${e.message}');
    } catch (e) {
      throw DataException('讀取自訂背景失敗：$e');
    }
  }

  /// 新增或覆蓋一個自訂背景。未登入時靜默略過。
  Future<void> upsert(CustomBackground b) async {
    if (!_signedIn) return;
    try {
      await _client.from('user_backgrounds').upsert({
        'id': b.id,
        'name': b.name,
        'data': b.toJson(),
      });
    } on PostgrestException catch (e) {
      throw DataException('儲存自訂背景失敗：${e.message}');
    } catch (e) {
      throw DataException('儲存自訂背景失敗：$e');
    }
  }

  /// 軟刪除（多裝置下 tombstone 防止被復活）。未登入時靜默略過。
  Future<void> softDelete(String id) async {
    if (!_signedIn) return;
    try {
      await _client
          .from('user_backgrounds')
          .update({'deleted_at': DateTime.now().toUtc().toIso8601String()})
          .eq('id', id);
    } on PostgrestException catch (e) {
      throw DataException('刪除自訂背景失敗：${e.message}');
    } catch (e) {
      throw DataException('刪除自訂背景失敗：$e');
    }
  }
}

final customBackgroundRepositoryProvider = Provider<CustomBackgroundRepository>(
  (ref) {
    final client = ref.watch(supabaseClientProvider);
    return CustomBackgroundRepository(client);
  },
);

/// 使用者自訂背景清單。
///
/// 依賴 auth 狀態：登入/登出都會重新抓取；未登入/離線時為
/// AsyncError，由建角背景步驟降級（僅顯示內建背景）。CRUD 後
/// 就地更新，不重新請求。
final customBackgroundsProvider = AsyncNotifierProvider<
    CustomBackgroundsNotifier, List<CustomBackground>>(
  CustomBackgroundsNotifier.new,
);

class CustomBackgroundsNotifier extends AsyncNotifier<List<CustomBackground>> {
  @override
  Future<List<CustomBackground>> build() {
    ref.watch(authStateChangesProvider);
    return ref.watch(customBackgroundRepositoryProvider).fetchAll();
  }

  /// 新增或更新（以 id 判斷），雲端成功後就地更新清單。
  Future<void> save(CustomBackground b) async {
    await ref.read(customBackgroundRepositoryProvider).upsert(b);
    final current = [...state.valueOrNull ?? <CustomBackground>[]];
    final i = current.indexWhere((x) => x.id == b.id);
    if (i >= 0) {
      current[i] = b;
    } else {
      current.add(b);
    }
    state = AsyncData(current);
  }

  /// 軟刪除，雲端成功後自清單移除。
  Future<void> delete(String id) async {
    await ref.read(customBackgroundRepositoryProvider).softDelete(id);
    state = AsyncData([
      for (final b in state.valueOrNull ?? <CustomBackground>[])
        if (b.id != id) b,
    ]);
  }
}
