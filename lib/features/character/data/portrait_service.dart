import 'dart:typed_data';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart' hide AuthException;

import '../../../shared/data/supabase_client.dart';
import '../../../shared/domain/app_exception.dart';

/// 角色圖服務：相簿選圖（客戶端縮圖）＋ Supabase Storage 上傳/刪除。
///
/// 儲存慣例（見 supabase/migrations/0003_portraits_bucket.sql）：
/// `portraits/{user_id}/{character_id}.jpg`，覆蓋制；公開讀 bucket，
/// `portraitUrl` 存公開 URL 並帶版本參數（固定路徑覆蓋後強制快取失效）。
class PortraitService {
  final SupabaseClient _client;

  PortraitService(this._client);

  static const _bucket = 'portraits';

  /// 自相簿選圖（長邊 1024、JPEG 品質 85）。取消回 null。
  /// static：離線模式（無 Supabase client）也能選圖預覽。
  static Future<Uint8List?> pick() async {
    final file = await ImagePicker().pickImage(
      source: ImageSource.gallery,
      maxWidth: 1024,
      maxHeight: 1024,
      imageQuality: 85,
    );
    if (file == null) return null;
    return file.readAsBytes();
  }

  String _path(String characterId) {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) throw const DataException('未登入，無法上傳角色圖');
    return '$uid/$characterId.jpg';
  }

  /// 上傳（覆蓋）並回傳帶版本參數的公開 URL。
  Future<String> upload(String characterId, Uint8List bytes) async {
    final path = _path(characterId);
    try {
      await _client.storage
          .from(_bucket)
          .uploadBinary(
            path,
            bytes,
            fileOptions: const FileOptions(
              contentType: 'image/jpeg',
              upsert: true,
            ),
          );
      final url = _client.storage.from(_bucket).getPublicUrl(path);
      // 固定路徑覆蓋制：以版本參數讓 Image.network / CDN 快取失效。
      return '$url?v=${DateTime.now().millisecondsSinceEpoch}';
    } on StorageException catch (e) {
      throw DataException('上傳角色圖失敗：${e.message}');
    } catch (e) {
      throw DataException('上傳角色圖失敗：$e');
    }
  }

  /// 刪除雲端角色圖。
  Future<void> remove(String characterId) async {
    final path = _path(characterId);
    try {
      await _client.storage.from(_bucket).remove([path]);
    } on StorageException catch (e) {
      throw DataException('移除角色圖失敗：${e.message}');
    } catch (e) {
      throw DataException('移除角色圖失敗：$e');
    }
  }
}

final portraitServiceProvider = Provider<PortraitService>((ref) {
  final client = ref.watch(supabaseClientProvider);
  return PortraitService(client);
});
