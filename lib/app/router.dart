import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../features/auth/presentation/login_page.dart';
import '../features/auth/presentation/register_page.dart';
import '../features/character/presentation/character_page.dart';
import '../features/character/presentation/character_select_page.dart';
import '../features/decision/presentation/decision_page.dart';
import '../features/journal/presentation/journal_page.dart';
import '../features/system/presentation/system_page.dart';
import '../shared/presentation/app_scaffold.dart';

final _selectedCharacterProvider = StateProvider<String?>((ref) => null);
final devBypassAuthProvider = StateProvider<bool>((ref) => false);

bool get _isSupabaseInitialized {
  try {
    Supabase.instance;
    return true;
  } catch (_) {
    return false;
  }
}

final routerProvider = Provider<GoRouter>((ref) {
  final authNotifier =
      _isSupabaseInitialized ? _AuthNotifier() : ChangeNotifier();

  return GoRouter(
    refreshListenable: authNotifier,
    initialLocation: '/main/decision',
    redirect: (context, state) {
      if (!_isSupabaseInitialized) return null;

      final devBypass = ref.read(devBypassAuthProvider);
      final session = Supabase.instance.client.auth.currentSession;
      final isLoggedIn = session != null || devBypass;
      final isAuthRoute = state.matchedLocation.startsWith('/auth');
      final isCharSelect = state.matchedLocation == '/character-select';
      final selectedChar = ref.read(_selectedCharacterProvider);

      if (!isLoggedIn && !isAuthRoute) return '/auth/login';
      if (isLoggedIn && isAuthRoute) {
        return selectedChar != null ? '/main/decision' : '/character-select';
      }
      if (isLoggedIn && !isCharSelect && selectedChar == null) {
        if (!state.matchedLocation.startsWith('/auth')) {
          return '/character-select';
        }
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/auth/login',
        builder: (context, state) => const LoginPage(),
      ),
      GoRoute(
        path: '/auth/register',
        builder: (context, state) => const RegisterPage(),
      ),
      GoRoute(
        path: '/character-select',
        builder: (context, state) {
          return CharacterSelectPage(
            onCharacterSelected: (id) {
              ref.read(_selectedCharacterProvider.notifier).state = id;
              GoRouter.of(context).go('/main/decision');
            },
          );
        },
      ),
      ShellRoute(
        builder: (context, state, child) => AppScaffold(child: child),
        routes: [
          GoRoute(
            path: '/main/decision',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: DecisionPage(),
            ),
          ),
          GoRoute(
            path: '/main/character',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: CharacterPage(),
            ),
          ),
          GoRoute(
            path: '/main/journal',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: JournalPage(),
            ),
          ),
          GoRoute(
            path: '/main/system',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: SystemPage(),
            ),
          ),
        ],
      ),
    ],
  );
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
