import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/theme/app_colors.dart';
import '../../../app/theme/app_spacing.dart';
import '../../catalog/data/catalog_repository.dart';
import '../../catalog/domain/catalog_models.dart';
import '../../catalog/domain/fivetools_text.dart';
import '../domain/character.dart';
import '../domain/character_creation_data.dart';
import '../domain/character_math.dart';
import '../domain/character_providers.dart';
import '../domain/level_up.dart';
import '../domain/spell_from_catalog.dart';

/// 引導式升級流程（D&D 2024，單職業、一次一級）。
///
/// 步驟依目標等級動態組成：生命值 →（Lv3）子職 →（4/8/12/16/19）能力值 →
/// 特性 →（施法職業）法術 → 確認。所有選擇存於頁面狀態，「完成升級」才
/// 一次寫回；中途離開不留任何變更。
///
/// [subclassOnly]：補選子職模式（Lv3+ 先前離線跳過），單步選完即套用。
class CharacterLevelUpPage extends ConsumerStatefulWidget {
  const CharacterLevelUpPage({super.key, this.subclassOnly = false});

  final bool subclassOnly;

  @override
  ConsumerState<CharacterLevelUpPage> createState() =>
      _CharacterLevelUpPageState();
}

class _CharacterLevelUpPageState extends ConsumerState<CharacterLevelUpPage> {
  late final Character _base;
  late final LevelUpPlan? _plan;
  late final List<String> _steps;
  int _step = 0;

  // 生命值
  bool _useAverage = true;
  final _rollCtl = TextEditingController();

  // 子職
  CatalogSubclass? _subclass;

  // 能力值（ASI）
  bool _asiPlus2 = true;
  String? _plus2;
  final Set<String> _plus1 = {};

  // 法術
  final Map<String, CatalogSpell> _selCantrips = {};
  final Map<String, CatalogSpell> _selSpells = {};

  @override
  void initState() {
    super.initState();
    _base = ref.read(currentCharacterProvider);
    if (widget.subclassOnly) {
      _plan = null;
      _steps = const ['子職'];
      return;
    }
    final plan = LevelUpPlan.forCharacter(_base);
    _plan = plan;
    _steps = [
      '生命值',
      if (plan.pickSubclass) '子職',
      if (plan.hasAsi) '能力值',
      '特性',
      if (plan.isCaster && plan.cantripPicks + plan.spellPicks > 0) '法術',
      '確認',
    ];
  }

  @override
  void dispose() {
    _rollCtl.dispose();
    super.dispose();
  }

  // ── 內容庫串接 ──

  /// 內容庫中本職業的 uuid（英文名對應；載入中/離線為 null）。
  String? get _classId {
    final classes = ref.watch(classCatalogProvider).asData?.value;
    if (classes == null) return null;
    for (final c in classes) {
      if (c.engName == _base.classNameEn) return c.id;
    }
    return null;
  }

  bool get _catalogOffline => ref.watch(classCatalogProvider).hasError;

  AsyncValue<List<CatalogClassFeature>>? get _featuresAsync {
    final id = _classId;
    return id == null ? null : ref.watch(classFeatureCatalogProvider(id));
  }

  /// 目標等級的本職業（非子職）特性。
  List<CatalogClassFeature> _baseFeatures(int level) {
    final list = _featuresAsync?.asData?.value ?? const [];
    return [
      for (final f in list)
        if (!f.isSubclass && f.level == level) f,
    ];
  }

  /// 所選子職到 [maxLevel] 為止的特性。
  List<CatalogClassFeature> _subclassFeatures(int maxLevel) {
    final sel = _subclass;
    if (sel == null) return const [];
    final list = _featuresAsync?.asData?.value ?? const [];
    return [
      for (final f in list)
        if (f.isSubclass &&
            f.subclassShortName == sel.shortName &&
            f.level <= maxLevel)
          f,
    ];
  }

  CharacterFeature _toFeature(CatalogClassFeature f, String source) =>
      CharacterFeature(
        name: f.name,
        nameEn: f.engName ?? '',
        source: source,
        description: ftFlattenEntries(
          (f.data['entries'] as List<dynamic>?) ?? const [],
        ),
      );

  // ── 選擇彙整與導航 ──

  int? get _roll {
    final v = int.tryParse(_rollCtl.text.trim());
    final plan = _plan;
    if (v == null || plan == null) return null;
    return (v < 1 || v > plan.hitDieFaces) ? null : v;
  }

  Map<String, int> get _asi {
    final plan = _plan;
    if (plan == null || !plan.hasAsi) return const {};
    if (_asiPlus2) return _plus2 == null ? const {} : {_plus2!: 2};
    return {for (final a in _plus1) a: 1};
  }

  LevelUpChoices _choices() {
    final plan = _plan!;
    final target = plan.targetLevel;
    return LevelUpChoices(
      hpRoll: _useAverage ? null : _roll,
      subclass: _subclass?.name,
      subclassEn: _subclass?.engName,
      asi: _asi,
      features: [
        for (final f in _baseFeatures(target))
          _toFeature(f, '職業：${_base.className} Lv$target'),
        if (_subclass != null)
          for (final f in _subclassFeatures(target))
            _toFeature(f, '子職：${_subclass!.name}'),
      ],
      cantrips: [for (final s in _selCantrips.values) spellFromCatalog(s)],
      spells: [for (final s in _selSpells.values) spellFromCatalog(s)],
    );
  }

  bool get _canNext {
    switch (_steps[_step]) {
      case '生命值':
        return _useAverage || _roll != null;
      case '子職':
        // 升級流程中離線可跳過；補選模式必須選到才能完成。
        return _subclass != null || (!widget.subclassOnly && _catalogOffline);
      case '能力值':
        return _asiPlus2 ? _plus2 != null : _plus1.length == 2;
      case '法術':
        if (_spellStepOffline) return true;
        final plan = _plan!;
        return _selCantrips.length == plan.cantripPicks &&
            _selSpells.length == plan.spellPicks;
      default:
        return true;
    }
  }

  /// 特性步驟可跳過的條件：已載入且本級無任何新特性（不含選子職的等級）。
  bool get _featureStepEmpty {
    final plan = _plan;
    if (plan == null || plan.pickSubclass) return false;
    final loaded = _featuresAsync?.hasValue ?? false;
    return loaded && _baseFeatures(plan.targetLevel).isEmpty;
  }

  void _next() {
    if (_step == _steps.length - 1) {
      _finish();
      return;
    }
    var next = _step + 1;
    while (_steps[next] == '特性' && _featureStepEmpty) {
      next++;
    }
    setState(() => _step = next);
  }

  void _back() {
    if (_step == 0) return;
    var prev = _step - 1;
    while (_steps[prev] == '特性' && _featureStepEmpty) {
      prev--;
    }
    setState(() => _step = prev);
  }

  void _finish() {
    final notifier = ref.read(currentCharacterProvider.notifier);
    if (widget.subclassOnly) {
      final sel = _subclass!;
      notifier.setSubclass(sel.name, sel.engName ?? '', [
        for (final f in _subclassFeatures(_base.level))
          _toFeature(f, '子職：${sel.name}'),
      ]);
    } else {
      notifier.applyLevelUp(_plan!, _choices());
    }
    if (context.canPop()) {
      context.pop();
    } else {
      context.go('/main/character');
    }
  }

  // ── UI ──

  /// 預先載入內容庫（職業/特性/法術），讓步驟組成與跳過判斷在使用者
  /// 點「下一步」時已有資料，而非到該步驟才開始抓。
  void _warmUpCatalog() {
    final _ = _featuresAsync;
    final plan = _plan;
    if (widget.subclassOnly || plan == null || !_steps.contains('法術')) return;
    if (plan.cantripPicks > 0) {
      ref.watch(spellCatalogProvider(_cantripQuery));
    }
    if (plan.spellPicks > 0) {
      ref.watch(spellCatalogProvider(_spellQuery));
    }
  }

  @override
  Widget build(BuildContext context) {
    _warmUpCatalog();
    final title = widget.subclassOnly ? '補選子職' : '升級等級';
    return Scaffold(
      backgroundColor: AppColors.darkSurface0,
      appBar: AppBar(
        backgroundColor: AppColors.darkSurface0,
        title: Text(
          title,
          style: const TextStyle(
            fontFamily: 'NotoSerifTC',
            fontWeight: FontWeight.w700,
          ),
        ),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () =>
              context.canPop() ? context.pop() : context.go('/main/character'),
        ),
      ),
      body: SafeArea(
        top: false,
        child: Column(
          children: [
            if (!widget.subclassOnly)
              Padding(
                padding: const EdgeInsets.fromLTRB(
                  AppSpacing.lg,
                  0,
                  AppSpacing.lg,
                  AppSpacing.sm,
                ),
                child: Row(
                  children: [
                    Text(
                      '步驟 ${_step + 1} / ${_steps.length} · ${_steps[_step]}',
                      style: const TextStyle(
                        fontFamily: 'Inter',
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: AppColors.accentGold,
                      ),
                    ),
                  ],
                ),
              ),
            const Divider(height: 1),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(AppSpacing.lg),
                child: Center(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 560),
                    child: _buildStep(),
                  ),
                ),
              ),
            ),
            _buildBottomBar(),
          ],
        ),
      ),
    );
  }

  Widget _buildStep() {
    switch (_steps[_step]) {
      case '生命值':
        return _hpStep();
      case '子職':
        return _subclassStep();
      case '能力值':
        return _asiStep();
      case '特性':
        return _featureStep();
      case '法術':
        return _spellStep();
      default:
        return _confirmStep();
    }
  }

  Widget _buildBottomBar() {
    final isLast = _step == _steps.length - 1;
    final label = widget.subclassOnly
        ? '完成補選'
        : isLast
        ? '完成升級'
        : '下一步';
    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Row(
          children: [
            if (_step > 0) ...[
              OutlinedButton(
                onPressed: _back,
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.xl,
                    vertical: AppSpacing.md,
                  ),
                  side: const BorderSide(color: AppColors.darkBorder),
                ),
                child: const Text(
                  '上一步',
                  style: TextStyle(
                    fontFamily: 'NotoSerifTC',
                    color: AppColors.darkTextSecondary,
                  ),
                ),
              ),
              const SizedBox(width: AppSpacing.md),
            ],
            Expanded(
              child: FilledButton(
                onPressed: _canNext
                    ? (widget.subclassOnly ? _finishSubclassOnly : _next)
                    : null,
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.accentGold,
                  disabledBackgroundColor: AppColors.darkBorder2,
                  padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
                ),
                child: Text(
                  label,
                  style: const TextStyle(
                    fontFamily: 'NotoSerifTC',
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF1A1206),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// 補選子職模式沒有確認步驟，「完成補選」需已選取子職（不可跳過）。
  void _finishSubclassOnly() {
    if (_subclass == null) return;
    _finish();
  }

  // ── 步驟：生命值 ──

  Widget _hpStep() {
    final plan = _plan!;
    final conMod = _base.abilityScores.con.modifier;
    final roll = _useAverage ? plan.averageHp : _roll;
    final gain = roll == null
        ? null
        : levelHpGain(roll, conMod, speciesHpPerLevel: plan.speciesHpPerLevel);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _lvBanner(plan),
        const SizedBox(height: AppSpacing.md),
        Text(
          '${_base.className} · 生命骰 1d${plan.hitDieFaces} · 體質調整 ${_sign(conMod)}'
          '${plan.speciesHpPerLevel > 0 ? ' · 種族 +${plan.speciesHpPerLevel}' : ''}',
          style: const TextStyle(
            fontFamily: 'NotoSerifTC',
            fontSize: 12,
            color: AppColors.darkTextSecondary,
          ),
        ),
        const SizedBox(height: AppSpacing.lg),
        _hpModeCard(
          selected: _useAverage,
          title: '取平均值',
          subtitle:
              '1d${plan.hitDieFaces} 平均 ${plan.averageHp} ＋ 體質 ${_sign(conMod)}',
          trailing:
              '+${levelHpGain(plan.averageHp, conMod, speciesHpPerLevel: plan.speciesHpPerLevel)}',
          onTap: () => setState(() => _useAverage = true),
        ),
        const SizedBox(height: AppSpacing.sm),
        _hpModeCard(
          selected: !_useAverage,
          title: '自行擲骰輸入',
          subtitle: '範圍 1–${plan.hitDieFaces}（App 不代擲）',
          onTap: () => setState(() => _useAverage = false),
          child: SizedBox(
            width: 72,
            child: TextField(
              controller: _rollCtl,
              enabled: !_useAverage,
              keyboardType: TextInputType.number,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontFamily: 'Cinzel',
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: AppColors.darkTextPrimary,
              ),
              decoration: const InputDecoration(hintText: '—', isDense: true),
              onChanged: (_) => setState(() {}),
            ),
          ),
        ),
        const SizedBox(height: AppSpacing.lg),
        Container(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.lg,
            vertical: AppSpacing.md,
          ),
          decoration: BoxDecoration(
            color: AppColors.darkSurface1,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: AppColors.darkBorder2),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                '最大生命值',
                style: TextStyle(
                  fontFamily: 'NotoSerifTC',
                  fontSize: 13,
                  color: AppColors.darkTextLight,
                ),
              ),
              Text(
                gain == null
                    ? '${_base.maxHp} → ?'
                    : '${_base.maxHp} → ${_base.maxHp + gain}',
                style: const TextStyle(
                  fontFamily: 'Cinzel',
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: AppColors.accentGold,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _hpModeCard({
    required bool selected,
    required String title,
    required String subtitle,
    String? trailing,
    Widget? child,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(
          color: selected
              ? AppColors.accentGold.withValues(alpha: 0.09)
              : AppColors.darkSurface1,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: selected ? AppColors.accentGold : AppColors.darkBorder2,
          ),
        ),
        child: Row(
          children: [
            Icon(
              selected
                  ? Icons.radio_button_checked
                  : Icons.radio_button_unchecked,
              size: 18,
              color: selected
                  ? AppColors.accentGold
                  : AppColors.darkTextSecondary,
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontFamily: 'NotoSerifTC',
                      fontSize: 13,
                      fontWeight: selected ? FontWeight.w700 : FontWeight.w400,
                      color: selected
                          ? AppColors.darkTextPrimary
                          : AppColors.darkTextLight,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: const TextStyle(
                      fontFamily: 'NotoSerifTC',
                      fontSize: 11,
                      color: AppColors.darkTextSecondary,
                    ),
                  ),
                ],
              ),
            ),
            if (trailing != null)
              Text(
                trailing,
                style: const TextStyle(
                  fontFamily: 'Cinzel',
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: AppColors.accentGold,
                ),
              ),
            ?child,
          ],
        ),
      ),
    );
  }

  Widget _lvBanner(LevelUpPlan plan) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.darkSurface1,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.darkBorder2),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            'LV ${_base.level}',
            style: const TextStyle(
              fontFamily: 'Cinzel',
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: AppColors.darkTextSecondary,
            ),
          ),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: AppSpacing.md),
            child: Icon(
              Icons.arrow_forward,
              size: 16,
              color: AppColors.accentGold,
            ),
          ),
          Text(
            'LV ${plan.targetLevel}',
            style: const TextStyle(
              fontFamily: 'Cinzel',
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: AppColors.accentGold,
            ),
          ),
        ],
      ),
    );
  }

  // ── 步驟：子職（Lv3 / 補選） ──

  Widget _subclassStep() {
    final classId = _classId;
    if (_catalogOffline || (classId == null && !_loadingCatalog)) {
      return _offlineCard(
        message: widget.subclassOnly
            ? '目前無法載入子職清單，請於連線後再試。'
            : '目前無法載入子職清單。可先跳過完成升級，之後於角色頁補選。',
        onRetry: () => ref.invalidate(classCatalogProvider),
      );
    }
    if (classId == null) return _loading();

    final subclassesAsync = ref.watch(subclassCatalogProvider(classId));
    return subclassesAsync.when(
      loading: _loading,
      error: (_, _) => _offlineCard(
        message: widget.subclassOnly
            ? '目前無法載入子職清單，請於連線後再試。'
            : '目前無法載入子職清單。可先跳過完成升級，之後於角色頁補選。',
        onRetry: () => ref.invalidate(subclassCatalogProvider(classId)),
      ),
      data: (subclasses) {
        final showLevel = widget.subclassOnly ? _base.level : 3;
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _fieldLabel('選擇子職 · ${_base.className}'),
            const SizedBox(height: AppSpacing.sm),
            for (final s in subclasses) ...[
              _subclassRow(s),
              const SizedBox(height: AppSpacing.xs),
            ],
            if (_subclass != null) ...[
              const SizedBox(height: AppSpacing.md),
              _subclassDescPanel(showLevel),
            ],
          ],
        );
      },
    );
  }

  Widget _subclassRow(CatalogSubclass s) {
    final selected = _subclass?.id == s.id;
    return InkWell(
      onTap: () => setState(() => _subclass = s),
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.md,
          vertical: AppSpacing.md,
        ),
        decoration: BoxDecoration(
          color: selected
              ? AppColors.accentGold.withValues(alpha: 0.09)
              : AppColors.darkSurface1,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: selected ? AppColors.accentGold : AppColors.darkBorder2,
          ),
        ),
        child: Row(
          children: [
            Icon(
              selected
                  ? Icons.radio_button_checked
                  : Icons.radio_button_unchecked,
              size: 16,
              color: selected
                  ? AppColors.accentGold
                  : AppColors.darkTextSecondary,
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Text(
                s.name,
                style: TextStyle(
                  fontFamily: 'NotoSerifTC',
                  fontSize: 13,
                  fontWeight: selected ? FontWeight.w700 : FontWeight.w400,
                  color: selected
                      ? AppColors.darkTextPrimary
                      : AppColors.darkTextLight,
                ),
              ),
            ),
            if (s.engName != null)
              Text(
                s.engName!,
                style: const TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 10,
                  color: AppColors.darkTextSecondary,
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _subclassDescPanel(int maxLevel) {
    final feats = _subclassFeatures(maxLevel);
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.darkSurface1,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.darkBorder2),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '${_subclass!.name}'
            '${_subclass!.engName != null ? ' ${_subclass!.engName}' : ''}',
            style: const TextStyle(
              fontFamily: 'NotoSerifTC',
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: AppColors.accentGold,
            ),
          ),
          if (feats.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.sm),
            Wrap(
              spacing: AppSpacing.xs,
              runSpacing: AppSpacing.xs,
              children: [
                for (final f in feats)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 3,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.accentGold.withValues(alpha: 0.09),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: AppColors.darkBorder),
                    ),
                    child: Text(
                      'LV${f.level} · ${f.name}',
                      style: const TextStyle(
                        fontFamily: 'NotoSerifTC',
                        fontSize: 10,
                        color: AppColors.accentGold,
                      ),
                    ),
                  ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  // ── 步驟：能力值（ASI） ──

  Widget _asiStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(
              child: _asiModePill('+2 單一屬性', _asiPlus2, () {
                setState(() {
                  _asiPlus2 = true;
                  _plus1.clear();
                });
              }),
            ),
            const SizedBox(width: AppSpacing.sm),
            Expanded(
              child: _asiModePill('+1／+1 兩屬性', !_asiPlus2, () {
                setState(() {
                  _asiPlus2 = false;
                  _plus2 = null;
                });
              }),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.md),
        for (final code in kAbilityOrder) ...[
          _asiRow(code),
          const SizedBox(height: AppSpacing.xs),
        ],
        const SizedBox(height: AppSpacing.sm),
        const Text(
          '能力值上限 20；已達上限的屬性不可再選。',
          style: TextStyle(
            fontFamily: 'NotoSerifTC',
            fontSize: 11,
            color: AppColors.darkTextSecondary,
          ),
        ),
      ],
    );
  }

  Widget _asiModePill(String label, bool selected, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: selected
              ? AppColors.accentGold.withValues(alpha: 0.13)
              : AppColors.darkSurface1,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: selected ? AppColors.accentGold : AppColors.darkBorder2,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontFamily: 'NotoSerifTC',
            fontSize: 12,
            fontWeight: selected ? FontWeight.w700 : FontWeight.w400,
            color: selected
                ? AppColors.accentGold
                : AppColors.darkTextSecondary,
          ),
        ),
      ),
    );
  }

  int _score(String code) => switch (code) {
    'STR' => _base.abilityScores.str.score,
    'DEX' => _base.abilityScores.dex.score,
    'CON' => _base.abilityScores.con.score,
    'INT' => _base.abilityScores.int_.score,
    'WIS' => _base.abilityScores.wis.score,
    _ => _base.abilityScores.cha.score,
  };

  Widget _asiRow(String code) {
    final score = _score(code);
    final bump = _asiPlus2 ? 2 : 1;
    final capped = score + bump > 20;
    final selected = _asiPlus2 ? _plus2 == code : _plus1.contains(code);

    return Opacity(
      opacity: capped && !selected ? 0.45 : 1,
      child: InkWell(
        onTap: capped && !selected
            ? null
            : () => setState(() {
                if (_asiPlus2) {
                  _plus2 = selected ? null : code;
                } else if (selected) {
                  _plus1.remove(code);
                } else if (_plus1.length < 2) {
                  _plus1.add(code);
                }
              }),
        borderRadius: BorderRadius.circular(10),
        child: Container(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.md,
            vertical: AppSpacing.sm + 2,
          ),
          decoration: BoxDecoration(
            color: selected
                ? AppColors.accentGold.withValues(alpha: 0.09)
                : AppColors.darkSurface1,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: selected ? AppColors.accentGold : AppColors.darkBorder2,
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '${kAbilityCn[code]} $code',
                style: TextStyle(
                  fontFamily: 'NotoSerifTC',
                  fontSize: 13,
                  fontWeight: selected ? FontWeight.w700 : FontWeight.w400,
                  color: selected
                      ? AppColors.darkTextPrimary
                      : AppColors.darkTextLight,
                ),
              ),
              if (selected)
                Row(
                  children: [
                    Text(
                      '$score',
                      style: const TextStyle(
                        fontFamily: 'Cinzel',
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: AppColors.darkTextSecondary,
                      ),
                    ),
                    const Padding(
                      padding: EdgeInsets.symmetric(horizontal: 6),
                      child: Icon(
                        Icons.arrow_forward,
                        size: 12,
                        color: AppColors.accentGold,
                      ),
                    ),
                    Text(
                      '${(score + bump).clamp(1, 20)}',
                      style: const TextStyle(
                        fontFamily: 'Cinzel',
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: AppColors.accentGold,
                      ),
                    ),
                  ],
                )
              else
                Row(
                  children: [
                    Text(
                      '$score',
                      style: const TextStyle(
                        fontFamily: 'Cinzel',
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: AppColors.darkTextLight,
                      ),
                    ),
                    if (capped)
                      const Padding(
                        padding: EdgeInsets.only(left: 6),
                        child: Text(
                          '已達上限',
                          style: TextStyle(
                            fontFamily: 'NotoSerifTC',
                            fontSize: 10,
                            color: AppColors.darkTextSecondary,
                          ),
                        ),
                      ),
                  ],
                ),
            ],
          ),
        ),
      ),
    );
  }

  // ── 步驟：特性 ──

  Widget _featureStep() {
    final plan = _plan!;
    final async = _featuresAsync;
    if (_catalogOffline || (async?.hasError ?? false)) {
      return _offlineCard(
        message: '目前無法載入本級特性。可先繼續完成升級，特性內容之後可於內容庫恢復後查閱。',
        onRetry: () {
          ref.invalidate(classCatalogProvider);
          final id = _classId;
          if (id != null) ref.invalidate(classFeatureCatalogProvider(id));
        },
      );
    }
    if (async == null || async.isLoading) return _loading();

    final feats = [
      for (final f in _baseFeatures(plan.targetLevel)) (f, '職業'),
      if (_subclass != null)
        for (final f in _subclassFeatures(plan.targetLevel))
          (f, '子職 · ${_subclass!.name}'),
    ];
    if (feats.isEmpty) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: AppSpacing.xl),
        child: Text(
          '本級沒有新特性。',
          textAlign: TextAlign.center,
          style: TextStyle(
            fontFamily: 'NotoSerifTC',
            fontSize: 13,
            color: AppColors.darkTextSecondary,
          ),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _fieldLabel('LV ${plan.targetLevel} 獲得特性（唯讀）'),
        const SizedBox(height: AppSpacing.sm),
        for (final (f, src) in feats) ...[
          _featureCard(f, src),
          const SizedBox(height: AppSpacing.sm),
        ],
      ],
    );
  }

  Widget _featureCard(CatalogClassFeature f, String source) {
    final choice = isChoiceFeature(f.engName ?? '');
    final desc = ftFlattenEntries(
      (f.data['entries'] as List<dynamic>?) ?? const [],
    );
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.darkSurface1,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.darkBorder2),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  f.engName == null ? f.name : '${f.name} ${f.engName}',
                  style: const TextStyle(
                    fontFamily: 'NotoSerifTC',
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: AppColors.darkTextPrimary,
                  ),
                ),
              ),
              Text(
                source,
                style: const TextStyle(
                  fontFamily: 'NotoSerifTC',
                  fontSize: 10,
                  color: AppColors.accentGold,
                ),
              ),
            ],
          ),
          if (desc.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.xs),
            Text(
              desc,
              maxLines: 6,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontFamily: 'NotoSerifTC',
                fontSize: 12,
                height: 1.5,
                color: AppColors.darkTextLight,
              ),
            ),
          ],
          if (choice) ...[
            const SizedBox(height: AppSpacing.sm),
            Row(
              children: [
                const Icon(
                  Icons.touch_app_outlined,
                  size: 13,
                  color: AppColors.darkTextSecondary,
                ),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    '此特性需做選擇，請閱讀說明後自行記錄。',
                    style: TextStyle(
                      fontFamily: 'NotoSerifTC',
                      fontSize: 11,
                      color: AppColors.darkTextSecondary.withValues(alpha: 0.9),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  // ── 步驟：法術 ──

  ({int? level, String? className}) get _cantripQuery =>
      (level: 0, className: _base.classNameEn);

  ({int? level, String? className}) get _spellQuery =>
      (level: _plan!.maxRing, className: _base.classNameEn);

  bool get _spellStepOffline {
    final plan = _plan!;
    final c =
        plan.cantripPicks > 0 &&
        ref.watch(spellCatalogProvider(_cantripQuery)).hasError;
    final s =
        plan.spellPicks > 0 &&
        ref.watch(spellCatalogProvider(_spellQuery)).hasError;
    return c || s;
  }

  Widget _spellStep() {
    final plan = _plan!;
    if (_spellStepOffline) {
      return _offlineCard(
        message: '目前無法載入法術清單。可先跳過完成升級，之後再補選法術。',
        onRetry: () {
          ref.invalidate(spellCatalogProvider(_cantripQuery));
          ref.invalidate(spellCatalogProvider(_spellQuery));
        },
      );
    }

    final knownCantrips = {for (final s in _base.cantrips) s.name};
    final knownSpells = {for (final s in _base.spells) s.name};

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            const Icon(
              Icons.auto_awesome,
              size: 15,
              color: AppColors.accentGold,
            ),
            const SizedBox(width: AppSpacing.sm),
            Text(
              '${_base.className} · 施法屬性 ${kAbilityCn[_base.spellcastingAbility]}',
              style: const TextStyle(
                fontFamily: 'NotoSerifTC',
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppColors.darkTextLight,
              ),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.md),
        if (plan.cantripPicks > 0) ...[
          _pickHeader(
            '戲法 CANTRIPS · 選 ${plan.cantripPicks}',
            _selCantrips.length,
            plan.cantripPicks,
          ),
          const SizedBox(height: AppSpacing.sm),
          _pickList(
            ref.watch(spellCatalogProvider(_cantripQuery)),
            _selCantrips,
            plan.cantripPicks,
            knownCantrips,
          ),
          const SizedBox(height: AppSpacing.lg),
        ],
        if (plan.spellPicks > 0) ...[
          _pickHeader(
            '${plan.maxRing}環法術 · 選 ${plan.spellPicks}',
            _selSpells.length,
            plan.spellPicks,
          ),
          const SizedBox(height: AppSpacing.sm),
          _pickList(
            ref.watch(spellCatalogProvider(_spellQuery)),
            _selSpells,
            plan.spellPicks,
            knownSpells,
          ),
        ],
      ],
    );
  }

  Widget _pickHeader(String label, int selected, int max) {
    final done = selected == max;
    return Row(
      children: [
        Expanded(child: _fieldLabel(label)),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
          decoration: BoxDecoration(
            color: AppColors.accentGold.withValues(alpha: done ? 0.25 : 0.13),
            borderRadius: BorderRadius.circular(4),
          ),
          child: Text(
            '已選 $selected/$max',
            style: const TextStyle(
              fontFamily: 'Inter',
              fontSize: 10,
              fontWeight: FontWeight.w700,
              color: AppColors.accentGold,
            ),
          ),
        ),
      ],
    );
  }

  Widget _pickList(
    AsyncValue<List<CatalogSpell>> async,
    Map<String, CatalogSpell> selection,
    int max,
    Set<String> known,
  ) {
    return async.when(
      loading: _loading,
      error: (_, _) => const SizedBox.shrink(),
      data: (spells) => Column(
        children: [
          for (final s in spells)
            if (!known.contains(s.name))
              _SpellPickRow(
                spell: s,
                selected: selection.containsKey(s.id),
                disabled:
                    !selection.containsKey(s.id) && selection.length >= max,
                onToggle: () => setState(() {
                  if (selection.containsKey(s.id)) {
                    selection.remove(s.id);
                  } else if (selection.length < max) {
                    selection[s.id] = s;
                  }
                }),
              ),
        ],
      ),
    );
  }

  // ── 步驟：確認 ──

  Widget _confirmStep() {
    final plan = _plan!;
    final choices = _choices();
    final next = applyLevelUp(_base, plan, choices);

    final oldSlots = {for (final s in _base.spellSlots) s.level: s.total};
    final newSlots = {for (final s in next.spellSlots) s.level: s.total};
    final rings = {...oldSlots.keys, ...newSlots.keys}.toList()..sort();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _lvBanner(plan),
        const SizedBox(height: AppSpacing.lg),
        _fieldLabel('數值變更'),
        const SizedBox(height: AppSpacing.sm),
        _diffRow('最大生命值', '${_base.maxHp}', '${next.maxHp}'),
        _diffRow(
          '熟練加值',
          _sign(_base.proficiencyBonus),
          _sign(next.proficiencyBonus),
        ),
        for (final e in choices.asi.entries)
          _diffRow(
            '${kAbilityCn[e.key]} ${e.key}',
            '${_score(e.key)}',
            '${(_score(e.key) + e.value).clamp(1, 20)}',
          ),
        for (final ring in rings)
          _diffRow(
            '$ring環法術位',
            oldSlots[ring]?.toString() ?? '—',
            newSlots[ring]?.toString() ?? '—',
          ),
        if (choices.subclass != null ||
            choices.features.isNotEmpty ||
            choices.cantrips.isNotEmpty ||
            choices.spells.isNotEmpty) ...[
          const SizedBox(height: AppSpacing.lg),
          _fieldLabel('新獲得'),
          const SizedBox(height: AppSpacing.sm),
          if (choices.subclass != null)
            _gainRow(Icons.alt_route, '子職', choices.subclass!),
          if (choices.features.isNotEmpty)
            _gainRow(
              Icons.auto_awesome_outlined,
              '新特性',
              choices.features.map((f) => f.name).join('、'),
            ),
          if (choices.cantrips.isNotEmpty)
            _gainRow(
              Icons.flare,
              '新戲法',
              choices.cantrips.map((s) => s.name).join('、'),
            ),
          if (choices.spells.isNotEmpty)
            _gainRow(
              Icons.menu_book,
              '新法術',
              choices.spells.map((s) => s.name).join('、'),
            ),
        ],
        const SizedBox(height: AppSpacing.lg),
        const Text(
          '確認後一次套用並重算衍生數值；已用法術位不會恢復（升級不是休息）。',
          style: TextStyle(
            fontFamily: 'NotoSerifTC',
            fontSize: 11,
            height: 1.5,
            color: AppColors.darkTextSecondary,
          ),
        ),
      ],
    );
  }

  Widget _diffRow(String label, String before, String after) {
    final changed = before != after;
    return Container(
      margin: const EdgeInsets.only(bottom: AppSpacing.xs),
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.sm + 2,
      ),
      decoration: BoxDecoration(
        color: AppColors.darkSurface1,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.darkBorder2),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontFamily: 'NotoSerifTC',
              fontSize: 12,
              color: AppColors.darkTextLight,
            ),
          ),
          if (changed)
            Row(
              children: [
                Text(
                  before,
                  style: const TextStyle(
                    fontFamily: 'Cinzel',
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: AppColors.darkTextSecondary,
                  ),
                ),
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 6),
                  child: Icon(
                    Icons.arrow_forward,
                    size: 11,
                    color: AppColors.accentGold,
                  ),
                ),
                Text(
                  after,
                  style: const TextStyle(
                    fontFamily: 'Cinzel',
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: AppColors.accentGold,
                  ),
                ),
              ],
            )
          else
            Row(
              children: [
                Text(
                  before,
                  style: const TextStyle(
                    fontFamily: 'Cinzel',
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: AppColors.darkTextLight,
                  ),
                ),
                const SizedBox(width: 6),
                const Text(
                  '不變',
                  style: TextStyle(
                    fontFamily: 'NotoSerifTC',
                    fontSize: 10,
                    color: AppColors.darkTextSecondary,
                  ),
                ),
              ],
            ),
        ],
      ),
    );
  }

  Widget _gainRow(IconData icon, String label, String value) {
    return Container(
      margin: const EdgeInsets.only(bottom: AppSpacing.xs),
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.sm + 2,
      ),
      decoration: BoxDecoration(
        color: AppColors.accentGold.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.darkBorder2),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 14, color: AppColors.accentGold),
          const SizedBox(width: AppSpacing.sm),
          Text(
            label,
            style: const TextStyle(
              fontFamily: 'NotoSerifTC',
              fontSize: 12,
              color: AppColors.darkTextSecondary,
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                fontFamily: 'NotoSerifTC',
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: AppColors.darkTextPrimary,
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ── 共用小件 ──

  bool get _loadingCatalog => ref.watch(classCatalogProvider).isLoading;

  Widget _loading() => const Padding(
    padding: EdgeInsets.symmetric(vertical: AppSpacing.xl),
    child: Center(
      child: SizedBox(
        width: 22,
        height: 22,
        child: CircularProgressIndicator(strokeWidth: 2),
      ),
    ),
  );

  Widget _fieldLabel(String text) => Text(
    text,
    style: const TextStyle(
      fontFamily: 'Inter',
      fontSize: 9,
      letterSpacing: 1,
      color: AppColors.sectionLabel,
    ),
  );

  Widget _offlineCard({
    required String message,
    required VoidCallback onRetry,
  }) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: AppColors.darkSurface1,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.darkBorder2),
      ),
      child: Column(
        children: [
          const Icon(
            Icons.cloud_off,
            size: 28,
            color: AppColors.darkTextSecondary,
          ),
          const SizedBox(height: AppSpacing.sm),
          const Text(
            '內容庫離線',
            style: TextStyle(
              fontFamily: 'NotoSerifTC',
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: AppColors.darkTextPrimary,
            ),
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(
            message,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontFamily: 'NotoSerifTC',
              fontSize: 12,
              color: AppColors.darkTextSecondary,
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          OutlinedButton.icon(
            onPressed: onRetry,
            icon: const Icon(
              Icons.refresh,
              size: 16,
              color: AppColors.accentGold,
            ),
            label: const Text(
              '重試',
              style: TextStyle(
                fontFamily: 'NotoSerifTC',
                color: AppColors.accentGold,
              ),
            ),
            style: OutlinedButton.styleFrom(
              side: const BorderSide(color: AppColors.accentGold),
            ),
          ),
        ],
      ),
    );
  }

  String _sign(int v) => v >= 0 ? '+$v' : '$v';
}

/// 法術勾選列（升級版：全寬、checkbox + 中英名 + 環數徽章，可展開描述）。
class _SpellPickRow extends StatefulWidget {
  const _SpellPickRow({
    required this.spell,
    required this.selected,
    required this.disabled,
    required this.onToggle,
  });

  final CatalogSpell spell;
  final bool selected;
  final bool disabled;
  final VoidCallback onToggle;

  @override
  State<_SpellPickRow> createState() => _SpellPickRowState();
}

class _SpellPickRowState extends State<_SpellPickRow> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    final s = widget.spell;
    final desc = ftFlattenEntries(s.entries);
    return Opacity(
      opacity: widget.disabled ? 0.45 : 1,
      child: Container(
        margin: const EdgeInsets.only(bottom: AppSpacing.xs),
        decoration: BoxDecoration(
          color: widget.selected
              ? AppColors.accentGold.withValues(alpha: 0.09)
              : AppColors.darkSurface1,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: widget.selected
                ? AppColors.accentGold
                : AppColors.darkBorder2,
          ),
        ),
        child: Column(
          children: [
            InkWell(
              onTap: widget.disabled ? null : widget.onToggle,
              borderRadius: BorderRadius.circular(10),
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.md,
                  vertical: AppSpacing.sm + 2,
                ),
                child: Row(
                  children: [
                    Icon(
                      widget.selected
                          ? Icons.check_box
                          : Icons.check_box_outline_blank,
                      size: 17,
                      color: widget.selected
                          ? AppColors.accentGold
                          : AppColors.darkTextSecondary,
                    ),
                    const SizedBox(width: AppSpacing.md),
                    Expanded(
                      child: Text(
                        s.engName == null ? s.name : '${s.name} ${s.engName}',
                        style: TextStyle(
                          fontFamily: 'NotoSerifTC',
                          fontSize: 12,
                          fontWeight: widget.selected
                              ? FontWeight.w700
                              : FontWeight.w400,
                          color: widget.selected
                              ? AppColors.darkTextPrimary
                              : AppColors.darkTextLight,
                        ),
                      ),
                    ),
                    if (desc.isNotEmpty)
                      IconButton(
                        visualDensity: VisualDensity.compact,
                        icon: Icon(
                          _expanded ? Icons.expand_less : Icons.expand_more,
                          size: 17,
                          color: AppColors.darkTextSecondary,
                        ),
                        onPressed: () => setState(() => _expanded = !_expanded),
                      ),
                  ],
                ),
              ),
            ),
            if (_expanded && desc.isNotEmpty)
              Padding(
                padding: const EdgeInsets.fromLTRB(
                  AppSpacing.lg,
                  0,
                  AppSpacing.lg,
                  AppSpacing.md,
                ),
                child: Text(
                  desc,
                  style: const TextStyle(
                    fontFamily: 'NotoSerifTC',
                    fontSize: 11,
                    height: 1.5,
                    color: AppColors.darkTextLight,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
