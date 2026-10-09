/**
 * 射程的格數標註。
 *
 * 跑團在方格圖上跑，「60呎」要先除以 5 才知道能不能構到——Flutter 端的法術卡
 * 直接寫「120 FT (24格)」就是為了省掉這步心算。移植時這個附註掉了。
 *
 * 只在看得出呎數時才加；「觸及」「自身」「視線」這些沒有格數可言，原樣回傳。
 *
 * 單位認中文「呎」也認英文 ft／feet／foot：內容庫是中文，但自創法術是使用者
 * 手打的，照英文原文寫成「60 ft」很常見，只認「呎」會讓同一個射程有的換格數、
 * 有的不換。原文照留，只在後面附格數——改寫使用者的字不是這裡的事。
 */
const FEET_PER_SQUARE = 5;

// \b 擋掉「60 fts」這類黏著其他字母的情況；「ft.」的句點落在 \b 之後，不影響。
const FEET = /^(\d+)\s*(?:呎|(?:ft|feet|foot)\b)/i;

export function withGridSquares(range: string): string {
  const m = FEET.exec(range.trim());
  if (!m) return range;
  const squares = Math.floor(Number(m[1]) / FEET_PER_SQUARE);
  if (squares <= 0) return range;
  return `${range}（${squares}格）`;
}
