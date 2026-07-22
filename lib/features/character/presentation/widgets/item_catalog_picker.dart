import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../app/theme/app_colors.dart';
import '../../../../app/theme/app_spacing.dart';
import '../../../../app/theme/surface_colors.dart';
import '../../../catalog/data/catalog_repository.dart';
import '../../../catalog/domain/catalog_models.dart';
import '../../../catalog/presentation/fivetools_renderer.dart';
import '../../domain/character.dart';
import '../../domain/character_providers.dart';
import '../../domain/currency_math.dart';
import 'coin_display.dart';

/// 從內容庫裝備目錄挑選物品（item-catalog 規格；版面依 designs.pen
/// 「裝備目錄挑選 iPad(改版)」）：等寬 segmented 分類（固定寬度不抖動）、
/// 子分類分組清單；詳情頁含統計卡/徽章/規則卡，取得面板整合於底部
/// （數量＋成交單價＋總計＋購買/直接取得，不再另開對話框）。
void showItemCatalogPicker(BuildContext context) {
  showModalBottomSheet<void>(
    context: context,
    useRootNavigator: true,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    // iPad 上 M3 bottom sheet 預設最大寬 640dp，會把主從式版面壓爛；
    // 目錄需要寬幅，放寬到 1100（超寬螢幕自動置中）。
    constraints: const BoxConstraints(maxWidth: 1100),
    builder: (context) => const _CatalogPickerSheet(),
  );
}

const _categoryLabels = {
  'weapon': '武器',
  'armor': '護甲',
  'gear': '裝備',
  'tool': '工具',
};

/// 武器精通（2024 SRD 5.2）中文名與一句話效果。
const _masteryInfo = {
  'Cleave': ('劈砍', '命中後可對緊鄰原目標的另一生物再攻擊一次（傷害不加屬性調整值）。'),
  'Graze': ('擦傷', '攻擊未命中時，仍造成等同屬性調整值的傷害。'),
  'Nick': ('迅斬', '雙持的額外攻擊可併入攻擊動作（每回合一次）。'),
  'Push': ('推撞', '命中時可將大型或更小的目標推離 10 呎。'),
  'Sap': ('弱化', '命中後目標的下一次攻擊檢定具劣勢。'),
  'Slow': ('遲滯', '命中後目標速度 −10 呎，直到你的下回合開始。'),
  'Topple': ('擊倒', '命中時可迫使目標進行體質豁免，失敗即陷入倒地。'),
  'Vex': ('擾亂', '命中後你對該目標的下一次攻擊檢定具優勢。'),
};

/// 武器屬性標籤的白話解釋（規則卡用）。
String? _propertyNote(String p) {
  final paren = RegExp(r'\((.+)\)').firstMatch(p)?.group(1);
  final head = p.split(' ').first;
  return switch (head) {
    'finesse' => '靈巧：命中與傷害可取力量或敏捷較高者。',
    'versatile' => '靈活：雙手持用時傷害改為 ${paren ?? '較高骰'}。',
    'thrown' => '投擲：可擲出進行遠程攻擊${paren != null ? '，射程 $paren' : ''}。',
    'light' => '輕型：適合雙持。',
    'heavy' => '重型：小型生物使用時攻擊具劣勢。',
    'two-handed' => '雙手：攻擊時須雙手持用。',
    'reach' => '觸及：攻擊距離 +5 呎。',
    'ammunition' => '彈藥：需消耗彈藥${paren != null ? '，射程 $paren' : ''}。',
    'loading' => '裝填：每次行動不論攻擊次數僅能射擊一次。',
    'special' => '特殊：規則見完整說明。',
    _ => null,
  };
}

ItemType _itemTypeOf(CatalogItem it) => switch (it.category) {
  'weapon' => ItemType.weapon,
  'armor' => ItemType.armor,
  _ => ItemType.gear,
};

ArmorCategory _armorCategoryOf(CatalogItem it) => switch (it.armorCategory) {
  'light' => ArmorCategory.light,
  'medium' => ArmorCategory.medium,
  'heavy' => ArmorCategory.heavy,
  'shield' => ArmorCategory.shield,
  _ => ArmorCategory.none,
};

Equipment _toEquipment(CatalogItem it) => Equipment(
  name: it.name,
  nameEn: it.engName ?? '',
  type: _categoryLabels[it.category] ?? it.category,
  itemType: _itemTypeOf(it),
  source: ItemSource.catalog,
  catalogRef: it.engName ?? it.name,
  priceCp: it.priceCp,
  damage: it.damageDice,
  damageType: it.damageType,
  finesse: it.finesse,
  properties: it.properties,
  armorCategory: _armorCategoryOf(it),
  acBase: it.acBase,
);

class _CatalogPickerSheet extends ConsumerStatefulWidget {
  const _CatalogPickerSheet();

  @override
  ConsumerState<_CatalogPickerSheet> createState() =>
      _CatalogPickerSheetState();
}

class _CatalogPickerSheetState extends ConsumerState<_CatalogPickerSheet> {
  /// 分類頁序：index 0 = 全部，其後依 _categoryLabels 順序。
  static final _categoryKeys = <String?>[null, ..._categoryLabels.keys];

  String _query = '';
  int _categoryIndex = 0;
  CatalogItem? _selected;
  late final PageController _pageController = PageController();

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  List<CatalogItem> _filter(List<CatalogItem> all, String? category) {
    final q = _query.trim().toLowerCase();
    return [
      for (final it in all)
        if ((category == null || it.category == category) &&
            (q.isEmpty ||
                it.name.toLowerCase().contains(q) ||
                (it.engName ?? '').toLowerCase().contains(q)))
          it,
    ];
  }

  @override
  Widget build(BuildContext context) {
    final surfaces = Theme.of(context).extension<SurfaceColors>()!;
    final mq = MediaQuery.of(context);
    final topGap = mq.padding.top + 40;
    final items = ref.watch(itemCatalogProvider).valueOrNull ?? const [];

    return Padding(
      padding: EdgeInsets.only(top: topGap),
      child: Container(
        height: mq.size.height - topGap,
        decoration: BoxDecoration(
          color: surfaces.surface1,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: ClipRRect(
          borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
          child: SafeArea(
            top: false,
            child: LayoutBuilder(
              builder: (context, constraints) {
                // 主從式需要左右都夠寬：左 360 + 右 ≥340 才啟用
                final wide = constraints.maxWidth >= 700;
                if (wide) {
                  return Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      SizedBox(width: 360, child: _listPane(surfaces, items)),
                      Container(width: 1, color: surfaces.border2),
                      Expanded(
                        child: _selected == null
                            ? Center(
                                child: Text(
                                  '選擇左側條目檢視詳情',
                                  style: TextStyle(
                                    fontFamily: 'NotoSerifTC',
                                    color: surfaces.textSecondary,
                                  ),
                                ),
                              )
                            : _DetailPane(
                                key: ValueKey(_selected!.id),
                                item: _selected!,
                                onClose: () => setState(() => _selected = null),
                              ),
                      ),
                    ],
                  );
                }
                return _selected == null
                    ? _listPane(surfaces, items)
                    : _DetailPane(
                        key: ValueKey(_selected!.id),
                        item: _selected!,
                        onClose: () => setState(() => _selected = null),
                        showBack: true,
                      );
              },
            ),
          ),
        ),
      ),
    );
  }

  Widget _listPane(SurfaceColors surfaces, List<CatalogItem> items) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
          child: TextField(
            onChanged: (v) => setState(() => _query = v),
            style: const TextStyle(fontFamily: 'NotoSerifTC', fontSize: 14),
            decoration: const InputDecoration(
              hintText: '搜尋物品（中/英文名稱）',
              prefixIcon: Icon(Icons.search, size: 18),
              isDense: true,
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: _CategorySegmented(
            selected: _categoryKeys[_categoryIndex],
            onChanged: (c) => _pageController.animateToPage(
              _categoryKeys.indexOf(c),
              duration: const Duration(milliseconds: 250),
              curve: Curves.easeOutCubic,
            ),
          ),
        ),
        const SizedBox(height: 4),
        // 分類清單以 PageView 呈現：左右滑動切換分類（與角色頁 tab 同手感），
        // 與上方 segmented 雙向同步。
        Expanded(
          child: PageView(
            controller: _pageController,
            onPageChanged: (i) => setState(() => _categoryIndex = i),
            children: [
              for (final key in _categoryKeys)
                _categoryListView(surfaces, _filter(items, key)),
            ],
          ),
        ),
      ],
    );
  }

  Widget _categoryListView(SurfaceColors surfaces, List<CatalogItem> filtered) {
    if (filtered.isEmpty) {
      return Center(
        child: Text(
          '沒有符合的條目',
          style: TextStyle(
            fontFamily: 'NotoSerifTC',
            color: surfaces.textSecondary,
          ),
        ),
      );
    }
    return ListView(children: _buildGroupedRows(surfaces, filtered));
  }

  /// 清單結構：「再次取得」置頂（自物品欄 source=catalog 推導）＋子分類
  /// 分組標頭。
  List<Widget> _buildGroupedRows(
    SurfaceColors surfaces,
    List<CatalogItem> filtered,
  ) {
    final rows = <Widget>[];

    final owned = ref
        .watch(currentCharacterProvider.select((c) => c.equipment))
        .where((e) => e.source == ItemSource.catalog)
        .map((e) => e.catalogRef)
        .toSet();
    final repurchase = [
      for (final it in filtered)
        if (owned.contains(it.engName ?? it.name)) it,
    ];
    if (repurchase.isNotEmpty && _query.isEmpty) {
      rows.add(_groupHeader(surfaces, '再次取得'));
      rows.addAll(repurchase.map((it) => _itemTile(surfaces, it)));
    }

    final groups = <String, List<CatalogItem>>{};
    for (final it in filtered) {
      final key = it.subcategory.isNotEmpty
          ? it.subcategory
          : (_categoryLabels[it.category] ?? it.category);
      groups.putIfAbsent(key, () => []).add(it);
    }
    final showHeaders = groups.length > 1;
    for (final entry in groups.entries) {
      if (showHeaders) rows.add(_groupHeader(surfaces, entry.key));
      rows.addAll(entry.value.map((it) => _itemTile(surfaces, it)));
    }
    return rows;
  }

  Widget _groupHeader(SurfaceColors surfaces, String label) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
      child: Row(
        children: [
          Text(
            label,
            style: TextStyle(
              fontFamily: 'NotoSerifTC',
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: surfaces.accent,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(child: Container(height: 1, color: surfaces.border2)),
        ],
      ),
    );
  }

  Widget _itemTile(SurfaceColors surfaces, CatalogItem it) {
    final selected = _selected == it;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8),
      child: InkWell(
        onTap: () => setState(() => _selected = it),
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 9),
          decoration: BoxDecoration(
            color: selected ? surfaces.surface2 : null,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            children: [
              if (selected) ...[
                Container(
                  width: 3,
                  height: 30,
                  decoration: BoxDecoration(
                    color: AppColors.accentGold,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(width: 8),
              ],
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      it.name,
                      style: TextStyle(
                        fontFamily: 'NotoSerifTC',
                        fontSize: 14,
                        fontWeight: selected
                            ? FontWeight.w700
                            : FontWeight.w400,
                        color: surfaces.textPrimary,
                      ),
                    ),
                    if (it.engName != null)
                      Text(
                        it.engName!,
                        style: TextStyle(
                          fontFamily: 'Inter',
                          fontSize: 10,
                          color: surfaces.textSecondary,
                        ),
                      ),
                  ],
                ),
              ),
              if (it.priceCp > 0)
                CoinAmount(it.priceCp, coinSize: 14)
              else
                Text(
                  '—',
                  style: TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 12,
                    color: surfaces.textSecondary,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

/// 等寬 segmented 分類列：每格 Expanded 均分、寬度固定，選取只變底色與
/// 字重、不加勾勾——避免 chip 寬度變化造成整排抖動。
class _CategorySegmented extends StatelessWidget {
  final String? selected;
  final ValueChanged<String?> onChanged;
  const _CategorySegmented({required this.selected, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    final surfaces = Theme.of(context).extension<SurfaceColors>()!;
    final cells = <(String?, String)>[
      (null, '全部'),
      for (final c in _categoryLabels.entries) (c.key, c.value),
    ];
    return Container(
      padding: const EdgeInsets.all(3),
      decoration: BoxDecoration(
        color: surfaces.surface0,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          for (final (key, label) in cells)
            Expanded(
              child: InkWell(
                onTap: () => onChanged(key),
                borderRadius: BorderRadius.circular(6),
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  decoration: BoxDecoration(
                    color: selected == key ? AppColors.goldDim : null,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    label,
                    style: TextStyle(
                      fontFamily: 'NotoSerifTC',
                      fontSize: 13,
                      fontWeight: selected == key
                          ? FontWeight.w700
                          : FontWeight.w400,
                      color: selected == key
                          ? Colors.white
                          : surfaces.textSecondary,
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// 詳情面板：標題＋徽章、統計卡列、規則卡、底部取得面板（同頁完成，
/// 不另開對話框）。
class _DetailPane extends ConsumerStatefulWidget {
  final CatalogItem item;
  final VoidCallback onClose;
  final bool showBack;
  const _DetailPane({
    super.key,
    required this.item,
    required this.onClose,
    this.showBack = false,
  });

  @override
  ConsumerState<_DetailPane> createState() => _DetailPaneState();
}

class _DetailPaneState extends ConsumerState<_DetailPane> {
  int _qty = 1;
  late int _unitPriceCp = widget.item.priceCp;

  CatalogItem get item => widget.item;

  @override
  Widget build(BuildContext context) {
    final surfaces = Theme.of(context).extension<SurfaceColors>()!;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 14, 20, 0),
          child: Row(
            children: [
              if (widget.showBack)
                IconButton(
                  icon: const Icon(Icons.arrow_back),
                  onPressed: widget.onClose,
                ),
              Text(
                item.name,
                style: TextStyle(
                  fontFamily: 'NotoSerifTC',
                  fontSize: 24,
                  fontWeight: FontWeight.w700,
                  color: surfaces.textPrimary,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  (item.engName ?? '').toUpperCase(),
                  style: TextStyle(
                    fontFamily: 'Cinzel',
                    fontSize: 14,
                    color: surfaces.textSecondary,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
          child: Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              if (item.subcategory.isNotEmpty)
                _badge(surfaces, item.subcategory, gold: true),
              for (final p in item.properties) _badge(surfaces, p),
              for (final m in item.mastery)
                _badge(surfaces, 'mastery: ${_masteryInfo[m]?.$1 ?? m}'),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
          child: _statStrip(surfaces),
        ),
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
            child: _rulesCard(surfaces),
          ),
        ),
        SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: _acquirePanel(surfaces),
          ),
        ),
      ],
    );
  }

  Widget _badge(SurfaceColors surfaces, String label, {bool gold = false}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(4),
        border: Border.all(
          color: gold ? AppColors.accentGold : surfaces.border,
        ),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontFamily: 'NotoSerifTC',
          fontSize: 11,
          color: gold ? surfaces.accent : surfaces.textLight,
        ),
      ),
    );
  }

  Widget _statStrip(SurfaceColors surfaces) {
    final cards = <Widget>[];

    Widget stat(String label, Widget value, String sub) => SizedBox(
      width: 128,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: surfaces.surface1,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: surfaces.border2),
        ),
        child: Column(
          children: [
            Text(
              label,
              style: TextStyle(
                fontFamily: 'NotoSerifTC',
                fontSize: 10,
                color: AppColors.sectionLabel,
              ),
            ),
            const SizedBox(height: 3),
            value,
            const SizedBox(height: 3),
            Text(
              sub,
              style: TextStyle(
                fontFamily: 'NotoSerifTC',
                fontSize: 10,
                color: surfaces.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );

    Text big(String s, {Color? color}) => Text(
      s,
      style: TextStyle(
        fontFamily: 'Cinzel',
        fontSize: 18,
        fontWeight: FontWeight.w700,
        color: color ?? surfaces.textLight,
      ),
    );

    if (item.damageDice.isNotEmpty) {
      cards.add(
        stat(
          '傷害 DAMAGE',
          big(item.damageDice, color: surfaces.accent),
          item.damageType,
        ),
      );
    }
    if (item.acBase > 0) {
      cards.add(
        stat(
          'AC',
          big(
            item.armorCategory == 'shield'
                ? '+${item.acBase}'
                : '${item.acBase}',
            color: surfaces.accent,
          ),
          {
                'light': '輕甲＋敏捷',
                'medium': '中甲＋敏捷≤2',
                'heavy': '重甲固定',
                'shield': '盾牌加值',
              }[item.armorCategory] ??
              '',
        ),
      );
    }
    if (item.weight.isNotEmpty && item.weight != '0') {
      cards.add(stat('重量 WEIGHT', big('${item.weight} lb'), '—'));
    }
    if (item.priceCp > 0) {
      cards.add(
        stat('標價 PRICE', CoinAmount(item.priceCp, coinSize: 16), 'SRD 定價'),
      );
    }
    final m = item.mastery.isNotEmpty ? _masteryInfo[item.mastery.first] : null;
    if (m != null) {
      cards.add(stat('精通 MASTERY', big(m.$1), item.mastery.first));
    }
    if (cards.isEmpty) return const SizedBox.shrink();

    return Wrap(spacing: 10, runSpacing: 10, children: cards);
  }

  Widget _rulesCard(SurfaceColors surfaces) {
    final lines = <String>[];
    final m = item.mastery.isNotEmpty ? _masteryInfo[item.mastery.first] : null;
    if (m != null) lines.add('精通——${m.$1} ${item.mastery.first}：${m.$2}');
    for (final p in item.properties) {
      final note = _propertyNote(p);
      if (note != null) lines.add(note);
    }

    if (item.entries.isEmpty && lines.isEmpty) return const SizedBox.shrink();

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: surfaces.surface1,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: surfaces.border2),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '規則 RULES',
            style: TextStyle(
              fontFamily: 'NotoSerifTC',
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: AppColors.goldDim,
            ),
          ),
          const SizedBox(height: 8),
          for (final line in lines)
            Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Text(
                line,
                style: TextStyle(
                  fontFamily: 'NotoSerifTC',
                  fontSize: 13,
                  height: 1.7,
                  color: surfaces.textLight,
                ),
              ),
            ),
          if (item.entries.isNotEmpty) FtEntriesView(item.entries),
        ],
      ),
    );
  }

  Widget _acquirePanel(SurfaceColors surfaces) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: surfaces.surface1,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: surfaces.border2),
      ),
      child: Column(
        children: [
          Wrap(
            spacing: 12,
            runSpacing: 8,
            alignment: WrapAlignment.spaceBetween,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    '數量',
                    style: TextStyle(
                      fontFamily: 'NotoSerifTC',
                      fontSize: 13,
                      color: surfaces.textSecondary,
                    ),
                  ),
                  const SizedBox(width: 6),
                  IconButton(
                    onPressed: _qty > 1 ? () => setState(() => _qty--) : null,
                    icon: const Icon(Icons.remove_circle_outline, size: 20),
                  ),
                  Text(
                    '$_qty',
                    style: TextStyle(
                      fontFamily: 'Cinzel',
                      fontSize: 17,
                      fontWeight: FontWeight.w700,
                      color: surfaces.textPrimary,
                    ),
                  ),
                  IconButton(
                    onPressed: _qty < 99 ? () => setState(() => _qty++) : null,
                    icon: const Icon(Icons.add_circle_outline, size: 20),
                  ),
                ],
              ),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    '成交單價',
                    style: TextStyle(
                      fontFamily: 'NotoSerifTC',
                      fontSize: 13,
                      color: surfaces.textSecondary,
                    ),
                  ),
                  const SizedBox(width: 8),
                  InkWell(
                    onTap: _editUnitPrice,
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 7,
                      ),
                      decoration: BoxDecoration(
                        color: surfaces.surface0,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: surfaces.border),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (_unitPriceCp > 0)
                            CoinAmount(_unitPriceCp, coinSize: 15)
                          else
                            Text(
                              '未定價',
                              style: TextStyle(
                                fontFamily: 'NotoSerifTC',
                                fontSize: 13,
                                color: surfaces.textSecondary,
                              ),
                            ),
                          const SizedBox(width: 6),
                          Icon(
                            Icons.edit_outlined,
                            size: 13,
                            color: surfaces.textSecondary,
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
          Divider(color: surfaces.border2, height: 20),
          Row(
            children: [
              Text(
                '總計',
                style: TextStyle(
                  fontFamily: 'NotoSerifTC',
                  fontSize: 13,
                  color: surfaces.textSecondary,
                ),
              ),
              const Spacer(),
              CoinAmount(
                _unitPriceCp * _qty,
                coinSize: 18,
                style: TextStyle(
                  fontFamily: 'Cinzel',
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                  color: surfaces.accent,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: _acquireFree,
                  style: OutlinedButton.styleFrom(
                    side: BorderSide(color: surfaces.border),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                  child: const Text(
                    '直接取得',
                    style: TextStyle(fontFamily: 'NotoSerifTC'),
                  ),
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: FilledButton(
                  onPressed: _purchase,
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.accentGold,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                  child: const Text(
                    '購買',
                    style: TextStyle(
                      fontFamily: 'NotoSerifTC',
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF1A1206),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  /// 單價編輯（數字＋幣別，幣別帶硬幣圖示）。
  void _editUnitPrice() {
    var unit = 'cp';
    var amount = _unitPriceCp;
    if (amount > 0 && amount % kCpPerGp == 0) {
      unit = 'gp';
      amount ~/= kCpPerGp;
    } else if (amount > 0 && amount % kCpPerSp == 0) {
      unit = 'sp';
      amount ~/= kCpPerSp;
    }
    final controller = TextEditingController(text: amount > 0 ? '$amount' : '');

    showDialog<void>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (dialogContext, setDialogState) => AlertDialog(
          title: const Text('成交單價'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              TextField(
                controller: controller,
                keyboardType: TextInputType.number,
                style: const TextStyle(
                  fontFamily: 'Cinzel',
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                ),
                decoration: const InputDecoration(hintText: '金額'),
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                children: [
                  for (final u in ['gp', 'sp', 'cp'])
                    ChoiceChip(
                      avatar: CoinIcon(u, size: 18),
                      showCheckmark: false,
                      label: Text(u),
                      selected: unit == u,
                      onSelected: (_) => setDialogState(() => unit = u),
                    ),
                ],
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext),
              child: const Text('取消'),
            ),
            FilledButton(
              onPressed: () {
                final n = int.tryParse(controller.text.trim()) ?? 0;
                setState(() {
                  _unitPriceCp =
                      n *
                      switch (unit) {
                        'gp' => kCpPerGp,
                        'sp' => kCpPerSp,
                        _ => 1,
                      };
                });
                Navigator.pop(dialogContext);
              },
              child: const Text('確定'),
            ),
          ],
        ),
      ),
    );
  }

  void _acquireFree() {
    ref
        .read(currentCharacterProvider.notifier)
        .addItem(_toEquipment(item).copyWith(quantity: _qty));
    Navigator.pop(context);
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text('已取得「${item.name}」×$_qty')));
  }

  void _purchase() {
    final result = ref
        .read(currentCharacterProvider.notifier)
        .purchaseItem(
          _toEquipment(item),
          unitPriceCp: _unitPriceCp,
          quantity: _qty,
        );
    if (!result.ok) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('金額不足：還差 ${formatCp(result.shortfallCp)}')),
      );
      return;
    }
    Navigator.pop(context);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          '已購買「${item.name}」×$_qty（${formatCp(_unitPriceCp * _qty)}）',
        ),
      ),
    );
  }
}
