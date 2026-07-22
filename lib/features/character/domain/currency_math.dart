import 'character.dart';

/// 幣值（cp 計）：cp=1、sp=10、ep=50、gp=100、pp=1000。
const kCpPerSp = 10;
const kCpPerEp = 50;
const kCpPerGp = 100;
const kCpPerPp = 1000;

/// [payFrom] 的結果：成功時 [remaining] 為扣款後財富；失敗時 [shortfallCp]
/// 為差額（cp 計），財富不變。
class PayResult {
  final bool ok;
  final Currency remaining;
  final int shortfallCp;

  const PayResult.success(this.remaining) : ok = true, shortfallCp = 0;
  const PayResult.insufficient(this.remaining, this.shortfallCp) : ok = false;
}

/// 財富總值（cp 計）。
int totalCp(Currency c) =>
    c.cp +
    c.sp * kCpPerSp +
    c.ep * kCpPerEp +
    c.gp * kCpPerGp +
    c.pp * kCpPerPp;

/// 以 cp 總額格式化為慣用幣別顯示（如 150 → 「1 gp 5 sp」）。
String formatCp(int cp) {
  if (cp == 0) return '0 cp';
  final parts = <String>[];
  final pp = cp ~/ kCpPerPp;
  cp %= kCpPerPp;
  final gp = cp ~/ kCpPerGp;
  cp %= kCpPerGp;
  final sp = cp ~/ kCpPerSp;
  cp %= kCpPerSp;
  if (pp > 0) parts.add('$pp pp');
  if (gp > 0) parts.add('$gp gp');
  if (sp > 0) parts.add('$sp sp');
  if (cp > 0) parts.add('$cp cp');
  return parts.join(' ');
}

/// 分層扣款（equipment-effects／inventory-items 規格）：
/// 1. 總財富不足 → 失敗回傳差額，財富不變
/// 2. 自幣值小到大先扣同階（cp→sp→ep→gp→pp）
/// 3. 餘額不足以整幣支付時，向上一階「換零」：只動用一枚最小的更大幣，
///    找零以 gp/sp/cp 慣用幣別回補（不產生 ep），不重排玩家其餘幣別組合
PayResult payFrom(Currency c, int priceCp) {
  if (priceCp <= 0) return PayResult.success(c);
  final total = totalCp(c);
  if (total < priceCp) {
    return PayResult.insufficient(c, priceCp - total);
  }

  // 由小到大逐階扣同額
  final values = [1, kCpPerSp, kCpPerEp, kCpPerGp, kCpPerPp];
  final counts = [c.cp, c.sp, c.ep, c.gp, c.pp];
  var remaining = priceCp;
  for (var i = 0; i < values.length && remaining > 0; i++) {
    final use = counts[i] < remaining ~/ values[i]
        ? counts[i]
        : remaining ~/ values[i];
    counts[i] -= use;
    remaining -= use * values[i];
  }

  // 剩餘零頭：打破一枚「面額大於零頭」的最小幣找零
  while (remaining > 0) {
    var broke = false;
    for (var i = 0; i < values.length; i++) {
      if (values[i] > remaining && counts[i] > 0) {
        counts[i] -= 1;
        var change = values[i] - remaining;
        remaining = 0;
        // 找零回補（gp/sp/cp，不產生 ep）
        counts[3] += change ~/ kCpPerGp;
        change %= kCpPerGp;
        counts[1] += change ~/ kCpPerSp;
        change %= kCpPerSp;
        counts[0] += change;
        broke = true;
        break;
      }
    }
    if (!broke) {
      // 理論上不可達（總額已驗足），保底避免無窮迴圈。
      return PayResult.insufficient(c, remaining);
    }
  }

  return PayResult.success(
    Currency(
      cp: counts[0],
      sp: counts[1],
      ep: counts[2],
      gp: counts[3],
      pp: counts[4],
    ),
  );
}
