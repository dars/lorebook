import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  ftFlattenEntries,
  ftFormatCastingTime,
  ftFormatRange,
  ftPlainText,
} from './fivetools';

const golden = (name: string) =>
  JSON.parse(
    readFileSync(path.resolve(import.meta.dirname, '../../../golden', name), 'utf-8'),
  );

type Case<I, O> = { desc: string; input: I; output: O };

describe('ftPlainText 對拍', () => {
  const cases = golden('ft_plain_text.json') as Case<{ text: string }, { text: string }>[];
  it('案例不為空', () => expect(cases.length).toBeGreaterThan(0));
  it.each(cases.map((c) => [c.desc, c] as const))('%s', (_d, c) => {
    expect(ftPlainText(c.input.text)).toBe(c.output.text);
  });
});

describe('ftFlattenEntries 對拍', () => {
  const cases = golden('ft_flatten_entries.json') as Case<
    { entries: unknown[] },
    { text: string }
  >[];
  it.each(cases.map((c) => [c.desc, c] as const))('%s', (_d, c) => {
    expect(ftFlattenEntries(c.input.entries)).toBe(c.output.text);
  });
});

describe('ftFormatCastingTime / ftFormatRange 對拍', () => {
  const cases = golden('ft_format.json') as Case<
    { castingTime?: unknown[]; range?: Record<string, unknown> },
    { text: string }
  >[];
  it.each(cases.map((c) => [c.desc, c] as const))('%s', (_d, c) => {
    const actual = c.input.castingTime
      ? ftFormatCastingTime(c.input.castingTime)
      : ftFormatRange(c.input.range!);
    expect(actual).toBe(c.output.text);
  });
});

import feats from '@/lib/rules/fixtures/srd-feats.json';
it('filter 顯示第一欄標籤，不顯示查詢條件', () => {
  expect(ftPlainText("{@filter 工具|items|type=tool;artisan's tools;instrument;gaming set}")).toBe('工具');
  expect(ftPlainText('{@filter 牧師|spells|level=0;1|class=Cleric}')).toBe('牧師');
  expect(ftPlainText('{@spell Fireball|XPHB|火球術}')).toBe('火球術');
});
it('實際技藝精湛與法術新手專長文字沒有篩選語法', () => {
  const skilled = ftFlattenEntries(feats.find(f => f.eng_name === 'Skilled')!.data.entries);
  const magic = ftFlattenEntries(feats.find(f => f.eng_name === 'Magic Initiate')!.data.entries);
  expect(skilled).toContain('技能或工具熟練');
  expect(magic).toContain('牧師、德魯伊或法師法術列表');
  expect(skilled + magic).not.toMatch(/type=|level=|class=/);
});
