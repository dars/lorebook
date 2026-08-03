import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:share_plus/share_plus.dart';

import '../../../../app/theme/app_colors.dart';
import '../../../../app/theme/app_spacing.dart';
import '../../../../app/theme/surface_colors.dart';
import '../../../../shared/domain/app_exception.dart';
import '../../data/character_share_repository.dart';
import '../../domain/character.dart';
import '../../domain/character_share.dart';
import '../../domain/share_link.dart';
import 'editor_sheet.dart';

/// 建立分享：填備註 → 明示分享範圍 → 產生連結與 QR。
///
/// 範圍說明是這個流程的重點而非附註：分享的是**活資料**，使用者按下去
/// 的當下看到的內容不等於對方最終看到的內容（見 openspec design D2 的
/// 風險段）。
Future<void> showCreateShareSheet(
  BuildContext context,
  Character character,
) async {
  await showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    builder: (_) => _CreateShareSheet(character: character),
  );
}

/// 顯示既有分享的連結與 QR（自分享清單點入）。
Future<void> showShareLinkSheet(BuildContext context, CharacterShare share) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    builder: (_) => _ShareLinkSheet(share: share),
  );
}

class _CreateShareSheet extends ConsumerStatefulWidget {
  final Character character;
  const _CreateShareSheet({required this.character});

  @override
  ConsumerState<_CreateShareSheet> createState() => _CreateShareSheetState();
}

class _CreateShareSheetState extends ConsumerState<_CreateShareSheet> {
  final _label = TextEditingController();
  bool _busy = false;

  @override
  void dispose() {
    _label.dispose();
    super.dispose();
  }

  Future<void> _create() async {
    setState(() => _busy = true);
    try {
      final share = await ref
          .read(characterShareRepositoryProvider)
          .createShare(widget.character.id, label: _label.text.trim());
      ref.invalidate(characterSharesProvider(widget.character.id));
      if (!mounted) return;
      Navigator.pop(context);
      await showShareLinkSheet(context, share);
    } on AppException catch (e) {
      if (!mounted) return;
      setState(() => _busy = false);
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(e.message)));
    }
  }

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
                '分享「${widget.character.name}」',
                style: TextStyle(
                  fontFamily: 'NotoSerifTC',
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: surfaces.textPrimary,
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              const EditorFieldLabel('分享給誰（備註，僅自己看得到）'),
              TextField(
                controller: _label,
                autofocus: true,
                textInputAction: TextInputAction.done,
                onSubmitted: (_) => _busy ? null : _create(),
                style: const TextStyle(fontFamily: 'NotoSerifTC', fontSize: 14),
                decoration: const InputDecoration(hintText: '例如：DM、小明'),
              ),
              const SizedBox(height: AppSpacing.sm),
              Wrap(
                spacing: 6,
                children: [
                  for (final s in ['DM', '隊友', '觀戰者'])
                    ActionChip(
                      label: Text(
                        s,
                        style: const TextStyle(
                          fontFamily: 'NotoSerifTC',
                          fontSize: 12,
                        ),
                      ),
                      onPressed: () => setState(() {
                        _label.text = s;
                        _label.selection = TextSelection.collapsed(
                          offset: s.length,
                        );
                      }),
                    ),
                ],
              ),
              const SizedBox(height: AppSpacing.lg),
              const _ScopeNotice(),
              const SizedBox(height: AppSpacing.lg),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: _busy ? null : () => Navigator.pop(context),
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
                    flex: 2,
                    child: FilledButton.icon(
                      onPressed: _busy ? null : _create,
                      style: FilledButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                      icon: _busy
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Icon(Icons.qr_code, size: 18),
                      label: const Text(
                        '建立連結',
                        style: TextStyle(
                          fontFamily: 'NotoSerifTC',
                          fontWeight: FontWeight.w700,
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

/// 分享範圍的明示——刻意寫「包含之後的所有變動」而非只說「分享角色卡」。
class _ScopeNotice extends StatelessWidget {
  const _ScopeNotice();

  static const _lines = [
    (Icons.check_circle_outline, '整張角色卡，包含傳記與背景故事'),
    (Icons.show_chart, '你的即時狀態——扣血、換裝、升級都會反映'),
    (Icons.all_inclusive, '建立之後的所有變動，直到你手動撤銷'),
    (Icons.link, '持有這個連結的人都能看，不需要帳號'),
  ];

  @override
  Widget build(BuildContext context) {
    final surfaces = Theme.of(context).extension<SurfaceColors>()!;
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.accentGold.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(AppSpacing.radiusCard),
        border: Border.all(color: AppColors.goldDim),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(
                Icons.visibility_outlined,
                size: 16,
                color: AppColors.accentGold,
              ),
              const SizedBox(width: 6),
              Text(
                '對方會看到什麼',
                style: TextStyle(
                  fontFamily: 'NotoSerifTC',
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: surfaces.textPrimary,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          for (final (icon, text) in _lines)
            Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(icon, size: 14, color: surfaces.textSecondary),
                  const SizedBox(width: 7),
                  Expanded(
                    child: Text(
                      text,
                      style: TextStyle(
                        fontFamily: 'NotoSerifTC',
                        fontSize: 12,
                        height: 1.5,
                        color: surfaces.textSecondary,
                      ),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _ShareLinkSheet extends StatelessWidget {
  final CharacterShare share;
  const _ShareLinkSheet({required this.share});

  @override
  Widget build(BuildContext context) {
    final surfaces = Theme.of(context).extension<SurfaceColors>()!;
    final link = shareLinkFor(share.token);

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 4, 20, 12),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              share.label.isEmpty ? '分享連結' : '分享給 ${share.label}',
              style: TextStyle(
                fontFamily: 'NotoSerifTC',
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: surfaces.textPrimary,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              '讓對方掃描，或把連結傳給他',
              style: TextStyle(
                fontFamily: 'NotoSerifTC',
                fontSize: 12,
                color: surfaces.textSecondary,
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            // QR 為本機繪製，不經任何第三方服務。
            Container(
              padding: const EdgeInsets.all(AppSpacing.md),
              decoration: BoxDecoration(
                color: const Color(0xFFE8DFC9),
                borderRadius: BorderRadius.circular(AppSpacing.radiusCard),
                border: Border.all(color: AppColors.goldDim),
              ),
              child: QrImageView(
                data: link,
                size: 180,
                backgroundColor: const Color(0xFFE8DFC9),
                eyeStyle: const QrEyeStyle(
                  eyeShape: QrEyeShape.square,
                  color: Color(0xFF1A1206),
                ),
                dataModuleStyle: const QrDataModuleStyle(
                  dataModuleShape: QrDataModuleShape.square,
                  color: Color(0xFF1A1206),
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            Container(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.md,
                vertical: AppSpacing.sm,
              ),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(AppSpacing.radiusCard),
                border: Border.all(color: surfaces.border),
              ),
              child: Row(
                children: [
                  Icon(Icons.link, size: 15, color: surfaces.textSecondary),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      link.replaceFirst(RegExp(r'^https?://'), ''),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontFamily: 'Inter',
                        fontSize: 12,
                        color: surfaces.textPrimary,
                      ),
                    ),
                  ),
                  IconButton(
                    tooltip: '複製連結',
                    iconSize: 18,
                    onPressed: () async {
                      await Clipboard.setData(ClipboardData(text: link));
                      if (!context.mounted) return;
                      ScaffoldMessenger.of(
                        context,
                      ).showSnackBar(const SnackBar(content: Text('已複製分享連結')));
                    },
                    icon: const Icon(Icons.copy, color: AppColors.accentGold),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            Row(
              children: [
                Expanded(
                  flex: 2,
                  child: FilledButton.icon(
                    onPressed: () => SharePlus.instance.share(
                      ShareParams(uri: Uri.parse(link)),
                    ),
                    style: FilledButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                    icon: const Icon(Icons.ios_share, size: 18),
                    label: const Text(
                      '系統分享',
                      style: TextStyle(
                        fontFamily: 'NotoSerifTC',
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(context),
                    style: OutlinedButton.styleFrom(
                      side: BorderSide(color: surfaces.border),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                    child: Text(
                      '完成',
                      style: TextStyle(
                        fontFamily: 'NotoSerifTC',
                        color: surfaces.textSecondary,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
