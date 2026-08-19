import { describe, expect, it } from 'vitest';

import { pipDelta, pipFilled } from './pips';

/** store 的行為：剩餘量加上 delta，夾在 0..total 之間。 */
const apply = (total: number, used: number, delta: number) =>
  total - Math.max(0, Math.min(total, total - used + delta));

/** 把一列點格畫成字串，方便直接看方向。●＝可用、○＝已消耗。 */
const render = (total: number, used: number) =>
  Array.from({ length: total }, (_, i) => (pipFilled(i, total, used) ? '●' : '○')).join('');

describe('點數格', () => {
  it('亮的靠左，由右往左遞減', () => {
    expect(render(4, 0)).toBe('●●●●');
    expect(render(4, 1)).toBe('●●●○');
    expect(render(4, 3)).toBe('●○○○');
    expect(render(4, 4)).toBe('○○○○');
  });

  it('點最右邊那顆亮的＝消耗 1 格', () => {
    const used = apply(4, 0, pipDelta(3, 4, 0));
    expect(used).toBe(1);
    expect(render(4, used)).toBe('●●●○');
  });

  it('點最左邊那顆暗的＝回復 1 格', () => {
    const used = apply(4, 4, pipDelta(0, 4, 4));
    expect(used).toBe(3);
    expect(render(4, used)).toBe('●○○○');
  });

  it('點到的那一格，點完一定變成相反狀態', () => {
    for (const total of [1, 3, 5, 9]) {
      for (let used = 0; used <= total; used++) {
        for (let i = 0; i < total; i++) {
          const before = pipFilled(i, total, used);
          const after = pipFilled(i, total, apply(total, used, pipDelta(i, total, used)));
          expect(after, `total=${total} used=${used} i=${i}`).toBe(!before);
        }
      }
    }
  });

  it('點最左邊那顆亮的＝全部消耗；點最右邊那顆暗的＝全部回復', () => {
    expect(apply(4, 0, pipDelta(0, 4, 0))).toBe(4);
    expect(apply(4, 4, pipDelta(3, 4, 4))).toBe(0);
  });
});
