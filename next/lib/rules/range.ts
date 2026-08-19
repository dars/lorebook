/**
 * 射程的格數標註。
 *
 * 跑團在方格圖上跑，「60呎」要先除以 5 才知道能不能構到——Flutter 端的法術卡
 * 直接寫「120 FT (24格)」就是為了省掉這步心算。移植時這個附註掉了。
 *
 * 只在看得出呎數時才加；「觸及」「自身」「視線」這些沒有格數可言，原樣回傳。
 */
const FEET_PER_SQUARE = 5;

export function withGridSquares(range: string): string {
  const m = /^(\d+)\s*呎/.exec(range.trim());
  if (!m) return range;
  const squares = Math.floor(Number(m[1]) / FEET_PER_SQUARE);
  if (squares <= 0) return range;
  return `${range}（${squares}格）`;
}
