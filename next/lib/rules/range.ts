/**
 * 射程的格數標註。
 *
 * 跑團在方格圖上跑，「60呎」要先除以 5 才知道能不能構到——Flutter 端的法術卡
 * 直接寫「120 FT (24格)」就是為了省掉這步心算。移植時這個附註掉了。
 *
 * 只在看得出呎數時才加；「觸及」「自身」「視線」這些沒有格數可言，原樣回傳。
 *
 * 單位認中文「呎」也認英文 ft／feet／foot：內容庫是中文，但自創法術是使用者
 * 手打的，照英文原文寫成「60 ft」很常見。認得出來的距離一律正規化成「N呎」：
 * 同一張卡上「60呎（12格）」與「60 ft（12格）」並列，看起來像兩種東西。
 * 距離之後的補充說明（「(sphere)」「半徑」）原樣保留。
 */
const FEET_PER_SQUARE = 5;

// \b 擋掉「60 fts」這類黏著其他字母的情況；「ft.」的句點一併吃掉，否則正規化
// 後會留下「60呎（12格）.」。
const FEET = /^(\d+)\s*(?:呎|(?:ft|feet|foot)\b\.?)/i;

export function withGridSquares(range: string): string {
  const trimmed = range.trim();
  const m = FEET.exec(trimmed);
  if (!m) return range;
  const feet = Number(m[1]);
  const squares = Math.floor(feet / FEET_PER_SQUARE);
  const rest = trimmed.slice(m[0].length).trim();
  return [
    `${feet}呎${squares > 0 ? `（${squares}格）` : ''}`,
    rest,
  ].filter(Boolean).join(' ');
}
