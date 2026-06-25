import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../app/theme/app_colors.dart';
import '../../../../app/theme/decorations.dart';
import '../../../../features/character/domain/character.dart';
import '../../../../features/character/domain/character_providers.dart';
import '../../../../shared/presentation/widgets/ability_card.dart';

class ChecksSection extends ConsumerStatefulWidget {
  const ChecksSection({super.key});

  @override
  ConsumerState<ChecksSection> createState() => _ChecksSectionState();
}

class _ChecksSectionState extends ConsumerState<ChecksSection> {
  int _tabIndex = 0;

  /// 目前選取的檢定項目；null 代表尚未選取（banner 顯示空白）。
  _Selection? _selected;

  void _select(_Selection sel) {
    setState(() => _selected = _selected?.id == sel.id ? null : sel);
  }

  void _switchTab(int index) {
    setState(() {
      _tabIndex = index;
      _selected = null; // 切換分頁時清除選取
    });
  }

  @override
  Widget build(BuildContext context) {
    final character = ref.watch(currentCharacterProvider);

    final abilities = [
      ('力量', 'Strength', 'STR', character.abilityScores.str),
      ('敏捷', 'Dexterity', 'DEX', character.abilityScores.dex),
      ('體質', 'Constitution', 'CON', character.abilityScores.con),
      ('智力', 'Intelligence', 'INT', character.abilityScores.int_),
      ('感知', 'Wisdom', 'WIS', character.abilityScores.wis),
      ('魅力', 'Charisma', 'CHA', character.abilityScores.cha),
    ];

    return CollapsibleSection(
      title: 'CHECKS 檢定',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildTabs(),
        const SizedBox(height: 8),
        _buildModifierBanner(_selected),
        const SizedBox(height: 8),
        if (_tabIndex == 0) _buildAbilityGrid(abilities),
        if (_tabIndex == 1)
          _buildSavesGrid(abilities, character.proficiencyBonus),
        if (_tabIndex == 2) _buildSkillsView(character, abilities),
        ],
      ),
    );
  }

  Widget _buildTabs() {
    final tabs = ['能力', '豁免', '技能'];
    return Container(
      height: 42,
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: const Color(0xFF1E160C),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.darkBorder, width: 1),
      ),
      child: Row(
        children: tabs.asMap().entries.map((entry) {
          final isActive = entry.key == _tabIndex;
          return Expanded(
            child: GestureDetector(
              onTap: () => _switchTab(entry.key),
              child: Container(
                decoration: BoxDecoration(
                  color: isActive ? const Color(0x22C9A84C) : Colors.transparent,
                ),
                alignment: Alignment.center,
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      entry.value,
                      style: TextStyle(
                        fontFamily: 'NotoSerifTC',
                        fontSize: 13,
                        fontWeight:
                            isActive ? FontWeight.w700 : FontWeight.normal,
                        color: isActive
                            ? AppColors.accentGold
                            : AppColors.darkTextSecondary,
                      ),
                    ),
                    if (isActive)
                      Container(
                        width: 28,
                        height: 2,
                        margin: const EdgeInsets.only(top: 2),
                        decoration: BoxDecoration(
                          color: AppColors.accentGold,
                          borderRadius: BorderRadius.circular(1),
                        ),
                      ),
                  ],
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildModifierBanner(_Selection? sel) {
    final active = sel != null;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      constraints: const BoxConstraints(minHeight: 72),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFF2E2010), Color(0xFF1A1005)],
        ),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: active ? AppColors.goldDim : AppColors.darkBorder,
          width: 1,
        ),
        boxShadow: active
            ? [
                const BoxShadow(
                  color: Color(0x20C9A84C),
                  blurRadius: 8,
                  offset: Offset(0, 2),
                ),
              ]
            : null,
      ),
      child: active ? _bannerActive(sel) : _bannerEmpty(),
    );
  }

  Widget _bannerEmpty() {
    return Row(
      children: [
        Icon(
          Icons.touch_app_outlined,
          size: 18,
          color: AppColors.darkTextSecondary.withValues(alpha: 0.6),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            '點選下方項目，計算 1d20 加值',
            style: TextStyle(
              fontFamily: 'NotoSerifTC',
              fontSize: 13,
              color: AppColors.darkTextSecondary.withValues(alpha: 0.7),
            ),
          ),
        ),
      ],
    );
  }

  Widget _bannerActive(_Selection sel) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              '骰 1d20 然後加上',
              style: TextStyle(
                fontFamily: 'NotoSerifTC',
                fontSize: 11,
                color: AppColors.darkTextSecondary,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              '${sel.labelCn}・${sel.labelEn}',
              style: TextStyle(
                fontFamily: 'Inter',
                fontSize: 10,
                color: AppColors.sectionLabel,
              ),
            ),
          ],
        ),
        Text(
          _fmt(sel.modifier),
          style: TextStyle(
            fontFamily: 'Cinzel',
            fontSize: 44,
            fontWeight: FontWeight.w700,
            color: AppColors.accentGold,
          ),
        ),
      ],
    );
  }

  Widget _buildAbilityGrid(
      List<(String, String, String, AbilityScore)> abilities) {
    CompactStatRow cell((String, String, String, AbilityScore) a) {
      final id = 'A:${a.$3}';
      return CompactStatRow(
        labelCN: a.$1,
        labelEN: a.$2,
        modifier: _fmt(a.$4.modifier),
        selected: _selected?.id == id,
        onTap: () => _select(_Selection(
          id: id,
          labelCn: a.$1,
          labelEn: a.$2,
          modifier: a.$4.modifier,
        )),
      );
    }

    final rows = <Widget>[];
    for (var i = 0; i < abilities.length; i += 2) {
      final a1 = abilities[i];
      final a2 = i + 1 < abilities.length ? abilities[i + 1] : null;
      rows.add(Row(
        children: [
          Expanded(child: cell(a1)),
          const SizedBox(width: 6),
          if (a2 != null)
            Expanded(child: cell(a2))
          else
            const Expanded(child: SizedBox()),
        ],
      ));
      rows.add(const SizedBox(height: 6));
    }
    return Column(children: rows);
  }

  Widget _buildSavesGrid(
      List<(String, String, String, AbilityScore)> abilities, int profBonus) {
    CompactStatRow cell((String, String, String, AbilityScore) a) {
      final id = 'V:${a.$3}';
      final save = a.$4.modifier + (a.$4.proficientSave ? profBonus : 0);
      final cn = '${a.$1}豁免';
      final en = '${a.$2} Save';
      return CompactStatRow(
        labelCN: cn,
        labelEN: en,
        modifier: _fmt(save),
        isProficient: a.$4.proficientSave,
        selected: _selected?.id == id,
        onTap: () => _select(_Selection(
          id: id,
          labelCn: cn,
          labelEn: en,
          modifier: save,
        )),
      );
    }

    final rows = <Widget>[];
    for (var i = 0; i < abilities.length; i += 2) {
      final a1 = abilities[i];
      final a2 = i + 1 < abilities.length ? abilities[i + 1] : null;
      rows.add(Row(
        children: [
          Expanded(child: cell(a1)),
          const SizedBox(width: 6),
          if (a2 != null)
            Expanded(child: cell(a2))
          else
            const Expanded(child: SizedBox()),
        ],
      ));
      rows.add(const SizedBox(height: 6));
    }
    return Column(children: rows);
  }

  Widget _buildSkillsView(Character character,
      List<(String, String, String, AbilityScore)> abilities) {
    final abilityOrder = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
    final abilityMap = {
      for (final a in abilities) a.$3: a,
    };

    final groups = <String, List<Skill>>{};
    for (final skill in character.skills) {
      groups.putIfAbsent(skill.abilityType, () => []).add(skill);
    }

    return Column(
      children: abilityOrder.where((k) => groups.containsKey(k)).map((key) {
        final ability = abilityMap[key]!;
        final skills = groups[key]!;
        return Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 4,
                    height: 4,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: AppColors.goldDim,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    '${ability.$1}・${ability.$2}',
                    style: TextStyle(
                      fontFamily: 'Inter',
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
                      color: AppColors.darkTextSecondary,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              ...List.generate((skills.length / 2).ceil(), (rowIdx) {
                final s1 = skills[rowIdx * 2];
                final s2 = rowIdx * 2 + 1 < skills.length
                    ? skills[rowIdx * 2 + 1]
                    : null;
                return Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: Row(
                    children: [
                      Expanded(child: _skillCell(s1)),
                      const SizedBox(width: 6),
                      if (s2 != null)
                        Expanded(child: _skillCell(s2))
                      else
                        const Expanded(child: SizedBox()),
                    ],
                  ),
                );
              }),
            ],
          ),
        );
      }).toList(),
    );
  }

  CompactStatRow _skillCell(Skill skill) {
    final id = 'K:${skill.nameEn}';
    return CompactStatRow(
      labelCN: skill.name,
      labelEN: skill.nameEn,
      modifier: _fmt(skill.modifier),
      isProficient: skill.proficient,
      selected: _selected?.id == id,
      onTap: () => _select(_Selection(
        id: id,
        labelCn: skill.name,
        labelEn: skill.nameEn,
        modifier: skill.modifier,
      )),
    );
  }

  String _fmt(int mod) => mod >= 0 ? '+$mod' : '$mod';
}

/// 目前選取的檢定項目（能力 / 豁免 / 技能共用）。
class _Selection {
  final String id;
  final String labelCn;
  final String labelEn;
  final int modifier;

  const _Selection({
    required this.id,
    required this.labelCn,
    required this.labelEn,
    required this.modifier,
  });
}
