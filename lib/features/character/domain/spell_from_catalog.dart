/// 內容庫法術 → 角色卡法術的反正規化映射。
///
/// 建角/學習法術當下把 [CatalogSpell] 複製成角色自持有的 [Spell]：
/// 描述壓成純文字全文（跑團時不依賴內容庫在線），排版損失（表格、
/// 升環區塊細節）為 v1 已知取捨——法術頁全面改用渲染器時再存結構化
/// entries。
library;

import '../../catalog/domain/catalog_models.dart';
import '../../catalog/domain/fivetools_text.dart';
import 'character.dart';

Spell spellFromCatalog(CatalogSpell s) => Spell(
  name: s.name,
  nameEn: s.engName ?? '',
  level: s.level,
  description: ftFlattenEntries(s.entries),
  range: ftFormatRange(s.range),
  castingTime: ftFormatCastingTime(s.castingTime),
  castKind: _castKind(s.castingTime),
  concentration: s.concentration,
  prepared: true,
);

/// 由 5etools `casting_time` 原始結構（`[{unit, number}]`）判斷動作類型。
SpellCastKind _castKind(List<dynamic> castingTime) {
  if (castingTime.isEmpty) return SpellCastKind.other;
  final unit = ((castingTime.first as Map)['unit'] as String?) ?? '';
  switch (unit) {
    case 'action':
      return SpellCastKind.action;
    case 'bonus':
      return SpellCastKind.bonus;
    case 'reaction':
      return SpellCastKind.reaction;
    default:
      return SpellCastKind.other;
  }
}
