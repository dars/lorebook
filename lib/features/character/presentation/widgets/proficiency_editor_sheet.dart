import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../app/theme/app_colors.dart';
import '../../../../app/theme/app_spacing.dart';
import '../../../../app/theme/surface_colors.dart';
import '../../domain/character_creation_data.dart';
import '../../domain/character_providers.dart';
import '../../domain/tool_proficiency_options.dart';
import 'editor_sheet.dart';

/// 熟練編輯：語言與工具。
///
/// 兩者共用同一個入口與 sheet——都是「會什麼」的清單，分開會逼使用者記得
/// 哪個按鈕管哪個。差別只在選項來源：語言是 App 內建常數（永遠可用），
/// 工具來自內容庫（需離線降級）。
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
  final _customLang = TextEditingController();
  final _customTool = TextEditingController();

  @override
  void dispose() {
    _customLang.dispose();
    _customTool.dispose();
    super.dispose();
  }

  void _addCustomLanguage() {
    final v = _customLang.text.trim();
    if (v.isEmpty) return;
    ref.read(currentCharacterProvider.notifier).addLanguage(v);
    _customLang.clear();
    setState(() {});
  }

  void _addCustomTool() {
    final v = _customTool.text.trim();
    if (v.isEmpty) return;
    ref.read(currentCharacterProvider.notifier).addToolProficiency(v);
    _customTool.clear();
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final surfaces = Theme.of(context).extension<SurfaceColors>()!;
    final character = ref.watch(currentCharacterProvider);
    final languages = character.languages;
    final tools = character.toolProficiencies;
    final notifier = ref.read(currentCharacterProvider.notifier);
    final toolOptions = ref.watch(toolProficiencyOptionsProvider);

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
                          controller: _customLang,
                          maxLength: kProficiencyEntryMax,
                          textInputAction: TextInputAction.done,
                          onSubmitted: (_) => _addCustomLanguage(),
                          decoration: const InputDecoration(
                            hintText: '清單沒有的語言，自行填寫',
                            counterText: '',
                          ),
                        ),
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      IconButton(
                        tooltip: '加入語言',
                        onPressed: _addCustomLanguage,
                        icon: const Icon(
                          Icons.add,
                          color: AppColors.accentGold,
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: AppSpacing.lg),

                  // ── 工具 ──
                  const EditorFieldLabel('工具'),
                  if (tools.isNotEmpty) ...[
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: [
                        for (final t in tools)
                          _SelectedChip(
                            label: t,
                            onRemove: () => setState(
                              () => notifier.removeToolProficiency(t),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.md),
                  ],
                  toolOptions.when(
                    loading: () => _hint(surfaces, '載入工具清單…'),
                    error: (_, _) => _hint(surfaces, '工具清單離線不可用，可用下方欄位自行填寫。'),
                    data: (grouped) {
                      if (grouped.isEmpty) {
                        return _hint(surfaces, '工具清單離線不可用，可用下方欄位自行填寫。');
                      }
                      // 38 項平鋪會變成難以檢索的 chip 牆（光工匠工具就 18
                      // 項），因此依 subcategory 分組，與自訂背景的選單一致。
                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          for (final entry in grouped.entries) ...[
                            Padding(
                              padding: const EdgeInsets.only(top: 6, bottom: 2),
                              child: Text(
                                entry.key,
                                style: const TextStyle(
                                  fontFamily: 'NotoSerifTC',
                                  fontSize: 11,
                                  color: AppColors.goldDim,
                                ),
                              ),
                            ),
                            Wrap(
                              spacing: 6,
                              children: [
                                for (final i in entry.value)
                                  if (!tools.contains(i.name))
                                    _AddChip(
                                      label: i.name,
                                      onTap: () => setState(
                                        () =>
                                            notifier.addToolProficiency(i.name),
                                      ),
                                    ),
                              ],
                            ),
                          ],
                        ],
                      );
                    },
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _customTool,
                          maxLength: kProficiencyEntryMax,
                          textInputAction: TextInputAction.done,
                          onSubmitted: (_) => _addCustomTool(),
                          decoration: const InputDecoration(
                            hintText: '清單沒有的工具，自行填寫',
                            counterText: '',
                          ),
                        ),
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      IconButton(
                        tooltip: '加入工具',
                        onPressed: _addCustomTool,
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

Widget _hint(SurfaceColors surfaces, String text) => Padding(
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
