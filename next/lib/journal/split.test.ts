import { describe, expect, it } from 'vitest';

import { joinJournalText, splitJournalText } from './split';

describe('日誌文字拆分', () => {
  it('第一行為標題，其餘為內文', () => {
    expect(splitJournalText('遇見老鐵匠\n他說東邊有礦坑\n還提到失蹤的隊伍')).toEqual({
      title: '遇見老鐵匠',
      body: '他說東邊有礦坑\n還提到失蹤的隊伍',
    });
  });

  it('只有一行時內文為空', () => {
    expect(splitJournalText('抵達城鎮')).toEqual({ title: '抵達城鎮', body: '' });
  });

  it('全空不建立', () => {
    expect(splitJournalText('')).toBeNull();
    expect(splitJournalText('  \n \n ')).toBeNull();
  });

  it('沒有標題但有內文時給「未命名」——清單上不該出現空白項', () => {
    expect(splitJournalText('\n只有內容')).toEqual({
      title: '未命名',
      body: '只有內容',
    });
  });

  it('拆開再合併可還原', () => {
    const text = '標題\n第一段\n第二段';
    const { title, body } = splitJournalText(text)!;
    expect(joinJournalText(title, body)).toBe(text);
  });
});
