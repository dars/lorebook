import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/theme/app_colors.dart';
import '../../../app/theme/app_spacing.dart';
import '../../../app/theme/decorations.dart';
import '../domain/character.dart';
import '../domain/character_creation_data.dart';
import '../domain/character_providers.dart';

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
  static const _steps = ['基本', '職業', '背景', '能力值', '技能', '確認'];

  int _step = 0;

  String _name = '';
  String _alignment = kAlignments.first;
  SpeciesOption? _species;
  ClassOption? _classOpt;
  BackgroundOption? _background;

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
  List<int> get _pool =>
      [for (final v in kStandardArray) if (!_base.values.contains(v)) v];

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
    switch (_step) {
      case 0:
        return _name.trim().isNotEmpty && _species != null;
      case 1:
        return _classOpt != null;
      case 2:
        return _background != null;
      case 3:
        final filled = _base.values.every((v) => v != null);
        switch (_method) {
          case _AbilityMethod.array:
            return filled;
          case _AbilityMethod.buy:
            return filled && _pointsRemaining >= 0;
          case _AbilityMethod.roll:
            return _base.values.every((v) => v != null && v >= 3 && v <= 18);
        }
      case 4:
        return _classSkills.length == (_classOpt?.skillCount ?? 0);
      default:
        return true;
    }
  }

  void _next() {
    if (_step < _steps.length - 1) {
      setState(() {
        _step++;
        if (_step == 3 && !_abilitiesInit) {
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
    _plus2 = _classOpt!.primaryAbilities
        .firstWhere(cands.contains, orElse: () => cands.first);
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

  void _create() {
    final cls = _classOpt!;
    final sp = _species!;
    final bg = _background!;
    const pb = 2;

    final scores = {for (final a in kAbilityOrder) a: _finalScore(a)};
    final mods = {for (final a in kAbilityOrder) a: abilityModifier(scores[a]!)};

    AbilityScore ab(String code) => AbilityScore(
          score: scores[code]!,
          modifier: mods[code]!,
          proficientSave: cls.saves.contains(code),
        );

    final profSkills = {..._classSkills, ...bg.skills};
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

    final perceptionMod =
        mods['WIS']! + (profSkills.contains('感知') ? pb : 0);
    final maxHp = (cls.hitDie + mods['CON']!).clamp(1, 999);

    final caster = cls.spellAbility.isNotEmpty;
    final spellMod = caster ? mods[cls.spellAbility]! : 0;

    final features = <CharacterFeature>[
      for (final t in sp.traits)
        CharacterFeature(name: t, source: '種族：${sp.cn}'),
      CharacterFeature(name: bg.originFeat, source: '背景：${bg.cn}'),
    ];

    final character = Character(
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
      size: sp.size,
      ac: 10 + mods['DEX']!,
      maxHp: maxHp,
      currentHp: maxHp,
      speed: sp.speed,
      initiative: mods['DEX']!,
      proficiencyBonus: pb,
      passivePerception: 10 + perceptionMod,
      spellDc: caster ? 8 + pb + spellMod : 0,
      spellAttack: caster ? pb + spellMod : 0,
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
      features: features,
      hitDieFaces: cls.hitDie,
    );

    ref.read(characterListProvider.notifier).add(character);
    ref.read(selectedCharacterIdProvider.notifier).state = character.id;
    context.go('/main/decision');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.darkSurface0,
      appBar: AppBar(
        backgroundColor: AppColors.darkSurface0,
        title: const Text('新增角色',
            style: TextStyle(
                fontFamily: 'NotoSerifTC', fontWeight: FontWeight.w700)),
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
                  AppSpacing.lg, 0, AppSpacing.lg, AppSpacing.sm),
              child: Row(
                children: [
                  Text('步驟 ${_step + 1} / ${_steps.length} · ${_steps[_step]}',
                      style: const TextStyle(
                          fontFamily: 'Inter',
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: AppColors.accentGold)),
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
    switch (_step) {
      case 0:
        return _basicStep();
      case 1:
        return _classStep();
      case 2:
        return _backgroundStep();
      case 3:
        return _abilityStep();
      case 4:
        return _skillStep();
      default:
        return _confirmStep();
    }
  }

  // ── 步驟一：基本 ──

  Widget _basicStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const _PortraitPlaceholder(),
        const SizedBox(height: AppSpacing.lg),
        const _FieldLabel('名稱'),
        const SizedBox(height: AppSpacing.xs),
        TextField(
          onChanged: (v) => setState(() => _name = v),
          style: const TextStyle(
              fontFamily: 'NotoSerifTC', color: AppColors.darkTextPrimary),
          decoration: InputDecoration(
            hintText: '輸入角色名稱',
            filled: true,
            fillColor: AppColors.darkSurface1,
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: const BorderSide(color: AppColors.darkBorder2),
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
          onSelect: (cn) =>
              setState(() => _species = kSpecies.firstWhere((s) => s.cn == cn)),
        ),
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

  Widget _backgroundStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _OptionChips(
          options: [for (final b in kBackgrounds) b.cn],
          selected: _background?.cn,
          onSelect: (cn) => setState(() {
            _background = kBackgrounds.firstWhere((b) => b.cn == cn);
            _resetAbilities();
          }),
        ),
        if (_background != null) ...[
          const SizedBox(height: AppSpacing.lg),
          _DescCard(
            title: '${_background!.cn} ${_background!.en}',
            body: _background!.description,
            chips: [
              '能力 ${_background!.abilities.map((s) => kAbilityCn[s]).join('/')}',
              '技能 ${_background!.skills.join('·')}',
              '專長 ${_background!.originFeat}',
            ],
          ),
        ],
      ],
    );
  }

  // ── 步驟四：能力值 ──

  Widget _abilityStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _HexChart(values: _realHexValues, highlights: const {}),
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
                      : AppColors.darkSurface1,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                      color: _method == e.key
                          ? AppColors.accentGold
                          : AppColors.darkBorder2),
                ),
                child: Text(e.value,
                    style: TextStyle(
                        fontFamily: 'NotoSerifTC',
                        fontSize: 13,
                        fontWeight: _method == e.key
                            ? FontWeight.w700
                            : FontWeight.w400,
                        color: _method == e.key
                            ? const Color(0xFF1A1206)
                            : AppColors.darkTextSecondary)),
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
              child: Text('剩餘可分配 ${_pool.length}／6',
                  style: const TextStyle(
                      fontFamily: 'NotoSerifTC',
                      fontSize: 12,
                      color: AppColors.darkTextSecondary)),
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
            const Text('剩餘點數',
                style: TextStyle(
                    fontFamily: 'NotoSerifTC',
                    fontSize: 12,
                    color: AppColors.darkTextSecondary)),
            const SizedBox(width: AppSpacing.sm),
            Expanded(
              child: ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: _pointsSpent / kPointBuyBudget,
                  minHeight: 8,
                  backgroundColor: AppColors.darkSurface2,
                  valueColor: const AlwaysStoppedAnimation(AppColors.accentGold),
                ),
              ),
            ),
            const SizedBox(width: AppSpacing.sm),
            Text('$_pointsRemaining / $kPointBuyBudget',
                style: const TextStyle(
                    fontFamily: 'Cinzel',
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: AppColors.accentGold)),
            const SizedBox(width: AppSpacing.sm),
            _pill('重置', () => setState(() {
                  for (final k in kAbilityOrder) {
                    _base[k] = 8;
                  }
                })),
          ],
        ),
        const SizedBox(height: AppSpacing.md),
        for (final code in kAbilityOrder)
          _abilityRowFrame(code, _buyControl(code)),
        const SizedBox(height: AppSpacing.sm),
        const Text('六項由 8 起，花點數買高（最高 15，可重複）',
            style: TextStyle(
                fontFamily: 'NotoSerifTC',
                fontSize: 11,
                color: AppColors.darkTextSecondary)),
      ];

  List<Widget> _rollBody() => [
        const Text('自行擲 4d6 去最低 ×6，將結果填入（App 不代擲）',
            style: TextStyle(
                fontFamily: 'NotoSerifTC',
                fontSize: 11,
                color: AppColors.darkTextSecondary)),
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
          child: Text(label,
              style: const TextStyle(
                  fontFamily: 'NotoSerifTC',
                  fontSize: 12,
                  color: AppColors.accentGold)),
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
            child: Text(kAbilityCn[code]!,
                style: const TextStyle(
                    fontFamily: 'NotoSerifTC',
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppColors.darkTextPrimary)),
          ),
          const Spacer(),
          if (bonus > 0)
            Padding(
              padding: const EdgeInsets.only(right: 6),
              child: Text('+$bonus',
                  style: const TextStyle(
                      fontFamily: 'Cinzel',
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: AppColors.goldDim)),
            ),
          control,
          const SizedBox(width: 6),
          const Text('→',
              style: TextStyle(
                  fontFamily: 'Inter', fontSize: 12, color: AppColors.sectionLabel)),
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
                  color: AppColors.accentGold),
            ),
          ),
        ],
      ),
    );
  }

  String _arrayLabel(String code, int v) {
    final h =
        _base.entries.where((e) => e.value == v && e.key != code).toList();
    return h.isEmpty ? '$v' : '$v · ${kAbilityCn[h.first.key]}';
  }

  Widget _arrayControl(String code) {
    return Container(
      width: 90,
      padding: const EdgeInsets.symmetric(horizontal: 10),
      decoration: BoxDecoration(
        color: AppColors.darkSurface1,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.darkBorder2),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<int>(
          value: _base[code],
          isExpanded: true,
          isDense: true,
          hint: const Text('—',
              style: TextStyle(
                  fontFamily: 'Cinzel',
                  fontSize: 16,
                  color: AppColors.darkTextSecondary)),
          dropdownColor: AppColors.darkSurface1,
          icon: const Icon(Icons.expand_more,
              size: 18, color: AppColors.darkTextSecondary),
          style: const TextStyle(
              fontFamily: 'Cinzel',
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: AppColors.darkTextPrimary),
          selectedItemBuilder: (c) => [
            for (final v in kStandardArray)
              Align(alignment: Alignment.centerLeft, child: Text('$v')),
          ],
          items: [
            for (final v in kStandardArray)
              DropdownMenuItem(
                value: v,
                child: Text(_arrayLabel(code, v),
                    style: const TextStyle(
                        fontFamily: 'NotoSerifTC',
                        fontSize: 13,
                        color: AppColors.darkTextPrimary)),
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
        color: AppColors.darkSurface1,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.darkBorder2),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<int>(
          value: _base[code],
          isExpanded: true,
          isDense: true,
          dropdownColor: AppColors.darkSurface1,
          icon: const Icon(Icons.expand_more,
              size: 18, color: AppColors.darkTextSecondary),
          style: const TextStyle(
              fontFamily: 'Cinzel',
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: AppColors.darkTextPrimary),
          selectedItemBuilder: (c) => [
            for (var v = 8; v <= 15; v++)
              Align(alignment: Alignment.centerLeft, child: Text('$v')),
          ],
          items: [
            for (var v = 8; v <= 15; v++)
              DropdownMenuItem(
                value: v,
                enabled: _buyAffordable(code, v),
                child: Text('$v（${kPointBuyCost[v]}點）',
                    style: TextStyle(
                        fontFamily: 'NotoSerifTC',
                        fontSize: 13,
                        color: _buyAffordable(code, v)
                            ? AppColors.darkTextPrimary
                            : AppColors.darkTextSecondary.withValues(alpha: 0.4))),
              ),
          ],
          onChanged: (v) =>
              v == null ? null : setState(() => _base[code] = v),
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
        style: const TextStyle(
            fontFamily: 'Cinzel',
            fontSize: 16,
            fontWeight: FontWeight.w700,
            color: AppColors.darkTextPrimary),
        decoration: InputDecoration(
          isDense: true,
          contentPadding: const EdgeInsets.symmetric(vertical: 8),
          filled: true,
          fillColor: AppColors.darkSurface1,
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: const BorderSide(color: AppColors.darkBorder2),
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

  Widget _bonusExplain() {
    final parts = [
      for (final code in kAbilityOrder)
        if (_bonusMap[code]! > 0) '${kAbilityCn[code]} +${_bonusMap[code]}',
    ];
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.darkSurface1,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.darkBorder2),
      ),
      child: Row(
        children: [
          const Icon(Icons.auto_awesome, size: 15, color: AppColors.accentGold),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Text(
              '背景加值 · ${_background!.cn}：${parts.join('、')}（已套用）',
              style: const TextStyle(
                  fontFamily: 'NotoSerifTC',
                  fontSize: 12,
                  color: AppColors.darkTextLight),
            ),
          ),
        ],
      ),
    );
  }

  // ── 步驟六：技能 ──

  Widget _skillStep() {
    final cls = _classOpt!;
    final bg = _background!;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _SectionHeader('技能熟練'),
        const SizedBox(height: AppSpacing.sm),
        _SubLabel('職業（選 ${cls.skillCount}）'),
        const SizedBox(height: AppSpacing.sm),
        for (final name in cls.skillChoices)
          _SkillRow(
            label: '$name ${skillByName(name).nameEn}',
            selected: _classSkills.contains(name),
            locked: false,
            onTap: () => setState(() {
              if (_classSkills.contains(name)) {
                _classSkills.remove(name);
              } else if (_classSkills.length < cls.skillCount) {
                _classSkills.add(name);
              }
            }),
          ),
        const SizedBox(height: AppSpacing.md),
        _SubLabel('背景 ${bg.cn}（自動）'),
        const SizedBox(height: AppSpacing.sm),
        for (final name in bg.skills)
          _SkillRow(
            label: '$name ${skillByName(name).nameEn}',
            selected: true,
            locked: true,
            onTap: null,
          ),
        const SizedBox(height: AppSpacing.lg),
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
      ],
    );
  }

  // ── 步驟七：確認 ──

  Widget _confirmStep() {
    final cls = _classOpt!;
    final sp = _species!;
    final bg = _background!;
    const pb = 2;
    final scores = {for (final a in kAbilityOrder) a: _finalScore(a)};
    final mods = {for (final a in kAbilityOrder) a: abilityModifier(scores[a]!)};
    final caster = cls.spellAbility.isNotEmpty;
    final profSkills = {..._classSkills, ...bg.skills};
    final perceptionMod = mods['WIS']! + (profSkills.contains('感知') ? pb : 0);
    final spellMod = caster ? mods[cls.spellAbility]! : 0;
    final hp = (cls.hitDie + mods['CON']!).clamp(1, 999);

    final combat = <(String, String)>[
      ('HP', '$hp'),
      ('AC', '${10 + mods['DEX']!}'),
      ('先攻', _sign(mods['DEX']!)),
      ('被動察覺', '${10 + perceptionMod}'),
      ('熟練', '+$pb'),
      if (caster) ('施法DC', '${8 + pb + spellMod}'),
      if (caster) ('施法命中', _sign(pb + spellMod)),
    ];

    final saves = [
      for (final code in kAbilityOrder)
        (
          kAbilityCn[code]!,
          mods[code]! + (cls.saves.contains(code) ? pb : 0),
          cls.saves.contains(code)
        ),
    ];
    final skills = [
      for (final s in kSkills)
        (
          s.name,
          mods[s.ability]! + (profSkills.contains(s.name) ? pb : 0),
          profSkills.contains(s.name)
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
                  Text(_name.trim().isEmpty ? '（未命名）' : _name.trim(),
                      style: const TextStyle(
                          fontFamily: 'NotoSerifTC',
                          fontSize: 22,
                          fontWeight: FontWeight.w700,
                          color: AppColors.darkTextPrimary)),
                  const SizedBox(height: 2),
                  Text('${sp.cn} · ${cls.cn} 1 · ${bg.cn} · $_alignment',
                      style: const TextStyle(
                          fontFamily: 'NotoSerifTC',
                          fontSize: 11,
                          color: AppColors.darkTextSecondary)),
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
        _HexChart(values: _realHexValues, highlights: const {}),
        const SizedBox(height: AppSpacing.lg),
        _SectionHeader('屬性值'),
        const SizedBox(height: AppSpacing.sm),
        _abilityGrid(scores, mods),
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
        child: const Icon(Icons.person, size: 26, color: Color(0xFF6B582F)),
      );

  Widget _statGrid(List<(String, String)> items) {
    final rows = <Widget>[];
    for (var i = 0; i < items.length; i += 3) {
      final cells = <Widget>[];
      for (var j = i; j < i + 3; j++) {
        cells.add(Expanded(
            child: j < items.length ? _statCard(items[j]) : const SizedBox()));
        if (j < i + 2) cells.add(const SizedBox(width: 6));
      }
      rows.add(Padding(
        padding: const EdgeInsets.only(bottom: 6),
        child: Row(children: cells),
      ));
    }
    return Column(children: rows);
  }

  Widget _statCard((String, String) d) {
    final (label, value) = d;
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 9, horizontal: 2),
      decoration: BoxDecoration(
        color: AppColors.darkSurface1,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.darkBorder2),
      ),
      child: Column(
        children: [
          Text(value,
              style: const TextStyle(
                  fontFamily: 'Cinzel',
                  fontSize: 17,
                  fontWeight: FontWeight.w700,
                  color: AppColors.accentGold)),
          const SizedBox(height: 1),
          Text(label,
              style: const TextStyle(
                  fontFamily: 'NotoSerifTC',
                  fontSize: 9,
                  color: AppColors.darkTextSecondary)),
        ],
      ),
    );
  }

  Widget _abilityGrid(Map<String, int> scores, Map<String, int> mods) {
    Widget card(String code) => Expanded(
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 2),
            decoration: BoxDecoration(
              color: AppColors.darkSurface1,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppColors.darkBorder2),
            ),
            child: Column(
              children: [
                Text(kAbilityCn[code]!,
                    style: const TextStyle(
                        fontFamily: 'NotoSerifTC',
                        fontSize: 11,
                        color: AppColors.darkTextSecondary)),
                Text('${scores[code]}',
                    style: const TextStyle(
                        fontFamily: 'Cinzel',
                        fontSize: 21,
                        fontWeight: FontWeight.w700,
                        color: AppColors.accentGold)),
                Text(_sign(mods[code]!),
                    style: const TextStyle(
                        fontFamily: 'Cinzel',
                        fontSize: 12,
                        color: AppColors.darkTextPrimary)),
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
      rows.add(Padding(
        padding: const EdgeInsets.only(bottom: AppSpacing.sm),
        child: Row(
          children: [
            Expanded(child: _checkCell(items[i])),
            const SizedBox(width: AppSpacing.sm),
            Expanded(
                child: i + 1 < items.length
                    ? _checkCell(items[i + 1])
                    : const SizedBox()),
          ],
        ),
      ));
    }
    return Column(children: rows);
  }

  Widget _checkCell((String, int, bool) d) {
    final (name, mod, prof) = d;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: AppColors.darkSurface1,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(
            color: prof ? AppColors.accentGold : AppColors.darkBorder2),
      ),
      child: Row(
        children: [
          Icon(prof ? Icons.check_circle : Icons.circle_outlined,
              size: 11,
              color: prof ? AppColors.accentGold : AppColors.darkTextSecondary),
          const SizedBox(width: 6),
          Expanded(
            child: Text(name,
                style: TextStyle(
                    fontFamily: 'NotoSerifTC',
                    fontSize: 13,
                    fontWeight: prof ? FontWeight.w600 : FontWeight.w400,
                    color: AppColors.darkTextPrimary)),
          ),
          Text(mod >= 0 ? '+$mod' : '$mod',
              style: TextStyle(
                  fontFamily: 'Cinzel',
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color:
                      prof ? AppColors.accentGold : AppColors.darkTextSecondary)),
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
                      horizontal: AppSpacing.xl, vertical: AppSpacing.md),
                  side: const BorderSide(color: AppColors.darkBorder),
                ),
                child: const Text('上一步',
                    style: TextStyle(
                        fontFamily: 'NotoSerifTC',
                        color: AppColors.darkTextSecondary)),
              ),
              const SizedBox(width: AppSpacing.md),
            ],
            Expanded(
              child: FilledButton(
                onPressed: _canNext ? _next : null,
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.accentGold,
                  disabledBackgroundColor: AppColors.darkBorder2,
                  padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
                ),
                child: Text(isLast ? '建立角色' : '下一步',
                    style: const TextStyle(
                        fontFamily: 'NotoSerifTC',
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF1A1206))),
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
  Widget build(BuildContext context) => Text(text,
      style: const TextStyle(
          fontFamily: 'Inter',
          fontSize: 9,
          letterSpacing: 1,
          color: AppColors.sectionLabel));
}

class _SectionHeader extends StatelessWidget {
  final String text;
  const _SectionHeader(this.text);
  @override
  Widget build(BuildContext context) => Text(text,
      style: const TextStyle(
          fontFamily: 'NotoSerifTC',
          fontSize: 14,
          fontWeight: FontWeight.w700,
          color: AppColors.darkTextPrimary));
}

class _SubLabel extends StatelessWidget {
  final String text;
  const _SubLabel(this.text);
  @override
  Widget build(BuildContext context) => Text(text,
      style: const TextStyle(
          fontFamily: 'NotoSerifTC',
          fontSize: 12,
          color: AppColors.darkTextSecondary));
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
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.darkSurface1,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.darkBorder2),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<T>(
          value: value,
          isExpanded: true,
          dropdownColor: AppColors.darkSurface1,
          icon: const Icon(Icons.expand_more, color: AppColors.darkTextSecondary),
          style: const TextStyle(
              fontFamily: 'NotoSerifTC',
              fontSize: 14,
              color: AppColors.darkTextPrimary),
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
    return Wrap(
      spacing: AppSpacing.sm,
      runSpacing: AppSpacing.sm,
      children: [
        for (final o in options)
          GestureDetector(
            onTap: () => onSelect(o),
            child: Container(
              padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.lg, vertical: AppSpacing.sm),
              decoration: BoxDecoration(
                color: selected == o
                    ? AppColors.accentGold.withValues(alpha: 0.18)
                    : AppColors.darkSurface1,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                    color: selected == o
                        ? AppColors.accentGold
                        : AppColors.darkBorder2),
              ),
              child: Text(o,
                  style: TextStyle(
                      fontFamily: 'NotoSerifTC',
                      fontSize: 14,
                      fontWeight:
                          selected == o ? FontWeight.w700 : FontWeight.w400,
                      color: selected == o
                          ? AppColors.accentGold
                          : AppColors.darkTextPrimary)),
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
  const _DescCard(
      {required this.title, required this.body, required this.chips});
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: AppColors.darkSurface1,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.darkBorder2),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title,
              style: const TextStyle(
                  fontFamily: 'NotoSerifTC',
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: AppColors.darkTextPrimary)),
          const SizedBox(height: AppSpacing.sm),
          Text(body,
              style: const TextStyle(
                  fontFamily: 'NotoSerifTC',
                  fontSize: 12,
                  height: 1.5,
                  color: AppColors.darkTextSecondary)),
          const SizedBox(height: AppSpacing.md),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              for (final c in chips)
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.sm, vertical: AppSpacing.xs),
                  decoration: BoxDecoration(
                    color: AppColors.darkSurface2,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(c,
                      style: const TextStyle(
                          fontFamily: 'Inter',
                          fontSize: 10,
                          color: AppColors.accentGold)),
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
  final VoidCallback? onTap;
  const _SkillRow({
    required this.label,
    required this.selected,
    required this.locked,
    required this.onTap,
  });
  @override
  Widget build(BuildContext context) {
    final on = selected || locked;
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.md, vertical: 9),
          decoration: BoxDecoration(
            color: AppColors.darkSurface1,
            borderRadius: BorderRadius.circular(8),
            border:
                Border.all(color: on ? AppColors.accentGold : AppColors.darkBorder2),
          ),
          child: Row(
            children: [
              Icon(on ? Icons.check_circle : Icons.circle_outlined,
                  size: 16,
                  color: on ? AppColors.accentGold : AppColors.darkTextSecondary),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: Text(label,
                    style: TextStyle(
                        fontFamily: 'NotoSerifTC',
                        fontSize: 13,
                        fontWeight: on ? FontWeight.w600 : FontWeight.w400,
                        color: AppColors.darkTextPrimary)),
              ),
              if (locked)
                const Icon(Icons.lock,
                    size: 12, color: AppColors.darkTextSecondary),
            ],
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
      padding:
          const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: 8),
      decoration: BoxDecoration(
        color: AppColors.accentGold.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.accentGold),
      ),
      child: Row(
        children: [
          const Icon(Icons.check_circle, size: 14, color: AppColors.accentGold),
          const SizedBox(width: AppSpacing.sm),
          Text('$label 豁免',
              style: const TextStyle(
                  fontFamily: 'NotoSerifTC',
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: AppColors.accentGold)),
        ],
      ),
    );
  }
}

/// 角色圖佔位：漩渦深淵漸層 + 剪影人像 + 問號。
class _PortraitPlaceholder extends StatelessWidget {
  const _PortraitPlaceholder();
  @override
  Widget build(BuildContext context) {
    return Container(
      height: 180,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.darkBorder2),
        gradient: const RadialGradient(
          radius: 0.9,
          colors: [Color(0xFF33291A), Color(0xFF0C0A06)],
        ),
      ),
      child: const Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.person, size: 60, color: Color(0xFF6B582F)),
          Text('?',
              style: TextStyle(
                  fontFamily: 'Cinzel',
                  fontSize: 28,
                  fontWeight: FontWeight.w700,
                  color: AppColors.accentGold)),
          SizedBox(height: 4),
          Text('尚未上傳角色圖',
              style: TextStyle(
                  fontFamily: 'NotoSerifTC',
                  fontSize: 10,
                  color: AppColors.darkTextSecondary)),
        ],
      ),
    );
  }
}

/// 六角能力雷達圖。values 為 6 軸正規化值（0~1，依 kAbilityOrder），
/// highlights 為要以金色強調的軸索引。
class _HexChart extends StatelessWidget {
  final List<double> values;
  final Set<int> highlights;
  const _HexChart({required this.values, required this.highlights});
  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 220,
        height: 200,
        child: CustomPaint(
          painter: _HexChartPainter(values: values, highlights: highlights),
        ),
      ),
    );
  }
}

class _HexChartPainter extends CustomPainter {
  final List<double> values;
  final Set<int> highlights;
  _HexChartPainter({required this.values, required this.highlights});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = math.min(size.width, size.height) / 2 - 26;

    Offset vertex(int i, double r) {
      final angle = -math.pi / 2 + i * math.pi / 3;
      return center + Offset(math.cos(angle) * r, math.sin(angle) * r);
    }

    final grid = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1
      ..color = AppColors.darkBorder2;
    for (final ring in [0.4, 0.7, 1.0]) {
      final path = Path();
      for (var i = 0; i < 6; i++) {
        final p = vertex(i, radius * ring);
        i == 0 ? path.moveTo(p.dx, p.dy) : path.lineTo(p.dx, p.dy);
      }
      path.close();
      canvas.drawPath(path, grid);
    }
    for (var i = 0; i < 6; i++) {
      canvas.drawLine(center, vertex(i, radius), grid);
    }

    final dataPath = Path();
    for (var i = 0; i < 6; i++) {
      final p = vertex(i, radius * values[i].clamp(0.0, 1.0));
      i == 0 ? dataPath.moveTo(p.dx, p.dy) : dataPath.lineTo(p.dx, p.dy);
    }
    dataPath.close();
    canvas.drawPath(
        dataPath,
        Paint()
          ..style = PaintingStyle.fill
          ..color = AppColors.accentGold.withValues(alpha: 0.30));
    canvas.drawPath(
        dataPath,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 1.5
          ..color = AppColors.accentGold);

    for (var i = 0; i < 6; i++) {
      final on = highlights.contains(i);
      final tp = TextPainter(
        text: TextSpan(
          text: kAbilityCn[kAbilityOrder[i]],
          style: TextStyle(
            fontFamily: 'NotoSerifTC',
            fontSize: 12,
            fontWeight: on ? FontWeight.w700 : FontWeight.w400,
            color: on ? AppColors.accentGold : AppColors.darkTextSecondary,
          ),
        ),
        textDirection: TextDirection.ltr,
      )..layout();
      final p = vertex(i, radius + 16);
      tp.paint(canvas, p - Offset(tp.width / 2, tp.height / 2));
    }
  }

  @override
  bool shouldRepaint(_HexChartPainter old) =>
      old.values != values || old.highlights != highlights;
}
