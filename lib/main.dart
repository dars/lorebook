import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app/app.dart';

const _supabaseUrl = String.fromEnvironment('SUPABASE_URL');
const _supabaseKey = String.fromEnvironment('SUPABASE_ANON_KEY');

void main() async {
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
}
