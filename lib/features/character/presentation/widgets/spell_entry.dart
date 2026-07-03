import '../../../../app/theme/dnd_colors.dart';
import '../../../../shared/presentation/widgets/entry_card.dart';
import '../../domain/character.dart';

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

/// 將 [Weapon] 轉為可展開的 [EntryCard]。
EntryCard weaponEntryCard(Weapon weapon, {required DndColors dnd}) {
  final bonus = weapon.attackBonus >= 0
      ? '+${weapon.attackBonus}'
      : '${weapon.attackBonus}';
  return EntryCard(
    badge: '攻',
    title: weapon.name,
    subtitle: weapon.nameEn,
    meta: '命中 $bonus',
    value: weapon.damage.isNotEmpty ? weapon.damage : null,
    valueColor: dnd.damage(weapon.damageType),
    description: weapon.properties.isNotEmpty
        ? weapon.properties.join(' · ')
        : null,
    emphasizeBadge: true,
  );
}
