import 'package:flutter/material.dart';
import 'package:widgetbook/widgetbook.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import 'app/theme/app_theme.dart';
import 'widgetbook.directories.g.dart';

/// Widgetbook 元件型錄（獨立進入點，與正式 App / bundle 分離）。
///
/// 啟動：`flutter run -t lib/widgetbook.dart -d <device>`
void main() => runApp(const WidgetbookApp());

@widgetbook.App()
class WidgetbookApp extends StatelessWidget {
  const WidgetbookApp({super.key});

  @override
  Widget build(BuildContext context) {
    return Widgetbook.material(
      directories: directories,
      addons: [
        MaterialThemeAddon(
          themes: [
            WidgetbookTheme(name: 'Dark', data: AppTheme.dark),
            WidgetbookTheme(name: 'Light', data: AppTheme.light),
          ],
          initialTheme: WidgetbookTheme(name: 'Dark', data: AppTheme.dark),
        ),
        ViewportAddon([
          IosViewports.iPhone13,
          IosViewports.iPadPro11Inches,
        ]),
        TextScaleAddon(),
        AlignmentAddon(),
      ],
    );
  }
}
