import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../app/theme/app_colors.dart';
import '../../../app/theme/surface_colors.dart';
import '../../analytics/analytics.dart';
import 'a2hs_platform_stub.dart'
    if (dart.library.js_interop) 'a2hs_platform_web.dart';

const _kDismissedKey = 'a2hs_prompt_dismissed';

/// 「加入主畫面」引導（web 行動瀏覽器限定）。
///
/// 掛在 MaterialApp.builder（Navigator 之上），以自繪 overlay 呈現，
/// 不依賴 Navigator。顯示條件：web × iOS/Android 瀏覽器 × 非 standalone
/// ×未勾「不要再顯示」。每次進站顯示一次，直到使用者選擇不再顯示。
class A2hsGate extends StatefulWidget {
  final Widget child;

  const A2hsGate({super.key, required this.child});

  @override
  State<A2hsGate> createState() => _A2hsGateState();
}

class _A2hsGateState extends State<A2hsGate> {
  bool _visible = false;

  @override
  void initState() {
    super.initState();
    _maybeShow();
  }

  Future<void> _maybeShow() async {
    if (!kIsWeb) return;
    final platform = defaultTargetPlatform;
    final isMobileBrowser =
        platform == TargetPlatform.iOS || platform == TargetPlatform.android;
    if (!isMobileBrowser || isStandaloneDisplay) return;
    final prefs = await SharedPreferences.getInstance();
    if (prefs.getBool(_kDismissedKey) ?? false) return;
    // 讓首幀與啟動畫面先落定，再浮出引導。
    await Future<void>.delayed(const Duration(seconds: 2));
    if (mounted) setState(() => _visible = true);
  }

  Future<void> _dismiss({required bool forever}) async {
    trackEvent('a2hs_dismissed', {'forever': forever});
    setState(() => _visible = false);
    if (forever) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool(_kDismissedKey, true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        widget.child,
        if (_visible)
          _A2hsSheet(
            onGotIt: () => _dismiss(forever: false),
            onNever: () => _dismiss(forever: true),
          ),
      ],
    );
  }
}

class _A2hsSheet extends StatelessWidget {
  final VoidCallback onGotIt;
  final VoidCallback onNever;

  const _A2hsSheet({required this.onGotIt, required this.onNever});

  @override
  Widget build(BuildContext context) {
    final surfaces = Theme.of(context).extension<SurfaceColors>()!;
    final isIos = defaultTargetPlatform == TargetPlatform.iOS;

    return Positioned.fill(
      child: GestureDetector(
        onTap: onGotIt, // 點背景＝知道了（本次收起）
        child: Container(
          color: const Color(0x99000000),
          alignment: Alignment.bottomCenter,
          child: GestureDetector(
            onTap: () {}, // 阻止點卡片冒泡到背景
            // 掛在 Navigator 之上、脫離 Material context：必須自帶
            // Material，否則 Text 會出現黃色雙底線 fallback 樣式。
            child: TweenAnimationBuilder<double>(
              tween: Tween(begin: 0, end: 1),
              duration: const Duration(milliseconds: 260),
              curve: Curves.easeOutCubic,
              builder: (context, t, child) => Opacity(
                opacity: t,
                child: Transform.translate(
                  offset: Offset(0, 24 * (1 - t)),
                  child: child,
                ),
              ),
              child: Container(
                margin: const EdgeInsets.all(16),
                constraints: const BoxConstraints(maxWidth: 420),
                child: Material(
                  color: surfaces.surface1,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                    side: BorderSide(color: surfaces.border),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 20, 20, 12),
                    child: _content(surfaces, isIos),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _content(SurfaceColors surfaces, bool isIos) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: Image.asset(
                'assets/images/app_icon.png',
                width: 40,
                height: 40,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                '把 Lorebook 加到主畫面',
                style: TextStyle(
                  fontFamily: 'NotoSerifTC',
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: surfaces.textPrimary,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Text.rich(
          isIos
              ? TextSpan(
                  children: [
                    const TextSpan(text: '點 Safari 下方的分享按鈕 '),
                    WidgetSpan(
                      alignment: PlaceholderAlignment.middle,
                      child: Icon(
                        Icons.ios_share,
                        size: 16,
                        color: AppColors.accentGold,
                      ),
                    ),
                    const TextSpan(text: '，選「加入主畫面」，之後就能像 App 一樣全螢幕開啟。'),
                  ],
                )
              : TextSpan(
                  children: [
                    const TextSpan(text: '點瀏覽器右上角選單 '),
                    WidgetSpan(
                      alignment: PlaceholderAlignment.middle,
                      child: Icon(
                        Icons.more_vert,
                        size: 16,
                        color: AppColors.accentGold,
                      ),
                    ),
                    const TextSpan(
                      text: '，選「加到主畫面」（或「安裝應用程式」），之後就能像 App 一樣開啟。',
                    ),
                  ],
                ),
          style: TextStyle(
            fontFamily: 'NotoSerifTC',
            fontSize: 13,
            height: 1.6,
            color: surfaces.textLight,
          ),
        ),
        const SizedBox(height: 8),
        Row(
          mainAxisAlignment: MainAxisAlignment.end,
          children: [
            TextButton(
              onPressed: onNever,
              child: Text(
                '不要再顯示',
                style: TextStyle(
                  fontFamily: 'NotoSerifTC',
                  fontSize: 13,
                  color: surfaces.textSecondary,
                ),
              ),
            ),
            const SizedBox(width: 4),
            FilledButton(
              onPressed: onGotIt,
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.accentGold,
              ),
              child: const Text(
                '知道了',
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
