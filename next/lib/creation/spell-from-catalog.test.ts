import { describe, expect, it } from 'vitest';

import { CatalogSpell } from '@/lib/catalog/types';
import { castKindOf, spellFromCatalog } from './spell-from-catalog';

/** 以 zod parse 建測資——確保測的是真的通過 schema 的形狀。 */
const spell = (over: Record<string, unknown>) =>
  CatalogSpell.parse({
    id: 'x',
    name: '測試法術',
    level: 1,
    ...over,
  });

describe('內容庫法術 → 角色卡法術', () => {
  it('由 casting_time 的 unit 決定 castKind', () => {
    expect(castKindOf([{ unit: 'action', number: 1 }])).toBe('action');
    expect(castKindOf([{ unit: 'bonus', number: 1 }])).toBe('bonus');
    expect(castKindOf([{ unit: 'reaction', number: 1 }])).toBe('reaction');
    expect(castKindOf([{ unit: 'minute', number: 10 }])).toBe('other');
  });

  it('casting_time 缺漏或畸形時給 other，不假設是動作', () => {
    expect(castKindOf([])).toBe('other');
    expect(castKindOf([null])).toBe('other');
    expect(castKindOf(['action'])).toBe('other');
  });

  // 這是實際壞過的地方：castKind 一律寫死 action，會讓護盾術（反應）與
  // 迷蹤步（附贈）在行動頁全被歸到動作區。
  it('反應法術不會被歸成動作', () => {
    const s = spellFromCatalog(
      spell({
        name: '護盾術',
        eng_name: 'Shield',
        casting_time: [{ unit: 'reaction', number: 1 }],
      }),
    );
    expect(s.castKind).toBe('reaction');
    expect(s.nameEn).toBe('Shield');
  });

  it('描述壓成純文字全文，不留空', () => {
    const s = spellFromCatalog(
      spell({ entries: ['造成 {@damage 8d6} 火焰傷害。'] }),
    );
    expect(s.description).toContain('8d6');
    expect(s.description).not.toContain('{@damage');
  });

  it('射程與施法時間都有值', () => {
    const s = spellFromCatalog(
      spell({
        range: { type: 'point', distance: { type: 'feet', amount: 60 } },
        casting_time: [{ unit: 'action', number: 1 }],
      }),
    );
    expect(s.range).not.toBe('');
    expect(s.castingTime).not.toBe('');
  });

  it('帶入專注旗標與環數', () => {
    const s = spellFromCatalog(spell({ level: 3, concentration: true }));
    expect(s.level).toBe(3);
    expect(s.concentration).toBe(true);
    expect(s.prepared).toBe(true);
  });
});
