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
