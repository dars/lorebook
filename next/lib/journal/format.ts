/**
 * 日誌日期的相對表述，移植自 Flutter 端的 `fmtJournalRelativeDate`。
 * 以「日」為單位比較（非 24 小時），所以昨晚 23:00 與今早 01:00 是「昨天」。
 */
export function fmtJournalRelativeDate(d: Date, now = new Date()): string {
  const startOf = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(d)) / 86_400_000);
  if (days <= 0) return '今天';
  if (days === 1) return '昨天';
  if (days < 7) return `${days} 天前`;
  return fmtJournalDate(d);
}

export const fmtJournalDate = (d: Date) =>
  `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
