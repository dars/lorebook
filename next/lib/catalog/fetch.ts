import { z } from 'zod';

import {
  CATALOG_SOURCE,
  CatalogClass,
  CatalogClassFeature,
  CatalogItem,
  CatalogSpell,
  CatalogSubclass,
} from './types';
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

/**
 * 某職業的子職與特性。
 *
 * 一次取回兩者：升級時需要「本職業該等級的特性」與「所選子職累積到該等級的
 * 特性」，分兩次查只是多一次往返。
 *
 * 以英文職業名查 class_id——角色卡存的是 classNameEn，而 classes 表的中文名
 * 欄位中英混雜不可靠（catalog_repository 的既有註解也這麼說）。
 */
export async function fetchClassProgression(
  classEn: string,
  maxLevel: number,
): Promise<{
  subclasses: CatalogSubclass[];
  features: CatalogClassFeature[];
  error: string | null;
}> {
  const supabase = createAnonClient();

  const { data: classRows, error: classErr } = await supabase
    .from('classes')
    .select('id, name, eng_name')
    .eq('source', CATALOG_SOURCE)
    .eq('eng_name', classEn);

  if (classErr) return { subclasses: [], features: [], error: classErr.message };

  const cls = CatalogClass.array().safeParse(classRows);
  if (!cls.success || cls.data.length === 0) {
    return { subclasses: [], features: [], error: null };
  }
  const classId = cls.data[0].id;

  const [subRes, featRes] = await Promise.all([
    supabase
      .from('subclasses')
      .select('id, name, eng_name, short_name, class_id, data')
      .eq('class_id', classId)
      .eq('source', CATALOG_SOURCE)
      .order('page'),
    supabase
      .from('class_features')
      .select('id, name, eng_name, level, is_subclass, subclass_short_name, data')
      .eq('class_id', classId)
      .eq('source', CATALOG_SOURCE)
      .lte('level', maxLevel)
      .order('level')
      .order('page'),
  ]);

  if (subRes.error || featRes.error) {
    return {
      subclasses: [],
      features: [],
      error: subRes.error?.message ?? featRes.error?.message ?? null,
    };
  }

  const subs = CatalogSubclass.array().safeParse(subRes.data);
  const feats = CatalogClassFeature.array().safeParse(featRes.data);

  return {
    subclasses: subs.success ? subs.data : [],
    features: feats.success ? feats.data : [],
    error:
      subs.success && feats.success ? null : describe('子職與職業特性', (subs.success ? feats : subs).error!),
  };
}
