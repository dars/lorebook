import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/theme/app_spacing.dart';
import '../../../shared/domain/app_exception.dart';
import '../data/auth_repository.dart';
import '../domain/guest_mode.dart';

class LoginPage extends ConsumerStatefulWidget {
  const LoginPage({super.key});

  @override
  ConsumerState<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends ConsumerState<LoginPage> {
  bool _isLoading = false;

  Future<void> _signIn(Future<void> Function(AuthRepository) action) async {
    setState(() => _isLoading = true);
    try {
      await action(ref.read(authRepositoryProvider));
      // 成功後 router 的 refreshListenable 會依 session 自動導向。
    } on AuthException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(e.message)));
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: AppSpacing.pagePadding,
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 400),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const SizedBox(height: AppSpacing.xxxxl),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(24),
                    child: Image.asset(
                      'assets/images/app_icon.png',
                      width: 96,
                      height: 96,
                      filterQuality: FilterQuality.medium,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xl),
                  Text(
                    'LOREBOOK',
                    style: theme.textTheme.headlineLarge?.copyWith(
                      fontFamily: 'Cinzel',
                      fontSize: 36,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  Text('D&D 5.5e 角色卡管理', style: theme.textTheme.bodyMedium),
                  const SizedBox(height: AppSpacing.xxxxl),
                  Card(
                    child: Padding(
                      padding: AppSpacing.cardPadding,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          ElevatedButton.icon(
                            key: const Key('login-google'),
                            onPressed: _isLoading
                                ? null
                                : () => _signIn((r) => r.signInWithGoogle()),
                            icon: _isLoading
                                ? const SizedBox(
                                    height: 20,
                                    width: 20,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                    ),
                                  )
                                : const Icon(Icons.g_mobiledata, size: 24),
                            label: const Text('以 Google 登入'),
                          ),
                          if (!kIsWeb &&
                              defaultTargetPlatform == TargetPlatform.iOS) ...[
                            const SizedBox(height: AppSpacing.lg),
                            OutlinedButton.icon(
                              key: const Key('login-apple'),
                              onPressed: _isLoading
                                  ? null
                                  : () => _signIn((r) => r.signInWithApple()),
                              icon: const Icon(Icons.apple, size: 24),
                              label: const Text('以 Apple 登入'),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xl),
                  TextButton(
                    key: const Key('login-guest'),
                    onPressed: _isLoading
                        ? null
                        : () {
                            ref.read(guestModeProvider.notifier).state = true;
                            context.go('/character-select');
                          },
                    child: const Text('先試玩範例角色（免登入）'),
                  ),
                  const SizedBox(height: AppSpacing.xxxxl),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
