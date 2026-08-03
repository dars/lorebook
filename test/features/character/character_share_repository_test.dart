import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:lorebook/features/character/data/character_share_repository.dart';
import 'package:lorebook/features/character/data/character_sync_repository.dart';
import 'package:lorebook/features/character/domain/character.dart';
import 'package:lorebook/features/character/domain/shared_character_result.dart';
import 'package:lorebook/shared/domain/app_exception.dart';
import 'package:lorebook/shared/util/random_token.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// character-share spec：token 產生、憑 token 取回活資料的回填一致性、
/// 三種失效態的映射，以及建立／撤銷／清單的請求形狀。
void main() {
  // 舊角色：靜態 weapons 清單（equipment 尚未存在）＋ 缺職業資源。
  final legacyJson = const Character(
    id: 'c-1',
    name: '戴夫林',
    className: '吟遊詩人',
    classNameEn: 'Bard',
    level: 5,
    maxHp: 30,
    currentHp: 23,
    abilityScores: AbilityScores(
      str: AbilityScore(score: 10, modifier: 0),
      dex: AbilityScore(score: 14, modifier: 2),
      con: AbilityScore(score: 12, modifier: 1),
      int_: AbilityScore(score: 10, modifier: 0),
      wis: AbilityScore(score: 10, modifier: 0),
      cha: AbilityScore(score: 16, modifier: 3),
    ),
    weapons: [
      Weapon(
        name: '匕首 ×2',
        nameEn: 'Dagger ×2',
        attackBonus: 5,
        damage: '1d4+2',
        damageType: '穿刺',
        properties: ['Finesse', 'Thrown'],
      ),
    ],
  ).toJson();

  SupabaseClient clientWith(
    String Function(http.Request req) body, {
    List<http.Request>? capture,
  }) => SupabaseClient(
    'http://localhost',
    'test-key',
    httpClient: MockClient((req) async {
      capture?.add(req);
      return http.Response(
        body(req),
        200,
        headers: {'content-type': 'application/json'},
        request: req,
      );
    }),
  );

  SupabaseClient clientReturning(String body, {List<http.Request>? capture}) =>
      clientWith((_) => body, capture: capture);

  /// 以未過期的持久化 session 恢復登入狀態（不觸發網路 refresh）。
  Future<void> signIn(SupabaseClient client) async {
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
  }

  group('generateShareToken', () {
    test('22 字元的 base64url，無 padding', () {
      final t = generateShareToken();
      expect(t.length, 22);
      expect(t, matches(RegExp(r'^[A-Za-z0-9_-]{22}$')));
    });

    test('大量產生無碰撞', () {
      final seen = {for (var i = 0; i < 5000; i++) generateShareToken()};
      expect(seen.length, 5000);
    });
  });

  group('fetchSharedCharacter', () {
    test('成功時套用與 fetchAll 相同的回填鏈', () async {
      final shared = CharacterShareRepository(
        clientReturning(
          jsonEncode([
            {'status': 'ok', 'data': legacyJson},
          ]),
        ),
      );
      final syncClient = clientReturning(
        jsonEncode([
          {'data': legacyJson},
        ]),
      );
      await signIn(syncClient);
      final sync = CharacterSyncRepository(syncClient);

      final result = await shared.fetchSharedCharacter('tok');
      expect(result, isA<SharedCharacterOk>());
      final viaShare = (result as SharedCharacterOk).character;

      // 兩條路徑對同一份舊資料必須產生完全一致的角色。
      final viaOwner = (await sync.fetchAll()).single;
      expect(viaShare, viaOwner);

      // 回填確實發生：靜態 weapons 轉為 equipment 武器、職業資源補齊。
      expect(viaShare.weapons, isEmpty);
      final dagger = viaShare.equipment.single;
      expect(dagger.name, '匕首');
      expect(dagger.quantity, 2);
      expect(dagger.itemType, ItemType.weapon);
      expect(dagger.equipped, isTrue);
      expect(dagger.damage, '1d4');
      expect(dagger.finesse, isTrue);
      expect(
        viaShare.resources.any((r) => r.nameEn == 'Bardic Inspiration'),
        isTrue,
      );
    });

    test('三種失效狀態碼各自映射', () async {
      for (final (status, matcher) in [
        ('revoked', isA<SharedCharacterRevoked>()),
        ('deleted', isA<SharedCharacterDeleted>()),
        ('not_found', isA<SharedCharacterNotFound>()),
      ]) {
        final repo = CharacterShareRepository(
          clientReturning(
            jsonEncode([
              {'status': status, 'data': null},
            ]),
          ),
        );
        expect(await repo.fetchSharedCharacter('tok'), matcher);
      }
    });

    test('空回應視為找不到；未登入亦可呼叫', () async {
      final repo = CharacterShareRepository(clientReturning('[]'));
      expect(
        await repo.fetchSharedCharacter('tok'),
        isA<SharedCharacterNotFound>(),
      );
    });

    test('狀態為 ok 但無資料時不當成成功', () async {
      final repo = CharacterShareRepository(
        clientReturning(
          jsonEncode([
            {'status': 'ok', 'data': null},
          ]),
        ),
      );
      expect(
        await repo.fetchSharedCharacter('tok'),
        isA<SharedCharacterNotFound>(),
      );
    });

    test('查詢走 RPC，token 為唯一參數', () async {
      final requests = <http.Request>[];
      final repo = CharacterShareRepository(
        clientReturning('[]', capture: requests),
      );
      await repo.fetchSharedCharacter('tok-123');
      final req = requests.single;
      expect(req.url.path, contains('rpc/get_shared_character'));
      expect(jsonDecode(req.body), {'p_token': 'tok-123'});
    });
  });

  group('未登入', () {
    test('建立／清單／撤銷皆擲 DataException 且不發出請求', () async {
      final requests = <http.Request>[];
      final repo = CharacterShareRepository(
        clientReturning('[]', capture: requests),
      );
      await expectLater(repo.createShare('c-1'), throwsA(isA<DataException>()));
      await expectLater(repo.listShares('c-1'), throwsA(isA<DataException>()));
      await expectLater(repo.revokeShare('tok'), throwsA(isA<DataException>()));
      expect(requests, isEmpty);
    });
  });

  group('已登入', () {
    late List<http.Request> requests;
    late CharacterShareRepository repo;

    const row = {
      'token': 'tok-abc',
      'character_id': 'c-1',
      'label': 'DM',
      'created_at': '2026-08-03T10:00:00Z',
      'revoked_at': null,
    };

    setUp(() async {
      requests = [];
      // insert().select().single() 期待單一物件，清單查詢期待陣列。
      final client = clientWith(
        (req) => req.method == 'GET' ? jsonEncode([row]) : jsonEncode(row),
        capture: requests,
      );
      await signIn(client);
      repo = CharacterShareRepository(client);
    });

    test('createShare 送出隨機 token 與備註，回傳建立的紀錄', () async {
      final share = await repo.createShare('c-1', label: 'DM');
      final req = requests.single;
      expect(req.method, 'POST');
      final body = jsonDecode(req.body) as Map;
      expect(body['character_id'], 'c-1');
      expect(body['label'], 'DM');
      expect(body['token'], matches(RegExp(r'^[A-Za-z0-9_-]{22}$')));
      // owner_id 不由客戶端指定（DB default auth.uid()）。
      expect(body.containsKey('owner_id'), isFalse);
      expect(share.token, 'tok-abc');
      expect(share.label, 'DM');
      expect(share.isActive, isTrue);
    });

    test('備註留空時不送出 label', () async {
      await repo.createShare('c-1');
      expect(jsonDecode(requests.single.body), isNot(contains('label')));
    });

    test('listShares 只取未撤銷者，新→舊', () async {
      await repo.listShares('c-1');
      final uri = requests.single.url;
      expect(uri.path, contains('character_shares'));
      expect(uri.query, contains('character_id=eq.c-1'));
      expect(uri.query, contains('revoked_at=is.null'));
      expect(uri.query, contains('order=created_at.desc'));
    });

    test('revokeShare 為 update revoked_at', () async {
      await repo.revokeShare('tok-abc');
      final req = requests.single;
      expect(req.method, 'PATCH');
      expect(req.url.query, contains('token=eq.tok-abc'));
      expect(jsonDecode(req.body), containsPair('revoked_at', isNotNull));
    });
  });
}
