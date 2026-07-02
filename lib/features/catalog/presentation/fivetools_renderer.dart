/// 5etools 內容渲染器。
///
/// 資料庫 `data.entries` 的文字含 5etools 標記語法（`{@dice 1d8}`、
/// `{@condition 無力}`、`{@spell 雷鳴波|phb}`…），區塊層則有
/// string / list / table / entries 等型別。本檔分兩層：
/// - 純解析（[ftTokenize]）：把一段文字切成 text/tag tokens，可獨立測試；
/// - Widget（[FtText]、[FtEntriesView]）：把 tokens / 區塊渲染成 UI。
///
/// 未知標記一律降級為純文字顯示（只取顯示名），確保不會炸畫面。
library;

import 'package:flutter/material.dart';

// ─────────────────────────────────────────── 純解析層

/// 一段行內文字的最小單位：純文字，或一個 `{@tag ...}` 標記。
class FtToken {
  /// 標記名（如 'dice'、'spell'）；純文字時為 null。
  final String? tag;

  /// 標記內容以 `|` 切開的參數（純文字時只有一個元素 = 原文）。
  final List<String> parts;

  const FtToken.text(String text) : tag = null, parts = const [], _text = text;

  FtToken.tag(this.tag, String content)
    : parts = content.split('|'),
      _text = content;

  final String _text;

  bool get isTag => tag != null;

  /// 解析後要顯示的文字。
  ///
  /// 5etools 慣例：參照類 `{@spell 名稱|書源|顯示名}` 顯示名在第 3 參數；
  /// 骰子類 `{@dice 1d8|顯示名}` 在第 2 參數；`{@dc 15}` → 'DC 15'、
  /// `{@hit 5}` → '+5'。
  String get display {
    if (!isTag) return _text;
    switch (tag) {
      case 'dc':
        return 'DC ${parts[0]}';
      case 'hit':
        final v = parts[0];
        return v.startsWith('+') || v.startsWith('-') ? v : '+$v';
      default:
        if (_diceTags.contains(tag)) {
          return parts.length >= 2 && parts[1].isNotEmpty ? parts[1] : parts[0];
        }
        if (_refTags.contains(tag)) {
          return parts.length >= 3 && parts[2].isNotEmpty ? parts[2] : parts[0];
        }
        // 樣式類與未知標記：顯示完整內容（可能含巢狀標記，由渲染層遞迴）。
        return _text;
    }
  }
}

/// 骰子 / 數值類標記（強調樣式，等寬數字字體）。
const _diceTags = {
  'dice',
  'damage',
  'scaledice',
  'scaledamage',
  'd20',
  'hit',
  'dc',
  'chance',
};

/// 規則參照類標記（強調色；未來可掛點擊導覽）。
const _refTags = {
  'spell',
  'item',
  'creature',
  'condition',
  'action',
  'skill',
  'sense',
  'feat',
  'background',
  'race',
  'class',
  'classFeature',
  'subclassFeature',
  'optionalfeature',
  'variantrule',
  'deity',
  'status',
  'disease',
  'reward',
  'object',
  'table',
  'hazard',
  'vehicle',
  'language',
  'charoption',
  'trap',
  'quickref',
  'filter',
  'book',
  'adventure',
};

const _boldTags = {'b', 'bold'};
const _italicTags = {'i', 'italic'};

/// 把含 5etools 標記的文字切成 tokens。支援巢狀大括號
/// （`{@b 內含 {@dice 1d6}}`）；不成對的大括號降級為純文字。
List<FtToken> ftTokenize(String input) {
  final tokens = <FtToken>[];
  var textStart = 0;
  var i = 0;
  while (i < input.length) {
    if (!input.startsWith('{@', i)) {
      i++;
      continue;
    }
    // 找到與 `{` 配對的 `}`（含巢狀）。
    var depth = 0;
    var j = i;
    while (j < input.length) {
      final ch = input[j];
      if (ch == '{') depth++;
      if (ch == '}') {
        depth--;
        if (depth == 0) break;
      }
      j++;
    }
    if (j >= input.length) break; // 不成對：其餘原樣輸出
    if (i > textStart) tokens.add(FtToken.text(input.substring(textStart, i)));
    final inner = input.substring(i + 2, j); // 去掉 '{@' 與 '}'
    final sp = inner.indexOf(' ');
    if (sp < 0) {
      tokens.add(FtToken.tag(inner, ''));
    } else {
      tokens.add(FtToken.tag(inner.substring(0, sp), inner.substring(sp + 1)));
    }
    i = j + 1;
    textStart = i;
  }
  if (textStart < input.length) {
    tokens.add(FtToken.text(input.substring(textStart)));
  }
  return tokens;
}

// ─────────────────────────────────────────── Widget 層

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
      if (_boldTags.contains(t.tag)) {
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
      } else if (_italicTags.contains(t.tag)) {
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
      } else if (_diceTags.contains(t.tag)) {
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
      } else if (_refTags.contains(t.tag)) {
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
