import 'package:flutter/material.dart';

import '../../../../app/theme/app_colors.dart';
import '../../../../app/theme/app_spacing.dart';
import '../../../../app/theme/surface_colors.dart';

/// 角色資料編輯 bottom sheet 的共用外框：標題＋欄位＋取消/儲存。
class EditorSheetScaffold extends StatelessWidget {
  final String title;
  final List<Widget> fields;
  final VoidCallback onSave;
  const EditorSheetScaffold({
    super.key,
    required this.title,
    required this.fields,
    required this.onSave,
  });

  @override
  Widget build(BuildContext context) {
    final surfaces = Theme.of(context).extension<SurfaceColors>()!;
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.fromLTRB(
          20,
          4,
          20,
          12 + MediaQuery.viewInsetsOf(context).bottom,
        ),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
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
              const SizedBox(height: AppSpacing.md),
              ...fields,
              const SizedBox(height: AppSpacing.md),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.pop(context),
                      style: OutlinedButton.styleFrom(
                        side: BorderSide(color: surfaces.border),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                      child: Text(
                        '取消',
                        style: TextStyle(
                          fontFamily: 'NotoSerifTC',
                          color: surfaces.textSecondary,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: FilledButton(
                      onPressed: onSave,
                      style: FilledButton.styleFrom(
                        backgroundColor: AppColors.accentGold,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                      child: const Text(
                        '儲存',
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
        ),
      ),
    );
  }
}

/// 編輯欄位的小標籤。
class EditorFieldLabel extends StatelessWidget {
  final String text;
  const EditorFieldLabel(this.text, {super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Text(
        text,
        style: const TextStyle(
          fontFamily: 'NotoSerifTC',
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: AppColors.goldDim,
        ),
      ),
    );
  }
}

/// 區塊標題列右端的編輯鈕（搭配 CollapsibleSection.trailing）。
class SectionEditIcon extends StatelessWidget {
  final VoidCallback onTap;
  const SectionEditIcon({super.key, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final surfaces = Theme.of(context).extension<SurfaceColors>()!;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(6),
      child: Padding(
        padding: const EdgeInsets.all(4),
        child: Icon(
          Icons.edit_outlined,
          size: 15,
          color: surfaces.textSecondary,
        ),
      ),
    );
  }
}
