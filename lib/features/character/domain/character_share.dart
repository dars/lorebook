import 'package:freezed_annotation/freezed_annotation.dart';

part 'character_share.freezed.dart';
part 'character_share.g.dart';

/// 一筆角色卡分享授權（`character_shares` 表，見
/// supabase/migrations/0005_character_shares.sql）。
///
/// [token] 為 128-bit 隨機值，持有者即可檢視該角色的**即時**資料；
/// [label] 是分享對象備註（如「DM」），僅擁有者可讀——檢視端的 RPC
/// 不回傳此欄位。首版無有效期限，撤銷是唯一的失效途徑。
@freezed
abstract class CharacterShare with _$CharacterShare {
  const factory CharacterShare({
    required String token,
    @JsonKey(name: 'character_id') required String characterId,
    @Default('') String label,
    @JsonKey(name: 'created_at') required DateTime createdAt,
    @JsonKey(name: 'revoked_at') DateTime? revokedAt,
  }) = _CharacterShare;

  const CharacterShare._();

  factory CharacterShare.fromJson(Map<String, dynamic> json) =>
      _$CharacterShareFromJson(json);

  /// 未撤銷即為有效（無期限，見 openspec design D3a）。
  bool get isActive => revokedAt == null;
}
