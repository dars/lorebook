import { describe, expect, it } from 'vitest';

import { parseCharacter } from '@/lib/domain/character';
import { backfillSpeciesHpPerLevel } from './backfill';

/**
 * 舊角色的每級額外 HP 回填（custom-species D3）。
 *
 * 回填在 parse 之前——parse 之後就分不出「文件沒有這個欄位」與「這個欄位
 * 就是 0」，而那兩者要的行為不同。
 */

const dwarf = {
  id: 'c1',
  name: '布蕾妲',
  species: '矮人',
  abilityScores: Object.fromEntries(
    ['str', 'dex', 'con', 'int_', 'wis', 'cha'].map((k) => [
      k,
      { score: 10, modifier: 0 },
    ]),
  ),
};

describe('backfillSpeciesHpPerLevel', () => {
  it('沒有這個欄位的矮人補為 1', () => {
    const c = parseCharacter(backfillSpeciesHpPerLevel(dwarf));
    expect(c.speciesHpPerLevel).toBe(1);
  });

  it('沒有這個欄位的人類補為 0', () => {
    const c = parseCharacter(
      backfillSpeciesHpPerLevel({ ...dwarf, species: '人類' }),
    );
    expect(c.speciesHpPerLevel).toBe(0);
  });

  it('未知種族不補——留給 schema 預設 0，與回填前的行為相同', () => {
    const c = parseCharacter(
      backfillSpeciesHpPerLevel({ ...dwarf, species: '石裔' }),
    );
    expect(c.speciesHpPerLevel).toBe(0);
  });

  it('已有這個欄位就不動——自訂種族的快照值不被內建清單覆寫', () => {
    // 自訂種族恰好與內建同名時，覆寫會把使用者的值改掉。
    const raw = { ...dwarf, speciesHpPerLevel: 2 };
    expect(backfillSpeciesHpPerLevel(raw)).toBe(raw);
    expect(parseCharacter(backfillSpeciesHpPerLevel(raw)).speciesHpPerLevel).toBe(2);
  });

  it('非物件原樣回傳，不丟例外', () => {
    expect(backfillSpeciesHpPerLevel(null)).toBeNull();
    expect(backfillSpeciesHpPerLevel('壞資料')).toBe('壞資料');
  });
});
