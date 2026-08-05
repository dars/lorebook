import 'dart:js_interop';

import 'package:web/web.dart' as web;

/// 以 service worker 換手作為「新版本已就緒」的訊號。
///
/// 部署後的實際時序（對照線上的 flutter_service_worker.js 與 flutter.js
/// loader 驗證過）：
/// 1. 使用者進站。SW 對 `/` 走 online-first，index.html 是新的
/// 2. 但 flutter_bootstrap.js 與 main.dart.js 在 RESOURCES 裡、走 cache-first
///    ——載入的是**舊版**，而舊 bootstrap 帶的是舊的 serviceWorkerVersion，
///    loader 比對後判定「沿用現有 SW」，不會自行更新
/// 3. 同時 `register()` 排入 update job，抓到內容已變的
///    flutter_service_worker.js → 新 SW 於 install 呼叫 skipWaiting() 後接管
///    本頁 → controllerchange 觸發，此刻新資產已進快取，重載即為新版
///
/// controller 為 null 時不註冊：那是本站的首次造訪，隨後的 controllerchange
/// 來自 SW 初次安裝而非版本更新，提示會誤觸。
void listenForAppUpdate(void Function() onUpdate) {
  final sw = web.window.navigator.serviceWorker;
  if (sw.controller == null) return;
  sw.addEventListener('controllerchange', ((web.Event _) => onUpdate()).toJS);
}

void reloadApp() => web.window.location.reload();
