import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { CharacterPrintSheet } from '@/components/character/character-print-sheet';
import { PrintMarks } from '@/components/character/print-fields';
import { DEMO_CHARACTERS } from '@/lib/demo/characters';

describe('紙本跑團角色卡', () => {
  it('顯示已消耗的起始值，但保持所有勾記格空白以便擦除重用', () => {
    const c = structuredClone(DEMO_CHARACTERS[0]);
    c.currentHp = 3;
    c.tempHp = 5;
    c.spellSlots = [{ level: 1, total: 3, used: 2 }];
    const html = renderToStaticMarkup(createElement(CharacterPrintSheet, { c }));
    expect(html).toContain('起始 3');
    expect(html).toContain('起始 5');
    expect(html).toMatch(/data-print-track="1 環法術位"[^]*?1 \/ 3/);
    expect(html).toContain('1 環法術位已用，3 個空白勾記格');
    expect(html).toContain('跑團紀錄頁');
    expect(html).toContain('目前數量');
    expect(html).toContain('場次筆記／待辦');
    expect(html).toContain('死亡豁免成功，3 個空白勾記格');
    expect(html).toContain('準備狀態');
    expect(html).not.toContain('checked');
  });

  it('非施法角色不出現虛構的法術位，私人旅程筆記不會夾帶進匯出', () => {
    const c = structuredClone(DEMO_CHARACTERS[1]);
    c.journalEntries = [{ id: 'private', title: 'PRIVATE_JOURNAL_TITLE', body: 'PRIVATE_JOURNAL_BODY', createdAt: '', updatedAt: '' }];
    const html = renderToStaticMarkup(createElement(CharacterPrintSheet, { c }));
    expect(html).not.toContain('data-print-track="1 環法術位"');
    expect(html).not.toContain('PRIVATE_JOURNAL');
    expect(html).toMatch(/生命骰（d\d+）已用/);
  });

  it('大額與零上限資源改用手寫數字，不產生無限勾記格', () => {
    for (const count of [0, 21, 1000000]) {
      const html = renderToStaticMarkup(createElement(PrintMarks, { count, label: '自訂資源' }));
      expect(html).toContain('剩餘');
      expect(html).not.toContain('個空白勾記格');
      expect(html.length).toBeLessThan(500);
    }
    expect(renderToStaticMarkup(createElement(PrintMarks, { count: 20, label: '資源' }))).toContain('20 個空白勾記格');
  });

  it('角色圖帶入既有的縮放與取景；未設定圖片時不印佔位圖', () => {
    const c = structuredClone(DEMO_CHARACTERS[0]);
    expect(renderToStaticMarkup(createElement(CharacterPrintSheet, { c }))).not.toContain('data-print-portrait');
    c.portraitUrl = '/images/unknown.jpg';
    c.portraitCenterX = 0.2;
    c.portraitCenterY = 0.8;
    c.portraitScale = 1.5;
    const html = renderToStaticMarkup(createElement(CharacterPrintSheet, { c }));
    expect(html).toContain('data-print-portrait');
    expect(html).toContain('alt="布蕾妲・晨鐘的角色圖"');
    expect(html).toContain('object-position:20% 80%;scale:1.5');
  });
});
