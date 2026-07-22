import 'package:flutter_test/flutter_test.dart';
import 'package:lorebook/features/character/domain/character.dart';
import 'package:lorebook/features/character/domain/currency_math.dart';

void main() {
  group('totalCp', () {
    test('五幣別加總', () {
      const c = Currency(pp: 1, gp: 2, ep: 1, sp: 3, cp: 4);
      expect(totalCp(c), 1000 + 200 + 50 + 30 + 4);
    });
  });

  group('payFrom', () {
    test('剛好足額：同階直接扣', () {
      const c = Currency(gp: 2, sp: 5);
      final r = payFrom(c, 250); // 2 gp 5 sp
      expect(r.ok, true);
      expect(r.remaining, const Currency());
    });

    test('spec 例：2 gp 買 15 sp，1 gp 換零', () {
      const c = Currency(gp: 2);
      final r = payFrom(c, 150);
      expect(r.ok, true);
      expect(r.remaining.gp, 0);
      expect(r.remaining.sp, 5);
      expect(totalCp(r.remaining), 200 - 150);
    });

    test('小幣值優先扣，不動大幣', () {
      const c = Currency(pp: 1, gp: 3, sp: 20);
      final r = payFrom(c, 200); // 20 sp 全額支付
      expect(r.ok, true);
      expect(r.remaining.pp, 1);
      expect(r.remaining.gp, 3);
      expect(r.remaining.sp, 0);
    });

    test('跨多階換零', () {
      const c = Currency(pp: 1); // 僅 1 白金
      final r = payFrom(c, 137); // 1 gp 3 sp 7 cp
      expect(r.ok, true);
      expect(totalCp(r.remaining), 1000 - 137);
      expect(r.remaining.pp, 0);
      // 找零不產生 ep
      expect(r.remaining.ep, 0);
    });

    test('ep 匯率（1 ep = 5 sp）參與支付', () {
      const c = Currency(ep: 1, sp: 1);
      final r = payFrom(c, 60); // 50 + 10
      expect(r.ok, true);
      expect(r.remaining, const Currency());
    });

    test('ep 奇數換算：以 ep 支付並找零', () {
      const c = Currency(ep: 2);
      final r = payFrom(c, 60);
      expect(r.ok, true);
      expect(totalCp(r.remaining), 40);
      expect(r.remaining.ep, 0); // 兩枚都動用（一枚支付、一枚換零）
    });

    test('不足額擋下：財富不變、回報差額', () {
      const c = Currency(gp: 1, sp: 2);
      final r = payFrom(c, 500);
      expect(r.ok, false);
      expect(r.shortfallCp, 500 - 120);
      expect(r.remaining, c);
    });

    test('金額 0 或負值視為免費', () {
      const c = Currency(gp: 1);
      expect(payFrom(c, 0).remaining, c);
      expect(payFrom(c, -5).remaining, c);
    });

    test('不重排其餘幣別：未動用的幣別原封不動', () {
      const c = Currency(pp: 2, gp: 1, ep: 3, sp: 4, cp: 5);
      final r = payFrom(c, 45); // 4 sp 5 cp
      expect(r.ok, true);
      expect(r.remaining.pp, 2);
      expect(r.remaining.gp, 1);
      expect(r.remaining.ep, 3);
      expect(r.remaining.sp, 0);
      expect(r.remaining.cp, 0);
    });
  });

  group('formatCp', () {
    test('混合幣別顯示', () {
      expect(formatCp(1153), '1 pp 1 gp 5 sp 3 cp');
      expect(formatCp(150), '1 gp 5 sp');
      expect(formatCp(0), '0 cp');
    });
  });
}
