import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/theme/app_colors.dart';
import '../../../app/theme/app_spacing.dart';
import '../../../app/theme/surface_colors.dart';
import '../../../shared/domain/app_exception.dart';
import '../data/custom_background_repository.dart';
import '../domain/character_creation_data.dart';
import '../domain/custom_background.dart';
import '../domain/tool_proficiency_options.dart';

/// 自訂背景編輯頁（建立與編輯共用；custom-backgrounds spec）。
///
/// 結構對齊 2024 背景機制：三個互異能力值、兩個互異技能、一個
/// 起源專長（SRD 候選）。表單即時驗證，未通過禁止儲存。
/// compact 全頁單欄；medium/expanded 內容置中限寬。
class CustomBackgroundEditPage extends ConsumerStatefulWidget {
  /// 編輯既有自訂背景時傳入；null 為建立。
  final CustomBackground? initial;

  const CustomBackgroundEditPage({super.key, this.initial});

  @override
  ConsumerState<CustomBackgroundEditPage> createState() =>
      _CustomBackgroundEditPageState();
}

class _CustomBackgroundEditPageState
    extends ConsumerState<CustomBackgroundEditPage> {
  late final TextEditingController _name;
  late final TextEditingController _description;
  late final Set<String> _abilities; // 能力代碼，恰 3
  late final Set<String> _skills; // 技能中文名，恰 2
  String? _originFeat;
  String? _tool;
  bool _originFeatCustom = false;
  late final TextEditingController _customFeatName;
  late final TextEditingController _customFeatDesc;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final b = widget.initial;
    _name = TextEditingController(text: b?.name ?? '');
    _description = TextEditingController(text: b?.description ?? '');
    _abilities = {...?b?.abilities};
    _skills = {...?b?.skills};
    _tool = (b?.toolProficiency.isEmpty ?? true) ? null : b!.toolProficiency;
    _originFeatCustom = b?.originFeatCustom ?? false;
    // SRD 模式時 _originFeat 才是清單選取值；自訂模式下名稱在自己的欄位裡。
    _originFeat = (b != null && !b.originFeatCustom) ? b.originFeat : null;
    _customFeatName = TextEditingController(
      text: (b?.originFeatCustom ?? false) ? b!.originFeat : '',
    );
    _customFeatDesc = TextEditingController(
      text: b?.originFeatDescription ?? '',
    );
  }

  @override
  void dispose() {
    _name.dispose();
    _description.dispose();
    _customFeatName.dispose();
    _customFeatDesc.dispose();
    super.dispose();
  }

  String get _trimmedName => _name.text.trim();

  String? get _nameError {
    if (_trimmedName.isEmpty) return '請輸入名稱';
    if (_trimmedName.length > 20) return '名稱至多 20 字';
    return null;
  }

  String get _customFeatTrimmed => _customFeatName.text.trim();

  bool get _originFeatValid => _originFeatCustom
      ? _customFeatTrimmed.isNotEmpty &&
            _customFeatTrimmed.length <= kCustomOriginFeatNameMax &&
            _customFeatDesc.text.length <= kCustomOriginFeatDescMax
      : _originFeat != null;

  bool get _valid =>
      _nameError == null &&
      _abilities.length == 3 &&
      _skills.length == 2 &&
      _originFeatValid;

  Future<void> _save() async {
    setState(() => _saving = true);
    final b = CustomBackground(
      id:
          widget.initial?.id ??
          DateTime.now().microsecondsSinceEpoch.toString(),
      name: _trimmedName,
      abilities: _abilities.toList(),
      skills: _skills.toList(),
      toolProficiency: _tool ?? '',
      originFeat: _originFeatCustom ? _customFeatTrimmed : _originFeat!,
      originFeatCustom: _originFeatCustom,
      // SRD 模式不留殘值（讀取端另以旗標把關，見 design D2）。
      originFeatDescription: _originFeatCustom
          ? _customFeatDesc.text.trim()
          : '',
      description: _description.text.trim(),
    );
    try {
      await ref.read(customBackgroundsProvider.notifier).save(b);
      if (mounted) context.pop();
    } on AppException catch (e) {
      if (mounted) {
        setState(() => _saving = false);
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(e.message)));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final surfaces = Theme.of(context).extension<SurfaceColors>()!;
    return Scaffold(
      backgroundColor: surfaces.surface0,
      appBar: AppBar(
        backgroundColor: surfaces.surface0,
        title: Text(
          widget.initial == null ? '自訂背景' : '編輯自訂背景',
          style: const TextStyle(
            fontFamily: 'NotoSerifTC',
            fontWeight: FontWeight.w700,
          ),
        ),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => context.pop(),
        ),
      ),
      body: SafeArea(
        top: false,
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(AppSpacing.lg),
                child: Center(
                  child: ConstrainedBox(
                    // medium/expanded：內容置中限寬；compact 自然滿版。
                    constraints: const BoxConstraints(maxWidth: 560),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const _RulesNotice(),
                        const SizedBox(height: AppSpacing.lg),
                        _label('名稱'),
                        TextField(
                          controller: _name,
                          maxLength: 20,
                          decoration: InputDecoration(
                            hintText: '例：獵人',
                            errorText: _name.text.isEmpty ? null : _nameError,
                          ),
                          onChanged: (_) => setState(() {}),
                        ),
                        const SizedBox(height: AppSpacing.lg),
                        _label('能力值加值候選（選 3）'),
                        _MultiChips(
                          options: [
                            for (final code in kAbilityCn.keys)
                              (value: code, text: kAbilityCn[code]!),
                          ],
                          selected: _abilities,
                          max: 3,
                          onChanged: () => setState(() {}),
                        ),
                        const SizedBox(height: AppSpacing.lg),
                        _label('固定技能（選 2）'),
                        _MultiChips(
                          options: [
                            for (final s in kSkills)
                              (value: s.name, text: s.name),
                          ],
                          selected: _skills,
                          max: 2,
                          onChanged: () => setState(() {}),
                        ),
                        const SizedBox(height: AppSpacing.lg),
                        _label('起源專長'),
                        _ModeToggle(
                          custom: _originFeatCustom,
                          onChanged: (v) =>
                              setState(() => _originFeatCustom = v),
                        ),
                        const SizedBox(height: AppSpacing.md),
                        if (!_originFeatCustom)
                          _MultiChips(
                            options: [
                              for (final f in kOriginFeatChoices)
                                (value: f, text: f),
                            ],
                            selected: {?_originFeat},
                            max: 1,
                            replaceOnMax: true,
                            onChanged: () => setState(() {}),
                            onSingle: (v) => _originFeat = v,
                          )
                        else ...[
                          TextField(
                            controller: _customFeatName,
                            maxLength: kCustomOriginFeatNameMax,
                            decoration: const InputDecoration(
                              hintText: '專長名稱，例：荒野嚮導',
                            ),
                            onChanged: (_) => setState(() {}),
                          ),
                          TextField(
                            controller: _customFeatDesc,
                            maxLength: kCustomOriginFeatDescMax,
                            maxLines: 3,
                            decoration: const InputDecoration(
                              hintText: '說明（選填）：這個專長做什麼',
                            ),
                            onChanged: (_) => setState(() {}),
                          ),
                          const SizedBox(height: AppSpacing.sm),
                          Text(
                            '自訂的起源專長僅為顯示文字，不會產生任何規則效果，'
                            '也不會成為可被其他背景引用的專長。角色卡上會標示為自訂。',
                            style: TextStyle(
                              fontFamily: 'NotoSerifTC',
                              fontSize: 11,
                              height: 1.55,
                              color: surfaces.textSecondary,
                            ),
                          ),
                        ],
                        const SizedBox(height: AppSpacing.lg),
                        _label('工具熟練'),
                        _ToolPicker(
                          selected: _tool,
                          onChanged: (v) => setState(() => _tool = v),
                        ),
                        const SizedBox(height: AppSpacing.lg),
                        _label('敘述（選填）'),
                        TextField(
                          controller: _description,
                          maxLines: 4,
                          decoration: const InputDecoration(
                            hintText: '這個背景的來歷與故事……',
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            const Divider(height: 1),
            Padding(
              padding: const EdgeInsets.all(AppSpacing.lg),
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 560),
                  child: SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: _valid && !_saving ? _save : null,
                      child: Text(_saving ? '儲存中…' : '儲存'),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _label(String text) => Padding(
    padding: const EdgeInsets.only(bottom: AppSpacing.sm),
    child: Text(
      text,
      style: const TextStyle(
        fontFamily: 'Inter',
        fontSize: 12,
        fontWeight: FontWeight.w700,
        color: AppColors.accentGold,
      ),
    ),
  );
}

/// 多選 chips：達 [max] 後其餘不可再選；[replaceOnMax] 時改為單選替換。
class _MultiChips extends StatelessWidget {
  final List<({String value, String text})> options;
  final Set<String> selected;
  final int max;
  final bool replaceOnMax;
  final VoidCallback onChanged;
  final ValueChanged<String>? onSingle;

  const _MultiChips({
    required this.options,
    required this.selected,
    required this.max,
    required this.onChanged,
    this.replaceOnMax = false,
    this.onSingle,
  });

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: AppSpacing.sm,
      runSpacing: AppSpacing.sm,
      children: [
        for (final o in options)
          _chip(
            context,
            o.text,
            selected: selected.contains(o.value),
            enabled:
                selected.contains(o.value) ||
                selected.length < max ||
                replaceOnMax,
            onTap: () {
              if (replaceOnMax && max == 1) {
                onSingle?.call(o.value);
              } else if (selected.contains(o.value)) {
                selected.remove(o.value);
              } else if (selected.length < max) {
                selected.add(o.value);
              }
              onChanged();
            },
          ),
      ],
    );
  }

  Widget _chip(
    BuildContext context,
    String text, {
    required bool selected,
    required bool enabled,
    required VoidCallback onTap,
  }) {
    final surfaces = Theme.of(context).extension<SurfaceColors>()!;
    return GestureDetector(
      onTap: enabled ? onTap : null,
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.lg,
          vertical: AppSpacing.sm,
        ),
        decoration: BoxDecoration(
          color: selected
              ? AppColors.accentGold.withValues(alpha: 0.18)
              : surfaces.surface1,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: selected ? AppColors.accentGold : surfaces.border2,
          ),
        ),
        child: Text(
          text,
          style: TextStyle(
            fontFamily: 'NotoSerifTC',
            fontSize: 14,
            fontWeight: selected ? FontWeight.w700 : FontWeight.w400,
            color: selected
                ? AppColors.accentGold
                : enabled
                ? surfaces.textPrimary
                : surfaces.textPrimary.withValues(alpha: 0.35),
          ),
        ),
      ),
    );
  }
}

/// 工具熟練選擇器：選項來自內容庫，依類別分組。
///
/// 工具是規則裡的既有集合，因此為選單而非自由填空。內容庫取不到時顯示
/// 離線提示並允許留空——不阻擋儲存，與自訂背景其餘欄位的離線行為一致。
class _ToolPicker extends ConsumerWidget {
  final String? selected;
  final ValueChanged<String?> onChanged;

  const _ToolPicker({required this.selected, required this.onChanged});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final surfaces = Theme.of(context).extension<SurfaceColors>()!;
    final async = ref.watch(toolProficiencyOptionsProvider);

    Widget hint(String text) => Padding(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
      child: Text(
        text,
        style: TextStyle(
          fontFamily: 'NotoSerifTC',
          fontSize: 12,
          color: surfaces.textSecondary,
        ),
      ),
    );

    return async.when(
      loading: () => hint('載入工具清單…'),
      error: (_, _) => hint('工具清單離線不可用，可留空稍後再補。'),
      data: (grouped) {
        if (grouped.isEmpty) {
          return hint('工具清單離線不可用，可留空稍後再補。');
        }
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            for (final entry in grouped.entries) ...[
              Padding(
                padding: const EdgeInsets.only(top: AppSpacing.sm, bottom: 4),
                child: Text(
                  entry.key,
                  style: const TextStyle(
                    fontFamily: 'NotoSerifTC',
                    fontSize: 11,
                    color: AppColors.goldDim,
                  ),
                ),
              ),
              _MultiChips(
                options: [
                  for (final i in entry.value) (value: i.name, text: i.name),
                ],
                selected: {?selected},
                max: 1,
                replaceOnMax: true,
                onChanged: () {},
                onSingle: onChanged,
              ),
            ],
          ],
        );
      },
    );
  }
}

/// 起源專長的來源模式：自 SRD 選取／自行填寫。
///
/// 模式是使用者的選擇，須明確記錄——名稱推導不出來（使用者可能自訂一個
/// 也叫「警覺」的專長，見 design D2）。
class _ModeToggle extends StatelessWidget {
  final bool custom;
  final ValueChanged<bool> onChanged;

  const _ModeToggle({required this.custom, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    final surfaces = Theme.of(context).extension<SurfaceColors>()!;

    Widget seg(String label, bool isCustom) {
      final on = custom == isCustom;
      return Expanded(
        child: GestureDetector(
          onTap: () => onChanged(isCustom),
          behavior: HitTestBehavior.opaque,
          child: Container(
            height: 40,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: on ? AppColors.accentGold : surfaces.surface1,
              borderRadius: BorderRadius.circular(AppSpacing.radiusCard),
              border: Border.all(
                color: on ? AppColors.accentGold : surfaces.border2,
              ),
            ),
            child: Text(
              label,
              style: TextStyle(
                fontFamily: 'NotoSerifTC',
                fontSize: 13,
                fontWeight: on ? FontWeight.w700 : FontWeight.w400,
                color: on ? const Color(0xFF1A1206) : surfaces.textSecondary,
              ),
            ),
          ),
        ),
      );
    }

    return Row(
      children: [
        seg('自 SRD 選取', false),
        const SizedBox(width: AppSpacing.sm),
        seg('自行填寫', true),
      ],
    );
  }
}

/// 自訂背景的規則依據。
///
/// 2024 版對背景給了明文的建構框架，這與自訂種族不同（種族沒有對等的官方
/// 規則，屬社群 homebrew）——講清楚依據，使用者才知道自己做的東西站得住腳。
class _RulesNotice extends StatelessWidget {
  const _RulesNotice();

  static const _lines = [
    (Icons.trending_up, '三個能力值加值候選', '建角時自這三項分配 +2/+1 或 +1/+1/+1。'),
    (Icons.school_outlined, '兩個固定技能', '選定後即為該背景的熟練，建角自動帶入。'),
    (Icons.auto_awesome, '一個起源專長', '自 SRD 起源專長中選擇，或自行填寫。'),
    (Icons.handyman_outlined, '一項工具熟練', '自內容庫的工具清單中選擇。'),
  ];

  @override
  Widget build(BuildContext context) {
    final surfaces = Theme.of(context).extension<SurfaceColors>()!;
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.accentGold.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(AppSpacing.radiusCard),
        border: Border.all(color: AppColors.goldDim),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(
                Icons.menu_book_outlined,
                size: 16,
                color: AppColors.accentGold,
              ),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  '2024 版的背景建構規則',
                  style: TextStyle(
                    fontFamily: 'NotoSerifTC',
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: surfaces.textPrimary,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          for (final (icon, title, desc) in _lines)
            Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(icon, size: 14, color: surfaces.textSecondary),
                  const SizedBox(width: 7),
                  Expanded(
                    child: Text.rich(
                      TextSpan(
                        children: [
                          TextSpan(
                            text: title,
                            style: TextStyle(
                              fontFamily: 'NotoSerifTC',
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: surfaces.textLight,
                            ),
                          ),
                          TextSpan(
                            text: '　$desc',
                            style: TextStyle(
                              fontFamily: 'NotoSerifTC',
                              fontSize: 12,
                              height: 1.5,
                              color: surfaces.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          const SizedBox(height: 2),
          Text(
            '這是 2024 版規則明文允許的建構方式，不是這個 App 自訂的限制。'
            '能力值加值來自背景而非種族，是 2024 版與舊版最大的差異之一。',
            style: TextStyle(
              fontFamily: 'NotoSerifTC',
              fontSize: 11,
              height: 1.55,
              color: surfaces.textSecondary,
            ),
          ),
        ],
      ),
    );
  }
}
