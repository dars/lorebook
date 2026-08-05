/**
 * 把單一文字區的內容拆成標題與內文：**第一行為標題、其餘為內文**。
 *
 * 與 Flutter 的編輯器一致——使用者只面對一個文字區，不必先想標題再想內容。
 * 標題為空但有內文時給「未命名」，避免清單上出現無法辨識的空白項。
 */
export function splitJournalText(text: string): {
  title: string;
  body: string;
} | null {
  const lines = text.split('\n');
  const title = (lines[0] ?? '').trim();
  const body = lines.slice(1).join('\n').trim();
  if (!title && !body) return null; // 全空：不建立
  return { title: title || '未命名', body };
}

export const joinJournalText = (title: string, body: string) =>
  body ? `${title}\n${body}` : title;
