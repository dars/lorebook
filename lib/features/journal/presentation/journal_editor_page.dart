import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/theme/app_colors.dart';
import '../../character/domain/character.dart';
import '../../character/domain/character_providers.dart';

/// 日誌「新增/編輯」格式化日期。
String fmtJournalDate(DateTime d) =>
    '${d.year}/${d.month.toString().padLeft(2, '0')}/${d.day.toString().padLeft(2, '0')}';

/// 筆記式日誌編輯畫面：第一行標題、下方自由內文；頂端日期；右上角儲存/刪除。
class JournalEditorPage extends ConsumerStatefulWidget {
  final JournalEntry? entry;
  const JournalEditorPage({super.key, this.entry});

  @override
  ConsumerState<JournalEditorPage> createState() => _JournalEditorPageState();
}

class _JournalEditorPageState extends ConsumerState<JournalEditorPage> {
  late final TextEditingController _content =
      TextEditingController(text: _initialText());

  String _initialText() {
    final e = widget.entry;
    if (e == null) return '';
    return e.body.isEmpty ? e.title : '${e.title}\n${e.body}';
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
    return Scaffold(
      appBar: AppBar(
        actions: [
          if (widget.entry != null)
            IconButton(
              icon: const Icon(Icons.delete_outline),
              tooltip: '刪除',
              onPressed: _delete,
            ),
          IconButton(
            icon: const Icon(Icons.check),
            tooltip: '儲存',
            onPressed: _save,
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 4, 20, 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                _dateLine(),
                style: TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 11,
                  color: AppColors.darkTextSecondary,
                ),
              ),
              const SizedBox(height: 8),
              Expanded(
                child: TextField(
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
                    color: AppColors.darkTextPrimary,
                  ),
                  decoration: const InputDecoration(
                    hintText: '第一行為標題，接著輸入內容…',
                    border: InputBorder.none,
                    enabledBorder: InputBorder.none,
                    focusedBorder: InputBorder.none,
                    isCollapsed: true,
                    contentPadding: EdgeInsets.zero,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
