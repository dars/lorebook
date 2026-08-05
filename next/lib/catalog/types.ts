import { z } from 'zod';

/**
 * 內容庫的唯讀型別（Supabase 的 `v_spells` / `v_items` view）。
 *
 * 查詢固定限定單一書源 XPHB（catalog-source 政策）；內容範圍為 SRD 5.2，
 * 含專有名的條目一律以 SRD 官方改名呈現。
 *
 * 欄位為 snake_case——直接對應資料庫欄位，不做轉換層。多一層改名只會在
 * 出錯時多一個要對照的地方。
 */

export const CatalogSpell = z.object({
  id: z.string(),
  name: z.string(),
  eng_name: z.string().nullish().transform((v) => v ?? null),
  level: z.number().int(),
  school: z.string().default(''),
  school_name: z.string().default(''),
  ritual: z.boolean().default(false),
  concentration: z.boolean().default(false),
  // 成分欄位在資料庫中確實有 null（comp_v 10 列、comp_s 38 列）。
  // Zod 的 .default() **只在鍵缺失時**套用，明確的 null 仍會失敗——
  // 這是實際踩到的坑，不是預防性寫法。
  comp_v: z.boolean().nullish().transform((v) => v ?? false),
  comp_s: z.boolean().nullish().transform((v) => v ?? false),
  comp_m: z.unknown().nullish().transform((v) => v ?? null),
  casting_time: z.array(z.unknown()).default([]),
  range: z.record(z.string(), z.unknown()).default({}),
  duration: z.array(z.unknown()).default([]),
  entries: z.array(z.unknown()).nullish().transform((v) => v ?? []),
  classes: z.array(z.string()).nullish().transform((v) => v ?? []),
  damage_inflict: z.array(z.string()).default([]),
  saving_throw: z.array(z.string()).default([]),
});

export const CatalogItem = z.object({
  id: z.string(),
  name: z.string(),
  eng_name: z.string().nullish().transform((v) => v ?? null),
  category: z.string().default(''),
  subcategory: z.string().default(''),
  /** cp 整數計價。顯示時才換算幣別——App 端不解析幣別字串。 */
  // 以下欄位在資料庫中確實有 null（ac_base 197 列、mastery 170、weight 39、
  // entries 70、price_cp 3）。一律用 nullish().transform 而非 .default——
  // 後者不處理明確的 null。
  price_cp: z.number().int().nullish().transform((v) => v ?? null),
  weight: z.number().nullish().transform((v) => v ?? null),
  rarity: z.string().nullish().transform((v) => v ?? null),
  damage_dice: z.string().nullish().transform((v) => v ?? null),
  damage_type: z.string().nullish().transform((v) => v ?? null),
  properties: z.array(z.string()).nullish().transform((v) => v ?? []),
  armor_category: z.string().nullish().transform((v) => v ?? null),
  ac_base: z.number().int().nullish().transform((v) => v ?? null),
  // 陣列而非字串（實查 v_items：['array','null']）——一件武器可有多個精通。
  mastery: z.array(z.string()).nullish().transform((v) => v ?? []),
  entries: z.array(z.unknown()).nullish().transform((v) => v ?? []),
});

export const CatalogClass = z.object({
  id: z.string(),
  name: z.string(),
  eng_name: z.string().nullish().transform((v) => v ?? null),
});

export const CatalogSubclass = z.object({
  id: z.string(),
  name: z.string(),
  eng_name: z.string().nullish().transform((v) => v ?? null),
  /** 用於比對 class_features 的 subclass_short_name。 */
  short_name: z.string().nullish().transform((v) => v ?? ''),
  class_id: z.string().nullish().transform((v) => v ?? ''),
  data: z.record(z.string(), z.unknown()).nullish().transform((v) => v ?? {}),
});

export const CatalogClassFeature = z.object({
  id: z.string(),
  name: z.string(),
  eng_name: z.string().nullish().transform((v) => v ?? null),
  level: z.number().int(),
  is_subclass: z.boolean().nullish().transform((v) => v ?? false),
  subclass_short_name: z.string().nullish().transform((v) => v ?? ''),
  data: z.record(z.string(), z.unknown()).nullish().transform((v) => v ?? {}),
});

export type CatalogClass = z.infer<typeof CatalogClass>;
export type CatalogSubclass = z.infer<typeof CatalogSubclass>;
export type CatalogClassFeature = z.infer<typeof CatalogClassFeature>;
export type CatalogSpell = z.infer<typeof CatalogSpell>;
export type CatalogItem = z.infer<typeof CatalogItem>;

/** 目前開放的書源代碼（XPHB = 2024 修訂版玩家手冊）。 */
export const CATALOG_SOURCE = 'XPHB';
