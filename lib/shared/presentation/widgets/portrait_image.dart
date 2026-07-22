import 'package:flutter/widgets.dart';

/// 角色立繪來源：`assets/` 開頭視為打包資產（範例角色用），
/// 其餘為使用者上傳的網路圖。
ImageProvider portraitImageProvider(String url) {
  return url.startsWith('assets/')
      ? AssetImage(url) as ImageProvider
      : NetworkImage(url);
}
