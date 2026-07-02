import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lorebook/features/catalog/presentation/fivetools_renderer.dart';

void main() {
  group('ftTokenize', () {
    test('純文字不含標記', () {
      final tokens = ftTokenize('速度歸0，不能受益於加值。');
      expect(tokens, hasLength(1));
      expect(tokens.single.isTag, isFalse);
      expect(tokens.single.display, '速度歸0，不能受益於加值。');
    });

    test('文字中夾標記', () {
      final tokens = ftTokenize('如果擒抱者陷入{@condition 無力}，被擒狀態結束。');
      expect(tokens, hasLength(3));
      expect(tokens[0].display, '如果擒抱者陷入');
      expect(tokens[1].tag, 'condition');
      expect(tokens[1].display, '無力');
      expect(tokens[2].display, '，被擒狀態結束。');
    });

    test('參照類 pipe 參數：顯示名取第 1 段（無第 3 段時）', () {
      final t = ftTokenize('{@spell 雷鳴波|phb}').single;
      expect(t.tag, 'spell');
      expect(t.display, '雷鳴波');
    });

    test('參照類 pipe 參數：有第 3 段時取第 3 段', () {
      final t = ftTokenize('{@spell 雷鳴波|phb|轟雷波}').single;
      expect(t.display, '轟雷波');
    });

    test('骰子標記顯示名取第 2 段', () {
      expect(ftTokenize('{@dice 1d8}').single.display, '1d8');
      expect(ftTokenize('{@damage 2d6|2d6 火焰}').single.display, '2d6 火焰');
    });

    test('dc 與 hit 的格式化', () {
      expect(ftTokenize('{@dc 15}').single.display, 'DC 15');
      expect(ftTokenize('{@hit 5}').single.display, '+5');
      expect(ftTokenize('{@hit -1}').single.display, '-1');
    });

    test('巢狀標記保留原文供遞迴', () {
      final t = ftTokenize('{@b 內含 {@dice 1d6} 傷害}').single;
      expect(t.tag, 'b');
      expect(t.display, '內含 {@dice 1d6} 傷害');
    });

    test('不成對大括號降級為純文字', () {
      final tokens = ftTokenize('壞資料 {@dice 1d8 沒關括號');
      expect(tokens.every((t) => !t.isTag), isTrue);
      expect(tokens.map((t) => t.display).join(), '壞資料 {@dice 1d8 沒關括號');
    });

    test('未知標記照顯示內容輸出', () {
      final t = ftTokenize('{@atk mw}').single;
      expect(t.tag, 'atk');
      expect(t.display, 'mw');
    });
  });

  group('FtEntriesView（真實 condition 資料）', () {
    Widget host(Widget child) => MaterialApp(
      home: Scaffold(body: SingleChildScrollView(child: child)),
    );

    testWidgets('渲染 list 區塊（被擒）', (tester) async {
      // 取自 entries 表 kind=condition eng_name=Grappled 的實際資料。
      const grappled = [
        {
          'type': 'list',
          'items': [
            '一個被擒生物的移動速度歸0，且不能受益於任何對它移動速度的加值。',
            '如果擒抱者陷入{@condition 無力}，被擒狀態將就此結束。',
          ],
        },
      ];
      await tester.pumpWidget(host(const FtEntriesView(grappled)));
      expect(find.textContaining('移動速度歸0', findRichText: true), findsOneWidget);
      // {@condition 無力} 應渲染成純顯示名。
      expect(
        find.textContaining('如果擒抱者陷入無力，', findRichText: true),
        findsOneWidget,
      );
      expect(
        find.textContaining('{@condition', findRichText: true),
        findsNothing,
      );
    });

    testWidgets('渲染 table 區塊（力竭）', (tester) async {
      const exhaustion = [
        '力竭分成六個等級。',
        {
          'type': 'table',
          'colLabels': ['等級', '效果'],
          'rows': [
            ['1', '所有屬性檢定具有劣勢'],
            ['6', '死亡'],
          ],
        },
      ];
      await tester.pumpWidget(host(const FtEntriesView(exhaustion)));
      expect(find.byType(Table), findsOneWidget);
      expect(
        find.textContaining('所有屬性檢定具有劣勢', findRichText: true),
        findsOneWidget,
      );
      expect(find.textContaining('死亡', findRichText: true), findsOneWidget);
    });

    testWidgets('渲染帶標題的巢狀 entries 區塊', (tester) async {
      const nested = [
        {
          'type': 'entries',
          'name': '子標題',
          'entries': ['內文一段。'],
        },
      ];
      await tester.pumpWidget(host(const FtEntriesView(nested)));
      expect(find.textContaining('子標題', findRichText: true), findsOneWidget);
      expect(find.textContaining('內文一段。', findRichText: true), findsOneWidget);
    });
  });
}
