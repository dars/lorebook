import { z } from 'zod';

import { CATALOG_SOURCE, CatalogItem, CatalogSpell } from './types';
import { createAnonClient } from '@/lib/supabase/server';

/**
 * 內容庫查詢。
 *
 * 用匿名 client：內容庫是 SRD 公開資料，與檢視者身分無關。查詢一律限定
 * 單一書源（catalog-source 政策），避免混入其他書源的條目。
 *
 * 失敗時回傳空陣列並附錯誤——內容庫不可用不該讓整頁崩潰，UI 據此降級。
 */

export type CatalogResult<T> = { rows: T[]; error: string | null };

/**
 * 把 Zod 的錯誤壓成一句可診斷的訊息。
 *
 * 「格式非預期」這種訊息在真的出錯時毫無用處——要能指出是哪一列的哪個欄位，
 * 否則只能靠猜。取前三個問題即足以定位，全列出反而淹沒重點。
 */
function describe(what: string, err: z.ZodError): string {
  const issues = err.issues
    .slice(0, 3)
    .map((i) => `${i.path.join('.')}：${i.message}`)
    .join('；');
  return `${what}資料格式非預期（${issues}）`;
}

export async function fetchSpells(): Promise<CatalogResult<CatalogSpell>> {
  const supabase = createAnonClient();
  const { data, error } = await supabase
    .from('v_spells')
    .select('*')
    .eq('source', CATALOG_SOURCE)
    .order('level')
    .order('name');

  if (error) return { rows: [], error: error.message };
  const parsed = CatalogSpell.array().safeParse(data);
  return parsed.success
    ? { rows: parsed.data, error: null }
    : { rows: [], error: describe('法術', parsed.error) };
}

export async function fetchItems(): Promise<CatalogResult<CatalogItem>> {
  const supabase = createAnonClient();
  const { data, error } = await supabase
    .from('v_items')
    .select('*')
    .eq('source', CATALOG_SOURCE)
    .order('category')
    .order('subcategory')
    .order('name');

  if (error) return { rows: [], error: error.message };
  const parsed = CatalogItem.array().safeParse(data);
  return parsed.success
    ? { rows: parsed.data, error: null }
    : { rows: [], error: describe('物品', parsed.error) };
}
