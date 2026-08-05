import 'package:flutter/material.dart';

import '../../../app/theme/app_colors.dart';
import '../../../app/theme/surface_colors.dart';
import '../../analytics/analytics.dart';
import '../responsive_layout.dart';
import 'app_update_platform_stub.dart'
    if (dart.library.js_interop) 'app_update_platform_web.dart';

/// 新版本提示（web 限定；其餘平台為透明包裝）。
///
/// 部署新版後，已開著的分頁不會自己變新——service worker 對 main.dart.js 走
/// cache-first，要重載才換得掉。跑團時角色卡常一開整晚不重整，沒有提示就可能
/// 停在舊版好幾天。
///
/// 刻意**不自動重載**：SW 接管的時機不可控，可能正好落在玩家改 HP 或寫筆記的
/// 當下。提示可以忽略，讓使用者自己挑時機（例如戰鬥結束後）。
class AppUpdateGate extends StatefulWidget {
  final Widget child;

  /// 測試注入點；預設為平台實作。
  @visibleForTesting
  final void Function(void Function() onUpdate)? listen;

  /// 測試注入點；預設為重載頁面。
  @visibleForTesting
  final VoidCallback? onApply;

  const AppUpdateGate({
    super.key,
    required this.child,
    this.listen,
    this.onApply,
  });

  @override
  State<AppUpdateGate> createState() => _AppUpdateGateState();
}

class _AppUpdateGateState extends State<AppUpdateGate> {
  bool _visible = false;

  @override
  void initState() {
    super.initState();
    (widget.listen ?? listenForAppUpdate)(_onUpdateAvailable);
  }

  void _onUpdateAvailable() {
    if (!mounted) return;
    trackEvent('app_update_available');
    setState(() => _visible = true);
  }

  void _apply() {
    trackEvent('app_update_applied');
    (widget.onApply ?? reloadApp)();
  }

  void _dismiss() {
    trackEvent('app_update_dismissed');
    setState(() => _visible = false);
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        widget.child,
        if (_visible) _UpdateBar(onApply: _apply, onDismiss: _dismiss),
      ],
    );
  }
}

class _UpdateBar extends StatelessWidget {
  final VoidCallback onApply;
  final VoidCallback onDismiss;

  const _UpdateBar({required this.onApply, required this.onDismiss});

  @override
  Widget build(BuildContext context) {
    final surfaces = Theme.of(context).extension<SurfaceColors>()!;
    // 手機版底部有 60dp 的書籤頁籤，提示往上讓開，否則會蓋住導覽；
    // 平板走 NavigationRail，底部無阻擋。
    final isCompact =
        MediaQuery.sizeOf(context).width < ResponsiveLayout.breakpoint;
    final bottom =
        MediaQuery.paddingOf(context).bottom + (isCompact ? 72.0 : 16.0);

    return Positioned(
      left: 0,
      right: 0,
      bottom: bottom,
      child: TweenAnimationBuilder<double>(
        tween: Tween(begin: 0, end: 1),
        duration: const Duration(milliseconds: 260),
        curve: Curves.easeOutCubic,
        builder: (context, t, child) => Opacity(
          opacity: t,
          child: Transform.translate(
            offset: Offset(0, 16 * (1 - t)),
            child: child,
          ),
        ),
        child: Center(
          child: Container(
            margin: const EdgeInsets.symmetric(horizontal: 16),
            constraints: const BoxConstraints(maxWidth: 420),
            // 掛在 Navigator 之上、脫離 Material context：必須自帶 Material，
            // 否則 Text 會出現黃色雙底線 fallback 樣式。
            child: Material(
              color: surfaces.surface1,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
                side: BorderSide(color: AppColors.accentGold),
              ),
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 14, 12, 8),
                child: _content(surfaces),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _content(SurfaceColors surfaces) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(
              Icons.auto_awesome,
              size: 18,
              color: AppColors.accentGold,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                'Lorebook 有新版本',
                style: TextStyle(
                  fontFamily: 'NotoSerifTC',
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: surfaces.textPrimary,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        Text(
          '重新載入即可套用。你的角色資料存在雲端，不會因此遺失。',
          style: TextStyle(
            fontFamily: 'NotoSerifTC',
            fontSize: 13,
            height: 1.5,
            color: surfaces.textLight,
          ),
        ),
        Row(
          mainAxisAlignment: MainAxisAlignment.end,
          children: [
            TextButton(
              onPressed: onDismiss,
              child: Text(
                '稍後再說',
                style: TextStyle(
                  fontFamily: 'NotoSerifTC',
                  fontSize: 13,
                  color: surfaces.textSecondary,
                ),
              ),
            ),
            const SizedBox(width: 4),
            FilledButton(
              onPressed: onApply,
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.accentGold,
              ),
              child: const Text(
                '立即更新',
                style: TextStyle(
                  fontFamily: 'NotoSerifTC',
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF1A1206),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }
}
