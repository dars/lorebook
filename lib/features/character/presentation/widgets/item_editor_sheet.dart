import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../app/theme/app_colors.dart';
import '../../../../app/theme/app_spacing.dart';
import '../../../../app/theme/surface_colors.dart';
import '../../domain/character.dart';
import '../../domain/character_providers.dart';
import 'editor_sheet.dart';

/// 開啟自訂物品編輯 sheet：[existing] 為 null 時新增，否則編輯該物品。
void showItemEditor(BuildContext context, {Equipment? existing}) {
  showModalBottomSheet<void>(
    context: context,
    useRootNavigator: true,
    isScrollControlled: true,
    backgroundColor: Theme.of(context).extension<SurfaceColors>()!.surface1,
    showDragHandle: true,
    builder: (context) => _ItemEditorSheet(existing: existing),
  );
}

const _typeLabels = {
  ItemType.weapon: '武器',
  ItemType.armor: '護甲',
  ItemType.gear: '裝備',
  ItemType.consumable: '消耗品',
};

/// D&D 規則的 13 種傷害類型（存英文小寫，DndColors.damage 依此上色）。
const _damageTypes = [
  ('bludgeoning', '鈍擊'),
  ('piercing', '穿刺'),
  ('slashing', '揮砍'),
  ('fire', '火焰'),
  ('cold', '寒冰'),
  ('lightning', '閃電'),
  ('thunder', '雷鳴'),
  ('acid', '強酸'),
  ('poison', '毒素'),
  ('necrotic', '黯蝕'),
  ('radiant', '光耀'),
  ('psychic', '心靈'),
  ('force', '力場'),
];

const _armorCategoryLabels = {
  ArmorCategory.light: '輕甲',
  ArmorCategory.medium: '中甲',
  ArmorCategory.heavy: '重甲',
  ArmorCategory.shield: '盾牌',
};

class _ItemEditorSheet extends ConsumerStatefulWidget {
  final Equipment? existing;
  const _ItemEditorSheet({this.existing});

  @override
  ConsumerState<_ItemEditorSheet> createState() => _ItemEditorSheetState();
}

class _ItemEditorSheetState extends ConsumerState<_ItemEditorSheet> {
  late final _name = TextEditingController(text: widget.existing?.name ?? '');
  late final _nameEn = TextEditingController(
    text: widget.existing?.nameEn ?? '',
  );
  late final _desc = TextEditingController(
    text: widget.existing?.description ?? '',
  );
  late final _damage = TextEditingController(
    text: widget.existing?.damage ?? '',
  );
  late final _acBase = TextEditingController(
    text: (widget.existing?.acBase ?? 0) > 0
        ? '${widget.existing!.acBase}'
        : '',
  );

  late ItemType _itemType = widget.existing?.itemType ?? ItemType.gear;
  late ArmorCategory _armorCategory = () {
    final c = widget.existing?.armorCategory ?? ArmorCategory.none;
    return c == ArmorCategory.none ? ArmorCategory.light : c;
  }();
  late String _damageType = widget.existing?.damageType ?? '';
  late bool _finesse = widget.existing?.finesse ?? false;
  late bool _quest = widget.existing?.quest ?? false;
  late int _quantity = widget.existing?.quantity ?? 1;

  @override
  void dispose() {
    _name.dispose();
    _nameEn.dispose();
    _desc.dispose();
    _damage.dispose();
    _acBase.dispose();
    super.dispose();
  }

  void _save() {
    final name = _name.text.trim();
    if (name.isEmpty) return; // 名稱必填
    final base = widget.existing ?? const Equipment(name: '');
    final updated = base.copyWith(
      name: name,
      nameEn: _nameEn.text.trim(),
      description: _desc.text.trim(),
      itemType: _itemType,
      quantity: _quantity,
      quest: _quest,
      damage: _itemType == ItemType.weapon ? _damage.text.trim() : '',
      damageType: _itemType == ItemType.weapon ? _damageType : '',
      finesse: _itemType == ItemType.weapon && _finesse,
      armorCategory: _itemType == ItemType.armor
          ? _armorCategory
          : ArmorCategory.none,
      acBase: _itemType == ItemType.armor
          ? (int.tryParse(_acBase.text.trim()) ?? 0)
          : 0,
      // 類型改變時清除不再適用的裝備狀態
      equipped:
          base.equipped &&
          (_itemType == ItemType.weapon || _itemType == ItemType.armor),
    );
    final notifier = ref.read(currentCharacterProvider.notifier);
    if (widget.existing == null) {
      notifier.addItem(updated);
    } else {
      notifier.updateItem(widget.existing!, updated);
    }
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    final surfaces = Theme.of(context).extension<SurfaceColors>()!;
    return EditorSheetScaffold(
      title: widget.existing == null ? '自訂物品' : '編輯物品',
      onSave: _save,
      fields: [
        const EditorFieldLabel('名稱（必填）'),
        TextField(
          controller: _name,
          style: const TextStyle(fontFamily: 'NotoSerifTC', fontSize: 14),
          decoration: const InputDecoration(hintText: '物品名稱'),
        ),
        const SizedBox(height: AppSpacing.md),
        const EditorFieldLabel('英文名'),
        TextField(
          controller: _nameEn,
          style: const TextStyle(fontFamily: 'Inter', fontSize: 14),
          decoration: const InputDecoration(hintText: 'Item name（可留空）'),
        ),
        const SizedBox(height: AppSpacing.md),
        const EditorFieldLabel('類型'),
        Wrap(
          spacing: 6,
          runSpacing: 6,
          children: [
            for (final t in ItemType.values)
              _chip(
                surfaces,
                label: _typeLabels[t]!,
                selected: _itemType == t,
                onTap: () => setState(() => _itemType = t),
              ),
          ],
        ),
        if (_itemType == ItemType.weapon) ...[
          const SizedBox(height: AppSpacing.md),
          const EditorFieldLabel('傷害骰（選填，如 1d8）'),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _damage,
                  style: const TextStyle(fontFamily: 'Inter', fontSize: 14),
                  decoration: const InputDecoration(hintText: '1d8'),
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: DropdownButtonFormField<String>(
                  initialValue: _damageType.isEmpty ? null : _damageType,
                  hint: const Text(
                    '傷害類型',
                    style: TextStyle(fontFamily: 'NotoSerifTC', fontSize: 13),
                  ),
                  isDense: true,
                  items: [
                    for (final (value, label) in _damageTypes)
                      DropdownMenuItem(
                        value: value,
                        child: Text.rich(
                          TextSpan(
                            children: [
                              TextSpan(
                                text: label,
                                style: const TextStyle(
                                  fontFamily: 'NotoSerifTC',
                                  fontSize: 13,
                                ),
                              ),
                              TextSpan(
                                text: '  $value',
                                style: TextStyle(
                                  fontFamily: 'Inter',
                                  fontSize: 11,
                                  color: Theme.of(context).colorScheme.onSurface
                                      .withValues(alpha: 0.45),
                                ),
                              ),
                            ],
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                  ],
                  onChanged: (v) => setState(() => _damageType = v ?? ''),
                ),
              ),
            ],
          ),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            value: _finesse,
            onChanged: (v) => setState(() => _finesse = v),
            title: Text(
              '靈巧（finesse）：命中/傷害取力量或敏捷較高者',
              style: TextStyle(
                fontFamily: 'NotoSerifTC',
                fontSize: 12,
                color: surfaces.textLight,
              ),
            ),
            activeThumbColor: AppColors.accentGold,
          ),
        ],
        if (_itemType == ItemType.armor) ...[
          const SizedBox(height: AppSpacing.md),
          const EditorFieldLabel('護甲類別'),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              for (final c in _armorCategoryLabels.entries)
                _chip(
                  surfaces,
                  label: c.value,
                  selected: _armorCategory == c.key,
                  onTap: () => setState(() => _armorCategory = c.key),
                ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          EditorFieldLabel(
            _armorCategory == ArmorCategory.shield
                ? 'AC 加值（盾牌通常 2）'
                : 'AC 基值（如輕甲 11、重甲 16）',
          ),
          TextField(
            controller: _acBase,
            keyboardType: TextInputType.number,
            style: const TextStyle(fontFamily: 'Inter', fontSize: 14),
            decoration: const InputDecoration(hintText: '缺值時不參與 AC 推導'),
          ),
        ],
        const SizedBox(height: AppSpacing.md),
        const EditorFieldLabel('描述'),
        TextField(
          controller: _desc,
          maxLines: 2,
          style: const TextStyle(fontFamily: 'NotoSerifTC', fontSize: 14),
          decoration: const InputDecoration(hintText: '（可留空）'),
        ),
        const SizedBox(height: AppSpacing.md),
        Row(
          children: [
            const EditorFieldLabel('數量'),
            const Spacer(),
            IconButton(
              onPressed: _quantity > 1
                  ? () => setState(() => _quantity--)
                  : null,
              icon: const Icon(Icons.remove_circle_outline),
            ),
            Text(
              '$_quantity',
              style: const TextStyle(
                fontFamily: 'Cinzel',
                fontSize: 16,
                fontWeight: FontWeight.w700,
              ),
            ),
            IconButton(
              onPressed: () => setState(() => _quantity++),
              icon: const Icon(Icons.add_circle_outline),
            ),
          ],
        ),
        SwitchListTile(
          contentPadding: EdgeInsets.zero,
          value: _quest,
          onChanged: (v) => setState(() => _quest = v),
          title: const Text(
            '任務物品',
            style: TextStyle(fontFamily: 'NotoSerifTC', fontSize: 14),
          ),
          subtitle: Text(
            '刪除需確認、用罄保留、不可販售',
            style: TextStyle(fontSize: 11, color: surfaces.textSecondary),
          ),
          activeThumbColor: AppColors.accentGold,
        ),
      ],
    );
  }

  Widget _chip(
    SurfaceColors surfaces, {
    required String label,
    required bool selected,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(AppSpacing.radiusChip),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        decoration: BoxDecoration(
          color: selected ? surfaces.surface2 : surfaces.surface0,
          borderRadius: BorderRadius.circular(AppSpacing.radiusChip),
          border: Border.all(
            color: selected ? AppColors.accentGold : surfaces.border,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontFamily: 'NotoSerifTC',
            fontSize: 12,
            fontWeight: selected ? FontWeight.w700 : FontWeight.w400,
            color: selected ? surfaces.textPrimary : surfaces.textLight,
          ),
        ),
      ),
    );
  }
}
