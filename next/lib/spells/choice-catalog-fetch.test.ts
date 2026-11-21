import { beforeEach, expect, it, vi } from 'vitest';
import { CatalogSpell } from '@/lib/catalog/types';
import { CustomSpell } from './types';
import { fetchChoiceSpells } from './choice-catalog-fetch';

const mocks = vi.hoisted(() => ({ catalog: vi.fn(), custom: vi.fn() }));
vi.mock('@/lib/catalog/fetch', () => ({ fetchSpells: mocks.catalog }));
vi.mock('./actions', () => ({ fetchCustomSpells: mocks.custom }));

beforeEach(() => {
  mocks.catalog.mockResolvedValue({ rows: [CatalogSpell.parse({ id: 'system', name: '系統', level: 1 })], error: null });
  mocks.custom.mockResolvedValue({ spells: [CustomSpell.parse({ id: 'own', name: '收藏法術', level: 1, description: '自訂' })], error: null });
});

it('建角、升級與補選共用的實際載入器會合併系統與自創收藏', async () => {
  const result = await fetchChoiceSpells();
  expect(result.error).toBeNull();
  expect(result.rows.map(s => s.id)).toEqual(['system', 'custom:own']);
  expect(result.rows[1].homebrew?.homebrewId).toBe('own');
});

it('自創載入失敗會明確回報，仍保留可用的系統選項', async () => {
  mocks.custom.mockResolvedValue({ spells: [], error: '連線失敗' });
  const result = await fetchChoiceSpells();
  expect(result.error).toContain('無法載入');
  expect(result.rows.map(s => s.id)).toEqual(['system']);
});
