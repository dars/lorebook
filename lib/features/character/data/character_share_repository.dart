import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart' hide AuthException;

import '../../../shared/data/supabase_client.dart';
import '../../../shared/domain/app_exception.dart';
import '../../../shared/util/random_token.dart';
import '../domain/character.dart';
import '../domain/character_share.dart';
import '../domain/class_resources.dart';
import '../domain/shared_character_result.dart';

/// 角色卡分享（`character_shares` 表 ＋ `get_shared_character` 函式，見
/// supabase/migrations/0005_character_shares.sql）。
///
/// 存取模型與其他 repository 不同：授權表本身是 own-row RLS 且不對 anon
/// 開放，檢視端一律走 `SECURITY DEFINER` 函式憑 token 取回**活資料**。
/// 因此 [fetchSharedCharacter] 不需登入即可呼叫，其餘方法都要。
class CharacterShareRepository {
  final SupabaseClient _client;

  CharacterShareRepository(this._client);

  bool get _signedIn => _client.auth.currentSession != null;

  /// 為 [characterId] 建立一條分享，回傳含新 token 的紀錄。
  ///
  /// 同一角色可有多條分享（給 DM 與各隊友），[label] 是給擁有者辨識用的
  /// 備註，檢視端不會取得。
  Future<CharacterShare> createShare(
    String characterId, {
    String label = '',
  }) async {
    if (!_signedIn) throw const DataException('未登入，無法建立分享');
    try {
      final row = await _client
          .from('character_shares')
          .insert({
            'token': generateShareToken(),
            'character_id': characterId,
            if (label.isNotEmpty) 'label': label,
          })
          .select()
          .single();
      return CharacterShare.fromJson(row);
    } on PostgrestException catch (e) {
      throw DataException('建立分享失敗：${e.message}');
    } catch (e) {
      throw DataException('建立分享失敗：$e');
    }
  }

  /// 該角色目前有效的分享（新→舊）。已撤銷者不列入——清單上的即為有效。
  Future<List<CharacterShare>> listShares(String characterId) async {
    if (!_signedIn) throw const DataException('未登入，無法讀取分享清單');
    try {
      final rows = await _client
          .from('character_shares')
          .select()
          .eq('character_id', characterId)
          .isFilter('revoked_at', null)
          .order('created_at', ascending: false);
      return [for (final r in rows) CharacterShare.fromJson(r)];
    } on PostgrestException catch (e) {
      throw DataException('讀取分享清單失敗：${e.message}');
    } catch (e) {
      throw DataException('讀取分享清單失敗：$e');
    }
  }

  /// 撤銷一條分享。撤銷後連結立即失效，且該筆自清單消失。
  Future<void> revokeShare(String token) async {
    if (!_signedIn) throw const DataException('未登入，無法撤銷分享');
    try {
      await _client
          .from('character_shares')
          .update({'revoked_at': DateTime.now().toUtc().toIso8601String()})
          .eq('token', token);
    } on PostgrestException catch (e) {
      throw DataException('撤銷分享失敗：${e.message}');
    } catch (e) {
      throw DataException('撤銷分享失敗：$e');
    }
  }

  /// 憑 token 取回角色卡的當下內容（未登入亦可）。
  ///
  /// 回填鏈與 [CharacterSyncRepository.fetchAll] 必須一致：漏掉會讓舊角色
  /// 在檢視端少掉武器攻擊列與職業資源，而主人自己看是正常的。
  Future<SharedCharacterResult> fetchSharedCharacter(String token) async {
    try {
      final rows = await _client.rpc(
        'get_shared_character',
        params: {'p_token': token},
      );
      final list = (rows as List).cast<Map<String, dynamic>>();
      if (list.isEmpty) return const SharedCharacterNotFound();

      final status = list.first['status'] as String? ?? 'not_found';
      final data = list.first['data'] as Map?;
      final character = data == null
          ? null
          : backfillClassResources(
              migrateLegacyWeapons(
                Character.fromJson(data.cast<String, dynamic>()),
              ),
            );
      return SharedCharacterResult.fromStatus(
        status,
        character,
        DateTime.now(),
      );
    } on PostgrestException catch (e) {
      throw DataException('讀取分享的角色卡失敗：${e.message}');
    } catch (e) {
      throw DataException('讀取分享的角色卡失敗：$e');
    }
  }
}

final characterShareRepositoryProvider = Provider<CharacterShareRepository>(
  (ref) => CharacterShareRepository(ref.watch(supabaseClientProvider)),
);

/// 某角色目前有效的分享清單。建立／撤銷後 invalidate 以重取。
final characterSharesProvider =
    FutureProvider.family<List<CharacterShare>, String>(
      (ref, characterId) =>
          ref.watch(characterShareRepositoryProvider).listShares(characterId),
    );

/// 憑 token 取回的分享角色卡。下拉重新整理時 invalidate 此 provider。
final sharedCharacterProvider =
    FutureProvider.family<SharedCharacterResult, String>(
      (ref, token) => ref
          .watch(characterShareRepositoryProvider)
          .fetchSharedCharacter(token),
    );
