import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('../../app/globals.css', import.meta.url), 'utf8');
const dark = css.slice(css.indexOf('@theme'), css.indexOf(":root[data-theme='light']"));
const light = css.slice(css.indexOf(":root[data-theme='light']"), css.indexOf('\nhtml {'));
function color(block: string, name: string): string {
  const value = block.match(new RegExp(`--color-${name}:\\s*(#[a-f0-9]{6})`))?.[1];
  if (!value) throw new Error(`Missing color: ${name}`);
  return value;
}
function luminance(hex: string): number {
  return hex.slice(1).match(/../g)!.map(value => parseInt(value, 16) / 255)
    .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
    .reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
}
function contrast(a: string, b: string): number {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + .05) / (values[1] + .05);
}

describe('閱讀文字對比', () => {
  for (const [name, theme] of [['深色', dark], ['淺色', light]]) {
    it(`${name}的閱讀文字在三種底色上達 AA`, () => {
      for (const foreground of ['text-primary', 'text-secondary', 'text-light', 'section-label']) {
        for (const background of ['surface-0', 'surface-1', 'surface-2']) {
          expect(contrast(color(theme, foreground), color(theme, background))).toBeGreaterThanOrEqual(4.5);
        }
      }
    });
  }
  it('登入金底按鈕使用不隨主題變動的深色前景', () => {
    expect(contrast(color(dark, 'gold-solid'), color(dark, 'on-gold'))).toBeGreaterThanOrEqual(4.5);
    expect(css).toMatch(/\.login-primary-button\s*\{[^}]*color: var\(--color-on-gold\)/);
  });
});
