import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/theme/app_colors.dart';
import '../../../app/theme/app_spacing.dart';
import '../../../app/theme/surface_colors.dart';
import '../../../shared/domain/app_exception.dart';
import '../../decision/presentation/decision_page.dart';
import '../data/character_share_repository.dart';
import '../domain/character.dart';
import '../domain/shared_character_result.dart';
import 'character_page.dart';
import 'read_only_scope.dart';
import 'widgets/character_tab_bar.dart';

/// 憑分享 token 檢視他人角色卡（唯讀）。
///
/// 未登入亦可開啟——內容庫本就 anon 公開唯讀，法術與職業特性等交叉引用
/// 都能正常渲染，因此不需要降級版型。整頁不讀取也不改變檢視者自己的
/// 「當前角色」狀態。
class SharedCharacterViewPage extends ConsumerWidget {
  final String token;

  const SharedCharacterViewPage({super.key, required this.token});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(sharedCharacterProvider(token));

    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: RefreshIndicator(
          onRefresh: () async => ref.invalidate(sharedCharacterProvider(token)),
          child: async.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => _Message(
              icon: Icons.wifi_off,
              titleEn: 'OFFLINE',
              title: '無法載入',
              body: e is AppException
                  ? '${e.message}\n請確認網路後再試一次。'
                  : '目前連不上網路，請稍後再試。',
              onRetry: () => ref.invalidate(sharedCharacterProvider(token)),
            ),
            data: (result) => switch (result) {
              SharedCharacterOk(:final character, :final fetchedAt) =>
                _SharedSheet(
                  character: character,
                  fetchedAt: fetchedAt,
                  onRefresh: () =>
                      ref.invalidate(sharedCharacterProvider(token)),
                ),
              SharedCharacterRevoked() => const _Message(
                icon: Icons.block,
                titleEn: 'REVOKED',
                title: '已停止分享',
                body: '角色主人已停止分享這張角色卡。',
              ),
              SharedCharacterDeleted() => const _Message(
                icon: Icons.person_off_outlined,
                titleEn: 'CHARACTER DELETED',
                title: '角色已刪除',
                body: '這張角色卡已被刪除。',
              ),
              SharedCharacterNotFound() => const _Message(
                icon: Icons.search_off,
                titleEn: 'NOT FOUND',
                title: '找不到',
                body: '找不到這個分享連結，請確認網址是否完整。',
              ),
            },
          ),
        ),
      ),
    );
  }
}

/// 唯讀角色卡：橫幅（資料時點）＋「行動／角色」兩個情境。
///
/// 沿用 App 本身的分法：跑團當下要看的即時數值（HP、AC、狀態、剩餘法術位、
/// 攻擊列）在行動頁，建卡結果在角色頁。兩者各自保有原本的版型級距行為。
class _SharedSheet extends StatefulWidget {
  final Character character;
  final DateTime fetchedAt;
  final VoidCallback onRefresh;

  const _SharedSheet({
    required this.character,
    required this.fetchedAt,
    required this.onRefresh,
  });

  @override
  State<_SharedSheet> createState() => _SharedSheetState();
}

class _SharedSheetState extends State<_SharedSheet> {
  int _index = 0;
  late final PageController _controller = PageController(initialPage: _index);

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        _ReadOnlyBanner(
          character: widget.character,
          fetchedAt: widget.fetchedAt,
          onRefresh: widget.onRefresh,
        ),
        CharacterTabBar(
          tabs: const ['行動', '角色'],
          currentIndex: _index,
          onChanged: (i) => _controller.animateToPage(
            i,
            duration: const Duration(milliseconds: 250),
            curve: Curves.easeOutCubic,
          ),
        ),
        Expanded(
          child: ReadOnlyScope(
            readOnly: true,
            child: PageView(
              controller: _controller,
              onPageChanged: (i) => setState(() => _index = i),
              children: [
                DecisionPage(character: widget.character),
                CharacterPage(character: widget.character),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

/// 不做 Realtime 訂閱，因此必須讓檢視者知道自己看的是哪個時點的資料
/// （見 openspec design D10）。刻意不顯示角色主人的身分。
class _ReadOnlyBanner extends StatelessWidget {
  final Character character;
  final DateTime fetchedAt;
  final VoidCallback onRefresh;

  const _ReadOnlyBanner({
    required this.character,
    required this.fetchedAt,
    required this.onRefresh,
  });

  @override
  Widget build(BuildContext context) {
    final surfaces = Theme.of(context).extension<SurfaceColors>()!;
    final t = fetchedAt.toLocal();
    final time =
        '${t.hour.toString().padLeft(2, '0')}:'
        '${t.minute.toString().padLeft(2, '0')}';

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.lg,
        vertical: AppSpacing.sm,
      ),
      decoration: BoxDecoration(
        color: AppColors.accentGold.withValues(alpha: 0.08),
        border: const Border(
          top: BorderSide(color: AppColors.goldDim),
          bottom: BorderSide(color: AppColors.goldDim),
        ),
      ),
      child: Row(
        children: [
          const Icon(
            Icons.visibility_outlined,
            size: 16,
            color: AppColors.accentGold,
          ),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  '唯讀檢視・${character.name}',
                  style: const TextStyle(
                    fontFamily: 'NotoSerifTC',
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: AppColors.accentGold,
                  ),
                ),
                Text(
                  '資料抓取於 $time',
                  style: TextStyle(
                    fontFamily: 'NotoSerifTC',
                    fontSize: 10,
                    color: surfaces.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          // 下拉可更新，但 web 與桌面沒有下拉手勢，需要明確的按鈕。
          IconButton(
            tooltip: '重新整理',
            iconSize: 18,
            onPressed: onRefresh,
            icon: Icon(Icons.refresh, color: surfaces.textLight),
          ),
        ],
      ),
    );
  }
}

/// 失效與載入失敗的共用畫面。
///
/// 失效原因刻意分開說明：統一顯示「找不到」會讓檢視者以為自己貼錯連結而
/// 反覆重試。四種畫面都不含角色主人身分、分享備註或角色內容。
class _Message extends StatelessWidget {
  final IconData icon;
  final String titleEn;
  final String title;
  final String body;
  final VoidCallback? onRetry;

  const _Message({
    required this.icon,
    required this.titleEn,
    required this.title,
    required this.body,
    this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    final surfaces = Theme.of(context).extension<SurfaceColors>()!;
    // 失效態也要能下拉重試（撤銷後主人可能又建了新連結）。
    return ListView(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.xl,
        vertical: 80,
      ),
      children: [
        Column(
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: surfaces.border),
              ),
              child: Icon(icon, size: 24, color: surfaces.textSecondary),
            ),
            const SizedBox(height: AppSpacing.md),
            Text(
              titleEn,
              style: const TextStyle(
                fontFamily: 'Inter',
                fontSize: 9,
                fontWeight: FontWeight.w700,
                letterSpacing: 2,
                color: AppColors.goldDim,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              title,
              style: TextStyle(
                fontFamily: 'NotoSerifTC',
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: surfaces.textPrimary,
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              body,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontFamily: 'NotoSerifTC',
                fontSize: 13,
                height: 1.5,
                color: surfaces.textSecondary,
              ),
            ),
            if (onRetry != null) ...[
              const SizedBox(height: AppSpacing.lg),
              OutlinedButton.icon(
                onPressed: onRetry,
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: AppColors.goldDim),
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.lg,
                    vertical: 10,
                  ),
                ),
                icon: const Icon(
                  Icons.refresh,
                  size: 16,
                  color: AppColors.accentGold,
                ),
                label: const Text(
                  '重試',
                  style: TextStyle(
                    fontFamily: 'NotoSerifTC',
                    color: AppColors.accentGold,
                  ),
                ),
              ),
            ],
          ],
        ),
      ],
    );
  }
}
