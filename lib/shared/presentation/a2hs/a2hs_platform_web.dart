import 'package:web/web.dart' as web;

/// 是否已以「加入主畫面」的 standalone 模式執行（PWA 安裝後開啟）。
bool get isStandaloneDisplay =>
    web.window.matchMedia('(display-mode: standalone)').matches;
