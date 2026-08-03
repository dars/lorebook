import 'package:flutter/material.dart';

import '../../../../app/theme/surface_colors.dart';

/// 特性說明彈窗。
///
/// 種族／職業／背景的特性一律走這裡，讓同一份清單只有一種互動；沿用決策頁
/// 狀態異常的說明彈窗慣例。說明為純文字呈現——自訂種族的特性由使用者填寫，
/// 不應進入內容庫的標記渲染路徑。
void showFeatureDetail(
  BuildContext context, {
  required String name,
  String nameEn = '',
  String source = '',
  required String description,
}) {
  if (description.isEmpty) return;
  showDialog<void>(
    context: context,
    builder: (context) {
      final surfaces = Theme.of(context).extension<SurfaceColors>()!;
      return AlertDialog(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              nameEn.isEmpty ? name : '$name　$nameEn',
              style: const TextStyle(fontFamily: 'NotoSerifTC', fontSize: 17),
            ),
            if (source.isNotEmpty) ...[
              const SizedBox(height: 2),
              Text(
                source,
                style: TextStyle(
                  fontFamily: 'NotoSerifTC',
                  fontSize: 11,
                  color: surfaces.textSecondary,
                ),
              ),
            ],
          ],
        ),
        content: ConstrainedBox(
          constraints: const BoxConstraints(maxHeight: 420),
          child: SingleChildScrollView(
            child: Text(
              description,
              style: TextStyle(
                fontFamily: 'NotoSerifTC',
                fontSize: 14,
                height: 1.6,
                color: surfaces.textLight,
              ),
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('關閉'),
          ),
        ],
      );
    },
  );
}
