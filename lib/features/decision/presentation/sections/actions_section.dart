import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../app/theme/app_colors.dart';
import '../../../../app/theme/decorations.dart';
import '../../../../app/theme/dnd_colors.dart';
import '../../../../features/character/domain/character.dart';
import '../../../../features/character/domain/character_providers.dart';
import '../../../../features/character/presentation/widgets/spell_entry.dart';
import '../../../../shared/presentation/widgets/entry_card.dart';

/// 通用動作（花費「動作」的非攻擊/非施法選項）。
class _OtherAction {
  final String cn;
  final String en;
  final String effect;
  final String desc;
  const _OtherAction(this.cn, this.en, this.effect, this.desc);
}

const _otherActions = <_OtherAction>[
  _OtherAction('疾走', 'Dash', '移動加倍', '本回合獲得等同於你速度的額外移動。'),
  _OtherAction('撤離', 'Disengage', '不引發機會攻擊', '本回合你的移動不會引發機會攻擊。'),
  _OtherAction('閃避', 'Dodge', '攻擊你有劣勢', '直到下回合開始，針對你的攻擊檢定具劣勢，且你的敏捷豁免具優勢。'),
  _OtherAction('協助', 'Help', '給予優勢', '協助盟友：其下一次相關檢定，或攻擊你協助對付的目標時具有優勢。'),
  _OtherAction('躲藏', 'Hide', '取得隱蔽', '進行敏捷（隱匿）檢定以隱藏行蹤。'),
  _OtherAction('預備', 'Ready', '設定觸發', '預備一個動作，於指定觸發條件出現時以反應執行。'),
  _OtherAction('搜索', 'Search', '尋找線索', '進行感知或調查檢定以察覺隱藏事物。'),
  _OtherAction('使用物品', 'Use Object', '互動物件', '與一件物品互動或使用其特殊功能。'),
];

/// 行動頁的動作經濟區：輸出 **動作 / 附贈動作 / 反應 三個頂層可收合 section**
/// （與狀態/移動同階）。「動作」section 內再分 攻擊 / 施法 / 其他（可收合），
/// 施法內再分 戲法 / 各環。
class ActionsSection extends ConsumerStatefulWidget {
  /// 平板多欄排列用的部分渲染旗標（預設全開 = 單欄行為）。
  final bool showAction;
  final bool showBonus;
  final bool showReaction;

  const ActionsSection({
    super.key,
    this.showAction = true,
    this.showBonus = true,
    this.showReaction = true,
  });

  @override
  ConsumerState<ActionsSection> createState() => _ActionsSectionState();
}

class _ActionsSectionState extends ConsumerState<ActionsSection> {
  // 類別收合狀態（頂層 section 的收合由 CollapsibleSection 自管）。預設「其他」收合。
  final Set<String> _collapsed = {'cat.other'};

  // 施法子層（戲法/各環）的展開狀態，**預設全收合**（空集合 = 全收合）。
  final Set<String> _expandedRings = {};

  bool _isCollapsed(String k) => _collapsed.contains(k);
  void _toggle(String k) => setState(() {
    if (!_collapsed.remove(k)) _collapsed.add(k);
  });

  void _toggleRing(String k) => setState(() {
    if (!_expandedRings.remove(k)) _expandedRings.add(k);
  });

  @override
  Widget build(BuildContext context) {
    final character = ref.watch(currentCharacterProvider);
    final dnd = Theme.of(context).extension<DndColors>()!;

    final weapons = character.weapons;
    final cantrips = character.cantrips;
    final actionSpells = character.spells
        .where(
          (s) =>
              s.level > 0 && s.prepared && s.castKind == SpellCastKind.action,
        )
        .toList();
    final isCaster = cantrips.isNotEmpty || actionSpells.isNotEmpty;
    final rings = actionSpells.map((s) => s.level).toSet().toList()..sort();

    final bonusSpells = character.spells
        .where((s) => s.castKind == SpellCastKind.bonus)
        .toList();
    final reactionSpells = character.spells
        .where((s) => s.castKind == SpellCastKind.reaction)
        .toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // ── 動作 ──
        if (widget.showAction)
          CollapsibleSection(
            title: 'ACTION 動作',
            summary: ['攻擊', if (isCaster) '施法', '其他'].join('・'),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _category(
                  key: 'cat.attack',
                  label: '攻擊',
                  count: '${weapons.length} 項',
                  children: [
                    for (final w in weapons)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: weaponEntryCard(w, dnd: dnd),
                      ),
                  ],
                ),
                if (isCaster)
                  _category(
                    key: 'cat.cast',
                    label: '施法',
                    count: _castCount(cantrips, actionSpells, rings),
                    children: [
                      if (cantrips.isNotEmpty)
                        _ringGroup(
                          key: 'ring.cantrip',
                          label: '戲法',
                          count: '${cantrips.length}',
                          children: [
                            for (final s in cantrips)
                              Padding(
                                padding: const EdgeInsets.only(bottom: 6),
                                child: spellEntryCard(s, badge: '戲', dnd: dnd),
                              ),
                          ],
                        ),
                      for (final ring in rings)
                        _ringGroup(
                          key: 'ring.$ring',
                          label: '$ring環',
                          count:
                              '${actionSpells.where((s) => s.level == ring).length}',
                          children: [
                            for (final s in actionSpells.where(
                              (x) => x.level == ring,
                            ))
                              Padding(
                                padding: const EdgeInsets.only(bottom: 6),
                                child: spellEntryCard(
                                  s,
                                  badge: '$ring',
                                  dnd: dnd,
                                  emphasize: true,
                                ),
                              ),
                          ],
                        ),
                    ],
                  ),
                _category(
                  key: 'cat.other',
                  label: '其他',
                  count: '${_otherActions.length} 項',
                  children: [
                    for (final o in _otherActions)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: EntryCard(
                          badge: '動',
                          title: o.cn,
                          subtitle: o.en,
                          value: o.effect,
                          valueColor: AppColors.darkTextLight,
                          description: o.desc,
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ),

        // ── 附贈動作 ──
        if (widget.showBonus)
          CollapsibleSection(
            title: 'BONUS ACTION 附贈動作',
            summary: bonusSpells.isEmpty
                ? '無可用'
                : bonusSpells.map((s) => s.name).join('・'),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: bonusSpells.isEmpty
                  ? [
                      const EntryCard(
                        badge: '贈',
                        title: '無附贈動作',
                        subtitle: 'No Bonus Actions',
                      ),
                    ]
                  : [
                      for (final s in bonusSpells)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: spellEntryCard(
                            s,
                            badge: '贈',
                            dnd: dnd,
                            emphasize: true,
                          ),
                        ),
                    ],
            ),
          ),

        // ── 反應 ──
        if (widget.showReaction)
          CollapsibleSection(
            title: 'REACTION 反應',
            summary: [...reactionSpells.map((s) => s.name), '機會攻擊'].join('・'),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                for (final s in reactionSpells)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: spellEntryCard(
                      s,
                      badge: '盾',
                      dnd: dnd,
                      emphasize: true,
                    ),
                  ),
                EntryCard(
                  badge: '攻',
                  title: '機會攻擊',
                  subtitle: 'Opportunity Attack',
                  value: '1 次攻擊',
                  valueColor: AppColors.darkTextLight,
                  description: '當敵人離開你的觸及範圍時，你可用反應對其進行一次近戰攻擊。',
                ),
              ],
            ),
          ),
      ],
    );
  }

  String _castCount(
    List<Spell> cantrips,
    List<Spell> actionSpells,
    List<int> rings,
  ) {
    final parts = <String>[];
    if (cantrips.isNotEmpty) parts.add('戲法 ${cantrips.length}');
    for (final r in rings) {
      parts.add('$r環 ${actionSpells.where((s) => s.level == r).length}');
    }
    return parts.join('・');
  }

  /// 類別（攻擊/施法/其他，可收合）。
  Widget _category({
    required String key,
    required String label,
    required String count,
    required List<Widget> children,
  }) {
    final collapsed = _isCollapsed(key);
    return Padding(
      padding: const EdgeInsets.only(left: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          InkWell(
            onTap: () => _toggle(key),
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 5),
              child: Row(
                children: [
                  Icon(
                    collapsed ? Icons.chevron_right : Icons.expand_more,
                    size: 15,
                    color: AppColors.goldDim,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    label,
                    style: TextStyle(
                      fontFamily: 'NotoSerifTC',
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: AppColors.goldDim,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      '· $count',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontFamily: 'Inter',
                        fontSize: 10,
                        color: AppColors.darkTextSecondary,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          if (!collapsed)
            Padding(
              padding: const EdgeInsets.only(left: 8, top: 6, bottom: 2),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: children,
              ),
            ),
        ],
      ),
    );
  }

  /// 施法子層（戲法/各環，可收合，預設收合）。
  Widget _ringGroup({
    required String key,
    required String label,
    required String count,
    required List<Widget> children,
  }) {
    final expanded = _expandedRings.contains(key);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        InkWell(
          onTap: () => _toggleRing(key),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Row(
              children: [
                Icon(
                  expanded ? Icons.expand_more : Icons.chevron_right,
                  size: 14,
                  color: AppColors.darkTextSecondary,
                ),
                const SizedBox(width: 4),
                Text(
                  label,
                  style: TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 1,
                    color: AppColors.darkTextSecondary,
                  ),
                ),
                const SizedBox(width: 6),
                Text(
                  '· $count',
                  style: TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 10,
                    color: AppColors.darkTextSecondary.withValues(alpha: 0.6),
                  ),
                ),
              ],
            ),
          ),
        ),
        if (expanded)
          Padding(
            padding: const EdgeInsets.only(left: 6, top: 4),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: children,
            ),
          ),
      ],
    );
  }
}
