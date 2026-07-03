/// 5etools 文字的純解析層（無 Flutter 依賴）。
///
/// - [ftTokenize]：把含 `{@tag ...}` 標記的文字切成 tokens；
/// - [ftFlattenEntries]：把 entries 區塊壓成純文字（反正規化存入角色卡用）；
/// - [ftFormatCastingTime] / [ftFormatRange]：v_spells 原始結構 → 顯示字串。
///
/// Widget 渲染層見 `../presentation/fivetools_renderer.dart`。
library;

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
        if (ftDiceTags.contains(tag)) {
          return parts.length >= 2 && parts[1].isNotEmpty ? parts[1] : parts[0];
        }
        if (ftRefTags.contains(tag)) {
          return parts.length >= 3 && parts[2].isNotEmpty ? parts[2] : parts[0];
        }
        // 樣式類與未知標記：顯示完整內容（可能含巢狀標記，由呼叫端遞迴）。
        return _text;
    }
  }
}

/// 骰子 / 數值類標記（渲染層施以強調樣式）。
const ftDiceTags = {
  'dice',
  'damage',
  'scaledice',
  'scaledamage',
  'd20',
  'hit',
  'dc',
  'chance',
};

/// 規則參照類標記（渲染層施以強調色；未來可掛點擊導覽）。
const ftRefTags = {
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

const ftBoldTags = {'b', 'bold'};
const ftItalicTags = {'i', 'italic'};

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

/// 把一段含標記的文字壓成純文字（標記取顯示名，遞迴展開巢狀）。
String ftPlainText(String input) {
  final sb = StringBuffer();
  for (final t in ftTokenize(input)) {
    if (t.isTag &&
        (ftBoldTags.contains(t.tag) ||
            ftItalicTags.contains(t.tag) ||
            (!ftDiceTags.contains(t.tag) && !ftRefTags.contains(t.tag)))) {
      // 樣式類/未知標記的內容可能還有巢狀標記。
      sb.write(ftPlainText(t.display));
    } else {
      sb.write(t.display);
    }
  }
  return sb.toString();
}

/// 把 5etools entries 區塊壓成純文字：
/// - 字串 → 段落；list 項目 → 「• 」開頭一行；
/// - 具名巢狀區塊 → 「【名稱】」+ 內容；table 捨棄。
/// 段落以換行連接。
String ftFlattenEntries(List<dynamic> entries) {
  final parts = <String>[];
  void walk(Object? e) {
    if (e is String) {
      parts.add(ftPlainText(e));
      return;
    }
    if (e is! Map) return;
    final map = e.cast<String, dynamic>();
    switch (map['type']) {
      case 'table':
        return; // 純文字無法表達，捨棄
      case 'list':
        for (final item in (map['items'] as List? ?? const [])) {
          if (item is String) {
            parts.add('• ${ftPlainText(item)}');
          } else {
            walk(item);
          }
        }
      default:
        final name = map['name'] as String?;
        if (name != null && name.isNotEmpty) parts.add('【$name】');
        for (final inner
            in ((map['entries'] ?? map['items']) as List? ?? const [])) {
          walk(inner);
        }
    }
  }

  for (final e in entries) {
    walk(e);
  }
  return parts.join('\n');
}

const _ftTimeUnits = {
  'action': '動作',
  'bonus': '附贈動作',
  'reaction': '反應',
  'minute': '分鐘',
  'hour': '小時',
};

/// v_spells `casting_time`（如 `[{unit:'action',number:1}]`）→ '1 動作'。
String ftFormatCastingTime(List<dynamic> castingTime) {
  if (castingTime.isEmpty) return '';
  final t = (castingTime.first as Map).cast<String, dynamic>();
  final unit = _ftTimeUnits[t['unit']] ?? '${t['unit'] ?? ''}';
  return '${t['number'] ?? 1} $unit'.trim();
}

const _ftShapes = {
  'cone': '錐形',
  'line': '直線',
  'radius': '半徑',
  'sphere': '球形',
  'cube': '立方',
  'hemisphere': '半球',
};

/// v_spells `range` 結構 → 顯示字串（'120呎'、'觸及'、'自身 (15呎錐形)'…）。
String ftFormatRange(Map<String, dynamic> range) {
  if (range.isEmpty) return '';
  final dist = (range['distance'] as Map?)?.cast<String, dynamic>();
  String d() {
    switch (dist?['type']) {
      case 'feet':
        return '${dist!['amount']}呎';
      case 'miles':
        return '${dist!['amount']}哩';
      case 'touch':
        return '觸及';
      case 'self':
        return '自身';
      case 'sight':
        return '視線';
      case 'unlimited':
        return '無限';
      default:
        return '';
    }
  }

  final type = range['type'] as String?;
  if (type == 'point') return d();
  if (type == 'special') return '特殊';
  final shape = _ftShapes[type];
  if (shape != null) return '自身 (${d()}$shape)';
  return d();
}
