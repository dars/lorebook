import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart' hide AuthException;

import '../../../shared/data/supabase_client.dart';
import '../../../shared/domain/app_exception.dart';

class AuthRepository {
  final SupabaseClient _client;

  AuthRepository(this._client);

  // web 回到當前 origin（需列於 Supabase Auth 的 Redirect URLs）；
  // 行動端用自訂 scheme 跳回 App。
  static final String _oauthRedirect = kIsWeb
      ? Uri.base.origin
      : 'dev.code4soul.lorebook://login-callback/';

  Future<void> signOut() async {
    try {
      await _client.auth.signOut();
    } on AuthApiException catch (e) {
      throw AuthException(e.message);
    } catch (e) {
      throw AuthException('登出失敗：$e');
    }
  }

  Future<bool> signInWithGoogle() async {
    try {
      return await _client.auth.signInWithOAuth(
        OAuthProvider.google,
        redirectTo: _oauthRedirect,
      );
    } on AuthApiException catch (e) {
      throw AuthException(e.message);
    } catch (e) {
      throw AuthException('Google 登入失敗：$e');
    }
  }

  Future<bool> signInWithApple() async {
    try {
      return await _client.auth.signInWithOAuth(
        OAuthProvider.apple,
        redirectTo: _oauthRedirect,
      );
    } on AuthApiException catch (e) {
      throw AuthException(e.message);
    } catch (e) {
      throw AuthException('Apple 登入失敗：$e');
    }
  }
}

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  final client = ref.watch(supabaseClientProvider);
  return AuthRepository(client);
});
