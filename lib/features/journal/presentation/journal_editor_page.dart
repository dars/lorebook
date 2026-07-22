import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/theme/app_colors.dart';
import '../../../app/theme/surface_colors.dart';
import '../../character/domain/character.dart';
import '../../character/domain/character_providers.dart';
import '../../../shared/analytics/analytics.dart';

/// 日誌「新增/編輯」格式化日期。
String fmtJournalDate(DateTime d) =>
    '${d.year}/${d.month.toString().padLeft(2, '0')}/${d.day.toString().padLeft(2, '0')}';

/// 清單卡片用的相對日期：一週內以「今天/昨天/N 天前」呈現（跑團日誌的
/// 心智模型是「上次團多久以前」），更早才退回完整日期。
String fmtJournalRelativeDate(DateTime d, {DateTime? now}) {
  final n = now ?? DateTime.now();
  final days = DateTime(
    n.year,
    n.month,
    n.day,
  ).difference(DateTime(d.year, d.month, d.day)).inDays;
  if (days <= 0) return '今天';
  if (days == 1) return '昨天';
  if (days < 7) return '$days 天前';
  return fmtJournalDate(d);
}

/// 以大型 modal（非整頁）開啟日誌編輯：蓋在目前畫面上，像一張攤開的紙。
void showJournalEditor(BuildContext context, {JournalEntry? entry}) {
  showModalBottomSheet<void>(
    context: context,
    useRootNavigator: true, // 覆蓋角色頁首與底欄，跟原本整頁行為一致。
    isScrollControlled: true,
    // 下滑關閉不走 PopScope 攔截（Flutter 已知行為），為了保證「有改動必先
    // 確認」一律關閉拖曳；點背景關閉仍可用且會被 PopScope 攔下確認。
    enableDrag: false,
    backgroundColor: Colors.transparent,
    barrierColor: Colors.black54,
    builder: (context) => _JournalEditorSheet(entry: entry),
  );
}

/// 筆記式日誌編輯 modal：第一行標題、下方自由內文；頂端日期；右上角儲存/刪除。
/// 頂部留白露出背後畫面，強調「蓋在畫面上的一張紙」而非整頁切換。
class _JournalEditorSheet extends ConsumerStatefulWidget {
  final JournalEntry? entry;
  const _JournalEditorSheet({this.entry});

  @override
  ConsumerState<_JournalEditorSheet> createState() =>
      _JournalEditorSheetState();
}

class _JournalEditorSheetState extends ConsumerState<_JournalEditorSheet> {
  late final String _initial = _initialText();
  late final _TitleFirstLineController _content = _TitleFirstLineController(
    text: _initial,
  );

  String _initialText() {
    final e = widget.entry;
    if (e == null) return '';
    return e.body.isEmpty ? e.title : '${e.title}\n${e.body}';
  }

  /// 攔截關閉（點背景／系統返回）：有未儲存變更時先確認，避免誤觸丟失內容。
  void _onPopAttempt(bool didPop, Object? result) {
    if (didPop) return;
    if (_content.text == _initial) {
      Navigator.pop(context);
      return;
    }
    _confirmDiscard();
  }

  Future<void> _confirmDiscard() async {
    final action = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('尚未儲存'),
        content: const Text('編輯的內容尚未儲存，關閉後將會遺失。'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, 'discard'),
            style: TextButton.styleFrom(foregroundColor: AppColors.danger),
            child: const Text('捨棄'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, 'keep'),
            child: const Text('繼續編輯'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, 'save'),
            child: const Text('儲存'),
          ),
        ],
      ),
    );
    if (!mounted) return;
    switch (action) {
      case 'save':
        _save();
      case 'discard':
        Navigator.pop(context);
    }
  }

  @override
  void dispose() {
    _content.dispose();
    super.dispose();
  }

  void _save() {
    // 第一行為標題，其餘為內文（Apple Notes 式）。
    final lines = _content.text.split('\n');
    final title = lines.isNotEmpty ? lines.first.trim() : '';
    final body = lines.length > 1 ? lines.sublist(1).join('\n').trim() : '';
    if (title.isEmpty && body.isEmpty) {
      Navigator.pop(context);
      return;
    }
    final displayTitle = title.isEmpty ? '未命名' : title;
    final notifier = ref.read(currentCharacterProvider.notifier);
    if (widget.entry == null) {
      notifier.addJournalEntry(displayTitle, body);
      trackEvent('journal_created');
    } else {
      notifier.updateJournalEntry(widget.entry!.id, displayTitle, body);
    }
    Navigator.pop(context);
  }

  Future<void> _delete() async {
    final entry = widget.entry;
    if (entry == null) return;
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('刪除日誌？'),
        content: Text('「${entry.title}」將被刪除，無法復原。'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('取消'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: AppColors.danger),
            child: const Text('刪除'),
          ),
        ],
      ),
    );
    if (ok == true) {
      ref.read(currentCharacterProvider.notifier).removeJournalEntry(entry.id);
      if (mounted) Navigator.pop(context);
    }
  }

  String _dateLine() {
    final e = widget.entry;
    if (e == null) return '新增 ${fmtJournalDate(DateTime.now())}';
    final created = '新增 ${fmtJournalDate(e.createdAt)}';
    if (e.updatedAt != e.createdAt) {
      return '$created · 編輯 ${fmtJournalDate(e.updatedAt)}';
    }
    return created;
  }

  @override
  Widget build(BuildContext context) {
    final surfaces = Theme.of(context).extension<SurfaceColors>()!;
    final mq = MediaQuery.of(context);
    // 頂端留一截安全區高度的間距，讓背後畫面露出來，才有「紙蓋在畫面上」
    // 而非整頁切換的觀感；modal 本身仍可佔滿其餘大部分高度。
    final topGap = mq.padding.top + 32;

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: _onPopAttempt,
      child: Padding(
        padding: EdgeInsets.only(top: topGap),
        child: Container(
          height: mq.size.height - topGap,
          decoration: BoxDecoration(
            color: surfaces.surface1,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
            boxShadow: const [
              BoxShadow(
                color: Color(0x40000000),
                blurRadius: 24,
                offset: Offset(0, -4),
              ),
            ],
          ),
          child: SafeArea(
            top: false,
            child: Padding(
              padding: EdgeInsets.fromLTRB(
                20,
                10,
                20,
                12 + mq.viewInsets.bottom,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 6),
                  // 標題列：呼應 SectionTitle 的「金色圖示＋線」語彙，而非預設
                  // Material 樣式。
                  Row(
                    children: [
                      Icon(
                        Icons.auto_stories_outlined,
                        size: 14,
                        color: surfaces.accent,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Container(
                          height: 1,
                          color: surfaces.accent.withValues(alpha: 0.35),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Text(
                        _dateLine(),
                        style: TextStyle(
                          fontFamily: 'Inter',
                          fontSize: 11,
                          letterSpacing: 0.5,
                          color: surfaces.textSecondary,
                        ),
                      ),
                      if (widget.entry != null)
                        IconButton(
                          icon: const Icon(Icons.delete_outline),
                          color: AppColors.danger,
                          tooltip: '刪除',
                          onPressed: _delete,
                        ),
                      IconButton(
                        icon: const Icon(Icons.check),
                        color: surfaces.accent,
                        tooltip: '儲存',
                        onPressed: _save,
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Expanded(
                    child: Stack(
                      children: [
                        // 淡淡橫格紙紋理，呼應「紙蓋在畫面上」的手寫感；
                        // topOffset 對齊 TextField 的 contentPadding，讓格線
                        // 落在每行文字的基線下。
                        Positioned.fill(
                          child: CustomPaint(
                            painter: _RuledPaperPainter(
                              lineColor: surfaces.border2,
                              topOffset: _kEditorContentPadding.top,
                            ),
                          ),
                        ),
                        TextField(
                          controller: _content,
                          maxLines: null,
                          expands: true,
                          autofocus: widget.entry == null,
                          textAlignVertical: TextAlignVertical.top,
                          keyboardType: TextInputType.multiline,
                          style: TextStyle(
                            fontFamily: 'NotoSerifTC',
                            fontSize: 16,
                            height: 1.7,
                            color: surfaces.textPrimary,
                          ),
                          decoration: const InputDecoration(
                            hintText: '第一行為標題，接著輸入內容…',
                            border: InputBorder.none,
                            enabledBorder: InputBorder.none,
                            focusedBorder: InputBorder.none,
                            isCollapsed: true,
                            contentPadding: _kEditorContentPadding,
                          ),
                        ),
                      ],
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

/// 第一行（標題）視覺上放大加粗，其餘為內文——沿用同一個純文字模型
/// （`_save()` 仍以第一個換行切標題/內文），只在畫面渲染時分段套字。
/// 覆寫 [buildTextSpan] 屬 Flutter 官方支援的擴充點（僅影響繪製，不影響
/// 選取/游標/組字模型），比拆成兩個獨立欄位更貼近「打字時自動變標題」
/// 的單一連續輸入手感。
class _TitleFirstLineController extends TextEditingController {
  _TitleFirstLineController({super.text});

  @override
  TextSpan buildTextSpan({
    required BuildContext context,
    TextStyle? style,
    required bool withComposing,
  }) {
    final t = text;
    final newlineIndex = t.indexOf('\n');
    final titleEnd = newlineIndex == -1 ? t.length : newlineIndex;
    final titleStyle = style?.merge(
      const TextStyle(
        fontFamily: 'NotoSerifTC',
        fontSize: 22,
        fontWeight: FontWeight.w700,
        height: 1.3,
      ),
    );
    final composing = (withComposing && value.isComposingRangeValid)
        ? value.composing
        : null;

    TextSpan segment(int start, int end, TextStyle? segStyle) {
      if (start >= end) return TextSpan(style: segStyle, text: '');
      if (composing == null ||
          composing.end <= start ||
          composing.start >= end) {
        return TextSpan(style: segStyle, text: t.substring(start, end));
      }
      final cs = composing.start.clamp(start, end);
      final ce = composing.end.clamp(start, end);
      final underline = segStyle?.merge(
        const TextStyle(decoration: TextDecoration.underline),
      );
      return TextSpan(
        style: segStyle,
        children: [
          if (cs > start) TextSpan(text: t.substring(start, cs)),
          if (ce > cs) TextSpan(text: t.substring(cs, ce), style: underline),
          if (end > ce) TextSpan(text: t.substring(ce, end)),
        ],
      );
    }

    return TextSpan(
      style: style,
      children: [
        segment(0, titleEnd, titleStyle),
        segment(titleEnd, t.length, style),
      ],
    );
  }
}

/// 輸入區內距：文字別貼著底板邊緣（主題 InputDecorationTheme 預設 filled，
/// 輸入區有自己的底板）。
const _kEditorContentPadding = EdgeInsets.fromLTRB(16, 14, 16, 14);

/// 淡淡橫格線紋理，行距對齊內文字級（16sp・行高 1.7）。純裝飾，不隨文字
/// 內容重繪。
class _RuledPaperPainter extends CustomPainter {
  final Color lineColor;
  final double topOffset;
  static const _lineHeight = 16 * 1.7;

  const _RuledPaperPainter({required this.lineColor, this.topOffset = 0});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = lineColor.withValues(alpha: 0.6)
      ..strokeWidth = 1;
    for (var y = topOffset + _lineHeight; y < size.height; y += _lineHeight) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
    }
  }

  @override
  bool shouldRepaint(covariant _RuledPaperPainter oldDelegate) =>
      oldDelegate.lineColor != lineColor || oldDelegate.topOffset != topOffset;
}
