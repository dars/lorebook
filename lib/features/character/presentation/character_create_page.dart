import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/theme/app_colors.dart';
import '../../../app/theme/app_spacing.dart';
import '../../../app/theme/decorations.dart';
import '../../../app/theme/surface_colors.dart';
import '../../../shared/presentation/responsive_layout.dart';
import '../../../shared/presentation/widgets/ability_hex_chart.dart';
import '../../catalog/data/catalog_repository.dart';
import '../../catalog/domain/catalog_models.dart';
import '../../catalog/presentation/fivetools_renderer.dart';
import '../../../shared/domain/app_exception.dart';
import '../domain/character.dart';
import '../domain/character_creation_data.dart';
import '../domain/character_math.dart';
import '../domain/character_providers.dart';
import '../domain/custom_background.dart';
import '../data/custom_background_repository.dart';
import '../data/portrait_service.dart';
import 'widgets/portrait_transform.dart';
import '../domain/spell_from_catalog.dart';

/// 能力值產生方式。
enum _AbilityMethod { array, buy, roll }

/// 引導式建角流程（D&D 2024）。
class CharacterCreatePage extends ConsumerStatefulWidget {
  const CharacterCreatePage({super.key});

  @override
  ConsumerState<CharacterCreatePage> createState() =>
      _CharacterCreatePageState();
}

class _CharacterCreatePageState extends ConsumerState<CharacterCreatePage> {
  /// 依主題（淺色/深色）切換的表面／邊框／文字色票，供建角流程內各步驟共用。
  SurfaceColors get _surfaces => Theme.of(context).extension<SurfaceColors>()!;

  /// 步驟清單依職業動態決定：施法職業多一步「法術」（7 步），
  /// 非施法職業維持 6 步。
  List<String> get _steps => [
    '基本',
    '職業',
    '背景',
    '能力值',
    '技能',
    if (_classOpt?.isCaster ?? false) '法術',
    '確認',
  ];

  int _step = 0;

  /// 建角暫存的角色圖（建立後上傳；null = 未選）。
  Uint8List? _portraitBytes;

  String _name = '';
  String _alignment = kAlignments.first;
  SpeciesOption? _species;
  ClassOption? _classOpt;
  BackgroundOption? _background;

  /// 選中的自訂背景 id（null = 內建背景）。
  String? _backgroundCustomId;

  /// 能力代碼 → 基礎分數（null = 未指派）。各方式共用。
  final Map<String, int?> _base = {for (final a in kAbilityOrder) a: null};

  /// 能力值產生方式。
  _AbilityMethod _method = _AbilityMethod.array;
  bool _abilitiesInit = false;

  /// 背景加值（由建議帶入、頁首說明，不在此頁編輯）。
  String _bonusMode = '2/1';
  String? _plus2;
  String? _plus1;

  final Set<String> _classSkills = {};

  /// 種族技能特性的已選技能（人類任選 1、精靈敏銳感官三選一）。
  final Set<String> _speciesSkills = {};

  /// 所選體型（多體型種族如人類；null = 種族預設）。
  String? _sizeChoice;

  /// 已選法術（id → 目錄法術）。戲法與一環分開計數。
  final Map<String, CatalogSpell> _selCantrips = {};
  final Map<String, CatalogSpell> _selSpells = {};

  SpellQuery get _cantripQuery => (level: 0, className: _classOpt!.en);
  SpellQuery get _spellQuery => (level: 1, className: _classOpt!.en);

  // ── 衍生 ──

  Map<String, int> get _bonusMap {
    final m = {for (final a in kAbilityOrder) a: 0};
    final cands = _background?.abilities ?? const [];
    if (_bonusMode == '1/1/1') {
      for (final a in cands) {
        m[a] = 1;
      }
    } else {
      if (_plus2 != null) m[_plus2!] = 2;
      if (_plus1 != null) m[_plus1!] = 1;
    }
    return m;
  }

  /// 最終分數 = 基礎 + 背景加值，上限 20。
  int _finalScore(String code) =>
      ((_base[code] ?? 0) + _bonusMap[code]!).clamp(0, 20);

  List<double> get _realHexValues => [
    for (final code in kAbilityOrder)
      () {
        final s = _finalScore(code);
        return s <= 0 ? 0.15 : ((s - 6) / 12).clamp(0.15, 1.0);
      }(),
  ];

  // 標準陣列：尚未指派的值。
  List<int> get _pool => [
    for (final v in kStandardArray)
      if (!_base.values.contains(v)) v,
  ];

  // 購點。
  int get _pointsSpent {
    var s = 0;
    for (final v in _base.values) {
      s += kPointBuyCost[v] ?? 0;
    }
    return s;
  }

  int get _pointsRemaining => kPointBuyBudget - _pointsSpent;

  bool _buyAffordable(String code, int v) {
    final cur = kPointBuyCost[_base[code]] ?? 0;
    return _pointsSpent - cur + (kPointBuyCost[v] ?? 0) <= kPointBuyBudget;
  }

  // ── 驗證 ──

  bool get _canNext {
    switch (_steps[_step]) {
      case '基本':
        return _name.trim().isNotEmpty && _species != null;
      case '職業':
        return _classOpt != null;
      case '背景':
        return _background != null;
      case '能力值':
        final filled = _base.values.every((v) => v != null);
        switch (_method) {
          case _AbilityMethod.array:
            return filled;
          case _AbilityMethod.buy:
            return filled && _pointsRemaining >= 0;
          case _AbilityMethod.roll:
            return _base.values.every((v) => v != null && v >= 3 && v <= 18);
        }
      case '技能':
        return _classSkills.length == (_classOpt?.skillCount ?? 0) &&
            _speciesSkills.length == (_species?.skillPickCount ?? 0);
      case '法術':
        return _canLeaveSpellStep;
      default:
        return true;
    }
  }

  /// 法術步驟閘門：選滿數量才放行；內容庫離線時允許跳過。
  bool get _canLeaveSpellStep {
    final cls = _classOpt!;
    final cantrips = ref.read(spellCatalogProvider(_cantripQuery));
    final spells = ref.read(spellCatalogProvider(_spellQuery));
    if (cantrips.hasError || spells.hasError) return true;
    return _selCantrips.length == cls.cantripsKnown &&
        _selSpells.length == cls.preparedSpells;
  }

  void _next() {
    if (_step < _steps.length - 1) {
      setState(() {
        _step++;
        if (_steps[_step] == '能力值' && !_abilitiesInit) {
          _initAbilities();
          _abilitiesInit = true;
        }
      });
    } else {
      _create();
    }
  }

  void _back() {
    if (_step > 0) setState(() => _step--);
  }

  /// 職業/背景變更：清空能力與加值，使其於進入能力值頁重新初始化。
  void _resetAbilities() {
    for (final k in kAbilityOrder) {
      _base[k] = null;
    }
    _bonusMode = '2/1';
    _plus2 = null;
    _plus1 = null;
    _abilitiesInit = false;
  }

  /// 進入能力值頁：設背景加值 + 預設標準陣列並套用建議。
  void _initAbilities() {
    _autofillBonus();
    _method = _AbilityMethod.array;
    _recommendArray();
  }

  /// 背景加值預設（+2 主屬性、+1 體質或次選）。
  void _autofillBonus() {
    final cands = _background!.abilities;
    _bonusMode = '2/1';
    _plus2 = _classOpt!.primaryAbilities.firstWhere(
      cands.contains,
      orElse: () => cands.first,
    );
    _plus1 = cands.firstWhere(
      (a) => a != _plus2 && a == 'CON',
      orElse: () => cands.firstWhere((a) => a != _plus2),
    );
  }

  /// 標準陣列「套用建議」：依優先序排入 15/14/13/12/10/8。
  void _recommendArray() {
    final priority = <String>[];
    void add(Iterable<String> xs) {
      for (final x in xs) {
        if (!priority.contains(x)) priority.add(x);
      }
    }

    add(_classOpt!.primaryAbilities);
    add(['CON', 'DEX']);
    add(kAbilityOrder);
    for (var i = 0; i < 6; i++) {
      _base[priority[i]] = kStandardArray[i];
    }
  }

  void _clearBase() {
    setState(() {
      for (final k in kAbilityOrder) {
        _base[k] = null;
      }
    });
  }

  void _setMethod(_AbilityMethod m) {
    setState(() {
      _method = m;
      switch (m) {
        case _AbilityMethod.array:
          _recommendArray();
        case _AbilityMethod.buy:
          for (final k in kAbilityOrder) {
            _base[k] = 8;
          }
        case _AbilityMethod.roll:
          for (final k in kAbilityOrder) {
            _base[k] = null;
          }
      }
    });
  }

  /// 標準陣列：選值（已被佔用則與該能力對調）。
  void _selectArrayValue(String code, int? value) {
    setState(() {
      if (value == null) {
        _base[code] = null;
        return;
      }
      final holder = _base.entries
          .where((e) => e.value == value && e.key != code)
          .toList();
      final old = _base[code];
      if (holder.isNotEmpty) _base[holder.first.key] = old;
      _base[code] = value;
    });
  }

  Future<void> _create() async {
    final cls = _classOpt!;
    final sp = _species!;
    final bg = _background!;
    const pb = 2;

    final scores = {for (final a in kAbilityOrder) a: _finalScore(a)};
    final mods = {
      for (final a in kAbilityOrder) a: abilityModifier(scores[a]!),
    };

    AbilityScore ab(String code) => AbilityScore(
      score: scores[code]!,
      modifier: mods[code]!,
      proficientSave: cls.saves.contains(code),
    );

    final profSkills = {..._classSkills, ..._speciesSkills, ...bg.skills};
    final skills = [
      for (final s in kSkills)
        Skill(
          name: s.name,
          nameEn: s.nameEn,
          abilityType: s.ability,
          modifier: mods[s.ability]! + (profSkills.contains(s.name) ? pb : 0),
          proficient: profSkills.contains(s.name),
        ),
    ];

    final perceptionMod = mods['WIS']! + (profSkills.contains('感知') ? pb : 0);
    final maxHp = level1MaxHp(cls, sp, mods);

    final caster = cls.spellAbility.isNotEmpty;
    final spellMod = caster ? mods[cls.spellAbility]! : 0;

    final features = <CharacterFeature>[
      for (final t in sp.traits)
        CharacterFeature(name: t, source: '種族：${sp.cn}'),
      CharacterFeature(name: bg.originFeat, source: '背景：${bg.cn}'),
    ];

    var character = Character(
      id: DateTime.now().microsecondsSinceEpoch.toString(),
      name: _name.trim(),
      species: sp.cn,
      speciesEn: sp.en,
      className: cls.cn,
      classNameEn: cls.en,
      level: 1,
      background: bg.cn,
      backgroundEn: bg.en,
      alignment: _alignment,
      creatureType: 'Humanoid',
      size: _sizeChoice ?? sp.size,
      ac: level1UnarmoredAc(cls, mods),
      maxHp: maxHp,
      currentHp: maxHp,
      speed: sp.speed,
      initiative: mods['DEX']!,
      proficiencyBonus: pb,
      passivePerception: 10 + perceptionMod,
      spellDc: caster ? spellSaveDcFor(pb, spellMod) : 0,
      spellAttack: caster ? spellAttackFor(pb, spellMod) : 0,
      spellcastingAbility: cls.spellAbility,
      abilityScores: AbilityScores(
        str: ab('STR'),
        dex: ab('DEX'),
        con: ab('CON'),
        int_: ab('INT'),
        wis: ab('WIS'),
        cha: ab('CHA'),
      ),
      skills: skills,
      // 法術：選擇當下反正規化（跳過法術步驟時為空，法術位仍建立）。
      cantrips: [for (final s in _selCantrips.values) spellFromCatalog(s)],
      spells: [for (final s in _selSpells.values) spellFromCatalog(s)],
      spellSlots: caster
          ? [SpellSlots(level: 1, total: cls.level1Slots)]
          : const [],
      features: features,
      hitDieFaces: cls.hitDie,
    );

    // 角色圖：建立時上傳（失敗不阻擋建角，可於傳記頁補傳）。
    final portrait = _portraitBytes;
    if (portrait != null) {
      try {
        final url = await ref
            .read(portraitServiceProvider)
            .upload(character.id, portrait);
        character = character.copyWith(portraitUrl: url);
      } catch (_) {
        if (mounted) {
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(const SnackBar(content: Text('角色圖上傳失敗，可稍後於傳記頁重試')));
        }
      }
    }
    if (!mounted) return;

    ref.read(characterListProvider.notifier).add(character);
    ref.read(selectedCharacterIdProvider.notifier).state = character.id;
    context.go('/main/decision');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _surfaces.surface0,
      appBar: AppBar(
        backgroundColor: _surfaces.surface0,
        title: const Text(
          '新增角色',
          style: TextStyle(
            fontFamily: 'NotoSerifTC',
            fontWeight: FontWeight.w700,
          ),
        ),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => context.canPop()
              ? context.pop()
              : context.go('/character-select'),
        ),
      ),
      body: SafeArea(
        top: false,
        child: Column(
          children: [
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
                child: _buildStep(),
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
      case '基本':
        return _basicStep();
      case '職業':
        return _classStep();
      case '背景':
        return _backgroundStep();
      case '能力值':
        return _abilityStep();
      case '技能':
        return _skillStep();
      case '法術':
        return _spellStep();
      default:
        return _confirmStep();
    }
  }

  // ── 步驟一：基本 ──

  Widget _basicStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // 與總覽 hero 同比例（4:5），預覽即最終立繪框的裁切。
        Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 240),
            child: AspectRatio(
              aspectRatio: kPortraitAspectRatio,
              child: GestureDetector(
                onTap: () async {
                  final bytes = await PortraitService.pick();
                  if (bytes != null) setState(() => _portraitBytes = bytes);
                },
                child: _portraitBytes == null
                    ? const _PortraitPlaceholder()
                    : ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: Image.memory(_portraitBytes!, fit: BoxFit.cover),
                      ),
              ),
            ),
          ),
        ),
        const SizedBox(height: AppSpacing.lg),
        const _FieldLabel('名稱'),
        const SizedBox(height: AppSpacing.xs),
        TextField(
          onChanged: (v) => setState(() => _name = v),
          style: TextStyle(
            fontFamily: 'NotoSerifTC',
            color: _surfaces.textPrimary,
          ),
          decoration: InputDecoration(
            hintText: '輸入角色名稱',
            filled: true,
            fillColor: _surfaces.surface1,
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(color: _surfaces.border2),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: const BorderSide(color: AppColors.accentGold),
            ),
          ),
        ),
        const SizedBox(height: AppSpacing.lg),
        const _FieldLabel('陣營 ALIGNMENT'),
        const SizedBox(height: AppSpacing.xs),
        _Dropdown<String>(
          value: _alignment,
          items: kAlignments,
          label: (a) => a,
          onChanged: (v) => setState(() => _alignment = v!),
        ),
        const SizedBox(height: AppSpacing.lg),
        const _FieldLabel('種族 SPECIES'),
        const SizedBox(height: AppSpacing.sm),
        _OptionChips(
          options: [for (final s in kSpecies) s.cn],
          selected: _species?.cn,
          onSelect: (cn) => setState(() {
            _species = kSpecies.firstWhere((s) => s.cn == cn);
            _speciesSkills.clear();
            _sizeChoice = _species!.effectiveSizeChoices.first;
          }),
        ),
        if (_species != null && _species!.effectiveSizeChoices.length > 1) ...[
          const SizedBox(height: AppSpacing.lg),
          const _FieldLabel('體型 SIZE'),
          const SizedBox(height: AppSpacing.sm),
          _OptionChips(
            options: [
              for (final s in _species!.effectiveSizeChoices)
                s == 'Small' ? '小型' : '中型',
            ],
            selected: (_sizeChoice ?? _species!.size) == 'Small' ? '小型' : '中型',
            onSelect: (label) => setState(
              () => _sizeChoice = label == '小型' ? 'Small' : 'Medium',
            ),
          ),
        ],
        if (_species != null) ...[
          const SizedBox(height: AppSpacing.lg),
          _DescCard(
            title: '${_species!.cn} ${_species!.en}',
            body: _species!.description,
            chips: [
              '速度 ${_species!.speed}',
              '體型 ${_species!.size == 'Small' ? '小型' : '中型'}',
              if (_species!.darkvision) '黑暗視覺',
              ..._species!.traits,
            ],
          ),
        ],
      ],
    );
  }

  // ── 步驟二：職業 ──

  Widget _classStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _OptionChips(
          options: [for (final c in kClasses) c.cn],
          selected: _classOpt?.cn,
          onSelect: (cn) => setState(() {
            _classOpt = kClasses.firstWhere((c) => c.cn == cn);
            _classSkills.clear();
            _selCantrips.clear();
            _selSpells.clear();
            _resetAbilities();
          }),
        ),
        if (_classOpt != null) ...[
          const SizedBox(height: AppSpacing.lg),
          _DescCard(
            title: '${_classOpt!.cn} ${_classOpt!.en}',
            body: _classOpt!.description,
            chips: [
              '生命骰 d${_classOpt!.hitDie}',
              '豁免 ${_classOpt!.saves.map((s) => kAbilityCn[s]).join('/')}',
              '主屬性 ${_classOpt!.primaryAbilities.map((s) => kAbilityCn[s]).join('/')}',
              '技能 選${_classOpt!.skillCount}',
              if (_classOpt!.spellAbility.isNotEmpty)
                '施法 ${kAbilityCn[_classOpt!.spellAbility]}',
            ],
          ),
        ],
      ],
    );
  }

  // ── 步驟三：背景 ──

  /// 內建 + 自訂背景的合併選項（label 唯一：自訂項帶「（自訂）」後綴，
  /// 同名再附序號）。
  List<({String label, BackgroundOption opt, CustomBackground? custom})>
  _backgroundEntries(List<CustomBackground> customs) {
    final entries =
        <({String label, BackgroundOption opt, CustomBackground? custom})>[
          for (final b in kBackgrounds) (label: b.cn, opt: b, custom: null),
        ];
    for (final c in customs) {
      var label = '${c.name}（自訂）';
      var n = 2;
      while (entries.any((e) => e.label == label)) {
        label = '${c.name}（自訂 $n）';
        n++;
      }
      entries.add((label: label, opt: c.toBackgroundOption(), custom: c));
    }
    return entries;
  }

  void _selectBackground(BackgroundOption opt, {String? customId}) {
    _background = opt;
    _backgroundCustomId = customId;
    // 背景固定技能與既有選擇衝突時，清掉重複的（不可重複熟練）。
    _classSkills.removeWhere(_background!.skills.contains);
    _speciesSkills.removeWhere(_background!.skills.contains);
    _resetAbilities();
  }

  Widget _backgroundStep() {
    final customsAsync = ref.watch(customBackgroundsProvider);
    final customs = customsAsync.valueOrNull ?? const <CustomBackground>[];
    final entries = _backgroundEntries(customs);
    final selectedLabel = _backgroundCustomId != null
        ? entries
              .where((e) => e.custom?.id == _backgroundCustomId)
              .map((e) => e.label)
              .firstOrNull
        : _background?.cn;
    final selectedCustom = _backgroundCustomId == null
        ? null
        : customs.where((c) => c.id == _backgroundCustomId).firstOrNull;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _OptionChips(
          options: [for (final e in entries) e.label],
          selected: selectedLabel,
          onSelect: (label) => setState(() {
            final e = entries.firstWhere((e) => e.label == label);
            _selectBackground(e.opt, customId: e.custom?.id);
          }),
        ),
        const SizedBox(height: AppSpacing.sm),
        Align(
          alignment: Alignment.centerLeft,
          child: TextButton.icon(
            onPressed: () => context.push('/custom-background-edit'),
            icon: const Icon(Icons.add, size: 18),
            label: const Text('自訂背景'),
          ),
        ),
        if (customsAsync.hasError)
          Padding(
            padding: EdgeInsets.only(top: AppSpacing.sm),
            child: Text(
              '自訂背景離線不可用（僅顯示內建背景）',
              style: TextStyle(
                fontFamily: 'Inter',
                fontSize: 12,
                color: _surfaces.textSecondary,
              ),
            ),
          ),
        if (_background != null) ...[
          const SizedBox(height: AppSpacing.lg),
          _DescCard(
            title: '${_background!.cn} ${_background!.en}'.trim(),
            body: _background!.description,
            chips: [
              '能力 ${_background!.abilities.map((s) => kAbilityCn[s]).join('/')}',
              '技能 ${_background!.skills.join('·')}',
              '專長 ${_background!.originFeat}',
            ],
          ),
          if (selectedCustom != null)
            Row(
              children: [
                TextButton.icon(
                  onPressed: () => _editCustomBackground(selectedCustom),
                  icon: const Icon(Icons.edit_outlined, size: 18),
                  label: const Text('編輯'),
                ),
                TextButton.icon(
                  onPressed: () => _deleteCustomBackground(selectedCustom),
                  icon: const Icon(Icons.delete_outline, size: 18),
                  label: const Text('刪除'),
                ),
              ],
            ),
        ],
      ],
    );
  }

  Future<void> _editCustomBackground(CustomBackground c) async {
    await context.push('/custom-background-edit', extra: c);
    if (!mounted) return;
    final updated = ref
        .read(customBackgroundsProvider)
        .valueOrNull
        ?.where((x) => x.id == c.id)
        .firstOrNull;
    if (updated != null && _backgroundCustomId == c.id) {
      setState(
        () => _selectBackground(
          updated.toBackgroundOption(),
          customId: updated.id,
        ),
      );
    }
  }

  Future<void> _deleteCustomBackground(CustomBackground c) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('刪除自訂背景'),
        content: Text('確定刪除「${c.name}」？已用它建立的角色不受影響。'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('取消'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('刪除'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    try {
      await ref.read(customBackgroundsProvider.notifier).delete(c.id);
      if (_backgroundCustomId == c.id) {
        setState(() {
          _background = null;
          _backgroundCustomId = null;
        });
      }
    } on AppException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(e.message)));
      }
    }
  }

  // ── 步驟四：能力值 ──

  Widget _abilityStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        AbilityHexChart(values: _realHexValues),
        const SizedBox(height: AppSpacing.md),
        _methodTabs(),
        const SizedBox(height: AppSpacing.md),
        _bonusExplain(),
        const SizedBox(height: AppSpacing.md),
        ..._methodBody(),
      ],
    );
  }

  Widget _methodTabs() {
    const labels = {
      _AbilityMethod.array: '標準陣列',
      _AbilityMethod.buy: '購點',
      _AbilityMethod.roll: '擲骰',
    };
    return Row(
      children: [
        for (final e in labels.entries) ...[
          Expanded(
            child: GestureDetector(
              onTap: () => _setMethod(e.key),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 7),
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: _method == e.key
                      ? AppColors.accentGold
                      : _surfaces.surface1,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: _method == e.key
                        ? AppColors.accentGold
                        : _surfaces.border2,
                  ),
                ),
                child: Text(
                  e.value,
                  style: TextStyle(
                    fontFamily: 'NotoSerifTC',
                    fontSize: 13,
                    fontWeight: _method == e.key
                        ? FontWeight.w700
                        : FontWeight.w400,
                    color: _method == e.key
                        ? const Color(0xFF1A1206)
                        : _surfaces.textSecondary,
                  ),
                ),
              ),
            ),
          ),
          if (e.key != _AbilityMethod.roll) const SizedBox(width: 6),
        ],
      ],
    );
  }

  List<Widget> _methodBody() {
    switch (_method) {
      case _AbilityMethod.array:
        return _arrayBody();
      case _AbilityMethod.buy:
        return _buyBody();
      case _AbilityMethod.roll:
        return _rollBody();
    }
  }

  List<Widget> _arrayBody() => [
    Row(
      children: [
        Expanded(
          child: Text(
            '剩餘可分配 ${_pool.length}／6',
            style: TextStyle(
              fontFamily: 'NotoSerifTC',
              fontSize: 12,
              color: _surfaces.textSecondary,
            ),
          ),
        ),
        _pill('套用建議', () => setState(_recommendArray)),
        const SizedBox(width: 6),
        _pill('清空', _clearBase),
      ],
    ),
    const SizedBox(height: AppSpacing.md),
    for (final code in kAbilityOrder)
      _abilityRowFrame(code, _arrayControl(code)),
  ];

  List<Widget> _buyBody() => [
    Row(
      children: [
        Text(
          '剩餘點數',
          style: TextStyle(
            fontFamily: 'NotoSerifTC',
            fontSize: 12,
            color: _surfaces.textSecondary,
          ),
        ),
        const SizedBox(width: AppSpacing.sm),
        Expanded(
          child: ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: _pointsSpent / kPointBuyBudget,
              minHeight: 8,
              backgroundColor: _surfaces.surface2,
              valueColor: const AlwaysStoppedAnimation(AppColors.accentGold),
            ),
          ),
        ),
        const SizedBox(width: AppSpacing.sm),
        Text(
          '$_pointsRemaining / $kPointBuyBudget',
          style: const TextStyle(
            fontFamily: 'Cinzel',
            fontSize: 14,
            fontWeight: FontWeight.w700,
            color: AppColors.accentGold,
          ),
        ),
        const SizedBox(width: AppSpacing.sm),
        _pill(
          '重置',
          () => setState(() {
            for (final k in kAbilityOrder) {
              _base[k] = 8;
            }
          }),
        ),
      ],
    ),
    const SizedBox(height: AppSpacing.md),
    for (final code in kAbilityOrder) _abilityRowFrame(code, _buyControl(code)),
    const SizedBox(height: AppSpacing.sm),
    Text(
      '六項由 8 起，花點數買高（最高 15，可重複）',
      style: TextStyle(
        fontFamily: 'NotoSerifTC',
        fontSize: 11,
        color: _surfaces.textSecondary,
      ),
    ),
  ];

  List<Widget> _rollBody() => [
    Text(
      '自行擲 4d6 去最低 ×6，將結果填入（App 不代擲）',
      style: TextStyle(
        fontFamily: 'NotoSerifTC',
        fontSize: 11,
        color: _surfaces.textSecondary,
      ),
    ),
    const SizedBox(height: AppSpacing.md),
    for (final code in kAbilityOrder)
      _abilityRowFrame(code, _rollControl(code)),
  ];

  Widget _pill(String label, VoidCallback onTap) => GestureDetector(
    onTap: onTap,
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.accentGold),
      ),
      child: Text(
        label,
        style: const TextStyle(
          fontFamily: 'NotoSerifTC',
          fontSize: 12,
          color: AppColors.accentGold,
        ),
      ),
    ),
  );

  Widget _abilityRowFrame(String code, Widget control) {
    final bonus = _bonusMap[code]!;
    final base = _base[code];
    final fin = base == null ? null : _finalScore(code);
    final mod = fin == null ? null : abilityModifier(fin);
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: Row(
        children: [
          SizedBox(
            width: 40,
            child: Text(
              kAbilityCn[code]!,
              style: TextStyle(
                fontFamily: 'NotoSerifTC',
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: _surfaces.textPrimary,
              ),
            ),
          ),
          const Spacer(),
          if (bonus > 0)
            Padding(
              padding: const EdgeInsets.only(right: 6),
              child: Text(
                '+$bonus',
                style: const TextStyle(
                  fontFamily: 'Cinzel',
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: AppColors.goldDim,
                ),
              ),
            ),
          control,
          const SizedBox(width: 6),
          const Text(
            '→',
            style: TextStyle(
              fontFamily: 'Inter',
              fontSize: 12,
              color: AppColors.sectionLabel,
            ),
          ),
          const SizedBox(width: 6),
          SizedBox(
            width: 58,
            child: Text(
              fin == null ? '—' : '$fin (${mod! >= 0 ? '+$mod' : '$mod'})',
              textAlign: TextAlign.right,
              style: const TextStyle(
                fontFamily: 'Cinzel',
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: AppColors.accentGold,
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _arrayLabel(String code, int v) {
    final h = _base.entries
        .where((e) => e.value == v && e.key != code)
        .toList();
    return h.isEmpty ? '$v' : '$v · ${kAbilityCn[h.first.key]}';
  }

  Widget _arrayControl(String code) {
    return Container(
      width: 90,
      padding: const EdgeInsets.symmetric(horizontal: 10),
      decoration: BoxDecoration(
        color: _surfaces.surface1,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: _surfaces.border2),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<int>(
          value: _base[code],
          isExpanded: true,
          isDense: true,
          hint: Text(
            '—',
            style: TextStyle(
              fontFamily: 'Cinzel',
              fontSize: 16,
              color: _surfaces.textSecondary,
            ),
          ),
          dropdownColor: _surfaces.surface1,
          icon: Icon(
            Icons.expand_more,
            size: 18,
            color: _surfaces.textSecondary,
          ),
          style: TextStyle(
            fontFamily: 'Cinzel',
            fontSize: 16,
            fontWeight: FontWeight.w700,
            color: _surfaces.textPrimary,
          ),
          selectedItemBuilder: (c) => [
            for (final v in kStandardArray)
              Align(alignment: Alignment.centerLeft, child: Text('$v')),
          ],
          items: [
            for (final v in kStandardArray)
              DropdownMenuItem(
                value: v,
                child: Text(
                  _arrayLabel(code, v),
                  style: TextStyle(
                    fontFamily: 'NotoSerifTC',
                    fontSize: 13,
                    color: _surfaces.textPrimary,
                  ),
                ),
              ),
          ],
          onChanged: (v) => _selectArrayValue(code, v),
        ),
      ),
    );
  }

  Widget _buyControl(String code) {
    return Container(
      width: 96,
      padding: const EdgeInsets.symmetric(horizontal: 10),
      decoration: BoxDecoration(
        color: _surfaces.surface1,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: _surfaces.border2),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<int>(
          value: _base[code],
          isExpanded: true,
          isDense: true,
          dropdownColor: _surfaces.surface1,
          icon: Icon(
            Icons.expand_more,
            size: 18,
            color: _surfaces.textSecondary,
          ),
          style: TextStyle(
            fontFamily: 'Cinzel',
            fontSize: 16,
            fontWeight: FontWeight.w700,
            color: _surfaces.textPrimary,
          ),
          selectedItemBuilder: (c) => [
            for (var v = 8; v <= 15; v++)
              Align(alignment: Alignment.centerLeft, child: Text('$v')),
          ],
          items: [
            for (var v = 8; v <= 15; v++)
              DropdownMenuItem(
                value: v,
                enabled: _buyAffordable(code, v),
                child: Text(
                  '$v（${kPointBuyCost[v]}點）',
                  style: TextStyle(
                    fontFamily: 'NotoSerifTC',
                    fontSize: 13,
                    color: _buyAffordable(code, v)
                        ? _surfaces.textPrimary
                        : _surfaces.textSecondary.withValues(alpha: 0.4),
                  ),
                ),
              ),
          ],
          onChanged: (v) => v == null ? null : setState(() => _base[code] = v),
        ),
      ),
    );
  }

  Widget _rollControl(String code) {
    return SizedBox(
      width: 60,
      child: TextFormField(
        key: ValueKey('roll-$code'),
        initialValue: _base[code]?.toString() ?? '',
        keyboardType: TextInputType.number,
        textAlign: TextAlign.center,
        style: TextStyle(
          fontFamily: 'Cinzel',
          fontSize: 16,
          fontWeight: FontWeight.w700,
          color: _surfaces.textPrimary,
        ),
        decoration: InputDecoration(
          isDense: true,
          contentPadding: const EdgeInsets.symmetric(vertical: 8),
          filled: true,
          fillColor: _surfaces.surface1,
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: BorderSide(color: _surfaces.border2),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: const BorderSide(color: AppColors.accentGold),
          ),
        ),
        onChanged: (s) => setState(() => _base[code] = int.tryParse(s)),
      ),
    );
  }

  /// 背景加值卡（2024：玩家可於背景三屬性間自選 +2/+1，或 +1/+1/+1）。
  Widget _bonusExplain() {
    final bg = _background!;
    final is21 = _bonusMode == '2/1';
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: _surfaces.surface1,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: _surfaces.border2),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(
                Icons.auto_awesome,
                size: 15,
                color: AppColors.accentGold,
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: Text(
                  '背景加值 · ${bg.cn}',
                  style: TextStyle(
                    fontFamily: 'NotoSerifTC',
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: _surfaces.textLight,
                  ),
                ),
              ),
              _bonusModePill(
                '+2/+1',
                is21,
                () => setState(() {
                  _bonusMode = '2/1';
                  if (_plus2 == null) _autofillBonus();
                }),
              ),
              const SizedBox(width: 6),
              _bonusModePill(
                '+1×3',
                !is21,
                () => setState(() => _bonusMode = '1/1/1'),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          if (is21) ...[
            _bonusAssignRow(
              '+2',
              _plus2,
              (a) => setState(() {
                if (_plus1 == a) _plus1 = _plus2;
                _plus2 = a;
              }),
            ),
            const SizedBox(height: AppSpacing.sm),
            _bonusAssignRow(
              '+1',
              _plus1,
              (a) => setState(() {
                if (_plus2 == a) _plus2 = _plus1;
                _plus1 = a;
              }),
            ),
          ] else
            Text(
              '三屬性各 +1：${bg.abilities.map((a) => kAbilityCn[a]).join('、')}',
              style: TextStyle(
                fontFamily: 'NotoSerifTC',
                fontSize: 12,
                color: _surfaces.textLight,
              ),
            ),
        ],
      ),
    );
  }

  Widget _bonusModePill(String label, bool selected, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: selected ? AppColors.accentGold : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: selected ? AppColors.accentGold : _surfaces.border2,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontFamily: 'Inter',
            fontSize: 11,
            fontWeight: FontWeight.w700,
            color: selected ? const Color(0xFF1A1206) : _surfaces.textSecondary,
          ),
        ),
      ),
    );
  }

  Widget _bonusAssignRow(
    String label,
    String? selected,
    ValueChanged<String> onPick,
  ) {
    final bg = _background!;
    return Row(
      children: [
        SizedBox(
          width: 30,
          child: Text(
            label,
            style: const TextStyle(
              fontFamily: 'Cinzel',
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: AppColors.accentGold,
            ),
          ),
        ),
        for (final a in bg.abilities) ...[
          Expanded(
            child: GestureDetector(
              key: ValueKey('bonus-$label-$a'),
              onTap: () => onPick(a),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 6),
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: selected == a
                      ? AppColors.accentGold.withValues(alpha: 0.18)
                      : _surfaces.surface2,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: selected == a
                        ? AppColors.accentGold
                        : _surfaces.border2,
                  ),
                ),
                child: Text(
                  kAbilityCn[a]!,
                  style: TextStyle(
                    fontFamily: 'NotoSerifTC',
                    fontSize: 12,
                    fontWeight: selected == a
                        ? FontWeight.w700
                        : FontWeight.w400,
                    color: selected == a
                        ? AppColors.accentGold
                        : _surfaces.textPrimary,
                  ),
                ),
              ),
            ),
          ),
          if (a != bg.abilities.last) const SizedBox(width: 6),
        ],
      ],
    );
  }

  // ── 步驟六：技能 ──

  Widget _skillStep() {
    final cls = _classOpt!;
    final bg = _background!;
    final sp = _species!;
    final bgOwned = bg.skills.toSet();

    // 已由其他來源取得的技能不得重複選（2024：重複熟練須改選其他）。
    final classPicker = <Widget>[
      _SubLabel('職業（選 ${cls.skillCount}）'),
      const SizedBox(height: AppSpacing.sm),
      for (final name in cls.skillChoices)
        () {
          final fromBg = bgOwned.contains(name);
          final fromSpecies = _speciesSkills.contains(name);
          return _SkillRow(
            label:
                '$name ${skillByName(name).nameEn}'
                '${fromBg
                    ? '（背景已有）'
                    : fromSpecies
                    ? '（種族已選）'
                    : ''}',
            selected: _classSkills.contains(name),
            locked: false,
            disabled: fromBg || fromSpecies,
            onTap: () => setState(() {
              if (_classSkills.contains(name)) {
                _classSkills.remove(name);
              } else if (_classSkills.length < cls.skillCount) {
                _classSkills.add(name);
              }
            }),
          );
        }(),
      if (sp.skillPickCount > 0) ...[
        const SizedBox(height: AppSpacing.md),
        _SubLabel('種族 ${sp.cn}（選 ${sp.skillPickCount}）'),
        const SizedBox(height: AppSpacing.sm),
        for (final name in sp.skillPickFrom)
          () {
            final fromBg = bgOwned.contains(name);
            final fromClass = _classSkills.contains(name);
            return _SkillRow(
              label:
                  '$name ${skillByName(name).nameEn}'
                  '${fromBg
                      ? '（背景已有）'
                      : fromClass
                      ? '（職業已選）'
                      : ''}',
              selected: _speciesSkills.contains(name),
              locked: false,
              disabled: fromBg || fromClass,
              onTap: () => setState(() {
                if (_speciesSkills.contains(name)) {
                  _speciesSkills.remove(name);
                } else if (_speciesSkills.length < sp.skillPickCount) {
                  _speciesSkills.add(name);
                }
              }),
            );
          }(),
      ],
    ];
    final bgBlock = <Widget>[
      _SubLabel('背景 ${bg.cn}（自動）'),
      const SizedBox(height: AppSpacing.sm),
      for (final name in bg.skills)
        _SkillRow(
          label: '$name ${skillByName(name).nameEn}',
          selected: true,
          locked: true,
          onTap: null,
        ),
    ];
    final savesBlock = <Widget>[
      _SectionHeader('豁免熟練'),
      const SizedBox(height: AppSpacing.sm),
      _SubLabel('職業（自動）'),
      const SizedBox(height: AppSpacing.sm),
      Row(
        children: [
          for (final s in cls.saves) ...[
            Expanded(child: _SaveTag(label: kAbilityCn[s]!)),
            if (s != cls.saves.last) const SizedBox(width: AppSpacing.sm),
          ],
        ],
      ),
    ];

    // 平板（≥600dp）：左欄為技能選擇，右欄上下為背景與豁免，縮短頁面長度。
    if (ResponsiveLayout.isTablet(context)) {
      return Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _SectionHeader('技能熟練'),
                const SizedBox(height: AppSpacing.sm),
                ...classPicker,
              ],
            ),
          ),
          const SizedBox(width: AppSpacing.lg),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _SectionHeader('背景熟練'),
                const SizedBox(height: AppSpacing.sm),
                ...bgBlock,
                const SizedBox(height: AppSpacing.lg),
                ...savesBlock,
              ],
            ),
          ),
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _SectionHeader('技能熟練'),
        const SizedBox(height: AppSpacing.sm),
        ...classPicker,
        const SizedBox(height: AppSpacing.md),
        ...bgBlock,
        const SizedBox(height: AppSpacing.lg),
        ...savesBlock,
      ],
    );
  }

  // ── 步驟七：法術（施法職業限定）──

  Widget _spellStep() {
    final cls = _classOpt!;
    final cantripsAsync = ref.watch(spellCatalogProvider(_cantripQuery));
    final spellsAsync = ref.watch(spellCatalogProvider(_spellQuery));
    final offline = cantripsAsync.hasError || spellsAsync.hasError;

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
              '${cls.cn} · 施法屬性 ${kAbilityCn[cls.spellAbility]}',
              style: TextStyle(
                fontFamily: 'NotoSerifTC',
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: _surfaces.textLight,
              ),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.md),
        if (offline)
          _offlineCard()
        else ...[
          if (cls.cantripsKnown > 0) ...[
            _spellSectionHeader(
              '戲法 CANTRIPS · 選 ${cls.cantripsKnown}',
              _selCantrips.length,
              cls.cantripsKnown,
            ),
            const SizedBox(height: AppSpacing.sm),
            _spellList(cantripsAsync, _selCantrips, cls.cantripsKnown),
            const SizedBox(height: AppSpacing.lg),
          ],
          _spellSectionHeader(
            '一環法術 1ST LEVEL · 準備 ${cls.preparedSpells}',
            _selSpells.length,
            cls.preparedSpells,
          ),
          const SizedBox(height: AppSpacing.sm),
          _spellList(spellsAsync, _selSpells, cls.preparedSpells),
        ],
      ],
    );
  }

  Widget _spellSectionHeader(String label, int selected, int max) {
    final done = selected == max;
    return Row(
      children: [
        Expanded(child: _FieldLabel(label)),
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

  Widget _spellList(
    AsyncValue<List<CatalogSpell>> async,
    Map<String, CatalogSpell> selection,
    int max,
  ) {
    return async.when(
      data: (spells) => Column(
        children: [
          for (final s in spells)
            _SpellPickRow(
              spell: s,
              selected: selection.containsKey(s.id),
              disabled: !selection.containsKey(s.id) && selection.length >= max,
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
      loading: () => const Padding(
        padding: EdgeInsets.symmetric(vertical: AppSpacing.xl),
        child: Center(
          child: SizedBox(
            width: 22,
            height: 22,
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
        ),
      ),
      error: (_, _) => const SizedBox.shrink(),
    );
  }

  Widget _offlineCard() {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: _surfaces.surface1,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _surfaces.border2),
      ),
      child: Column(
        children: [
          Icon(Icons.cloud_off, size: 28, color: _surfaces.textSecondary),
          const SizedBox(height: AppSpacing.sm),
          Text(
            '內容庫離線',
            style: TextStyle(
              fontFamily: 'NotoSerifTC',
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: _surfaces.textPrimary,
            ),
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(
            '目前無法載入法術清單。可先完成建角，之後再補選法術。',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontFamily: 'NotoSerifTC',
              fontSize: 12,
              color: _surfaces.textSecondary,
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          OutlinedButton.icon(
            onPressed: () {
              ref.invalidate(spellCatalogProvider(_cantripQuery));
              ref.invalidate(spellCatalogProvider(_spellQuery));
            },
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

  // ── 步驟八：確認 ──

  Widget _confirmStep() {
    final cls = _classOpt!;
    final sp = _species!;
    final bg = _background!;
    const pb = 2;
    final scores = {for (final a in kAbilityOrder) a: _finalScore(a)};
    final mods = {
      for (final a in kAbilityOrder) a: abilityModifier(scores[a]!),
    };
    final caster = cls.spellAbility.isNotEmpty;
    final profSkills = {..._classSkills, ..._speciesSkills, ...bg.skills};
    final perceptionMod = mods['WIS']! + (profSkills.contains('感知') ? pb : 0);
    final spellMod = caster ? mods[cls.spellAbility]! : 0;
    final hp = level1MaxHp(cls, sp, mods);

    final combat = <(String, String)>[
      ('HP', '$hp'),
      ('AC', '${level1UnarmoredAc(cls, mods)}'),
      ('先攻', _sign(mods['DEX']!)),
      ('被動察覺', '${10 + perceptionMod}'),
      ('熟練', '+$pb'),
      if (caster) ('施法DC', '${spellSaveDcFor(pb, spellMod)}'),
      if (caster) ('施法命中', _sign(spellAttackFor(pb, spellMod))),
    ];

    final saves = [
      for (final code in kAbilityOrder)
        (
          kAbilityCn[code]!,
          mods[code]! + (cls.saves.contains(code) ? pb : 0),
          cls.saves.contains(code),
        ),
    ];
    final skills = [
      for (final s in kSkills)
        (
          s.name,
          mods[s.ability]! + (profSkills.contains(s.name) ? pb : 0),
          profSkills.contains(s.name),
        ),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            _portraitSmall(),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _name.trim().isEmpty ? '（未命名）' : _name.trim(),
                    style: TextStyle(
                      fontFamily: 'NotoSerifTC',
                      fontSize: 22,
                      fontWeight: FontWeight.w700,
                      color: _surfaces.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '${sp.cn} · ${cls.cn} 1 · ${bg.cn} · $_alignment',
                    style: TextStyle(
                      fontFamily: 'NotoSerifTC',
                      fontSize: 11,
                      color: _surfaces.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.lg),
        _SectionHeader('戰鬥數值'),
        const SizedBox(height: AppSpacing.sm),
        _statGrid(combat),
        const SizedBox(height: AppSpacing.lg),
        AbilityHexChart(values: _realHexValues),
        const SizedBox(height: AppSpacing.lg),
        _SectionHeader('屬性值'),
        const SizedBox(height: AppSpacing.sm),
        _abilityGrid(scores, mods),
        if (caster && (_selCantrips.isNotEmpty || _selSpells.isNotEmpty)) ...[
          const SizedBox(height: AppSpacing.lg),
          _SectionHeader('法術'),
          if (_selCantrips.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.sm),
            const _SubLabel('戲法'),
            const SizedBox(height: AppSpacing.xs),
            _spellChips(_selCantrips.values),
          ],
          if (_selSpells.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.sm),
            const _SubLabel('一環法術（已準備）'),
            const SizedBox(height: AppSpacing.xs),
            _spellChips(_selSpells.values),
          ],
        ],
        const SizedBox(height: AppSpacing.sm),
        CollapsibleSection(
          title: 'SAVING THROWS 豁免',
          initiallyExpanded: false,
          summary: '6 項',
          child: _checkGrid(saves),
        ),
        CollapsibleSection(
          title: 'SKILLS 技能',
          initiallyExpanded: false,
          summary: '18 項',
          child: _checkGrid(skills),
        ),
      ],
    );
  }

  Widget _spellChips(Iterable<CatalogSpell> spells) {
    return Wrap(
      spacing: 6,
      runSpacing: 6,
      children: [
        for (final s in spells)
          Container(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.sm,
              vertical: AppSpacing.xs,
            ),
            decoration: BoxDecoration(
              color: _surfaces.surface2,
              borderRadius: BorderRadius.circular(6),
              border: Border.all(color: _surfaces.border2),
            ),
            child: Text(
              (s.engName ?? '').isEmpty ? s.name : '${s.name} ${s.engName}',
              style: const TextStyle(
                fontFamily: 'NotoSerifTC',
                fontSize: 11,
                color: AppColors.accentGold,
              ),
            ),
          ),
      ],
    );
  }

  Widget _portraitSmall() => Container(
    width: 56,
    height: 56,
    clipBehavior: Clip.antiAlias,
    decoration: BoxDecoration(
      shape: BoxShape.circle,
      border: Border.all(color: AppColors.accentGold),
      gradient: const RadialGradient(
        colors: [Color(0xFF33291A), Color(0xFF0C0A06)],
      ),
    ),
    child: _portraitBytes == null
        ? const Icon(Icons.person, size: 26, color: Color(0xFF6B582F))
        : Image.memory(
            _portraitBytes!,
            width: 56,
            height: 56,
            fit: BoxFit.cover,
          ),
  );

  Widget _statGrid(List<(String, String)> items) {
    final rows = <Widget>[];
    for (var i = 0; i < items.length; i += 3) {
      final cells = <Widget>[];
      for (var j = i; j < i + 3; j++) {
        cells.add(
          Expanded(
            child: j < items.length ? _statCard(items[j]) : const SizedBox(),
          ),
        );
        if (j < i + 2) cells.add(const SizedBox(width: 6));
      }
      rows.add(
        Padding(
          padding: const EdgeInsets.only(bottom: 6),
          child: Row(children: cells),
        ),
      );
    }
    return Column(children: rows);
  }

  Widget _statCard((String, String) d) {
    final (label, value) = d;
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 9, horizontal: 2),
      decoration: BoxDecoration(
        color: _surfaces.surface1,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: _surfaces.border2),
      ),
      child: Column(
        children: [
          Text(
            value,
            style: const TextStyle(
              fontFamily: 'Cinzel',
              fontSize: 17,
              fontWeight: FontWeight.w700,
              color: AppColors.accentGold,
            ),
          ),
          const SizedBox(height: 1),
          Text(
            label,
            style: TextStyle(
              fontFamily: 'NotoSerifTC',
              fontSize: 9,
              color: _surfaces.textSecondary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _abilityGrid(Map<String, int> scores, Map<String, int> mods) {
    Widget card(String code) => Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 2),
        decoration: BoxDecoration(
          color: _surfaces.surface1,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: _surfaces.border2),
        ),
        child: Column(
          children: [
            Text(
              kAbilityCn[code]!,
              style: TextStyle(
                fontFamily: 'NotoSerifTC',
                fontSize: 11,
                color: _surfaces.textSecondary,
              ),
            ),
            Text(
              '${scores[code]}',
              style: const TextStyle(
                fontFamily: 'Cinzel',
                fontSize: 21,
                fontWeight: FontWeight.w700,
                color: AppColors.accentGold,
              ),
            ),
            Text(
              _sign(mods[code]!),
              style: TextStyle(
                fontFamily: 'Cinzel',
                fontSize: 12,
                color: _surfaces.textPrimary,
              ),
            ),
          ],
        ),
      ),
    );
    Widget row(List<String> codes) => Row(
      children: [
        for (var i = 0; i < codes.length; i++) ...[
          card(codes[i]),
          if (i < codes.length - 1) const SizedBox(width: 8),
        ],
      ],
    );
    return Column(
      children: [
        row(['STR', 'DEX', 'CON']),
        const SizedBox(height: 8),
        row(['INT', 'WIS', 'CHA']),
      ],
    );
  }

  Widget _checkGrid(List<(String, int, bool)> items) {
    final rows = <Widget>[];
    for (var i = 0; i < items.length; i += 2) {
      rows.add(
        Padding(
          padding: const EdgeInsets.only(bottom: AppSpacing.sm),
          child: Row(
            children: [
              Expanded(child: _checkCell(items[i])),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: i + 1 < items.length
                    ? _checkCell(items[i + 1])
                    : const SizedBox(),
              ),
            ],
          ),
        ),
      );
    }
    return Column(children: rows);
  }

  Widget _checkCell((String, int, bool) d) {
    final (name, mod, prof) = d;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: _surfaces.surface1,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(
          color: prof ? AppColors.accentGold : _surfaces.border2,
        ),
      ),
      child: Row(
        children: [
          Icon(
            prof ? Icons.check_circle : Icons.circle_outlined,
            size: 11,
            color: prof ? AppColors.accentGold : _surfaces.textSecondary,
          ),
          const SizedBox(width: 6),
          Expanded(
            child: Text(
              name,
              style: TextStyle(
                fontFamily: 'NotoSerifTC',
                fontSize: 13,
                fontWeight: prof ? FontWeight.w600 : FontWeight.w400,
                color: _surfaces.textPrimary,
              ),
            ),
          ),
          Text(
            mod >= 0 ? '+$mod' : '$mod',
            style: TextStyle(
              fontFamily: 'Cinzel',
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: prof ? AppColors.accentGold : _surfaces.textSecondary,
            ),
          ),
        ],
      ),
    );
  }

  String _sign(int v) => v >= 0 ? '+$v' : '$v';

  // ── 底部按鈕 ──

  Widget _buildBottomBar() {
    final isLast = _step == _steps.length - 1;
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
                  side: BorderSide(color: _surfaces.border),
                ),
                child: Text(
                  '上一步',
                  style: TextStyle(
                    fontFamily: 'NotoSerifTC',
                    color: _surfaces.textSecondary,
                  ),
                ),
              ),
              const SizedBox(width: AppSpacing.md),
            ],
            Expanded(
              child: FilledButton(
                onPressed: _canNext ? _next : null,
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.accentGold,
                  disabledBackgroundColor: _surfaces.border2,
                  padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
                ),
                child: Text(
                  isLast ? '建立角色' : '下一步',
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
}

// ════════════════ 共用小元件 ════════════════

class _FieldLabel extends StatelessWidget {
  final String text;
  const _FieldLabel(this.text);
  @override
  Widget build(BuildContext context) => Text(
    text,
    style: const TextStyle(
      fontFamily: 'Inter',
      fontSize: 9,
      letterSpacing: 1,
      color: AppColors.sectionLabel,
    ),
  );
}

class _SectionHeader extends StatelessWidget {
  final String text;
  const _SectionHeader(this.text);
  @override
  Widget build(BuildContext context) {
    final surfaces = Theme.of(context).extension<SurfaceColors>()!;
    return Text(
      text,
      style: TextStyle(
        fontFamily: 'NotoSerifTC',
        fontSize: 14,
        fontWeight: FontWeight.w700,
        color: surfaces.textPrimary,
      ),
    );
  }
}

class _SubLabel extends StatelessWidget {
  final String text;
  const _SubLabel(this.text);
  @override
  Widget build(BuildContext context) {
    final surfaces = Theme.of(context).extension<SurfaceColors>()!;
    return Text(
      text,
      style: TextStyle(
        fontFamily: 'NotoSerifTC',
        fontSize: 12,
        color: surfaces.textSecondary,
      ),
    );
  }
}

class _Dropdown<T> extends StatelessWidget {
  final T value;
  final List<T> items;
  final String Function(T) label;
  final ValueChanged<T?> onChanged;
  const _Dropdown({
    required this.value,
    required this.items,
    required this.label,
    required this.onChanged,
  });
  @override
  Widget build(BuildContext context) {
    final surfaces = Theme.of(context).extension<SurfaceColors>()!;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
      decoration: BoxDecoration(
        color: surfaces.surface1,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: surfaces.border2),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<T>(
          value: value,
          isExpanded: true,
          dropdownColor: surfaces.surface1,
          icon: Icon(Icons.expand_more, color: surfaces.textSecondary),
          style: TextStyle(
            fontFamily: 'NotoSerifTC',
            fontSize: 14,
            color: surfaces.textPrimary,
          ),
          items: [
            for (final it in items)
              DropdownMenuItem(value: it, child: Text(label(it))),
          ],
          onChanged: onChanged,
        ),
      ),
    );
  }
}

class _OptionChips extends StatelessWidget {
  final List<String> options;
  final String? selected;
  final ValueChanged<String> onSelect;
  const _OptionChips({
    required this.options,
    required this.selected,
    required this.onSelect,
  });
  @override
  Widget build(BuildContext context) {
    final surfaces = Theme.of(context).extension<SurfaceColors>()!;
    return Wrap(
      spacing: AppSpacing.sm,
      runSpacing: AppSpacing.sm,
      children: [
        for (final o in options)
          GestureDetector(
            onTap: () => onSelect(o),
            child: Container(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.lg,
                vertical: AppSpacing.sm,
              ),
              decoration: BoxDecoration(
                color: selected == o
                    ? AppColors.accentGold.withValues(alpha: 0.18)
                    : surfaces.surface1,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: selected == o
                      ? AppColors.accentGold
                      : surfaces.border2,
                ),
              ),
              child: Text(
                o,
                style: TextStyle(
                  fontFamily: 'NotoSerifTC',
                  fontSize: 14,
                  fontWeight: selected == o ? FontWeight.w700 : FontWeight.w400,
                  color: selected == o
                      ? AppColors.accentGold
                      : surfaces.textPrimary,
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _DescCard extends StatelessWidget {
  final String title;
  final String body;
  final List<String> chips;
  const _DescCard({
    required this.title,
    required this.body,
    required this.chips,
  });
  @override
  Widget build(BuildContext context) {
    final surfaces = Theme.of(context).extension<SurfaceColors>()!;
    return Container(
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: surfaces.surface1,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: surfaces.border2),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: TextStyle(
              fontFamily: 'NotoSerifTC',
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: surfaces.textPrimary,
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            body,
            style: TextStyle(
              fontFamily: 'NotoSerifTC',
              fontSize: 13,
              height: 1.5,
              color: surfaces.textLight,
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              for (final c in chips)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.sm,
                    vertical: AppSpacing.xs,
                  ),
                  decoration: BoxDecoration(
                    color: surfaces.surface2,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    c,
                    style: const TextStyle(
                      fontFamily: 'Inter',
                      fontSize: 10,
                      color: AppColors.accentGold,
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _SkillRow extends StatelessWidget {
  final String label;
  final bool selected;
  final bool locked;

  /// 已由其他來源取得而不可選（半透明、不可點）。
  final bool disabled;
  final VoidCallback? onTap;
  const _SkillRow({
    required this.label,
    required this.selected,
    required this.locked,
    required this.onTap,
    this.disabled = false,
  });
  @override
  Widget build(BuildContext context) {
    final surfaces = Theme.of(context).extension<SurfaceColors>()!;
    final on = selected || locked;
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: Opacity(
        opacity: disabled ? 0.45 : 1,
        child: GestureDetector(
          onTap: disabled ? null : onTap,
          child: Container(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.md,
              vertical: 9,
            ),
            decoration: BoxDecoration(
              color: surfaces.surface1,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: on ? AppColors.accentGold : surfaces.border2,
              ),
            ),
            child: Row(
              children: [
                Icon(
                  on ? Icons.check_circle : Icons.circle_outlined,
                  size: 16,
                  color: on ? AppColors.accentGold : surfaces.textSecondary,
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: Text(
                    label,
                    style: TextStyle(
                      fontFamily: 'NotoSerifTC',
                      fontSize: 13,
                      fontWeight: on ? FontWeight.w600 : FontWeight.w400,
                      color: surfaces.textPrimary,
                    ),
                  ),
                ),
                if (locked)
                  Icon(Icons.lock, size: 12, color: surfaces.textSecondary),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _SaveTag extends StatelessWidget {
  final String label;
  const _SaveTag({required this.label});
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: 8,
      ),
      decoration: BoxDecoration(
        color: AppColors.accentGold.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.accentGold),
      ),
      child: Row(
        children: [
          const Icon(Icons.check_circle, size: 14, color: AppColors.accentGold),
          const SizedBox(width: AppSpacing.sm),
          Text(
            '$label 豁免',
            style: const TextStyle(
              fontFamily: 'NotoSerifTC',
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: AppColors.accentGold,
            ),
          ),
        ],
      ),
    );
  }
}

/// 法術學派單字元代碼 → 中文名。
const _schoolCn = {
  'A': '防護',
  'C': '咒法',
  'D': '預言',
  'E': '惑控',
  'V': '塑能',
  'I': '幻術',
  'N': '死靈',
  'T': '變化',
};

/// 建角法術選擇列：勾選框選取、點列展開完整描述。
class _SpellPickRow extends StatefulWidget {
  final CatalogSpell spell;
  final bool selected;
  final bool disabled;
  final VoidCallback onToggle;

  const _SpellPickRow({
    required this.spell,
    required this.selected,
    required this.disabled,
    required this.onToggle,
  });

  @override
  State<_SpellPickRow> createState() => _SpellPickRowState();
}

class _SpellPickRowState extends State<_SpellPickRow> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    final surfaces = Theme.of(context).extension<SurfaceColors>()!;
    final s = widget.spell;
    final on = widget.selected;
    final badges = <String>[
      if (_schoolCn[s.school] != null) _schoolCn[s.school]!,
      if (s.concentration) '專注',
      if (s.ritual) '儀式',
    ];

    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: Opacity(
        opacity: widget.disabled ? 0.45 : 1,
        child: Container(
          decoration: BoxDecoration(
            color: surfaces.surface1,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: on ? AppColors.accentGold : surfaces.border2,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  // 勾選（獨立觸控目標 ≥ 48dp）
                  GestureDetector(
                    key: ValueKey('pick-${s.name}'),
                    onTap: widget.disabled ? null : widget.onToggle,
                    behavior: HitTestBehavior.opaque,
                    child: SizedBox(
                      width: 48,
                      height: 48,
                      child: Icon(
                        on ? Icons.check_circle : Icons.circle_outlined,
                        size: 18,
                        color: on
                            ? AppColors.accentGold
                            : surfaces.textSecondary,
                      ),
                    ),
                  ),
                  // 其餘區域：展開/收合描述
                  Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => _expanded = !_expanded),
                      behavior: HitTestBehavior.opaque,
                      child: SizedBox(
                        height: 48,
                        child: Row(
                          children: [
                            Expanded(
                              child: Text.rich(
                                TextSpan(
                                  text: s.name,
                                  style: TextStyle(
                                    fontFamily: 'NotoSerifTC',
                                    fontSize: 13,
                                    fontWeight: on
                                        ? FontWeight.w600
                                        : FontWeight.w400,
                                    color: surfaces.textPrimary,
                                  ),
                                  children: [
                                    if ((s.engName ?? '').isNotEmpty)
                                      TextSpan(
                                        text: '  ${s.engName}',
                                        style: TextStyle(
                                          fontFamily: 'Inter',
                                          fontSize: 10,
                                          fontWeight: FontWeight.w400,
                                          color: surfaces.textSecondary,
                                        ),
                                      ),
                                  ],
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            for (final b in badges) ...[
                              Container(
                                margin: const EdgeInsets.only(left: 4),
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 5,
                                  vertical: 2,
                                ),
                                decoration: BoxDecoration(
                                  color: AppColors.accentGold.withValues(
                                    alpha: 0.13,
                                  ),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  b,
                                  style: const TextStyle(
                                    fontFamily: 'NotoSerifTC',
                                    fontSize: 9,
                                    fontWeight: FontWeight.w600,
                                    color: AppColors.accentGold,
                                  ),
                                ),
                              ),
                            ],
                            Padding(
                              padding: const EdgeInsets.symmetric(
                                horizontal: AppSpacing.sm,
                              ),
                              child: Icon(
                                _expanded
                                    ? Icons.expand_less
                                    : Icons.expand_more,
                                size: 16,
                                color: surfaces.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              if (_expanded)
                Padding(
                  padding: const EdgeInsets.fromLTRB(
                    48,
                    0,
                    AppSpacing.lg,
                    AppSpacing.md,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        [
                          if (ftFormatCastingTime(s.castingTime).isNotEmpty)
                            '施法時間 ${ftFormatCastingTime(s.castingTime)}',
                          if (ftFormatRange(s.range).isNotEmpty)
                            '射程 ${ftFormatRange(s.range)}',
                          '成分 ${[if (s.compV) 'V', if (s.compS) 'S', if (s.compM != null) 'M'].join('·')}',
                        ].join(' · '),
                        style: TextStyle(
                          fontFamily: 'Inter',
                          fontSize: 10,
                          color: surfaces.textSecondary,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      FtEntriesView(
                        s.entries,
                        style: TextStyle(
                          fontFamily: 'NotoSerifTC',
                          fontSize: 13,
                          height: 1.6,
                          color: surfaces.textLight,
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

/// 角色圖佔位：漩渦深淵漸層 + 剪影人像 + 問號。
class _PortraitPlaceholder extends StatelessWidget {
  const _PortraitPlaceholder();
  @override
  Widget build(BuildContext context) {
    final surfaces = Theme.of(context).extension<SurfaceColors>()!;
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: surfaces.border2),
        gradient: const RadialGradient(
          radius: 0.9,
          colors: [Color(0xFF33291A), Color(0xFF0C0A06)],
        ),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.person, size: 60, color: Color(0xFF6B582F)),
          const Text(
            '?',
            style: TextStyle(
              fontFamily: 'Cinzel',
              fontSize: 28,
              fontWeight: FontWeight.w700,
              color: AppColors.accentGold,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            '尚未上傳角色圖',
            style: TextStyle(
              fontFamily: 'NotoSerifTC',
              fontSize: 10,
              color: surfaces.textSecondary,
            ),
          ),
        ],
      ),
    );
  }
}
