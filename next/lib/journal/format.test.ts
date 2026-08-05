import { describe, expect, it } from 'vitest';

import { fmtJournalRelativeDate } from './format';

describe('日誌相對日期', () => {
  const now = new Date(2026, 7, 5, 12, 0);

  it.each([
    [new Date(2026, 7, 5, 1, 0), '今天'],
    [new Date(2026, 7, 4, 23, 30), '昨天'],
    [new Date(2026, 7, 2), '3 天前'],
    [new Date(2026, 6, 20), '2026/7/20'],
  ])('%s → %s', (d, expected) => {
    expect(fmtJournalRelativeDate(d, now)).toBe(expected);
  });

  it('以「日」為單位比較，不是 24 小時', () => {
    // 昨晚 23:00 距今 13 小時，但仍是「昨天」。
    expect(fmtJournalRelativeDate(new Date(2026, 7, 4, 23, 0), now)).toBe('昨天');
  });
});
