import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../app/theme/app_colors.dart';
import '../../../../app/theme/app_spacing.dart';
import '../../../../app/theme/decorations.dart';
import '../../../../app/theme/surface_colors.dart';
import '../../../../shared/data/supabase_client.dart';
import '../../../../shared/domain/app_exception.dart';
import '../../../auth/domain/auth_state.dart';
import '../../../auth/domain/guest_mode.dart';
import '../../data/character_share_repository.dart';
import '../../domain/character.dart';
import '../../domain/character_share.dart';
import '../../domain/share_link.dart';
import 'share_sheet.dart';

/// 總覽頁底部的分享區段：建立分享 ＋ 已發出的分享清單 ＋ 逐筆撤銷。
///
/// 預設收合（總覽是跑團中最常翻的分頁，分享屬「設定一次、偶爾管理」的
/// 操作）；標頭顯示目前的分享數，讓遺忘的分享是看得見的，而不是靜默存在
/// （見 openspec design D5a）。清單上的都是有效的，撤銷後該筆即消失，
/// 因此不另行標示「有效」。
class ShareSection extends ConsumerWidget {
  final Character character;

  const ShareSection({super.key, required this.character});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // 離線模式（未初始化 Supabase）連 auth provider 都不能碰。
    final guest = ref.watch(guestModeProvider);
    var canShare = isSupabaseInitialized && !guest;
    if (canShare) {
      // 監聽 auth 變更，登入／登出後區段即時切換（不只讀當下的 currentUser）。
      ref.watch(authStateChangesProvider);
      canShare = ref.watch(currentUserProvider) != null;
    }

    final shares = canShare
        ? ref.watch(characterSharesProvider(character.id)).valueOrNull
        : null;
    final count = shares?.length ?? 0;

    return CollapsibleSection(
      title: 'SHARE 分享',
      initiallyExpanded: false,
      summary: count > 0 ? '$count 條' : null,
      child: canShare
          ? _ShareBody(character: character, shares: shares)
          : const _SignInHint(),
    );
  }
}

class _SignInHint extends StatelessWidget {
  const _SignInHint();

  @override
  Widget build(BuildContext context) {
    final surfaces = Theme.of(context).extension<SurfaceColors>()!;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
      child: Text(
        '分享角色卡需要登入——連結指向雲端的角色資料，離線或試玩的角色沒有可分享的來源。',
        style: TextStyle(
          fontFamily: 'NotoSerifTC',
          fontSize: 12,
          height: 1.5,
          color: surfaces.textSecondary,
        ),
      ),
    );
  }
}

class _ShareBody extends ConsumerWidget {
  final Character character;
  final List<CharacterShare>? shares;

  const _ShareBody({required this.character, required this.shares});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final surfaces = Theme.of(context).extension<SurfaceColors>()!;
    final list = shares;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        FilledButton.icon(
          onPressed: () => showCreateShareSheet(context, character),
          style: FilledButton.styleFrom(
            padding: const EdgeInsets.symmetric(vertical: 12),
          ),
          icon: const Icon(Icons.share, size: 18),
          label: const Text(
            '建立分享連結',
            style: TextStyle(
              fontFamily: 'NotoSerifTC',
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        if (list == null)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: AppSpacing.md),
            child: Center(
              child: SizedBox(
                width: 18,
                height: 18,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
            ),
          )
        else
          for (final s in list)
            Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.sm),
              child: _ShareRow(share: s, characterId: character.id),
            ),
        Padding(
          padding: const EdgeInsets.only(top: 4),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(Icons.info_outline, size: 13, color: surfaces.textSecondary),
              const SizedBox(width: 7),
              Expanded(
                child: Text(
                  '持有連結的人看得到這張卡的即時狀態，包含你之後的所有變動，直到你撤銷。',
                  style: TextStyle(
                    fontFamily: 'NotoSerifTC',
                    fontSize: 11,
                    height: 1.5,
                    color: surfaces.textSecondary,
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _ShareRow extends ConsumerStatefulWidget {
  final CharacterShare share;
  final String characterId;

  const _ShareRow({required this.share, required this.characterId});

  @override
  ConsumerState<_ShareRow> createState() => _ShareRowState();
}

class _ShareRowState extends ConsumerState<_ShareRow> {
  bool _busy = false;

  Future<void> _revoke() async {
    final label = widget.share.label.isEmpty
        ? '這條分享'
        : '給「${widget.share.label}」的分享';
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('撤銷分享？'),
        content: Text('$label將立即失效，對方會看到「角色主人已停止分享」。其他分享不受影響。'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('取消'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: AppColors.danger),
            child: const Text('撤銷'),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;

    setState(() => _busy = true);
    try {
      await ref
          .read(characterShareRepositoryProvider)
          .revokeShare(widget.share.token);
      ref.invalidate(characterSharesProvider(widget.characterId));
    } on AppException catch (e) {
      if (!mounted) return;
      setState(() => _busy = false);
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(e.message)));
    }
  }

  String get _createdAt {
    final d = widget.share.createdAt.toLocal();
    return '${d.year}/${d.month.toString().padLeft(2, '0')}/'
        '${d.day.toString().padLeft(2, '0')} 建立';
  }

  @override
  Widget build(BuildContext context) {
    final surfaces = Theme.of(context).extension<SurfaceColors>()!;
    final label = widget.share.label;

    return ParchmentCard(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.sm,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              if (label.isNotEmpty) ...[
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 7,
                    vertical: 2,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.accentGold.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(4),
                    border: Border.all(color: AppColors.goldDim),
                  ),
                  child: Text(
                    label,
                    style: const TextStyle(
                      fontFamily: 'NotoSerifTC',
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: AppColors.accentGold,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
              ],
              Text(
                _createdAt,
                style: TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 10,
                  color: surfaces.textSecondary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              Expanded(
                child: Text(
                  shareLinkDisplay(widget.share.token),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 11,
                    color: surfaces.textSecondary,
                  ),
                ),
              ),
              IconButton(
                tooltip: '顯示連結與 QR',
                iconSize: 18,
                onPressed: _busy
                    ? null
                    : () => showShareLinkSheet(context, widget.share),
                icon: const Icon(Icons.qr_code_2),
              ),
              IconButton(
                tooltip: '撤銷',
                iconSize: 18,
                onPressed: _busy ? null : _revoke,
                icon: _busy
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.block, color: AppColors.danger),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
