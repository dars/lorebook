import { describe, expect, it } from 'vitest';

import { withGridSquares } from './range';

describe('射程的格數標註', () => {
  it('看得出呎數就換算格數', () => {
    expect(withGridSquares('60呎')).toBe('60呎（12格）');
    expect(withGridSquares('120呎')).toBe('120呎（24格）');
    expect(withGridSquares('30 呎')).toBe('30 呎（6格）');
  });

  it('英文單位與中文同等看待', () => {
    // 自創法術是使用者手打的，照英文原文寫成 60 ft 很常見。
    expect(withGridSquares('60ft')).toBe('60ft（12格）');
    expect(withGridSquares('60 ft')).toBe('60 ft（12格）');
    expect(withGridSquares('60 ft.')).toBe('60 ft.（12格）');
    expect(withGridSquares('60 FT')).toBe('60 FT（12格）');
    expect(withGridSquares('150 feet')).toBe('150 feet（30格）');
    expect(withGridSquares('5 foot')).toBe('5 foot（1格）');
  });

  it('ft 後面黏著其他字母時不當成單位', () => {
    expect(withGridSquares('60 fts')).toBe('60 fts');
  });

  it('沒有呎數的射程原樣回傳', () => {
    for (const r of ['觸及', '自身', '視線', '無限', '特殊', '']) {
      expect(withGridSquares(r), r).toBe(r);
    }
  });

  it('不足一格就不標', () => {
    // 5 呎以下在方格圖上都是同一格，寫「0格」只會讓人困惑。
    expect(withGridSquares('4呎')).toBe('4呎');
  });

  it('自身加範圍這類複合描述不誤判', () => {
    // 開頭不是數字就不動它。
    expect(withGridSquares('自身（15呎錐形）')).toBe('自身（15呎錐形）');
  });
});
