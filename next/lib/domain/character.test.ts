import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { Character, parseCharacter } from './character';

/** golden/ 在 repo 根目錄，由 Flutter 端產生，兩邊共用。 */
const golden = (name: string) =>
  JSON.parse(
    readFileSync(path.resolve(__dirname, '../../../golden', name), 'utf-8'),
  );

describe('Character 型別能解析既有的真實資料', () => {
  const real = golden('real_characters.json') as unknown[];

  it('樣本不為空——空陣列會讓下面的測試全部空轉而假性通過', () => {
    expect(real.length).toBeGreaterThan(0);
  });

  it.each(real.map((c) => [(c as { name: string }).name, c] as const))(
    '%s',
    (_name, raw) => {
      expect(() => parseCharacter(raw)).not.toThrow();
    },
  );

  it('解析後的欄位與原始 JSON 一致（不是靠預設值蒙混）', () => {
    const devlin = real.find(
      (c) => (c as { name: string }).name === '戴夫林',
    ) as Record<string, unknown>;
    const c = parseCharacter(devlin);

    expect(c.className).toBe('法師');
    expect(c.level).toBe(4);
    expect(c.abilityScores.int_.score).toBe(devlin.abilityScores &&
      (devlin.abilityScores as Record<string, { score: number }>).int_.score);
    expect(c.features.length).toBe((devlin.features as unknown[]).length);
    expect(c.spells.length).toBe((devlin.spells as unknown[]).length);
  });
});

describe('缺欄位以預設值補齊（舊角色比新欄位早存在）', () => {
  const minimal = {
    id: 'x',
    name: '最小',
    abilityScores: Object.fromEntries(
      ['str', 'dex', 'con', 'int_', 'wis', 'cha'].map((k) => [
        k,
        { score: 10, modifier: 0 },
      ]),
    ),
  };

  it('僅含必填欄位仍可解析', () => {
    const c = parseCharacter(minimal);
    expect(c.level).toBe(1);
    expect(c.ac).toBe(10);
    expect(c.currency.gp).toBe(0);
    expect(c.toolProficiencies).toEqual([]);
    expect(c.concentrationSpell).toBeNull();
  });

  it('必填欄位缺失才報錯', () => {
    expect(() => Character.parse({ name: '無 id' })).toThrow();
  });
});
