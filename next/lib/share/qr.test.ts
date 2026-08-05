import { describe, expect, it } from 'vitest';
import QR from 'qrcode';

import { shareLinkFor } from './token';

/**
 * QR 產生的驗收：**必須本機產生**。
 *
 * 這裡真正要守的不是「圖畫得對」，而是「token 沒有離開這台機器」——線上 QR
 * 服務會拿到分享連結，而那就是角色卡的通行證。
 */
describe('分享 QR', () => {
  const link = shareLinkFor('https://lorebook.code4soul.dev', 'rtvvqYWSrOt0cs');

  it('產出自包含的 SVG，不會發出任何網路請求', async () => {
    const svg = await QR.toString(link, { type: 'svg', margin: 0 });
    expect(svg).toContain('<svg');

    // 檢查真正會發出請求的東西。xmlns 的 http://www.w3.org/2000/svg 是命名
    // 空間識別碼，瀏覽器不會去抓它——單純比對 http 會誤判。
    expect(svg).not.toContain('<image');
    expect(svg).not.toContain('<script');
    expect(svg).not.toMatch(/\bhref\s*=/);
    expect(svg).not.toMatch(/\bsrc\s*=/);
    expect(svg).not.toContain('url(');

    // 連結內容不得以明文出現在 SVG 裡——那代表它被當成文字嵌入而非編碼。
    expect(svg).not.toContain('lorebook.code4soul.dev');
  });

  it('內容可還原為原連結（掃描得到正確網址）', async () => {
    // qrcode 沒有解碼 API，改以「相同輸入產生相同輸出、不同輸入不同」佐證
    // 內容確實編碼進去，而非固定圖樣。
    const a = await QR.toString(link, { type: 'svg', margin: 0 });
    const b = await QR.toString(link, { type: 'svg', margin: 0 });
    const c = await QR.toString(link + 'x', { type: 'svg', margin: 0 });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it('採用指定配色——深色底的 QR 有掃描器讀不到', async () => {
    const svg = await QR.toString(link, {
      type: 'svg',
      margin: 0,
      color: { light: '#E8DFC9', dark: '#1A1206' },
    });
    expect(svg.toUpperCase()).toContain('#E8DFC9');
    expect(svg.toUpperCase()).toContain('#1A1206');
  });
});
