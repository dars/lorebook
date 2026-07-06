import 'package:flutter/material.dart';

/// D&D 傷害類型配色，以 [ThemeExtension] 形式掛在 [ThemeData] 上，
/// 方便日後依使用者設定整套切換（深色 / 淺色 / 自訂主題）。
///
/// 取用方式：
/// ```dart
/// final dnd = Theme.of(context).extension<DndColors>()!;
/// final color = dnd.damage('fire');
/// ```
@immutable
class DndColors extends ThemeExtension<DndColors> {
  final Color fire;
  final Color cold;
  final Color lightning;
  final Color thunder;
  final Color acid;
  final Color poison;
  final Color necrotic;
  final Color radiant;
  final Color psychic;
  final Color force;

  /// 物理傷害（鈍擊 / 穿刺 / 揮砍）共用。
  final Color physical;

  /// 預設 / 未知類型 / 非傷害數值的顏色。
  final Color neutral;

  /// 臨時 HP / 護盾的冷色（藍/青），與綠色 HP、金色主題區隔。
  final Color tempHp;

  const DndColors({
    required this.fire,
    required this.cold,
    required this.lightning,
    required this.thunder,
    required this.acid,
    required this.poison,
    required this.necrotic,
    required this.radiant,
    required this.psychic,
    required this.force,
    required this.physical,
    required this.neutral,
    required this.tempHp,
  });

  /// 依傷害類型字串（中英皆可）取得顏色，未知則回傳 [neutral]。
  Color damage(String type) => switch (type.toLowerCase().trim()) {
    'fire' || '火' || '火焰' => fire,
    'cold' || '冰' || '寒冰' || '冰霜' => cold,
    'lightning' || '閃電' || '電' => lightning,
    'thunder' || '雷鳴' || '轟雷' => thunder,
    'acid' || '強酸' || '酸' => acid,
    'poison' || '毒素' || '毒' => poison,
    'necrotic' || '黯蝕' || '死靈' => necrotic,
    'radiant' || '光耀' || '神聖' => radiant,
    'psychic' || '心靈' || '精神' => psychic,
    'force' || '力場' => force,
    'bludgeoning' ||
    'piercing' ||
    'slashing' ||
    '鈍擊' ||
    '穿刺' ||
    '揮砍' => physical,
    _ => neutral,
  };

  @override
  DndColors copyWith({
    Color? fire,
    Color? cold,
    Color? lightning,
    Color? thunder,
    Color? acid,
    Color? poison,
    Color? necrotic,
    Color? radiant,
    Color? psychic,
    Color? force,
    Color? physical,
    Color? neutral,
    Color? tempHp,
  }) {
    return DndColors(
      fire: fire ?? this.fire,
      cold: cold ?? this.cold,
      lightning: lightning ?? this.lightning,
      thunder: thunder ?? this.thunder,
      acid: acid ?? this.acid,
      poison: poison ?? this.poison,
      necrotic: necrotic ?? this.necrotic,
      radiant: radiant ?? this.radiant,
      psychic: psychic ?? this.psychic,
      force: force ?? this.force,
      physical: physical ?? this.physical,
      neutral: neutral ?? this.neutral,
      tempHp: tempHp ?? this.tempHp,
    );
  }

  @override
  DndColors lerp(ThemeExtension<DndColors>? other, double t) {
    if (other is! DndColors) return this;
    return DndColors(
      fire: Color.lerp(fire, other.fire, t)!,
      cold: Color.lerp(cold, other.cold, t)!,
      lightning: Color.lerp(lightning, other.lightning, t)!,
      thunder: Color.lerp(thunder, other.thunder, t)!,
      acid: Color.lerp(acid, other.acid, t)!,
      poison: Color.lerp(poison, other.poison, t)!,
      necrotic: Color.lerp(necrotic, other.necrotic, t)!,
      radiant: Color.lerp(radiant, other.radiant, t)!,
      psychic: Color.lerp(psychic, other.psychic, t)!,
      force: Color.lerp(force, other.force, t)!,
      physical: Color.lerp(physical, other.physical, t)!,
      neutral: Color.lerp(neutral, other.neutral, t)!,
      tempHp: Color.lerp(tempHp, other.tempHp, t)!,
    );
  }

  /// 深色主題配色（對齊 designs.pen）。
  static const dark = DndColors(
    fire: Color(0xFFD4845A),
    cold: Color(0xFF5A9ED4),
    lightning: Color(0xFF6FB7D4),
    thunder: Color(0xFF9B8FD0),
    acid: Color(0xFF8FA86B),
    poison: Color(0xFF7BA86B),
    necrotic: Color(0xFF7E8C6B),
    radiant: Color(0xFFE0C56A),
    psychic: Color(0xFFB58FD0),
    force: Color(0xFFC9A84C),
    physical: Color(0xFFC9A84C),
    neutral: Color(0xFFC9A84C),
    tempHp: Color(0xFF6FB0D4),
  );

  /// 淺色主題配色（較深、適合羊皮紙底）。
  static const light = DndColors(
    fire: Color(0xFFC0532B),
    cold: Color(0xFF2F6FB0),
    lightning: Color(0xFF3E7FA0),
    thunder: Color(0xFF6A5AA0),
    acid: Color(0xFF5E7A3A),
    poison: Color(0xFF4E7A3A),
    necrotic: Color(0xFF5A6B4A),
    radiant: Color(0xFFA9831F),
    psychic: Color(0xFF7A4FA0),
    force: Color(0xFF8B6E2A),
    physical: Color(0xFF6B4E3E),
    neutral: Color(0xFF6B4E3E),
    tempHp: Color(0xFF2F6FB0),
  );
}
