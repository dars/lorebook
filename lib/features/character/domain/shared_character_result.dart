import 'character.dart';

/// 憑分享 token 取回角色卡的結果。
///
/// 失效原因刻意可區分（見 openspec design D9）：統一顯示「找不到」會讓
/// 檢視者以為自己貼錯連結而反覆重試。四種結果皆不含擁有者身分、分享備註
/// 或其他角色的任何資訊。
sealed class SharedCharacterResult {
  const SharedCharacterResult();

  /// 對應 `get_shared_character` 的 `status` 欄位。
  static SharedCharacterResult fromStatus(
    String status,
    Character? character,
    DateTime fetchedAt,
  ) => switch (status) {
    'ok' when character != null => SharedCharacterOk(character, fetchedAt),
    'revoked' => const SharedCharacterRevoked(),
    'deleted' => const SharedCharacterDeleted(),
    _ => const SharedCharacterNotFound(),
  };
}

/// 分享有效，[character] 為角色的當下內容（非快照）。
class SharedCharacterOk extends SharedCharacterResult {
  final Character character;

  /// 這份資料的抓取時間——不做 Realtime 訂閱，檢視者需知道資料的時點。
  final DateTime fetchedAt;

  const SharedCharacterOk(this.character, this.fetchedAt);
}

/// 角色主人已撤銷這條分享。
class SharedCharacterRevoked extends SharedCharacterResult {
  const SharedCharacterRevoked();
}

/// 來源角色卡已被擁有者刪除。
class SharedCharacterDeleted extends SharedCharacterResult {
  const SharedCharacterDeleted();
}

/// token 不存在（網址不完整或根本沒這條分享）。
class SharedCharacterNotFound extends SharedCharacterResult {
  const SharedCharacterNotFound();
}
