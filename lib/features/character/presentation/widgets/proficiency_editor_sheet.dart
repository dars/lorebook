import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../app/theme/app_colors.dart';
import '../../../../app/theme/app_spacing.dart';
import '../../../../app/theme/surface_colors.dart';
import '../../domain/character_creation_data.dart';
import '../../domain/character_providers.dart';
import 'editor_sheet.dart';

/// 熟練編輯（語言；工具熟練待 `tool-proficiency-editing` 接入）。
///
/// 版面刻意分段，工具接進來時直接補一段即可，不需重構——兩者共用同一個
/// 入口，否則熟練區段會長出兩個並列的編輯按鈕。
void showProficiencyEditor(BuildContext context) {
  showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    builder: (_) => const _ProficiencyEditorSheet(),
  );
}

class _ProficiencyEditorSheet extends ConsumerStatefulWidget {
  const _ProficiencyEditorSheet();

  @override
  ConsumerState<_ProficiencyEditorSheet> createState() =>
      _ProficiencyEditorSheetState();
}

class _ProficiencyEditorSheetState
    extends ConsumerState<_ProficiencyEditorSheet> {
  final _custom = TextEditingController();

  @override
  void dispose() {
    _custom.dispose();
    super.dispose();
  }

  void _addCustom() {
    final v = _custom.text.trim();
    if (v.isEmpty) return;
    ref.read(currentCharacterProvider.notifier).addLanguage(v);
    _custom.clear();
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final surfaces = Theme.of(context).extension<SurfaceColors>()!;
    final languages = ref.watch(currentCharacterProvider).languages;
    final notifier = ref.read(currentCharacterProvider.notifier);

    return SafeArea(
      child: Padding(
        padding: EdgeInsets.fromLTRB(
          20,
          4,
          20,
          12 + MediaQuery.viewInsetsOf(context).bottom,
        ),
        child: SingleChildScrollView(
          // 桌面版限寬置中，比照自訂背景編輯頁。
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 560),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '熟練',
                    style: TextStyle(
                      fontFamily: 'NotoSerifTC',
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: surfaces.textPrimary,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.md),

                  // ── 語言 ──
                  const EditorFieldLabel('語言'),
                  if (languages.isNotEmpty) ...[
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: [
                        for (final l in languages)
                          _SelectedChip(
                            label: l,
                            onRemove: () =>
                                setState(() => notifier.removeLanguage(l)),
                          ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.md),
                  ],
                  Text(
                    '自清單選取',
                    style: TextStyle(
                      fontFamily: 'NotoSerifTC',
                      fontSize: 11,
                      color: surfaces.textSecondary,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Wrap(
                    spacing: 6,
                    children: [
                      for (final l in kLanguages)
                        if (!languages.contains(l))
                          _AddChip(
                            label: l,
                            onTap: () =>
                                setState(() => notifier.addLanguage(l)),
                          ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _custom,
                          maxLength: kProficiencyEntryMax,
                          textInputAction: TextInputAction.done,
                          onSubmitted: (_) => _addCustom(),
                          decoration: const InputDecoration(
                            hintText: '清單沒有的語言，自行填寫',
                            counterText: '',
                          ),
                        ),
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      IconButton(
                        tooltip: '加入',
                        onPressed: _addCustom,
                        icon: const Icon(
                          Icons.add,
                          color: AppColors.accentGold,
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: AppSpacing.lg),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: () => Navigator.pop(context),
                      style: FilledButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                      child: const Text(
                        '完成',
                        style: TextStyle(
                          fontFamily: 'NotoSerifTC',
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// 已擁有的項目：點 × 移除。
class _SelectedChip extends StatelessWidget {
  final String label;
  final VoidCallback onRemove;

  const _SelectedChip({required this.label, required this.onRemove});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.only(left: 10, right: 4, top: 4, bottom: 4),
      decoration: BoxDecoration(
        color: AppColors.accentGold.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.accentGold),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontFamily: 'NotoSerifTC',
              fontSize: 12,
              color: AppColors.accentGold,
            ),
          ),
          const SizedBox(width: 2),
          GestureDetector(
            onTap: onRemove,
            behavior: HitTestBehavior.opaque,
            child: const Padding(
              // 觸控目標：chip 本體約 26dp，四周補足。
              padding: EdgeInsets.all(11),
              child: Icon(Icons.close, size: 14, color: AppColors.accentGold),
            ),
          ),
        ],
      ),
    );
  }
}

/// 尚未擁有的候選：點擊加入。
class _AddChip extends StatelessWidget {
  final String label;
  final VoidCallback onTap;

  const _AddChip({required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final surfaces = Theme.of(context).extension<SurfaceColors>()!;
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      // 觸控高度用垂直 padding 撐（chip 本體約 26dp ＋ 上下各 11dp）。
      // 不可用 Container 的 alignment——設了 alignment 的 Container 在 Wrap
      // 的鬆散約束下會撐滿可用寬度，每個 chip 就各佔一整行。
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 11),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
          decoration: BoxDecoration(
            color: surfaces.surface2,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: surfaces.border2),
          ),
          child: Text(
            label,
            style: TextStyle(
              fontFamily: 'NotoSerifTC',
              fontSize: 12,
              color: surfaces.textSecondary,
            ),
          ),
        ),
      ),
    );
  }
}
