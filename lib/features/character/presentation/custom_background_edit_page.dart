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
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final b = widget.initial;
    _name = TextEditingController(text: b?.name ?? '');
    _description = TextEditingController(text: b?.description ?? '');
    _abilities = {...?b?.abilities};
    _skills = {...?b?.skills};
    _originFeat = b?.originFeat;
  }

  @override
  void dispose() {
    _name.dispose();
    _description.dispose();
    super.dispose();
  }

  String get _trimmedName => _name.text.trim();

  String? get _nameError {
    if (_trimmedName.isEmpty) return '請輸入名稱';
    if (_trimmedName.length > 20) return '名稱至多 20 字';
    return null;
  }

  bool get _valid =>
      _nameError == null &&
      _abilities.length == 3 &&
      _skills.length == 2 &&
      _originFeat != null;

  Future<void> _save() async {
    setState(() => _saving = true);
    final b = CustomBackground(
      id:
          widget.initial?.id ??
          DateTime.now().microsecondsSinceEpoch.toString(),
      name: _trimmedName,
      abilities: _abilities.toList(),
      skills: _skills.toList(),
      originFeat: _originFeat!,
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
