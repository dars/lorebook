import { describe, expect, it } from 'vitest';

import { randomId } from '@/lib/creation/id';
import { collectRow } from './collect';
import { parseHomebrew } from './types';

/**
 * 收藏＝複製，且與來源完全脫鉤（openspec homebrew-share D2）。
 *
 * 這裡守的是那句話在資料上的具體樣子：新 id、文件裡的 id 也換掉、來源標記
 * 帶上、沒有任何回連來源的欄位。
 */

const background = parseHomebrew('background', {
  id: 'author-bg-id',
  name: '工程師',
  abilities: ['INT', 'DEX', 'CON'],
  skills: ['調查', '奧秘'],
  originFeat: '技藝精湛',
})!;

const subclass = parseHomebrew('subclass', {
  id: 'author-sc-id',
  name: '烈焰學派',
  classEn: 'Wizard',
  levels: [3, 6, 10, 14],
  features: [{ level: 3, name: '燃焰', description: '' }],
})!;

const opts = {
  id: 'my-new-id',
  userId: 'user-a',
  token: 'tok123',
  sourceUpdatedAt: '2026-08-20T00:00:00Z',
};

describe('collectRow', () => {
  it('用新 id，且文件裡那份 id 也一起換掉', () => {
    const row = collectRow(background, opts);
    expect(row.id).toBe('my-new-id');
    // 沿用來源的 id 會讓文件與列的主鍵不一致，之後編輯就寫到別的地方去了
    expect((row.data as { id: string }).id).toBe('my-new-id');
  });

  it('帶上來源標記，且沒有任何回連來源的欄位', () => {
    const row = collectRow(background, { ...opts, note: '  阿凱的  ' });
    expect(row.source_token).toBe('tok123');
    expect(row.source_updated_at).toBe('2026-08-20T00:00:00Z');
    expect(row.source_note).toBe('阿凱的');
    // 來源的 user_id、原本的 id 都不留——留了只會誘使日後有人寫回查
    expect(Object.keys(row)).not.toContain('source_user_id');
    expect(Object.keys(row)).not.toContain('source_id');
  });

  it('空白備註存 null，不存空字串', () => {
    expect(collectRow(background, opts).source_note).toBeNull();
    expect(collectRow(background, { ...opts, note: '   ' }).source_note).toBeNull();
  });

  it('提升欄位依型別而異：背景只有 name，子職還有 class_en', () => {
    expect(collectRow(background, opts).name).toBe('工程師');
    expect(collectRow(background, opts).class_en).toBeUndefined();

    const row = collectRow(subclass, opts);
    expect(row.name).toBe('烈焰學派');
    expect(row.class_en).toBe('Wizard');
  });

  it('兩個使用者收同一份：各得各的 id，內容相同（tasks 5.6）', () => {
    const a = collectRow(background, { ...opts, id: randomId(), userId: 'user-a' });
    const b = collectRow(background, { ...opts, id: randomId(), userId: 'user-b' });

    expect(a.id).not.toBe(b.id);
    expect(a.user_id).not.toBe(b.user_id);
    // 同一個來源，因此 source_token 相同——這正是重複收藏提示的依據
    expect(a.source_token).toBe(b.source_token);
    expect((a.data as { name: string }).name).toBe(
      (b.data as { name: string }).name,
    );
  });

  it('作者的文件不被就地改動——複製不該汙染來源物件', () => {
    collectRow(background, opts);
    expect(background.data.id).toBe('author-bg-id');
  });
});
