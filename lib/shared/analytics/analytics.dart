import 'package:firebase_analytics/firebase_analytics.dart';
import 'package:firebase_core/firebase_core.dart';

/// Firebase Analytics（GA4）事件追蹤，三平台同一套。
///
/// 事件命名採 GA4 慣例小寫底線；參數勿含個資（角色名、email 等）。
/// Firebase 未初始化（離線建置、init 失敗）時靜默略過。
void trackEvent(String name, [Map<String, Object?> params = const {}]) {
  if (Firebase.apps.isEmpty) return;
  FirebaseAnalytics.instance.logEvent(
    name: name,
    parameters: {
      // GA4 參數僅接受 String/num：其他型別（bool 等）轉字串。
      for (final e in params.entries)
        if (e.value case final Object v) e.key: v is num ? v : v.toString(),
    },
  );
}

/// 頁面/畫面瀏覽（router 路徑變更時呼叫）。
void trackScreen(String path) {
  if (Firebase.apps.isEmpty) return;
  FirebaseAnalytics.instance.logScreenView(screenName: path);
}
