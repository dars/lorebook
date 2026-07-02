/// flutter_driver 啟動入口：供 MCP / 自動化驅動 App 用。
/// 正式 App（lib/main.dart）不受影響。
library;

import 'package:flutter_driver/driver_extension.dart';
import 'package:lorebook/main.dart' as app;

void main() {
  enableFlutterDriverExtension();
  app.main();
}
