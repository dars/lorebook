import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../features/character/data/character_sync_repository.dart';
import '../features/system/presentation/theme_provider.dart';
import 'router.dart';
import 'theme/app_theme.dart';

class LorebookApp extends ConsumerWidget {
  const LorebookApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);
    final themeMode = ref.watch(themeModeProvider);
    // 啟用角色雲端同步（debounce 推送 + 進背景 flush）。
    ref.watch(characterSyncControllerProvider);

    return MaterialApp.router(
      title: 'Lorebook',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      themeMode: themeMode,
      routerConfig: router,
    );
  }
}
