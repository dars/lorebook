import { z } from 'zod';

import raw from './creation-data.json';

/**
 * 建角選項資料，由 `tool/export_creation_data.dart` 自 Flutter 端匯出。
 *
 * **匯出而非手抄**：28 個選項物件、687 行資料，手動轉寫必然出錯，而且錯在
 * 資料裡不會有編譯錯誤——只會讓某個種族少一個特性、某個職業少一個可選技能，
 * 難以察覺。與 golden 對照是同一套紀律。
 *
 * 資料更新時重跑匯出器，不要手改這份 JSON。
 */

/**
 * 種族特性：名稱＋英文名＋說明。
 *
 * 匯出的內建資料三個欄位都在，選填的預設值是給自訂種族用的——同一個形狀
 * 兩邊共用，自訂種族不另立特性型別（openspec custom-species D4d）。
 */
export const SpeciesTrait = z.object({
  name: z.string(),
  nameEn: z.string().default(''),
  description: z.string().default(''),
});

/**
 * 有限次數能力：次數 ＋ 回復時機（custom-species D9）。
 *
 * 選用該種族建角時展開為角色卡的資源項目。內建種族的資料尚未標記這一類
 * 特性（仍在 traits 的文字裡），因此目前只有自訂種族會有值。
 */
export const SpeciesAbility = z.object({
  name: z.string(),
  /** 1／2／3 或 'proficiency'（熟練加值，隨等級變動）。 */
  uses: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal('proficiency'),
  ]),
  recovery: z.enum(['short', 'long']),
  description: z.string().default(''),
});

export const SpeciesOption = z.object({
  cn: z.string(),
  en: z.string(),
  speed: z.string(),
  size: z.string(),
  /** 黑暗視覺距離（0 = 無）。特性列表中已含由此推導的條目。 */
  darkvisionFt: z.number().int(),
  /** 每級額外 HP（矮人堅毅 = 1）。 */
  hpPerLevel: z.number().int(),
  skillPickCount: z.number().int(),
  skillPickFrom: z.array(z.string()),
  sizeChoices: z.array(z.string()),
  traits: z.array(SpeciesTrait),
  /** 有限次數能力。內建資料無此欄位，預設為空。 */
  abilities: z.array(SpeciesAbility).default([]),
  description: z.string(),
  /** 這個選項本身是不是使用者自訂的種族。內建資料無此欄位，預設 false。 */
  isCustom: z.boolean().default(false),
});

export const ClassOption = z.object({
  cn: z.string(),
  en: z.string(),
  hitDie: z.number().int(),
  /** 施法屬性代碼；'' = 非施法職業。 */
  spellAbility: z.string(),
  saves: z.array(z.string()),
  primaryAbilities: z.array(z.string()),
  skillCount: z.number().int(),
  skillChoices: z.array(z.string()),
  cantripsKnown: z.number().int(),
  preparedSpells: z.number().int(),
  level1Slots: z.number().int(),
  /** 無甲防禦的附加屬性；'' = 無。 */
  unarmoredDefense: z.string(),
  description: z.string(),
});

export const BackgroundOption = z.object({
  cn: z.string(),
  en: z.string(),
  /** 能力加值候選（3 個代碼）。 */
  abilities: z.array(z.string()),
  skills: z.array(z.string()),
  originFeat: z.string(),
  toolProficiency: z.string(),
  originFeatCustom: z.boolean(),
  originFeatDescription: z.string(),
  description: z.string(),
  /** 這個選項本身是不是使用者自訂的背景。內建資料無此欄位，預設 false。 */
  isCustom: z.boolean().default(false),
});

const SkillDef = z.object({
  name: z.string(),
  nameEn: z.string(),
  ability: z.string(),
});

const CreationData = z.object({
  species: z.array(SpeciesOption),
  classes: z.array(ClassOption),
  backgrounds: z.array(BackgroundOption),
  skills: z.array(SkillDef),
  languages: z.array(z.string()),
  abilityOrder: z.array(z.string()),
  proficiencyEntryMax: z.number().int(),
});

const parsed = CreationData.parse(raw);

export const SPECIES = parsed.species;
export const CLASSES = parsed.classes;
export const BACKGROUNDS = parsed.backgrounds;
export const SKILLS = parsed.skills;
export const LANGUAGES = parsed.languages;
export const ABILITY_ORDER = parsed.abilityOrder;
export const PROFICIENCY_ENTRY_MAX = parsed.proficiencyEntryMax;

export type SpeciesTrait = z.infer<typeof SpeciesTrait>;
export type SpeciesAbility = z.infer<typeof SpeciesAbility>;
export type SpeciesOption = z.infer<typeof SpeciesOption>;
export type ClassOption = z.infer<typeof ClassOption>;
export type BackgroundOption = z.infer<typeof BackgroundOption>;
export type SkillDef = z.infer<typeof SkillDef>;

export const isCaster = (c: ClassOption) => c.spellAbility !== '';

/**
 * 能力代碼 → 中文。集中在這裡是因為它原本在建角精靈、能力值步驟、六角圖
 * 各抄了一份——同一個對照表散成三份，改譯名時漏掉哪一份都不會有編譯錯誤。
 */
export const ABILITY_LABEL: Record<string, string> = {
  STR: '力量', DEX: '敏捷', CON: '體質',
  INT: '智力', WIS: '感知', CHA: '魅力',
};

/** 體型的中文。資料是英文原值（Small/Medium/Large），畫面一律中文。 */
export const SIZE_LABEL: Record<string, string> = {
  Small: '小型',
  Medium: '中型',
  Large: '大型',
};

export const sizeCn = (size: string) => SIZE_LABEL[size] ?? size;

export const abilityLabels = (codes: string[]) =>
  codes.map((c) => ABILITY_LABEL[c] ?? c).join('/');

/** 職業英文名 → 中文。自訂子職以英文名為關聯鍵，顯示時一律經過這裡。 */
export const classCn = (en: string) => CLASSES.find((c) => c.en === en)?.cn ?? en;
