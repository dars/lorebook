import type { Currency } from '@/lib/domain/character';

/**
 * 貨幣運算，移植自 Flutter 端的 `currency_math.dart`。
 * 驗收依據為 golden/pay_from.json 與 golden/format_cp.json。
 */

export const CP_PER_SP = 10;
export const CP_PER_EP = 50;
export const CP_PER_GP = 100;
export const CP_PER_PP = 1000;

export type PayResult =
  | { ok: true; remaining: Currency; shortfallCp: 0 }
  | { ok: false; remaining: Currency; shortfallCp: number };

/** 財富總值（cp 計）。 */
export const totalCp = (c: Currency) =>
  c.cp + c.sp * CP_PER_SP + c.ep * CP_PER_EP + c.gp * CP_PER_GP + c.pp * CP_PER_PP;

/** 以 cp 總額格式化為慣用幣別顯示（150 → 「1 gp 5 sp」）。 */
export function formatCp(cp: number): string {
  if (cp === 0) return '0 cp';
  const parts: string[] = [];
  const pp = Math.floor(cp / CP_PER_PP);
  cp %= CP_PER_PP;
  const gp = Math.floor(cp / CP_PER_GP);
  cp %= CP_PER_GP;
  const sp = Math.floor(cp / CP_PER_SP);
  cp %= CP_PER_SP;
  if (pp > 0) parts.push(`${pp} pp`);
  if (gp > 0) parts.push(`${gp} gp`);
  if (sp > 0) parts.push(`${sp} sp`);
  if (cp > 0) parts.push(`${cp} cp`);
  return parts.join(' ');
}

/**
 * 分層扣款：
 * 1. 總財富不足 → 失敗回傳差額，財富不變
 * 2. 自幣值小到大先扣同階（cp→sp→ep→gp→pp）
 * 3. 餘額不足以整幣支付時向上「換零」：只動用一枚最小的更大幣，找零以
 *    gp/sp/cp 回補（**不產生 ep**），不重排玩家其餘幣別組合
 */
export function payFrom(c: Currency, priceCp: number): PayResult {
  if (priceCp <= 0) return { ok: true, remaining: c, shortfallCp: 0 };
  const total = totalCp(c);
  if (total < priceCp) {
    return { ok: false, remaining: c, shortfallCp: priceCp - total };
  }

  // index 對應 [cp, sp, ep, gp, pp]
  const values = [1, CP_PER_SP, CP_PER_EP, CP_PER_GP, CP_PER_PP];
  const counts = [c.cp, c.sp, c.ep, c.gp, c.pp];
  let remaining = priceCp;

  for (let i = 0; i < values.length && remaining > 0; i++) {
    const use = Math.min(counts[i], Math.floor(remaining / values[i]));
    counts[i] -= use;
    remaining -= use * values[i];
  }

  while (remaining > 0) {
    let broke = false;
    for (let i = 0; i < values.length; i++) {
      if (values[i] > remaining && counts[i] > 0) {
        counts[i] -= 1;
        let change = values[i] - remaining;
        remaining = 0;
        counts[3] += Math.floor(change / CP_PER_GP);
        change %= CP_PER_GP;
        counts[1] += Math.floor(change / CP_PER_SP);
        change %= CP_PER_SP;
        counts[0] += change;
        broke = true;
        break;
      }
    }
    if (!broke) {
      // 理論上不可達（總額已驗足），保底避免無窮迴圈。
      return { ok: false, remaining: c, shortfallCp: remaining };
    }
  }

  return {
    ok: true,
    remaining: { cp: counts[0], sp: counts[1], ep: counts[2], gp: counts[3], pp: counts[4] },
    shortfallCp: 0,
  };
}
