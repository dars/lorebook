import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lorebook/app/theme/app_theme.dart';
import 'package:lorebook/shared/presentation/app_update/app_update_gate.dart';

/// 新版本提示：service worker 換手時才浮出，且不自動重載。
void main() {
  late void Function() fireUpdate;
  int applied = 0;

  Future<void> pump(WidgetTester tester, {Size size = const Size(900, 700)}) {
    applied = 0;
    tester.view.physicalSize = size;
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    return tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.dark,
        home: AppUpdateGate(
          listen: (cb) => fireUpdate = cb,
          onApply: () => applied++,
          child: const Scaffold(body: Text('內容')),
        ),
      ),
    );
  }

  testWidgets('沒有更新訊號時不顯示，不干擾畫面', (tester) async {
    await pump(tester);
    expect(find.text('Lorebook 有新版本'), findsNothing);
    expect(find.text('內容'), findsOneWidget);
  });

  testWidgets('收到訊號後浮出提示，且不自動重載', (tester) async {
    await pump(tester);
    fireUpdate();
    await tester.pumpAndSettle();

    expect(find.text('Lorebook 有新版本'), findsOneWidget);
    // 關鍵：提示只是提示——SW 接管的時機不可控，自動重載可能打斷編輯中的操作
    expect(applied, 0);
  });

  testWidgets('點「立即更新」才套用', (tester) async {
    await pump(tester);
    fireUpdate();
    await tester.pumpAndSettle();

    await tester.tap(find.text('立即更新'));
    await tester.pump();
    expect(applied, 1);
  });

  testWidgets('點「稍後再說」收起，內容照常可用', (tester) async {
    await pump(tester);
    fireUpdate();
    await tester.pumpAndSettle();

    await tester.tap(find.text('稍後再說'));
    await tester.pumpAndSettle();
    expect(find.text('Lorebook 有新版本'), findsNothing);
    expect(applied, 0);
    expect(find.text('內容'), findsOneWidget);
  });

  testWidgets('手機版讓開底部書籤頁籤（60dp），不蓋住導覽', (tester) async {
    await pump(tester, size: const Size(400, 800));
    fireUpdate();
    await tester.pumpAndSettle();

    final barBottom = tester.getRect(find.text('立即更新')).bottom;
    expect(barBottom, lessThan(800 - 60), reason: '提示底緣須在書籤頁籤上方，否則會擋住換頁');
  });
}
