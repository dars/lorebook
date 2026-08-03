import 'dart:convert';
import 'dart:math';

/// 分享用的隨機識別碼長度（bytes）。128-bit 是 capability URL 的
/// 常見下限——不可猜且無列舉路徑，見 openspec design D3。
const int _kTokenBytes = 16;

final Random _secure = Random.secure();

/// 產生 128-bit 密碼學安全隨機值，以 base64url 編碼（22 字元、無 padding）。
///
/// 刻意**不**由角色 id、使用者 id 或時間戳推導——可枚舉的識別碼本身就不該
/// 作為分享載體。同樣的熵用 UUID 字串要 36 字元，base64url 只要 22，連結與
/// QR 都短一截。
String generateShareToken() {
  final bytes = List<int>.generate(_kTokenBytes, (_) => _secure.nextInt(256));
  return base64UrlEncode(bytes).replaceAll('=', '');
}
