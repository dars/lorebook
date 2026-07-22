import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:lorebook/features/character/data/custom_background_repository.dart';
import 'package:lorebook/features/character/domain/custom_background.dart';
import 'package:lorebook/shared/domain/app_exception.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// custom-backgrounds spec「自訂背景的儲存與同步」：
/// 查詢過濾 tombstone、刪除為軟刪除（update deleted_at）、
/// 未登入時讀取擲錯 / 寫入靜默略過。
void main() {
  const sample = CustomBackground(
    id: 'bg-1',
    name: '獵人',
    abilities: ['DEX', 'CON', 'WIS'],
    skills: ['隱匿', '求生'],
    originFeat: '警覺',
    description: '荒野的追蹤者。',
  );

  group('未登入（離線）', () {
    final requests = <http.Request>[];
    final client = SupabaseClient(
      'http://localhost',
      'test-key',
      httpClient: MockClient((req) async {
        requests.add(req);
        return http.Response(
          '[]',
          200,
          headers: {'content-type': 'application/json'},
          request: req,
        );
      }),
    );
    final repo = CustomBackgroundRepository(client);

    test('fetchAll 擲 DataException，upsert/softDelete 靜默略過', () async {
      await expectLater(repo.fetchAll(), throwsA(isA<DataException>()));
      await repo.upsert(sample);
      await repo.softDelete(sample.id);
      expect(requests, isEmpty); // 未登入不發出任何請求
    });
  });

  group('已登入', () {
    late List<http.Request> requests;
    late SupabaseClient client;
    late CustomBackgroundRepository repo;

    setUp(() async {
      requests = [];
      client = SupabaseClient(
        'http://localhost',
        'test-key',
        httpClient: MockClient((req) async {
          requests.add(req);
          return http.Response(
            '[]',
            200,
            headers: {'content-type': 'application/json'},
            request: req,
          );
        }),
      );
      // 以未過期的持久化 session 恢復登入狀態（不觸發網路 refresh）。
      // access_token 需為含 exp claim 的合法 JWT 結構（expiresAt 由此解出）。
      final expiresAt =
          DateTime.now().add(const Duration(hours: 1)).millisecondsSinceEpoch ~/
          1000;
      String b64(Map<String, dynamic> m) =>
          base64Url.encode(utf8.encode(jsonEncode(m))).replaceAll('=', '');
      final jwt =
          '${b64({'alg': 'none', 'typ': 'JWT'})}'
          '.${b64({'sub': 'user-1', 'exp': expiresAt, 'role': 'authenticated'})}'
          '.sig';
      await client.auth.recoverSession(
        jsonEncode({
          'access_token': jwt,
          'refresh_token': 'refresh',
          'token_type': 'bearer',
          'expires_in': 3600,
          'expires_at': expiresAt,
          'user': {
            'id': 'user-1',
            'aud': 'authenticated',
            'app_metadata': <String, dynamic>{},
            'user_metadata': <String, dynamic>{},
            'created_at': '2026-01-01T00:00:00Z',
          },
        }),
      );
      repo = CustomBackgroundRepository(client);
    });

    test('fetchAll 過濾 tombstone、依 created_at 升冪', () async {
      await repo.fetchAll();
      final uri = requests.single.url;
      expect(uri.path, contains('user_backgrounds'));
      expect(uri.query, contains('deleted_at=is.null'));
      expect(uri.query, contains('order=created_at.asc'));
    });

    test('upsert 送出提升欄位 name 與完整 data 文件', () async {
      await repo.upsert(sample);
      final req = requests.single;
      expect(req.method, 'POST');
      final body = jsonDecode(req.body) as Map;
      expect(body['id'], 'bg-1');
      expect(body['name'], '獵人');
      expect((body['data'] as Map)['skills'], ['隱匿', '求生']);
    });

    test('softDelete 為 update deleted_at（軟刪除）', () async {
      await repo.softDelete('bg-1');
      final req = requests.single;
      expect(req.method, 'PATCH');
      expect(req.url.query, contains('id=eq.bg-1'));
      expect(jsonDecode(req.body), containsPair('deleted_at', isNotNull));
    });
  });

  test('JSON round-trip 與 BackgroundOption 轉接', () {
    final restored = CustomBackground.fromJson(sample.toJson());
    expect(restored, sample);
    final opt = sample.toBackgroundOption();
    expect(opt.cn, '獵人');
    expect(opt.en, ''); // 快照 backgroundEn 為空字串
    expect(opt.abilities, ['DEX', 'CON', 'WIS']);
    expect(opt.originFeat, '警覺');
  });
}
