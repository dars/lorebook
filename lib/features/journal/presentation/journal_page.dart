import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/theme/app_colors.dart';
import '../../../app/theme/app_spacing.dart';
import '../../../app/theme/decorations.dart';
import '../../../app/theme/surface_colors.dart';
import '../../../shared/presentation/responsive_layout.dart';
import '../../character/domain/character.dart';
import '../../character/domain/character_providers.dart';
import 'journal_editor_page.dart';

class JournalPage extends ConsumerWidget {
  const JournalPage({super.key});

  void _openEditor(BuildContext context, {JournalEntry? entry}) {
    showJournalEditor(context, entry: entry);
  }

  /// 刪除確認（滑動與長按共用）；回傳是否確認刪除。
  Future<bool> _confirmDelete(BuildContext context, JournalEntry entry) async {
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
    return ok == true;
  }

  /// 卡片＋左滑刪除；長按也可刪（iPad 配鍵鼠時滑動不易發現）。
  Widget _entryCard(BuildContext context, WidgetRef ref, JournalEntry e) {
    void remove() =>
        ref.read(currentCharacterProvider.notifier).removeJournalEntry(e.id);

    return Dismissible(
      key: ValueKey(e.id),
      direction: DismissDirection.endToStart,
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xl),
        decoration: BoxDecoration(
          color: AppColors.danger,
          borderRadius: BorderRadius.circular(AppSpacing.radiusCard),
        ),
        child: const Icon(Icons.delete_outline, color: Colors.white),
      ),
      confirmDismiss: (_) => _confirmDelete(context, e),
      onDismissed: (_) => remove(),
      child: _JournalCard(
        entry: e,
        onTap: () => _openEditor(context, entry: e),
        onLongPress: () async {
          if (await _confirmDelete(context, e)) remove();
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final entries = [...ref.watch(currentCharacterProvider).journalEntries]
      ..sort((a, b) => b.updatedAt.compareTo(a.updatedAt));

    return Stack(
      children: [
        if (entries.isEmpty)
          const _EmptyState()
        else
          ResponsiveLayout(
            mobile: _singleColumn(context, ref, entries),
            tablet: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 600),
                child: _singleColumn(context, ref, entries),
              ),
            ),
            expanded: _twoColumn(context, ref, entries),
          ),
        Positioned(
          right: AppSpacing.lg,
          bottom: context.bottomNavClearance,
          child: FloatingActionButton(
            onPressed: () => _openEditor(context),
            child: const Icon(Icons.add),
          ),
        ),
      ],
    );
  }

  Widget _singleColumn(
    BuildContext context,
    WidgetRef ref,
    List<JournalEntry> entries,
  ) {
    return ListView(
      padding: EdgeInsets.fromLTRB(
        AppSpacing.lg,
        AppSpacing.lg,
        AppSpacing.lg,
        context.bottomNavClearance + 80,
      ),
      children: [
        const SectionTitle(title: 'JOURNAL 旅程筆記'),
        for (final e in entries)
          Padding(
            padding: const EdgeInsets.only(bottom: AppSpacing.md),
            child: _entryCard(context, ref, e),
          ),
      ],
    );
  }

  /// expanded（iPad 橫向）：卡片依排序奇偶分左右欄，整頁單一捲動。
  Widget _twoColumn(
    BuildContext context,
    WidgetRef ref,
    List<JournalEntry> entries,
  ) {
    Widget cardColumn(List<JournalEntry> list) => Expanded(
      child: Column(
        children: [
          for (final e in list)
            Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.md),
              child: _entryCard(context, ref, e),
            ),
        ],
      ),
    );

    final left = <JournalEntry>[];
    final right = <JournalEntry>[];
    for (var i = 0; i < entries.length; i++) {
      (i.isEven ? left : right).add(entries[i]);
    }

    return SingleChildScrollView(
      padding: EdgeInsets.fromLTRB(
        AppSpacing.lg,
        AppSpacing.lg,
        AppSpacing.lg,
        AppSpacing.xl + 80,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SectionTitle(title: 'JOURNAL 旅程筆記'),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              cardColumn(left),
              const SizedBox(width: AppSpacing.lg),
              cardColumn(right),
            ],
          ),
        ],
      ),
    );
  }
}

class _JournalCard extends StatelessWidget {
  final JournalEntry entry;
  final VoidCallback onTap;
  final VoidCallback? onLongPress;
  const _JournalCard({
    required this.entry,
    required this.onTap,
    this.onLongPress,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final surfaces = theme.extension<SurfaceColors>()!;
    return GestureDetector(
      onTap: onTap,
      onLongPress: onLongPress,
      child: ParchmentCard(
        padding: AppSpacing.cardPadding,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    entry.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                Text(
                  fmtJournalRelativeDate(entry.updatedAt),
                  style: TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 11,
                    color: surfaces.textSecondary,
                  ),
                ),
              ],
            ),
            if (entry.body.isNotEmpty) ...[
              const SizedBox(height: AppSpacing.xs),
              Text(
                entry.body,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: surfaces.textSecondary,
                  height: 1.5,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final surfaces = theme.extension<SurfaceColors>()!;
    return Center(
      child: Padding(
        padding: AppSpacing.pagePadding,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.menu_book_outlined, size: 48, color: surfaces.accent),
            const SizedBox(height: AppSpacing.md),
            Text('尚未建立任何日誌', style: theme.textTheme.titleSmall),
            const SizedBox(height: AppSpacing.xs),
            Text(
              '點右下角「+」開始記錄你的冒險',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: surfaces.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
