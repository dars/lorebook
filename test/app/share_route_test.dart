import 'package:flutter_test/flutter_test.dart';
import 'package:lorebook/app/router.dart';
import 'package:lorebook/features/character/domain/share_link.dart';

/// routing spec「分享檢視路由」與「Auth redirect guard」的分享豁免。
void main() {
  const token = 'kQ7fN2xR9pLmVt8sYbW3Za';
  const sharePath = '/v/$token';

  group('分享路徑', () {
    test('前綴與 homebrew 分享（/s）錯開', () {
      expect(kSharePathPrefix, '/v');
      expect(kSharePathPrefix, isNot('/s'));
    });

    test('連結由前綴與 token 組成', () {
      final link = shareLinkFor(token);
      expect(Uri.parse(link).path, sharePath);
      expect(Uri.parse(link).scheme, 'https');
    });

    test('顯示用短版去掉 scheme 且過長時截斷', () {
      final display = shareLinkDisplay(token);
      expect(display, isNot(startsWith('http')));
      expect(display.length, lessThanOrEqualTo(34));
    });
  });

  group('auth guard 對分享檢視的豁免', () {
    test('未登入不被導向登入頁', () {
      expect(
        authRedirectFor(
          location: sharePath,
          isLoggedIn: false,
          selectedCharacterId: null,
        ),
        isNull,
      );
    });

    test('已登入且未選角色，也不被導向角色選擇', () {
      expect(
        authRedirectFor(
          location: sharePath,
          isLoggedIn: true,
          selectedCharacterId: null,
        ),
        isNull,
      );
    });

    test('已登入且已選角色，仍停留於分享路由', () {
      expect(
        authRedirectFor(
          location: sharePath,
          isLoggedIn: true,
          selectedCharacterId: 'c-1',
        ),
        isNull,
      );
    });
  });

  group('auth guard 其餘路由行為不變', () {
    test('未登入存取主畫面 → 登入頁', () {
      expect(
        authRedirectFor(
          location: '/main/character',
          isLoggedIn: false,
          selectedCharacterId: null,
        ),
        '/auth/login',
      );
    });

    test('已登入存取登入頁 → 依是否已選角色', () {
      expect(
        authRedirectFor(
          location: '/auth/login',
          isLoggedIn: true,
          selectedCharacterId: null,
        ),
        '/character-select',
      );
      expect(
        authRedirectFor(
          location: '/auth/login',
          isLoggedIn: true,
          selectedCharacterId: 'c-1',
        ),
        '/main/decision',
      );
    });

    test('已登入未選角色存取主畫面 → 角色選擇', () {
      expect(
        authRedirectFor(
          location: '/main/decision',
          isLoggedIn: true,
          selectedCharacterId: null,
        ),
        '/character-select',
      );
    });

    test('建角與自訂背景編輯不被導開', () {
      for (final path in ['/character-create', '/custom-background-edit']) {
        expect(
          authRedirectFor(
            location: path,
            isLoggedIn: true,
            selectedCharacterId: null,
          ),
          isNull,
        );
      }
    });
  });
}
