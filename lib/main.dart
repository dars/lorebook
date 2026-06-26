import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app/app.dart';

const _supabaseUrl = String.fromEnvironment('SUPABASE_URL');
const _supabaseKey = String.fromEnvironment('SUPABASE_ANON_KEY');

void main() {
  // 即使在 release，也把錯誤畫到螢幕上（白畫面 → 可見錯誤訊息，便於診斷）。
  ErrorWidget.builder = (details) => _ErrorScreen(
        message: details.exceptionAsString(),
        detail: details.stack?.toString(),
      );

  runZonedGuarded(() async {
    WidgetsFlutterBinding.ensureInitialized();

    if (_supabaseUrl.isNotEmpty && _supabaseKey.isNotEmpty) {
      // 初始化失敗（網路/金鑰/首次啟動…）不應阻擋 App 啟動，否則整頁白畫面。
      try {
        await Supabase.initialize(
          url: _supabaseUrl,
          publishableKey: _supabaseKey,
        );
      } catch (e, st) {
        debugPrint('Supabase 初始化失敗，以離線模式啟動：$e\n$st');
      }
    }

    runApp(const ProviderScope(child: LorebookApp()));
  }, (error, stack) {
    // 啟動期的未捕捉例外：以可見錯誤畫面取代白畫面。
    runApp(_ErrorScreen(message: '$error', detail: '$stack', root: true));
  });
}

/// 診斷用：把錯誤訊息顯示在深色背景上（release 也可見）。
class _ErrorScreen extends StatelessWidget {
  final String message;
  final String? detail;
  final bool root;

  const _ErrorScreen({required this.message, this.detail, this.root = false});

  @override
  Widget build(BuildContext context) {
    final body = SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('啟動錯誤',
                  style: TextStyle(
                      color: Color(0xFFC9A84C),
                      fontSize: 16,
                      fontWeight: FontWeight.w700)),
              const SizedBox(height: 12),
              SelectableText(message,
                  style: const TextStyle(color: Color(0xFFE8DFC9), fontSize: 13)),
              if (detail != null) ...[
                const SizedBox(height: 12),
                SelectableText(detail!,
                    style: const TextStyle(
                        color: Color(0xFF9A8A66), fontSize: 10)),
              ],
            ],
          ),
        ),
      ),
    );
    // 自帶 Directionality/Material，避免在缺乏祖先時渲染失敗。
    return root
        ? MaterialApp(
            debugShowCheckedModeBanner: false,
            home: Scaffold(
                backgroundColor: const Color(0xFF14110C), body: body),
          )
        : Directionality(
            textDirection: TextDirection.ltr,
            child: Material(color: const Color(0xFF14110C), child: body),
          );
  }
}
