import { describe, expect, it } from 'vitest';

import { withGridSquares } from './range';

describe('射程的格數標註', () => {
  it('看得出呎數就換算格數', () => {
    expect(withGridSquares('60呎')).toBe('60呎（12格）');
    expect(withGridSquares('120呎')).toBe('120呎（24格）');
  });

  it('單位寫法不同一律正規化成「N呎」', () => {
    // 自創法術是使用者手打的，照英文原文寫成 60 ft 很常見；同一張卡上的射程
    // 該長一個樣子，不然看起來像兩種東西。
    for (const r of ['30 呎', '30ft', '30 ft', '30 ft.', '30 FT', '30 feet', '30 Foot']) {
      expect(withGridSquares(r), r).toBe('30呎（6格）');
    }
  });

  it('距離後面的補充說明保留', () => {
    expect(withGridSquares('60 ft. (sphere)')).toBe('60呎（12格） (sphere)');
    expect(withGridSquares('60呎 半徑')).toBe('60呎（12格） 半徑');
  });

  it('ft 後面黏著其他字母時不當成單位', () => {
    expect(withGridSquares('60 fts')).toBe('60 fts');
  });

  it('沒有呎數的射程原樣回傳', () => {
    for (const r of ['觸及', '自身', '視線', '無限', '特殊', '']) {
      expect(withGridSquares(r), r).toBe(r);
    }
  });

  it('不足一格就不標格數，但單位一樣正規化', () => {
    // 5 呎以下在方格圖上都是同一格，寫「0格」只會讓人困惑。
    expect(withGridSquares('4呎')).toBe('4呎');
    expect(withGridSquares('4 ft')).toBe('4呎');
  });

  it('自身加範圍這類複合描述不誤判', () => {
    // 開頭不是數字就不動它。
    expect(withGridSquares('自身（15呎錐形）')).toBe('自身（15呎錐形）');
  });
});
