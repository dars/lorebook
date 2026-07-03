/// 5etools 內容渲染器（Widget 層）。
///
/// 純解析（[ftTokenize] 等）在 `../domain/fivetools_text.dart`，
/// 本檔負責把 tokens / 區塊渲染成 UI：
/// - [FtText]：單段含標記文字 → styled spans；
/// - [FtEntriesView]：entries 區塊清單（string / list / table / 具名巢狀）。
///
/// 未知標記一律降級為純文字顯示，確保不會炸畫面。
library;

import 'package:flutter/material.dart';

import '../domain/fivetools_text.dart';

export '../domain/fivetools_text.dart';

/// 渲染單段含標記的文字。
class FtText extends StatelessWidget {
  final String text;
  final TextStyle? style;

  const FtText(this.text, {super.key, this.style});

  @override
  Widget build(BuildContext context) {
    final base = style ?? DefaultTextStyle.of(context).style;
    return Text.rich(
      TextSpan(children: _spans(context, text, base)),
      style: base,
    );
  }

  static List<InlineSpan> _spans(
    BuildContext context,
    String input,
    TextStyle base,
  ) {
    final accent = Theme.of(context).colorScheme.primary;
    final spans = <InlineSpan>[];
    for (final t in ftTokenize(input)) {
      if (!t.isTag) {
        spans.add(TextSpan(text: t.display));
        continue;
      }
      if (ftBoldTags.contains(t.tag)) {
        spans.add(
          TextSpan(
            children: _spans(
              context,
              t.display,
              base.copyWith(fontWeight: FontWeight.w700),
            ),
            style: const TextStyle(fontWeight: FontWeight.w700),
          ),
        );
      } else if (ftItalicTags.contains(t.tag)) {
        spans.add(
          TextSpan(
            children: _spans(
              context,
              t.display,
              base.copyWith(fontStyle: FontStyle.italic),
            ),
            style: const TextStyle(fontStyle: FontStyle.italic),
          ),
        );
      } else if (ftDiceTags.contains(t.tag)) {
        spans.add(
          TextSpan(
            text: t.display,
            style: TextStyle(
              fontFamily: 'Inter',
              fontWeight: FontWeight.w600,
              color: accent,
            ),
          ),
        );
      } else if (ftRefTags.contains(t.tag)) {
        spans.add(
          TextSpan(
            text: t.display,
            style: TextStyle(fontWeight: FontWeight.w600, color: accent),
          ),
        );
      } else {
        // 未知標記：遞迴渲染內容（內容可能還有標記）。
        spans.addAll(_spans(context, t.display, base));
      }
    }
    return spans;
  }
}

/// 渲染 5etools `entries` 區塊清單（string / list / table /
/// entries / inset…）。未知區塊型別：有 `entries`/`items` 就遞迴，
/// 否則忽略。
class FtEntriesView extends StatelessWidget {
  final List<dynamic> entries;
  final TextStyle? style;

  const FtEntriesView(this.entries, {super.key, this.style});

  @override
  Widget build(BuildContext context) {
    final children = <Widget>[];
    for (final e in entries) {
      final w = _block(context, e);
      if (w != null) children.add(w);
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (var i = 0; i < children.length; i++) ...[
          if (i > 0) const SizedBox(height: 8),
          children[i],
        ],
      ],
    );
  }

  Widget? _block(BuildContext context, Object? e) {
    if (e is String) return FtText(e, style: style);
    if (e is! Map) return null;
    final map = e.cast<String, dynamic>();
    switch (map['type']) {
      case 'list':
        return _bulletList(context, map['items'] as List? ?? const []);
      case 'table':
        return _table(context, map);
      default:
        // entries / section / inset 等：有標題就先渲染標題，內容遞迴。
        final name = map['name'] as String?;
        final inner = (map['entries'] ?? map['items']) as List?;
        if (inner == null) return null;
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (name != null && name.isNotEmpty) ...[
              FtText('{@b $name}', style: style),
              const SizedBox(height: 4),
            ],
            FtEntriesView(inner, style: style),
          ],
        );
    }
  }

  Widget _bulletList(BuildContext context, List<dynamic> items) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (var i = 0; i < items.length; i++)
          Padding(
            padding: EdgeInsets.only(top: i > 0 ? 6.0 : 0),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('•  ', style: style),
                Expanded(child: _block(context, items[i]) ?? const SizedBox()),
              ],
            ),
          ),
      ],
    );
  }

  Widget _table(BuildContext context, Map<String, dynamic> map) {
    final outline = Theme.of(context).colorScheme.outline;
    final colLabels = (map['colLabels'] as List?)?.cast<String>() ?? const [];
    final rows = (map['rows'] as List?) ?? const [];
    return Table(
      border: TableBorder.all(color: outline, width: 0.5),
      defaultVerticalAlignment: TableCellVerticalAlignment.middle,
      columnWidths: const {0: IntrinsicColumnWidth()},
      children: [
        if (colLabels.isNotEmpty)
          TableRow(
            children: [
              for (final label in colLabels)
                Padding(
                  padding: const EdgeInsets.all(6),
                  child: FtText('{@b $label}', style: style),
                ),
            ],
          ),
        for (final row in rows)
          TableRow(
            children: [
              for (final cell in (row as List))
                Padding(
                  padding: const EdgeInsets.all(6),
                  child: _block(context, cell) ?? const SizedBox(),
                ),
            ],
          ),
      ],
    );
  }
}
