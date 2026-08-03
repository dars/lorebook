import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../features/auth/domain/guest_mode.dart';
import '../features/auth/presentation/login_page.dart';
import '../shared/analytics/analytics.dart';
import '../features/character/domain/character_providers.dart';
import '../features/character/domain/custom_background.dart';
import '../features/character/presentation/character_create_page.dart';
import '../features/character/presentation/character_level_up_page.dart';
import '../features/character/presentation/character_page.dart';
import '../features/character/presentation/character_select_page.dart';
import '../features/character/domain/share_link.dart';
import '../features/character/presentation/custom_background_edit_page.dart';
import '../features/character/presentation/shared_character_view_page.dart';
import '../features/decision/presentation/decision_page.dart';
import '../features/journal/presentation/journal_page.dart';
import '../features/system/presentation/system_page.dart';
import '../shared/presentation/app_scaffold.dart';

final devBypassAuthProvider = StateProvider<bool>((ref) => false);

bool get _isSupabaseInitialized {
  try {
    // 必須存取 .client：未初始化（或 initialize 失敗留下半初始化 instance）時
    // 才會丟 LateInitializationError，避免誤判為已初始化而存取未就緒的 client。
    Supabase.instance.client;
    return true;
  } catch (_) {
    return false;
  }
}

/// 導向決策（純函式，與 Supabase／Riverpod 解耦以便測試）。
///
/// 分享檢視豁免 auth guard：掃碼的人可能沒裝 App、沒帳號，要求註冊才能看
/// 一眼角色卡，摩擦遠大於收益（design D4）。已登入者同樣停在此路由，
/// 不被導回角色選擇。
@visibleForTesting
String? authRedirectFor({
  required String location,
  required bool isLoggedIn,
  required String? selectedCharacterId,
}) {
  if (location.startsWith('$kSharePathPrefix/')) return null;

  final isAuthRoute = location.startsWith('/auth');
  final isCharSelect = location == '/character-select';
  final isCreate = location == '/character-create';
  // 建角流程可開自訂背景編輯頁，此時可能尚未選定角色。
  final isBgEdit = location == '/custom-background-edit';

  if (!isLoggedIn && !isAuthRoute) return '/auth/login';
  if (isLoggedIn && isAuthRoute) {
    return selectedCharacterId != null ? '/main/decision' : '/character-select';
  }
  if (isLoggedIn &&
      !isCharSelect &&
      !isCreate &&
      !isBgEdit &&
      selectedCharacterId == null) {
    return '/character-select';
  }

  return null;
}

final routerProvider = Provider<GoRouter>((ref) {
  final authNotifier = _isSupabaseInitialized
      ? _AuthNotifier()
      : ChangeNotifier();

  final router = GoRouter(
    refreshListenable: authNotifier,
    initialLocation: '/main/decision',
    redirect: (context, state) {
      if (!_isSupabaseInitialized) return null;

      final devBypass = ref.read(devBypassAuthProvider);
      final guest = ref.read(guestModeProvider);
      final session = Supabase.instance.client.auth.currentSession;

      return authRedirectFor(
        location: state.matchedLocation,
        isLoggedIn: session != null || devBypass || guest,
        selectedCharacterId: ref.read(selectedCharacterIdProvider),
      );
    },
    routes: [
      GoRoute(
        path: '/auth/login',
        builder: (context, state) => const LoginPage(),
      ),
      GoRoute(
        path: '/character-select',
        builder: (context, state) {
          return CharacterSelectPage(
            onCharacterSelected: (id) {
              // 切換前把當前角色暫存編輯寫回清單，再切換（session 內保留）。
              ref
                  .read(characterListProvider.notifier)
                  .upsert(ref.read(currentCharacterProvider));
              ref.read(selectedCharacterIdProvider.notifier).state = id;
              GoRouter.of(context).go('/main/decision');
            },
          );
        },
      ),
      GoRoute(
        path: '/character-create',
        builder: (context, state) => const CharacterCreatePage(),
      ),
      GoRoute(
        path: '/custom-background-edit',
        builder: (context, state) =>
            CustomBackgroundEditPage(initial: state.extra as CustomBackground?),
      ),
      // 分享檢視（deep link 入口）。前綴與 homebrew 分享的 /s/ 錯開。
      GoRoute(
        path: '$kSharePathPrefix/:token',
        builder: (context, state) =>
            SharedCharacterViewPage(token: state.pathParameters['token']!),
      ),
      GoRoute(
        path: '/character-level-up',
        builder: (context, state) => CharacterLevelUpPage(
          subclassOnly: state.uri.queryParameters['mode'] == 'subclass',
        ),
      ),
      ShellRoute(
        builder: (context, state, child) => AppScaffold(child: child),
        routes: [
          GoRoute(
            path: '/main/decision',
            pageBuilder: (context, state) =>
                const NoTransitionPage(child: DecisionPage()),
          ),
          GoRoute(
            path: '/main/character',
            pageBuilder: (context, state) =>
                const NoTransitionPage(child: CharacterPage()),
          ),
          GoRoute(
            path: '/main/journal',
            pageBuilder: (context, state) =>
                const NoTransitionPage(child: JournalPage()),
          ),
          GoRoute(
            path: '/main/system',
            pageBuilder: (context, state) =>
                const NoTransitionPage(child: SystemPage()),
          ),
        ],
      ),
    ],
  );

  // 畫面瀏覽追蹤：路徑變更即上報（Analytics 未啟用時為 no-op）。
  String? lastTrackedPath;
  router.routerDelegate.addListener(() {
    final path = router.routerDelegate.currentConfiguration.uri.path;
    if (path == lastTrackedPath) return;
    lastTrackedPath = path;
    trackScreen(path);
  });

  return router;
});

class _AuthNotifier extends ChangeNotifier {
  late final StreamSubscription<AuthState> _sub;

  _AuthNotifier() {
    _sub = Supabase.instance.client.auth.onAuthStateChange.listen((_) {
      notifyListeners();
    });
  }

  @override
  void dispose() {
    _sub.cancel();
    super.dispose();
  }
}
