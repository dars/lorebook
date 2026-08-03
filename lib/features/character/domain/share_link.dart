import 'package:flutter/foundation.dart';

/// 角色卡分享連結的路徑前綴。
///
/// 與 homebrew 分享（規劃中的 `/s/`）刻意錯開——單看連結就能判斷會開出
/// 什麼，deep link 的路徑比對也不會互相攔截。
const String kSharePathPrefix = '/v';

/// web 版網域。原生端以編譯期參數覆寫（`--dart-define=WEB_BASE_URL=…`）；
/// web 端直接沿用當前 origin，本機開發與正式站都不必改設定。
const String _kWebBaseUrl = String.fromEnvironment(
  'WEB_BASE_URL',
  defaultValue: 'https://lorebook-1om.pages.dev',
);

String get _base => kIsWeb ? Uri.base.origin : _kWebBaseUrl;

/// 分享連結。QR code 的內容即此字串——載體只裝這個短網址，不裝資料本體，
/// 因此不受角色卡大小影響。
String shareLinkFor(String token) => '$_base$kSharePathPrefix/$token';

/// 顯示用的短版（去掉 scheme，長 token 截斷）。
String shareLinkDisplay(String token) {
  final full = shareLinkFor(token).replaceFirst(RegExp(r'^https?://'), '');
  return full.length <= 34 ? full : '${full.substring(0, 33)}…';
}
