import '../../../../app/theme/dnd_colors.dart';
import '../../../../shared/presentation/widgets/entry_card.dart';
import '../../domain/character.dart';
import '../../domain/derived_stats.dart';

/// 將 [Spell] 轉為可展開的 [EntryCard]（戲法、已備法術、附贈／反應法術共用）。
///
/// [badge] 預設依環數自動帶（戲法為「戲」、其餘為環數）；可覆寫成情境徽章
/// （如附贈動作「贈」、反應「盾」）。[emphasize] 控制徽章是否金色強調。
EntryCard spellEntryCard(
  Spell spell, {
  required DndColors dnd,
  String? badge,
  bool emphasize = false,
}) {
  final hasDamage = spell.damage.isNotEmpty;
  return EntryCard(
    badge: badge ?? (spell.level == 0 ? '戲' : '${spell.level}'),
    title: spell.name,
    subtitle: spell.nameEn,
    meta: spell.range.isNotEmpty ? spell.range : null,
    metaArrow: spell.range.isNotEmpty,
    value: hasDamage ? spell.damage : null,
    valueColor: hasDamage ? dnd.damage(spell.damageType) : null,
    description: spell.description,
    footnote: spell.upgrade.isNotEmpty ? spell.upgrade : null,
    emphasizeBadge: emphasize,
  );
}

/// 將推導的 [AttackEntry]（裝備中武器／徒手攻擊）轉為可展開的 [EntryCard]。
/// 機制資料不足（hitBonus 為 null）時僅顯示名稱。
EntryCard attackEntryCard(AttackEntry entry, {required DndColors dnd}) {
  final hit = entry.hitBonus;
  final title = entry.quantity > 1
      ? '${entry.name} ×${entry.quantity}'
      : entry.name;
  return EntryCard(
    badge: '攻',
    title: title,
    subtitle: entry.nameEn,
    meta: hit != null ? '命中 ${hit >= 0 ? '+$hit' : '$hit'}' : null,
    value: entry.damage,
    valueColor: entry.damage != null ? dnd.damage(entry.damageType) : null,
    description: entry.properties.isNotEmpty
        ? entry.properties.join(' · ')
        : null,
    emphasizeBadge: true,
  );
}
