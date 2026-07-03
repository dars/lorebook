import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/theme/app_colors.dart';
import '../../../app/theme/app_spacing.dart';
import '../../../app/theme/decorations.dart';
import '../../character/domain/character.dart';
import '../../character/domain/character_providers.dart';
import 'journal_editor_page.dart';

class JournalPage extends ConsumerWidget {
  const JournalPage({super.key});

  void _openEditor(BuildContext context, {JournalEntry? entry}) {
    // 用 root navigator 全螢幕推進（覆蓋角色頁首與底欄）。
    Navigator.of(
      context,
      rootNavigator: true,
    ).push(MaterialPageRoute(builder: (_) => JournalEditorPage(entry: entry)));
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
          ListView(
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
                  child: _JournalCard(
                    entry: e,
                    onTap: () => _openEditor(context, entry: e),
                  ),
                ),
            ],
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
}

class _JournalCard extends StatelessWidget {
  final JournalEntry entry;
  final VoidCallback onTap;
  const _JournalCard({required this.entry, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return GestureDetector(
      onTap: onTap,
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
                  fmtJournalDate(entry.updatedAt),
                  style: TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 11,
                    color: AppColors.darkTextSecondary,
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
                  color: AppColors.textSecondary,
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
    return Center(
      child: Padding(
        padding: AppSpacing.pagePadding,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.menu_book_outlined,
              size: 48,
              color: AppColors.accentGold,
            ),
            const SizedBox(height: AppSpacing.md),
            Text('尚未建立任何日誌', style: theme.textTheme.titleSmall),
            const SizedBox(height: AppSpacing.xs),
            Text(
              '點右下角「+」開始記錄你的冒險',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
